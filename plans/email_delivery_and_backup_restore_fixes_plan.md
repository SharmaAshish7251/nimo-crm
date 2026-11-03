# Architecture Plan: Resilient Email Delivery & Full Database Backup-Restore Integrity

## Objectives
1. **Fix Email Delivery Error (`Connection closed unexpectedly`)**:
   - Prevent 500 crashes when Google OAuth SMTP / REST fails (due to Google requiring `https://mail.google.com/` scope or missing Gmail API enablement in Google Cloud Console).
   - Implement resilient multi-tier email dispatch in `src/lib/mail.ts`:
     1. Tier 1: Tenant custom SMTP or Google OAuth dispatch (with Gmail API REST support).
     2. Tier 2: Automatic, seamless fallback to verified live System SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`), which is tested and working 100%.
     3. Tier 3: Developer Ethereal sandbox in local dev / clear diagnostic errors in production.
   - Update `POST /api/settings/integrations` to test the full pipeline and report whether dispatch was direct or handled via System SMTP fallback.
   - Update Google OAuth route scope to include `https://mail.google.com/` for full Gmail SMTP authorization if allowed.

2. **Fix Database Backup & Restore System**:
   - In `src/lib/backupEngine.ts`: Fix `ActivityLog.create` field validation errors in `exportTenantBackup` (`actorId`/`verb` -> `userId`, `userName`, `details`).
   - In `src/components/settings/DataBackupRestoreTab.tsx`: Convert export execution from GET URL link to POST fetch + Blob download to eliminate URL query string limits.
   - In `src/app/api/backup/export/route.ts`: Support POST file attachment stream download.
   - Verify that all 54 collections and 3,336+ records restore cleanly without duplicate key (E11000) or activity log failures.

3. **Feature Highlighting & Mobile Responsiveness**:
   - Ensure all modal dialogs and toasts comply with FontAwesome 6 icons and 100% mobile responsiveness.
