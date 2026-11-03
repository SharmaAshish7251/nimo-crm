# NexAce CRM — Universal Data Import, Export, Database Backup & Restore System Specification

**Status:** Implementation Blueprint & Deep Research  
**Target:** NexAce CRM (NIMO CRM) Multi-Tenant Enterprise Platform  
**Location:** `plans/data_import_export_backup_restore_system_plan.md`  
**Date:** November 2026

---

## 1. Executive Summary & Problem Analysis

### 1.1 The Need
NexAce CRM manages 56 distinct Mongoose data models covering HRMS, Operations, Projects, IT Assets, Finance, Sales, Communications, and Attendance. While the system previously contained siloed import scripts (e.g. `LeadImportModal`, `ImportHolidayExcelModal`, `BulkImportModal`) and tabular report exports (`ReportsDashboard`), it lacked an **Enterprise-Grade, Unified Database Backup, Export, Disaster Recovery & Universal Import System**.

Enterprise customers and regulated consulting firms require:
1. **Full Workspace Database Backup & Export**: 1-click snapshot of the entire tenant workspace across all collections into an encrypted/checksummed portable database archive (`.nexace.json` or `.json`).
2. **Selective Module & Table Export**: Exporting specific business collections (Leads, Tasks, Invoices, Employees, Timesheets) to **JSON, CSV, or Excel (.xlsx)**.
3. **Database Restore & Disaster Recovery**: Restoring tenant data from past backup files with two distinct strategies:
   - **Safe Merge / Upsert Mode (Non-Destructive)**: Updates existing records and inserts missing ones without wiping workspace data.
   - **Clean Overwrite Mode (Full Disaster Recovery)**: Cleanses the selected collections for the tenant and restores exact state with strict confirmation safeguards.
4. **Universal Tabular Import Engine**: Drag-and-drop CSV / Excel / JSON importer with schema auto-mapping, validation preview, error reporting, and bulk insertion for primary business collections.
5. **Security, Auditability & Strict Tenant Isolation**: Only authorized Admins (or privileged OPS) can trigger backup and restore. Every restored record is strictly re-stamped with the current workspace's `tenantId`, preventing cross-tenant leakage.

---

## 2. Architecture & Data Model Classification

```mermaid
graph TD
    subgraph "Client Layer (/dashboard/settings?tab=backup)"
        UI[Universal Data Management & Backup Desk]
        UI --> TabBackup[Full Workspace Backup & Export]
        UI --> TabRestore[Database File Restore & Disaster Recovery]
        UI --> TabImport[Universal Tabular Importer - CSV/XLSX]
        UI --> TabHistory[Backup History & Automated Snapshots]
    end

    subgraph "API & Security Layer"
        TabBackup --> API_Export[/api/backup/export]
        TabRestore --> API_Restore[/api/backup/restore]
        TabImport --> API_Import[/api/backup/import]
        TabHistory --> API_History[/api/backup/history]
        
        API_Export --> AuthCheck{Admin / RBAC Check}
        API_Restore --> AuthCheck
        API_Import --> AuthCheck
    end

    subgraph "Core Backup Engine (src/lib/backupEngine.ts)"
        AuthCheck --> Engine[Backup & Restore Engine]
        Engine --> Registry[56 Model Registry & Dependency Resolver]
        Engine --> Hasher[SHA-256 Checksum & Metadata Stamping]
        Engine --> BulkOp[MongoDB BulkWrite & Upsert Pipeline]
        Engine --> TenantSanitizer[Strict tenantId Re-Stamping]
    end

    subgraph "Database Layer"
        BulkOp --> Mongo[(MongoDB Atlas / 56 Collections)]
        BulkOp --> AuditLog[(ActivityLog Audit Trail)]
    end
```

### 2.1 The 56 Model Domain Registry
The backup and restore system registers all 56 collections into 8 distinct functional domains:

