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

export async function sendEmail({ to, subject, text, html, attachments, tenantId }: SendMailOptions): Promise<{
  success: boolean;
  isDev?: boolean;
  previewUrl?: string;
  provider?: string;
  fallbackUsed?: boolean;
}> {
  const isProduction = process.env.NODE_ENV === "production";

  // Tier 1: Check Tenant-level Integration (Google OAuth or Tenant Custom SMTP)
  try {
    await connectToDatabase();
    const { Tenant } = await import("@/models/Tenant");
    const tenant = tenantId ? await Tenant.findById(tenantId).lean() : await Tenant.findOne().lean();

    if (tenant?.emailIntegration?.isConfigured) {
      const integration = tenant.emailIntegration;
      const senderName = integration.senderName || tenant.name || "NIMO-CRM";

      if (integration.provider === "google_oauth" && integration.googleRefreshToken && integration.activeEmail) {
        const googleTransporter = getGoogleOAuthTransporter(integration.activeEmail, integration.googleRefreshToken);
        if (googleTransporter) {
          try {
            await googleTransporter.sendMail({
              from: `"${senderName}" <${integration.activeEmail}>`,
              to: to.toLowerCase().trim(),
              subject,
              text,
              html,
              attachments,
            });
            console.log(`[Mail Engine] Live email dispatched via Google OAuth (${integration.activeEmail})`);
            return { success: true, isDev: false, provider: "google_oauth" };
          } catch (oauthErr) {
            console.warn(
              "[Mail Engine] Google OAuth dispatch failed (SMTP requires https://mail.google.com/ or enabled Gmail API). Falling back to system SMTP...",
              oauthErr instanceof Error ? oauthErr.message : oauthErr
            );
          }
        }
      } else if (integration.provider === "smtp" && integration.smtpHost && integration.smtpUser && integration.smtpPass) {
        try {
          const tenantSmtp = nodemailer.createTransport({
            host: integration.smtpHost,
            port: integration.smtpPort || 587,
            secure: (integration.smtpPort || 587) === 465,
            auth: { user: integration.smtpUser, pass: integration.smtpPass },
            tls: { rejectUnauthorized: isProduction },
          });
          await tenantSmtp.sendMail({
            from: `"${senderName}" <${integration.smtpUser}>`,
            to: to.toLowerCase().trim(),
            subject,
            text,
            html,
            attachments,
          });
          console.log(`[Mail Engine] Live email dispatched via Tenant Custom SMTP (${integration.smtpUser})`);
          return { success: true, isDev: false, provider: "custom_smtp" };
        } catch (customSmtpErr) {
          console.warn("[Mail Engine] Tenant custom SMTP failed. Falling back to system SMTP...", customSmtpErr);
        }
      }
    }
  } catch (err) {
    console.warn("[Mail Engine] Could not load tenant email integration, checking system SMTP:", err);
  }

  // Tier 2: System SMTP (process.env.SMTP_*)
  const systemTransporter = getSystemLiveTransporter();
  if (systemTransporter) {
    try {
      const user = process.env.SMTP_USER?.trim();
      const rawFrom = process.env.SMTP_FROM?.trim()?.replace(/^["']|["']$/g, "");
      const fromAddress = rawFrom || (user ? `NIMO-CRM <${user}>` : "NIMO-CRM <noreply@nimo-crm.com>");

      await systemTransporter.sendMail({
        from: fromAddress,
        to: to.toLowerCase().trim(),
        subject,
        text,
        html,
        attachments,
      });
      console.log(`[Mail Engine] Live email dispatched successfully to ${to} via System SMTP`);
      return { success: true, isDev: false, provider: "system_smtp", fallbackUsed: true };
    } catch (sysErr: any) {
      console.error("[Mail Engine] System SMTP failed:", sysErr.message);
      if (isProduction) {
        throw new Error(`Email Delivery Failed: ${sysErr.message}`);
      }
    }
  }

  // Tier 3: Developer Sandbox (local development only)
  if (!isProduction) {
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
      return { success: true, isDev: true, previewUrl, provider: "ethereal_sandbox" };
    } catch (err: unknown) {
      console.error("[Mail Dev Sandbox Error]", err);
      return { success: true, isDev: true, provider: "mock_fallback" };
    }
  }

  // Tier 4: Production Guard
  throw new Error(
    "No operational email sending method is configured. Please sign in with Google or configure SMTP credentials in your dashboard settings."
  );
}
