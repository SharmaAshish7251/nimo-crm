# Implementation Plan — Complete CRM Rebranding to NIMO-CRM

## Objective
Thoroughly rename all brand identities, titles, headings, configuration identifiers, notification templates, manifest descriptors, and user-facing assets from "NexAce CRM" / "NexAce" to **"NIMO-CRM"** (and "NIMO CRM" / "nimo-crm" where case/hyphenation demands), ensuring a unified, consistent brand presence across web, mobile, and backend subsystems.

---

## Scope of Changes

### 1. Project Configuration & App Metadata
- **`package.json`**:
  - `"name": "nexace-crm"` → `"name": "nimo-crm"`
  - `"description"` if present
- **`capacitor.config.ts`**:
  - `appName`: `"NexAce CRM"` → `"NIMO-CRM"`
  - `appId`: `"com.nexace.crm"` → `"com.nimo.crm"`
- **`public/manifest.json`**:
  - `"name": "NexAce CRM"` → `"NIMO-CRM"`
  - `"short_name": "NexAce CRM"` → `"NIMO-CRM"`
- **`src/app/layout.tsx`**:
  - `title`: `"NexAce CRM | The Unified Workspace"` → `"NIMO-CRM | The Unified Workspace"`
  - `applicationName`: `"NexAce CRM"` → `"NIMO-CRM"`
  - `appleWebApp.title`: `"NIMO-CRM"`
- **`android/app/src/main/res/values/strings.xml`**:
  - `<string name="app_name">NexAce CRM</string>` → `<string name="app_name">NIMO-CRM</string>`
  - `<string name="title_activity_main">NexAce CRM</string>` → `<string name="title_activity_main">NIMO-CRM</string>`
- **`ios/App/App/Info.plist`**:
  - `CFBundleDisplayName`: `"NIMO-CRM"`

---

### 2. Core System Services & Engines
- **`src/lib/backupEngine.ts`**:
  - `SYSTEM_SIGNATURE`: `"NEXACE-CRM-BACKUP-V1"` → `"NIMO-CRM-BACKUP-V1"`
  - `description`: `"NexAce CRM Full Tenant System Backup"` → `"NIMO-CRM Full Tenant System Backup"`
  - Support backward compatibility for restore validation (accept both `NEXACE` and `NIMO` signatures during import/restore).
- **`src/lib/featureHighlights.ts`**:
  - Branding references and release notes updated to NIMO-CRM.
- **`src/lib/mail.ts`**:
  - Default sender name: `"NexAce CRM"` → `"NIMO-CRM"`
- **`src/lib/fcm.ts`**:
  - Notification channel: `"nexace_crm_default"` → `"nimo_crm_default"`
- **`src/app/actions/auth.ts`**:
  - Default company name: `"NexAce CRM"` → `"NIMO-CRM"`
  - Default company slug: `"nexace"` → `"nimo"`

---

### 3. User Interface & Branding
- **Auth Screens**:
  - `src/app/(auth)/login/page.tsx`
  - `src/app/(auth)/register/page.tsx`
  - `src/app/(auth)/forgot-password/page.tsx`
- **Dashboard Layouts & Navigation**:
  - `src/components/layout/DashboardClientLayout.tsx`
  - `src/components/layout/MobileBottomNav.tsx`
  - `src/components/layout/OnboardingScreens.tsx`
  - `src/components/layout/CommandPalette.tsx`
  - `src/components/layout/NativeLoginScreen.tsx`
  - `src/components/landing/HeroDataFlowEngine.tsx`
  - `src/components/landing/CrmMotionShowcase.tsx`
  - `src/app/page.tsx` (Landing Page)
  - `src/app/guide/page.tsx` (User Guide)
- **Settings & Management Tabs**:
  - `src/components/settings/DataBackupRestoreTab.tsx`
  - `src/components/settings/UserManagementTab.tsx`
  - `src/components/settings/AdminInvoicesTab.tsx`
  - `src/components/settings/SelfServiceInvoiceTab.tsx`
- **Operations & Business Modules**:
  - `src/components/operations/BulkImportModal.tsx`
  - `src/components/operations/ContractsOnboardingTab.tsx`
  - `src/components/operations/HrWorkdeskDashboard.tsx`
  - `src/components/operations/SalesWorkdeskDashboard.tsx`
  - `src/components/operations/ReportsDashboard.tsx`
  - `src/components/finance/ZeroTouchPayrollDesk.tsx`
  - `src/components/finance/InvoiceDetailsView.tsx`
  - `src/components/bd/ProposalPreviewModal.tsx`
  - `src/components/bd/SendProposalModal.tsx`
  - `src/components/bd/SalesExecutiveDashboard.tsx`
  - `src/components/calendar/CompanyCelebrationsTab.tsx`
  - `src/components/calendar/CompanyHolidaysTab.tsx`
  - `src/components/calendar/ShiftExtensionsDesk.tsx`

---

### 4. Email Templates & API Notifications
- `src/app/api/auth/send-code/route.ts`
- `src/app/api/it/invoices/route.ts`
- `src/app/api/it/invoices/[id]/route.ts`
- `src/app/api/it/subscriptions/route.ts`
- `src/app/api/ops/contracts/route.ts`
- `src/app/api/ops/contracts/[id]/route.ts`
- `src/app/api/notifications/test-push/route.ts`
- `src/app/api/backup/export/route.ts` (export filename prefixes: `nimo_backup_...`)

---

## Verification Criteria
1. Full TypeScript compilation (`tsc --noEmit` / syntax check) passes cleanly with 0 errors.
2. All UI components display **NIMO-CRM** with FontAwesome 6 icons intact.
3. Mobile responsiveness strictly preserved across all viewports.
4. Git commit and push to remote repository.