| Domain | Collections / Models Included | Typical Use Cases |
|---|---|---|
| **1. Identity & Workspace** | `Tenant`, `TenantSubscription`, `User`, `Department`, `RolePermission` | Organization setup, employee accounts, roles, access permissions |
| **2. Time, Attendance & Shifts** | `Attendance`, `Availability`, `AvailabilityConfirmation`, `Holiday`, `Event`, `TimeEntry`, `Sprint` | Clock-in records, shift rosters, holidays, weekly timesheets |
| **3. Projects & Operations** | `Project`, `Task`, `Wiki`, `DriveFile`, `Client`, `ClientContract`, `ExternalTeam` | Client delivery, Kanban tasks, SOP docs, cloud drive, contractors |
| **4. Sales & BD Pipeline** | `Lead`, `SalesDeal`, `Proposal`, `Referral` | Inbound leads, sales stages, quotes, candidate referrals |
| **5. HR & People Operations** | `HROnboarding`, `ChecklistPreset`, `HRDocument`, `LeaveRequest`, `LeaveBalance`, `HRCase`, `HRAppraisal`, `HRFnFSettlement`, `SalarySlip`, `CompensationPolicy`, `HRSandbox`, `HRMeeting`, `HRResourceAllocation` | Onboarding, leaves, appraisals, documents, payroll slips |
| **6. Finance & Invoicing** | `FinanceInvoice`, `ITInvoice`, `FinanceExpense` | Invoices, contractor claims, company expenses, interaction history |
| **7. IT Assets & Tools** | `ITDevice`, `ITAccessEntry`, `ITDriveLink`, `ITSubscription` | Hardware inventory, software credentials, SaaS licenses |
| **8. Culture & Comms** | `Channel`, `ChatMessage`, `Announcement`, `BirthdayWish`, `Kudos`, `PulseSurvey`, `OneOnOneMeeting`, `Notification`, `FeatureBroadcast`, `ActivityLog` | Team chat, announcements, 1:1 agendas, kudos wall, audit trail |

---

## 3. Database Backup Package Specification (`.nexace.json`)

To ensure reliability, cross-version compatibility, and corruption detection, backup files adhere to a standardized JSON manifest structure:

```json
{
  "manifest": {
    "format": "nexace-database-backup",
    "version": "1.0",
    "exportedAt": "2026-11-03T07:45:00.000Z",
    "environment": "production",
    "tenantId": "6543210fedcba9876543210f",
    "tenantSlug": "acme-corp",
    "tenantName": "Acme Global Solutions",
    "exportedBy": {
      "userId": "6543210fedcba98765432100",
      "userName": "Alex Mercer",
      "userRole": "Admin"
    },
    "checksum": "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "totalCollections": 14,
    "totalRecords": 3482,
    "collectionSummary": {
      "User": 48,
      "Project": 12,
      "Task": 240,
      "Attendance": 1850,
      "FinanceInvoice": 64
    }
  },
  "data": {
    "User": [ ... ],
    "Project": [ ... ],
    "Task": [ ... ]
  }
}
```

---

## 4. Restore Strategies & Safety Guardrails

### 4.1 Mode A: Safe Merge & Upsert (Default & Recommended)
- Matches records by `_id`. If `_id` matches an existing record in the target tenant, it updates the record. If not found, it inserts a new record.
- Non-matching or existing records not present in the backup are **never deleted**.
- Guaranteed 100% data preservation with zero downtime.

### 4.2 Mode B: Clean Overwrite / Full Disaster Recovery
- Used for total recovery from accidental deletion or major data corruption.
- For each selected collection, deletes existing tenant records (`deleteMany({ tenantId })`) and inserts all backup documents via `insertMany` or batch chunks.
- **Safeguard**: Requires explicit double confirmation: the user must type the exact confirmation phrase `"RESTORE"` into an interactive security modal.

### 4.3 Validation Dry-Run Stage
Before committing any changes to the database:
1. The backup file is parsed and validated against the manifest schema.
2. The SHA-256 checksum is recomputed and verified.
3. An interactive inspection summary shows:
   - File creation date and original tenant metadata.
   - Record count breakdown per collection.
   - Existing vs. new record diff comparison.
   - Warnings if sensitive configuration conflicts are detected.

---

## 5. Universal Tabular Data Import & Export Engine

