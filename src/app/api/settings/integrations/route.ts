import { NextResponse } from "next/server";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";
import { connectToDatabase } from "@/lib/db";
import { Tenant } from "@/models/Tenant";
import mongoose from "mongoose";

export async function GET() {
  try {
    const authResult = await requireTenantSession(["Admin", "OPS"]);
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId } = authResult;

    await connectToDatabase();
    const tenant = await Tenant.findById(tenantObjectId).lean();

    // Check system environment status
    const hasGoogleClientId = Boolean(process.env.GOOGLE_CLIENT_ID?.trim());
    const hasSystemSmtp = Boolean(process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim());

    // Measure MongoDB ping
    let dbStatus = "Connected";
    let dbLatencyMs = 0;
    try {
      const startTime = Date.now();
      await mongoose.connection.db?.admin().ping();
      dbLatencyMs = Date.now() - startTime;
    } catch {
      dbStatus = "Degraded";
    }

    const currentDbHost = mongoose.connection.host || "MongoDB Atlas Cluster";
    const currentDbName = mongoose.connection.name || "nimo-crm";

    return NextResponse.json({
      success: true,
      email: {
        provider: tenant?.emailIntegration?.provider || (hasSystemSmtp ? "smtp" : "none"),
        activeEmail: tenant?.emailIntegration?.activeEmail || process.env.SMTP_USER || "",
        senderName: tenant?.emailIntegration?.senderName || tenant?.name || "NIMO-CRM",
        isConfigured: Boolean(tenant?.emailIntegration?.isConfigured || hasSystemSmtp),
        hasGoogleOAuth: hasGoogleClientId,
        hasSystemSmtp,
      },
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
        host: currentDbHost,
        databaseName: currentDbName,
        isCustom: Boolean(tenant?.databaseConfig?.isCustom),
        customMongoUri: tenant?.databaseConfig?.customMongoUri ? "••••••••••••••••" : "",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch integrations" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireTenantSession(["Admin"]);
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, session } = authResult;

    const body = await request.json();
    const { action } = body;

    await connectToDatabase();

    // ── ACTION 1: Test Email Dispatch ──
    if (action === "test_email") {
      const { toEmail } = body;
      const target = toEmail?.trim() || session.userId;

      const { sendEmail } = await import("@/lib/mail");
      await sendEmail({
        to: target,
        subject: "[NIMO-CRM] Test Email Verification",
        text: `This is a verification test email from your NIMO-CRM dashboard dispatched at ${new Date().toLocaleString()}. All email sending systems are operational!`,
        html: `
          <div style="font-family: -apple-system, sans-serif; padding: 24px; background: #f8fafc; color: #1e293b;">
            <div style="max-width: 480px; margin: 0 auto; background: #fff; padding: 28px; border-radius: 14px; border: 1px solid #e2e8f0; text-align: center;">
              <h3 style="color: #00c5a0; margin: 0 0 12px;">✦ NIMO-CRM Email Test</h3>
              <p style="font-size: 14px; color: #475569; line-height: 1.6;">
                Congratulations! Your email sending engine is active and successfully delivering messages.
              </p>
              <div style="font-size: 12px; color: #94a3b8; margin-top: 20px;">
                Dispatched by ${session.userName} on ${new Date().toLocaleString()}
              </div>
            </div>
          </div>
        `,
        tenantId: tenantObjectId.toString(),
      });

      return NextResponse.json({ success: true, message: `Test email successfully dispatched to ${target}` });
    }

    // ── ACTION 2: Test External MongoDB Connection ──
    if (action === "test_database") {
      const { mongoUri } = body;
      if (!mongoUri || !mongoUri.startsWith("mongodb")) {
        return NextResponse.json({ error: "Please enter a valid MongoDB connection string starting with mongodb:// or mongodb+srv://" }, { status: 400 });
      }

      const startTime = Date.now();
      const testConn = await mongoose.createConnection(mongoUri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
      }).asPromise();

      await testConn.db?.admin().ping();
      const latencyMs = Date.now() - startTime;
      const clusterHost = testConn.host;
      await testConn.close();

      return NextResponse.json({
        success: true,
        message: "Successfully connected to MongoDB cluster!",
        clusterHost,
        latencyMs,
      });
    }

    // ── ACTION 3: Configure Custom SMTP Provider ──
    if (action === "save_smtp") {
      const { host, port, user, pass, senderName } = body;
      if (!host || !user || !pass) {
        return NextResponse.json({ error: "SMTP Host, Username, and Password are required." }, { status: 400 });
      }

      await Tenant.findByIdAndUpdate(tenantObjectId, {
        $set: {
          emailIntegration: {
            provider: "smtp",
            activeEmail: user.trim(),
            senderName: senderName || "NIMO-CRM",
            smtpHost: host.trim(),
            smtpPort: parseInt(port || "587"),
            smtpUser: user.trim(),
            smtpPass: pass.trim(),
            isConfigured: true,
          },
        },
      });

      return NextResponse.json({ success: true, message: "Custom SMTP credentials saved successfully." });
    }

    // ── ACTION 4: Save or Reset Custom Database Config ──
    if (action === "save_database") {
      const { customMongoUri, useDefault } = body;

      if (useDefault) {
        await Tenant.findByIdAndUpdate(tenantObjectId, {
          $set: {
            databaseConfig: {
              isCustom: false,
              customMongoUri: "",
              activeClusterName: "Default Shared Cluster",
              lastConnectedAt: new Date(),
            },
          },
        });
        return NextResponse.json({ success: true, message: "Reverted to default shared MongoDB cluster." });
      }

      if (!customMongoUri || !customMongoUri.startsWith("mongodb")) {
        return NextResponse.json({ error: "Please provide a valid MongoDB connection URI." }, { status: 400 });
      }

      await Tenant.findByIdAndUpdate(tenantObjectId, {
        $set: {
          databaseConfig: {
            isCustom: true,
            customMongoUri: customMongoUri.trim(),
            activeClusterName: "Private Dedicated Cluster",
            lastConnectedAt: new Date(),
          },
        },
      });

      return NextResponse.json({ success: true, message: "Custom MongoDB database configured successfully." });
    }

    return NextResponse.json({ error: `Unknown action '${action}'` }, { status: 400 });
  } catch (err: any) {
    console.error("[Integrations API Error]:", err);
    return NextResponse.json({ error: err.message || "Failed to process request" }, { status: 500 });
  }
}

