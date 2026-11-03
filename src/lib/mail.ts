import nodemailer from "nodemailer";
import { connectToDatabase } from "@/lib/db";

export interface EmailAttachment {
  filename: string;
  content?: Buffer | string;
  path?: string;
  contentType?: string;
}

export interface SendMailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
  attachments?: EmailAttachment[];
  tenantId?: string;
}

let cachedTransporter: nodemailer.Transporter | null = null;
let cachedConfigKey = "";

function getSystemLiveTransporter(): nodemailer.Transporter | null {
  const host = process.env.SMTP_HOST?.trim();
  const port = parseInt(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.replace(/\s+/g, "");

  if (!host || !user || !pass) {
    return null;
  }

  const configKey = `smtp:${host}:${port}:${user}:${pass}`;
  if (cachedTransporter && cachedConfigKey === configKey) {
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === "production",
    },
  });
  cachedConfigKey = configKey;
  return cachedTransporter;
}

/**
 * Creates or retrieves a Google OAuth2 Nodemailer transporter
 */
function getGoogleOAuthTransporter(activeEmail: string, refreshToken: string): nodemailer.Transporter | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret || !refreshToken || !activeEmail) {
    return null;
  }

  const configKey = `google:${activeEmail}:${refreshToken}`;
  if (cachedTransporter && cachedConfigKey === configKey) {
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: activeEmail,
      clientId,
      clientSecret,
      refreshToken,
    },
  });
  cachedConfigKey = configKey;
  return cachedTransporter;
}

export async function sendEmail({ to, subject, text, html, attachments, tenantId }: SendMailOptions) {
  const isProduction = process.env.NODE_ENV === "production";
  let activeTransporter: nodemailer.Transporter | null = null;
  let fromAddress = "";

  // 1. Check if the tenant has an active Google OAuth or Custom SMTP integration
  try {
    await connectToDatabase();
    const { Tenant } = await import("@/models/Tenant");
    const tenant = tenantId ? await Tenant.findById(tenantId).lean() : await Tenant.findOne().lean();

    if (tenant?.emailIntegration?.isConfigured) {
      const integration = tenant.emailIntegration;

      if (integration.provider === "google_oauth" && integration.googleRefreshToken && integration.activeEmail) {
        activeTransporter = getGoogleOAuthTransporter(integration.activeEmail, integration.googleRefreshToken);
        if (activeTransporter) {
          const senderName = integration.senderName || tenant.name || "NIMO-CRM";
          fromAddress = `"${senderName}" <${integration.activeEmail}>`;
          console.log(`[Mail Engine] Sending email via Google OAuth (${integration.activeEmail})`);
        }
      } else if (integration.provider === "smtp" && integration.smtpHost && integration.smtpUser && integration.smtpPass) {
        activeTransporter = nodemailer.createTransport({
          host: integration.smtpHost,
          port: integration.smtpPort || 587,
          secure: (integration.smtpPort || 587) === 465,
          auth: { user: integration.smtpUser, pass: integration.smtpPass },
          tls: { rejectUnauthorized: isProduction },
        });
        const senderName = integration.senderName || tenant.name || "NIMO-CRM";
        fromAddress = `"${senderName}" <${integration.smtpUser}>`;
        console.log(`[Mail Engine] Sending email via Tenant Custom SMTP (${integration.smtpUser})`);
      }
    }
  } catch (err) {
    console.warn("[Mail Engine] Could not load tenant email integration, falling back to system SMTP:", err);
  }

  // 2. Fallback to System Live SMTP (process.env.SMTP_*)
  if (!activeTransporter) {
    activeTransporter = getSystemLiveTransporter();
    const user = process.env.SMTP_USER?.trim();
    const rawFrom = process.env.SMTP_FROM?.trim()?.replace(/^["']|["']$/g, "");
    fromAddress = rawFrom || (user ? `NIMO-CRM <${user}>` : "NIMO-CRM <noreply@nimo-crm.com>");
  }

  // 3. Dispatch Live Email
  if (activeTransporter) {
    try {
      await activeTransporter.sendMail({
        from: fromAddress,
        to: to.toLowerCase().trim(),
        subject,
        text,
        html,
        attachments,
      });
      console.log(`[Mail Engine] Live email dispatched successfully to ${to}`);
      return { success: true, isDev: false };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("[Mail Engine Error] Delivery failed:", errMsg);
      throw new Error(`Email Delivery Failed: ${errMsg}`);
    }
  }

  // 4. Production Guard
  if (isProduction) {
    throw new Error(
      "No email sending method is configured. Please sign in with Google or configure SMTP credentials in your dashboard settings."
    );
  }

  // 5. Developer Sandbox (local development only)
  console.warn("[Mail Dev Sandbox] Falling back to Ethereal sandbox...");
  try {
    const testAccount = await nodemailer.createTestAccount();
    const devTransporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });

    const info = await devTransporter.sendMail({
      from: '"NIMO-CRM Dev" <noreply@nimo-crm.com>',
      to: to.toLowerCase().trim(),
      subject: `[DEV] ${subject}`,
      text,
      html,
      attachments,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info) || "";
    console.log(`[Mail Dev Sandbox] Dispatched to ${to}. Preview: ${previewUrl}`);
    return { success: true, isDev: true, previewUrl };
  } catch (err: unknown) {
    console.error("[Mail Dev Sandbox Error]", err);
    return { success: true, isDev: true };
  }
}
