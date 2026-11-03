# Implementation Plan — Google OAuth Login, Auto-Provisioning & Dynamic Integrations

## Executive Summary
This feature implements a zero-configuration onboarding and operations system for **NIMO-CRM**:
1. **Google OAuth 2.0 / Gmail Login**: Users authenticate using their Google / Gmail account via a native, secure OAuth2 flow.
2. **Automated MongoDB Workspace Provisioning**: First-time Gmail sign-ins automatically provision a complete company workspace (`Tenant`), assign the user as `Admin`, seed standard departments, holiday calendars, shift presets, and permissions—requiring zero database setup from the user.
3. **Automated Gmail / SMTP Email Engine**: On Google login, the granted Google OAuth tokens allow the CRM to send emails (invoices, verification, notifications) directly through the authorized Gmail account using Nodemailer OAuth2 / Gmail API, eliminating manual SMTP host/port/app-password configuration.
4. **Dashboard Integrations & Switcher Hub (`/dashboard/settings?tab=integrations`)**:
   - **Gmail / Email Switcher**: View connected Google account, test send email with 1 click, add secondary SMTP/Gmail accounts, and toggle active sender.
   - **Database Switcher**: View active MongoDB connection status, latency, and optionally switch to a private MongoDB Atlas cluster URI.

---

## Architectural Specification

```
┌─────────────────────────────────────────────────────────────┐
│                    NIMO-CRM Auth View                       │
│              [ G  Continue with Google / Gmail ]            │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
            GET /api/auth/google -> Google OAuth2 Consent
                               │
                               ▼
            GET /api/auth/google/callback
                               │
                 ┌─────────────┴─────────────┐
                 │                           │
          User Exists?                New Gmail User?
                 │                           │
                 ▼                           ▼
          Refresh Tokens              AUTO-PROVISION:
          & Update Profile            1. Tenant.create({ name, slug })
                 │                    2. User.create({ role: "Admin", status: "Active" })
                 │                    3. Seed Departments, Shifts, Permissions
                 │                    4. Store encrypted Google OAuth tokens
                 │                           │
                 └─────────────┬─────────────┘
                               │
                               ▼
             Create JWT Session (`src/lib/session.ts`)
                               │
                               ▼
                     Redirect to /dashboard
```

---

## Proposed Changes

### 1. Database Model Extensions
- **`src/models/User.ts`**:
  - `googleId?: string`
  - `authProvider?: "credentials" | "google"`
  - `googleAccessToken?: string`
  - `googleRefreshToken?: string`
  - `googleTokenExpiry?: Date`
- **`src/models/Tenant.ts`**:
  - `emailIntegration?: { provider: "smtp" | "google_oauth"; activeEmail: string; googleRefreshToken?: string; isConfigured: boolean }`
  - `databaseConfig?: { customMongoUri?: string; isCustom: boolean; activeClusterName?: string }`

### 2. Google OAuth Routes
- **`src/app/api/auth/google/route.ts`**: Initiates Google OAuth2 consent request with `openid`, `email`, `profile`, and `https://mail.google.com/` (or `https://www.googleapis.com/auth/gmail.send`) scopes.
- **`src/app/api/auth/google/callback/route.ts`**: Handles OAuth callback, exchanges authorization code for tokens, extracts user info from Google, performs automated MongoDB tenant/user provisioning, generates session cookie, and redirects to dashboard.

### 3. Dynamic Email Engine (`src/lib/mail.ts`)
- Updates `sendEmail` to check if the current tenant or user has a connected Google OAuth account or custom SMTP credentials.
- If Google OAuth tokens exist, creates a Nodemailer OAuth2 transport using `clientId`, `clientSecret`, and `refreshToken`.
- Automatically falls back to system `SMTP_*` if Google OAuth is not configured.

### 4. Auth UI Updates
- **`src/app/(auth)/login/page.tsx`**: Add mobile-responsive "Continue with Google" button with FontAwesome `<i className="fa-brands fa-google text-red-500 mr-2.5" />` and divider `OR`.
- **`src/app/(auth)/register/page.tsx`**: Add "Sign up with Google" button with FontAwesome `<i className="fa-brands fa-google text-red-500 mr-2.5" />`.

### 5. Settings Hub: Integrations & Database Portal
- **`src/components/settings/IntegrationsAndDatabaseTab.tsx`**:
  - **Email & Gmail Account Desk**: Displays connected Gmail, active mode, 1-click test email dispatch, and toggle switch.
  - **Database & MongoDB Desk**: Displays current connection status, ping latency, and allows testing and switching to a private MongoDB URI.
- **`src/app/dashboard/settings/page.tsx`**: Register `?tab=integrations` in settings tab registry.
- **`src/lib/featureHighlights.ts`**: Register Release v3.2 featuring Google OAuth One-Click Onboarding & Dynamic Integrations Desk.

---

## Verification Criteria
1. TypeScript compilation passes with 0 errors.
2. Google OAuth endpoint initiates redirection properly.
3. Fallback and direct credentials login remains 100% functional.
4. Mobile-responsive across all viewports (`min-h-[40px]`, safe touch targets).
5. All icons use FontAwesome 6 exclusively.

