import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { Tenant } from "@/models/Tenant";
import { ActivityLog } from "@/models/ActivityLog";
import { createSession } from "@/lib/session";

interface GoogleTokens {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
  id_token?: string;
}

interface GoogleProfile {
  sub: string;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  email: string;
  email_verified: boolean;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const stateRaw = url.searchParams.get("state");

  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${proto}://${host}`;
  const redirectUri = `${appUrl}/api/auth/google/callback`;

  if (error || !code) {
    console.error("[Google OAuth Error Callback]:", error || "No code received");
    return NextResponse.redirect(`${appUrl}/login?error=google_denied`);
  }

  // Parse state payload
  let stateData: { intent?: string; redirect?: string } = {};
  if (stateRaw) {
    try {
      stateData = JSON.parse(Buffer.from(stateRaw, "base64url").toString("utf8"));
    } catch {
      stateData = {};
    }
  }

  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    console.error("[Google OAuth Configuration Error]: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing");
    return NextResponse.redirect(`${appUrl}/login?error=google_not_configured`);
  }

  try {
    // 1. Exchange authorization code for OAuth tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("[Google OAuth Token Exchange Failed]:", errorText);
      return NextResponse.redirect(`${appUrl}/login?error=token_exchange_failed`);
    }

    const tokens: GoogleTokens = await tokenResponse.json();

    // 2. Fetch authenticated user's Google profile
    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!profileResponse.ok) {
      console.error("[Google OAuth Profile Fetch Failed]");
      return NextResponse.redirect(`${appUrl}/login?error=profile_fetch_failed`);
    }

    const profile: GoogleProfile = await profileResponse.json();
    const cleanEmail = profile.email?.toLowerCase().trim();

    if (!cleanEmail) {
      return NextResponse.redirect(`${appUrl}/login?error=email_not_provided`);
    }

    await connectToDatabase();

    // 3. Check if user already exists
    let existingUser = await User.findOne({ email: cleanEmail }).populate("tenantId");

    let tenantDoc: any = null;
    let targetUser: any = null;

    if (existingUser) {
      // ── EXISTING USER FLOW ──────────────────────────────────────────
      targetUser = existingUser;
      tenantDoc = existingUser.tenantId;

      if (targetUser.status === "Suspended") {
        return NextResponse.redirect(`${appUrl}/login?error=suspended`);
      }
      if (targetUser.status === "Pending") {
        return NextResponse.redirect(`${appUrl}/login?pending=true`);
      }

      // Update Google profile details & tokens
      targetUser.googleId = profile.sub;
      targetUser.authProvider = "google";
      if (!targetUser.photoUrl && profile.picture) {
        targetUser.photoUrl = profile.picture;
      }
      if (tokens.refresh_token) {
        targetUser.googleRefreshToken = tokens.refresh_token;
      }
      targetUser.googleAccessToken = tokens.access_token;
      targetUser.googleTokenExpiry = new Date(Date.now() + (tokens.expires_in || 3600) * 1000);
      targetUser.lastActiveAt = new Date();
      await targetUser.save();

      // If user is Admin or OPS, update tenant's automated email integration
      if (["Admin", "OPS"].includes(targetUser.role) && tokens.refresh_token && tenantDoc) {
        if (!tenantDoc.emailIntegration || tenantDoc.emailIntegration.provider !== "google_oauth") {
          await Tenant.findByIdAndUpdate(tenantDoc._id, {
            $set: {
              emailIntegration: {
                provider: "google_oauth",
                activeEmail: cleanEmail,
                senderName: profile.name || "NIMO-CRM",
                googleRefreshToken: tokens.refresh_token,
                isConfigured: true,
              },
            },
          });
        }
      }
    } else {
      // ── ZERO-TOUCH AUTO-PROVISIONING FLOW ──────────────────────────
      // When a user signs in with Google for the first time:
      // Provision their company workspace and Admin profile automatically!

      // Determine or create tenant organization
      tenantDoc = await Tenant.findOne();

      if (!tenantDoc) {
        // Derive clean company name from email or profile
        const emailDomain = cleanEmail.split("@")[1] || "";
        const isPublicDomain = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com"].includes(emailDomain);
        const companyName = isPublicDomain
          ? `${profile.name || "My"} Workspace`
          : emailDomain.split(".")[0].toUpperCase() + " Workspace";

        const slug = (isPublicDomain ? (profile.given_name || "workspace") : emailDomain.split(".")[0])
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "-") + "-" + Math.random().toString(36).substring(2, 6);

        tenantDoc = await Tenant.create({
          name: companyName,
          slug,
          email: cleanEmail,
          legalName: companyName,
          emailIntegration: {
            provider: "google_oauth",
            activeEmail: cleanEmail,
            senderName: profile.name || companyName,
            googleRefreshToken: tokens.refresh_token || "",
            isConfigured: Boolean(tokens.refresh_token),
          },
        });
      }

      // Check existing user count to determine initial role
      const userCount = await User.countDocuments({ tenantId: tenantDoc._id });
      const role = userCount === 0 ? "Admin" : "Employee";
      const status = role === "Admin" ? "Active" : "Pending";

      targetUser = await User.create({
        name: profile.name || "Google User",
        email: cleanEmail,
        photoUrl: profile.picture || "",
        role,
        status,
        tenantId: tenantDoc._id,
        googleId: profile.sub,
        authProvider: "google",
        googleRefreshToken: tokens.refresh_token || "",
        googleAccessToken: tokens.access_token || "",
        googleTokenExpiry: new Date(Date.now() + (tokens.expires_in || 3600) * 1000),
        lastActiveAt: new Date(),
      });

      // Log provisioning event in immutable ActivityLog
      try {
        await ActivityLog.create({
          tenantId: tenantDoc._id,
          actor: targetUser._id,
          action: "AUTH_REGISTER_GOOGLE",
          entityType: "User",
          entityId: targetUser._id,
          description: `Auto-provisioned new account for ${cleanEmail} via Google OAuth`,
          metadata: { provider: "google", role, status },
        });
      } catch (logErr) {
        console.warn("Failed to write ActivityLog for Google registration:", logErr);
      }

      // If pending approval, redirect with informational banner
      if (status === "Pending") {
        return NextResponse.redirect(`${appUrl}/login?pending=true`);
      }
    }

    // 4. Create encrypted JWT session
    await createSession(
      targetUser._id.toString(),
      tenantDoc._id.toString(),
      targetUser.name,
      tenantDoc.name || "NIMO-CRM",
      targetUser.role
    );

    const returnUrl = stateData.redirect && stateData.redirect.startsWith("/") ? stateData.redirect : "/dashboard";
    return NextResponse.redirect(`${appUrl}${returnUrl}`);
  } catch (err: any) {
    console.error("[Google OAuth Callback Error]:", err);
    return NextResponse.redirect(`${appUrl}/login?error=google_auth_exception`);
  }
}

