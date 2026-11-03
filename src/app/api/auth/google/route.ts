import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const intent = searchParams.get("intent") || "login";
    const redirectParam = searchParams.get("redirect") || "/dashboard";

    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    if (!clientId) {
      return NextResponse.json(
        {
          error: "Google OAuth is not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your environment variables (.env.local / Vercel Settings).",
          setupGuide: "https://console.cloud.google.com/apis/credentials",
        },
        { status: 500 }
      );
    }

    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000";
    const proto = request.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${proto}://${host}`;
    const redirectUri = `${appUrl}/api/auth/google/callback`;

    // Secure state payload encoding intent & return URL
    const statePayload = Buffer.from(
      JSON.stringify({
        intent,
        redirect: redirectParam,
        timestamp: Date.now(),
      })
    ).toString("base64url");

    // Standard scopes + Gmail sending scope for automated email setup
    const scopes = [
      "openid",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/gmail.send",
      "https://mail.google.com/",
    ].join(" ");

    const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    googleAuthUrl.searchParams.set("client_id", clientId);
    googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
    googleAuthUrl.searchParams.set("response_type", "code");
    googleAuthUrl.searchParams.set("scope", scopes);
    googleAuthUrl.searchParams.set("access_type", "offline"); // Crucial: gets refresh token for background Gmail sending
    googleAuthUrl.searchParams.set("prompt", "consent"); // Ensures refresh token is generated on every sign-in
    googleAuthUrl.searchParams.set("state", statePayload);

    return NextResponse.redirect(googleAuthUrl.toString(), 302);
  } catch (err: any) {
    console.error("[Google OAuth Init Error]:", err);
    return NextResponse.redirect(new URL("/login?error=google_auth_failed", request.url));
  }
}