Beyond raw database JSON backups, business teams need spreadsheet imports and exports for day-to-day operations:
- **Formats Supported**: CSV (`.csv`), Excel (`.xlsx`), JSON (`.json`).
- **Collections Supported**:
  - `User`: Mass employee provisioning (name, email, role, department, salary, shift).
  - `Lead`: Inbound sales leads batch import with status and pipeline values.
  - `Client`: Customer directory and retainer contract terms.
  - `Task`: Backlog items, sprints, assignees, priorities, due dates.
  - `Attendance`: External biometric clock log ingestion.
  - `ITDevice`: Office hardware and asset inventory.
  - `Holiday`: Annual corporate calendar.
- **Intelligent Field Mapping**: Automatically identifies header synonyms (e.g. "Full Name", "Employee Name", "name" -> maps to `name`; "Email Address", "Work Email" -> maps to `email`).
- **Validation Engine**: Previews valid rows, highlights syntax/validation errors (e.g. invalid emails, missing required fields), and allows selective skip or fix before importing.

---

## 6. Implementation Deliverables

1. **`src/lib/backupEngine.ts`**: Core backend library providing:
   - Dynamic model registry mapping 56 Mongoose schemas.
   - `exportTenantData(tenantId, selectedCollections, options)`: generates backup package with checksum.
   - `inspectBackupFile(backupContent)`: validates manifest, checksum, and calculates diffs.
   - `restoreTenantData(tenantId, backupContent, mode, options)`: executes atomic or batched upsert/clean restore with tenant stamping.
   - `exportCollectionToCsv(tenantId, collectionName)`: converts collection documents into standardized CSV with nested field flattening.
   - `importTabularData(tenantId, collectionName, rows, options)`: maps tabular data to Mongoose schema with type coercion and validation.

2. **API Routes**:
   - `GET / POST /api/backup/export`: Exports full workspace or selected collections (JSON / CSV).
   - `POST /api/backup/restore`: Accepts uploaded backup file, handles dry-run validation, and commits restore.
   - `POST /api/backup/import`: Universal CSV/Excel/JSON collection importer.
   - `GET /api/backup/history`: Retrieves recent backup snapshots and system audit records.

3. **User Interface Component (`src/components/settings/DataBackupRestoreTab.tsx`)**:
   - Comprehensive, 100% mobile-responsive admin control desk.
   - Tabs:
     - **Export & Backup**: Category selection chips, "Select All", quick presets, single-click `.nexace.json` download.
     - **Restore & Recovery**: Drag-and-drop file dropzone, dry-run inspection card, mode selector (Merge vs. Overwrite), security confirmation dialog.
     - **Tabular Importer / Exporter**: Choose entity (Leads, Users, Tasks, etc.), download template CSV, upload data, live table preview with column mapping.
     - **Automated Snapshots & Audit History**: View past export/restore events, record counts, file sizes, and download links.

4. **Settings & Navigation Integration**:
   - Integrated as a top-level tab in `/dashboard/settings?tab=backup` and deep-linked in `/dashboard/clients?tab=reports` and `DashboardClientLayout.tsx`.
   - Dynamic RBAC permission control: Admin always has access; configurable via `manageDataBackup` capability.

5. **Feature Highlights Registry**:
   - Registered in `src/lib/featureHighlights.ts` under Release v3.1 with FontAwesome 6 icon (`fa-solid fa-database`), badge, and deep links.

---

## 7. What Can Be Done Beyond (Enterprise Recommendations)

In addition to this complete in-app import, export, and restore system, the following advanced capabilities can be implemented as next milestones:
1. **Automated Cloud S3 / GCS Snapshots**: Scheduled nightly cron worker that exports the tenant database and streams encrypted archives directly into AWS S3, Google Cloud Storage, or Azure Blob Storage.
2. **Cross-Tenant Template Cloning**: Allows an enterprise partner or agency to take a "Golden Workspace" template (pre-configured roles, wiki SOPs, checklist presets, departments) and clone it into new client tenants with 1 click.
3. **Point-In-Time Recovery (PITR)**: Integration with MongoDB Atlas continuous backup oplog for restoring down to the exact second.
4. **Data Masking & Sanitization Mode**: An export option that anonymizes employee salaries, phone numbers, and addresses for creating staging or test datasets.

