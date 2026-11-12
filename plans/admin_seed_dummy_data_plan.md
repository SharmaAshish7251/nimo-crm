# Implementation Plan: Settings > Seed Data (Comprehensive CRM Dummy Data Generator)

## 1. Executive Summary
Provide Workspace Admins with an interactive, robust **"Seed & Demo Data"** control center located at `Settings > Seed Data`. This empowers administrators with a 1-click solution to populate a blank or fresh CRM database with rich, realistic, interconnected dummy data covering **all 10+ functional CRM domains** without affecting or deleting the current Admin's session.

---

## 2. Supported Data Domains & Features
The seeder will generate realistic mock documents pinned to the active `tenantId`:
1. **Identity & Structure**:
   - 6 Standard Departments (Engineering, Design, Operations, Sales & BD, Human Resources, Finance).
   - Standard RolePermission documents (Admin, OPS, HR, Employee).
2. **Team & Directory**:
   - 10+ Diverse Employee profiles across departments with realistic titles, phone numbers, bios, skill tags, and avatars.
3. **Projects, Sprints & Tasks**:
   - 4 Active & Completed Projects across departments (e.g. Mobile App Redesign, Cloud Migration, Enterprise Portal).
   - Active Sprint with realistic progress metrics.
   - 25+ Kanban Tasks spanning Todo, In Progress, Review, and Done with priority levels, assignees, and deadlines.
4. **Time & Attendance**:
   - Clock-in/Clock-out attendance records with geo-coordinates, shift durations, and overtime flags.
   - 15+ Weekly Timesheet entries assigned to active projects.
5. **Sales Pipeline & Deals**:
   - Inbound Leads (Warm, Qualified, Contacted).
   - Sales Deals across pipeline stages (Discovery, Proposal Sent, Negotiation, Closed Won) with monetary values.
   - Sent quotation Proposals and candidate Referrals.
6. **HRMS & People Operations**:
   - Standard Leave Balances (Casual, Sick, Paid).
   - Sample Leave Requests (Approved, Pending).
   - Company Holidays calendar.
   - Onboarding Checklists and HR document templates.
   - Sample Salary Slips with deductions and allowances.
7. **Finance & Invoicing**:
   - Client Accounts with billing details.
   - Client Invoices (Paid, Sent, Overdue).
   - Business & Travel Expense claims.
8. **IT Asset Management**:
   - Hardware Inventory (Laptops, Monitors, Keyboards) assigned to employees.
   - Software Access entries & SaaS Subscriptions (Figma, GitHub, AWS, Slack).
   - IT Cloud Drive links and vendor invoices.
9. **Communications & Culture**:
   - Collaboration Channels (`#general`, `#engineering`, `#random`, `#announcements`).
   - Active Chat Messages with threaded timestamps.
   - Official Company Announcements.
   - Peer Kudos, Birthday Wishes, 1:1 Check-in records, and Pulse Surveys.
10. **Knowledge Base (Wiki)**:
    - SOP Guides, Onboarding Handbooks, and Security Guidelines.

---

## 3. Architecture & API Design
- **API Endpoint**: `POST /api/settings/seed-data`
  - **Security**: Strictly restricted to authenticated users with `Admin` role (`requireTenantSession(["Admin"])`).
  - **Safety**: Pins all created records directly to `tenantObjectId`.
  - **Preservation**: NEVER overwrites, modifies, or deletes the active Admin's user record or session.
  - **Validation Fidelity**: Accurately matches all 20+ Mongoose models' schemas and required fields (e.g. `TimeEntry`, `SalesDeal`, `Proposal`, `Referral`, `Holiday`, `ChecklistPreset`, `SalarySlip`, `FinanceExpense`, `ITAccessEntry`, `ITSubscription`, `ITDriveLink`, `Kudos`, `BirthdayWish`, `OneOnOneMeeting`, `PulseSurvey`).
- **Purge Endpoint**: `DELETE /api/settings/seed-data`
  - **Security**: Restricted to `Admin` only.
  - **Safety Protocol**:
    - Deletes generated dummy data across all CRM modules matching `tenantId`.
    - **CRITICAL**: Strictly protects the active Admin user account (`_id: { $ne: adminObjectId }`) and the `Tenant` document.
    - Records `WORKSPACE_DELETE_DUMMY_DATA` audit trail in `ActivityLog`.
- **Frontend UI (`src/components/settings/SeedDemoDataTab.tsx`)**:
  - Add tab button in `src/app/dashboard/settings/page.tsx`:
    - Label: `Seed & Delete Dummy Data`
    - Icon: `fa-solid fa-flask-vial text-amber-500`
    - Deep-link: `?tab=seed`
  - Summary Cards showing live counts per domain with FontAwesome 6 icons.
  - Primary CTA: **"Seed Dummy Data"** (`fa-solid fa-wand-magic-sparkles`).
  - Secondary Destructive CTA: **"Delete Dummy Data"** (`fa-solid fa-trash-can text-white bg-rose-600`).
  - Dedicated Full-Width **"Danger Zone: Delete All Workspace Dummy Data"** Card.
  - Safe Confirmation Modals:
    - Seed modal explaining non-destructive append.
    - Purge modal explaining data wipe with safety guarantee that the Admin user account is preserved.
  - 100% Mobile Responsive design (`max-h-[90vh]`, touch targets >= 38px, safe scrollable containers).
- **Feature Highlights Registry**:
  - Registered in `src/lib/featureHighlights.ts` for automatic spotlight on login.

