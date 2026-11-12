import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { Tenant } from "@/models/Tenant";
import { ActivityLog } from "@/models/ActivityLog";
import { Notification } from "@/models/Notification";
import { sendEmail } from "@/lib/mail";
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
      // Note: Pending users are allowed to log in and will see the "Under Approval" holding dashboard

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

      // The very first user to sign in to a fresh workspace is automatically designated as Admin.
      // Subsequent Google sign-ins are created as Employee role with Pending status for Admin approval.
      const existingUserCount = await User.countDocuments({ tenantId: tenantDoc._id });
      const role = existingUserCount === 0 ? "Admin" : "Employee";
      const status = existingUserCount === 0 ? "Active" : "Pending";

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

      // Notify all Admins and OPS via In-App Notification and Live Email
      try {
        const adminUsers = await User.find({
          tenantId: tenantDoc._id,
          role: { $in: ["Admin", "OPS"] },
          status: "Active",
        });

        if (adminUsers.length > 0) {
          const notifDocs = adminUsers.map((admin) => ({
            tenantId: tenantDoc._id,
            recipientId: admin._id,
            title: "New Employee Account Pending Approval",
            message: `${targetUser.name} (${cleanEmail}) registered via Google and is awaiting approval.`,
            type: "system",
            linkUrl: "/dashboard/clients?tab=users&filter=Pending",
            read: false,
            adminOnly: true,
          }));
          await Notification.insertMany(notifDocs);

          for (const admin of adminUsers) {
            try {
              await sendEmail({
                to: admin.email,
                subject: `[NIMO-CRM] New Employee Approval Request: ${targetUser.name}`,
                text: `New account awaiting approval: ${targetUser.name} (${cleanEmail}). Please review and approve in OPS Portal > User Accounts -- Pending Employee Approvals.`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
                    <h2 style="color: #1e293b; margin-top: 0;">New Account Awaiting Approval</h2>
                    <p style="color: #475569; font-size: 14px;">
                      A new employee has registered for your workspace <strong>${tenantDoc.name}</strong> via Google and is currently pending approval:
                    </p>
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin: 16px 0;">
                      <p style="margin: 4px 0; font-size: 14px; color: #1e293b;"><strong>Name:</strong> ${targetUser.name}</p>
                      <p style="margin: 4px 0; font-size: 14px; color: #1e293b;"><strong>Email:</strong> ${cleanEmail}</p>
                      <p style="margin: 4px 0; font-size: 14px; color: #d97706;"><strong>Status:</strong> Pending Approval</p>
                      <p style="margin: 4px 0; font-size: 14px; color: #64748b;"><strong>Auth Provider:</strong> Google 1-Click</p>
                    </div>
                    <p style="color: #475569; font-size: 14px;">Please sign in to OPS Portal &gt; User Accounts to approve or activate this account.</p>
                    <div style="margin-top: 24px;">
                      <a href="${appUrl}/dashboard/clients?tab=users&filter=Pending" style="display: inline-block; padding: 10px 20px; background-color: #00c5a0; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">Review &amp; Approve in Admin Portal</a>
                    </div>
                  </div>
                `,
                tenantId: tenantDoc._id.toString(),
              });
            } catch (mailErr) {
              console.error("Failed to send approval email to admin:", mailErr);
            }
          }
        }

        // Welcome notification for the newly registered user
        await Notification.create({
          tenantId: tenantDoc._id,
          recipientId: targetUser._id,
          title: "Welcome to NIMO-CRM",
          message: "Your Google registration was received. Your account is currently awaiting administrator activation.",
          type: "system",
          linkUrl: "/dashboard",
          read: false,
        });
      } catch (notifErr) {
        console.error("Failed to generate registration notifications:", notifErr);
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

