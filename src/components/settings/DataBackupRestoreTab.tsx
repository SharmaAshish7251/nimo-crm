"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

interface DomainCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  collections: string[];
}

const BACKUP_DOMAINS: DomainCategory[] = [
  {
    id: "identity",
    name: "Identity & Organization",
    icon: "fa-solid fa-building-user",
    description: "Company details, employee accounts, departments, and role permissions.",
    collections: ["Tenant", "TenantSubscription", "User", "Department", "RolePermission"],
  },
  {
    id: "time_attendance",
    name: "Time, Shifts & Attendance",
    icon: "fa-solid fa-clock",
    description: "Shift logs, clock-in geo stamps, availability rosters, timesheets, and holidays.",
    collections: ["Attendance", "Availability", "AvailabilityConfirmation", "TimeEntry", "Holiday", "Event", "Sprint"],
  },
  {
    id: "projects_operations",
    name: "Projects, Tasks & Drive",
    icon: "fa-solid fa-diagram-project",
    description: "Kanban projects, tasks, SOP wiki docs, cloud drive files, and client contracts.",
    collections: ["Project", "Task", "Wiki", "DriveFile", "Client", "ClientContract", "ExternalTeam"],
  },
  {
    id: "sales_bd",
    name: "Sales Pipeline & Deals",
    icon: "fa-solid fa-briefcase",
    description: "Inbound sales leads, CRM deal stages, quotation proposals, and candidate referrals.",
    collections: ["Lead", "SalesDeal", "Proposal", "Referral"],
  },
  {
    id: "hr_people",
    name: "HRMS & People Operations",
    icon: "fa-solid fa-user-tie",
    description: "Onboarding checklists, leave balances, help desk tickets, appraisals, and payslips.",
    collections: [
      "HROnboarding",
      "ChecklistPreset",
      "HRDocument",
      "LeaveRequest",
      "LeaveBalance",
      "HRCase",
      "HRAppraisal",
      "HRFnFSettlement",
      "SalarySlip",
      "CompensationPolicy",
      "HRSandbox",
      "HRMeeting",
      "HRResourceAllocation",
    ],
  },
  {
    id: "finance_invoicing",
    name: "Finance, Invoicing & Expenses",
    icon: "fa-solid fa-file-invoice-dollar",
    description: "Corporate invoices, contractor claims, interaction audit timelines, and business expenses.",
    collections: ["FinanceInvoice", "ITInvoice", "FinanceExpense"],
  },
  {
    id: "it_assets",
    name: "IT Inventory & Licenses",
    icon: "fa-solid fa-laptop",
    description: "Hardware device tracking, software access matrix, cloud drive links, and SaaS renewals.",
    collections: ["ITDevice", "ITAccessEntry", "ITDriveLink", "ITSubscription"],
  },
  {
    id: "comms_culture",
    name: "Communications & Culture",
    icon: "fa-solid fa-comments",
    description: "Channels, chats, announcements, peer kudos, 1:1 check-ins, and pulse surveys.",
    collections: ["Channel", "ChatMessage", "Announcement", "BirthdayWish", "Kudos", "PulseSurvey", "OneOnOneMeeting", "Notification", "FeatureBroadcast"],
  },
  {
    id: "audit_security",
    name: "Audit Trail & Logs",
    icon: "fa-solid fa-shield-halved",
    description: "Complete immutable audit history of actions, verbs, and system events.",
    collections: ["ActivityLog"],
  },
];

const CSV_EXPORTABLE_ENTITIES = [
  { key: "User", name: "Employees & Directory", icon: "fa-solid fa-users" },
  { key: "Lead", name: "Sales Leads", icon: "fa-solid fa-bullseye" },
  { key: "Client", name: "Clients & Accounts", icon: "fa-solid fa-handshake" },
  { key: "Task", name: "Project Tasks", icon: "fa-solid fa-list-check" },
  { key: "TimeEntry", name: "Weekly Timesheets", icon: "fa-solid fa-business-time" },
  { key: "Attendance", name: "Shift Clock Logs", icon: "fa-solid fa-fingerprint" },
  { key: "FinanceInvoice", name: "Client Invoices", icon: "fa-solid fa-file-invoice-dollar" },
  { key: "ITDevice", name: "Hardware Inventory", icon: "fa-solid fa-laptop" },
  { key: "Holiday", name: "Company Holidays", icon: "fa-solid fa-calendar-check" },
];

export default function DataBackupRestoreTab() {
  const [activeSubTab, setActiveSubTab] = useState<"export" | "restore" | "import" | "history">("export");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── EXPORT STATE ──────────────────────────────────────────────────────────
  const [selectedDomains, setSelectedDomains] = useState<string[]>(BACKUP_DOMAINS.map((d) => d.id));
  const [sanitizeExport, setSanitizeExport] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const toggleDomain = (id: string) => {
    setSelectedDomains((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]));
  };

  const handleSelectAllDomains = () => {
    if (selectedDomains.length === BACKUP_DOMAINS.length) {
      setSelectedDomains([]);
    } else {
      setSelectedDomains(BACKUP_DOMAINS.map((d) => d.id));
    }
  };

  const handleTriggerExport = async () => {
    if (selectedDomains.length === 0) {
      showToast("Please select at least one data domain to export.", "error");
      return;
    }

    try {
      setIsExporting(true);
      const collections =
        selectedDomains.length === BACKUP_DOMAINS.length
          ? "all"
          : BACKUP_DOMAINS.filter((d) => selectedDomains.includes(d.id))
              .flatMap((d) => d.collections)
              .join(",");

      const url = `/api/backup/export?format=json&sanitize=${sanitizeExport}&collections=${encodeURIComponent(collections)}`;
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast("Workspace database backup package generated and downloading.");
      fetchHistory();
    } catch {
      showToast("Failed to initiate backup export.", "error");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCsv = (collectionName: string) => {
    const url = `/api/backup/export?format=csv&collection=${collectionName}`;
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Downloading CSV export for ${collectionName}...`);
  };

  // ── RESTORE STATE ─────────────────────────────────────────────────────────
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [inspectionResult, setInspectionResult] = useState<{
    manifest: any;
    comparison: Array<{ collection: string; backupCount: number; currentCount: number }>;
    errors: string[];
  } | null>(null);
  const [rawParsedPackage, setRawParsedPackage] = useState<any>(null);

  const [restoreMode, setRestoreMode] = useState<"merge" | "overwrite">("merge");
  const [selectedRestoreCollections, setSelectedRestoreCollections] = useState<string[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreSummary, setRestoreSummary] = useState<Record<string, number> | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadAndInspectFile(file);
    }
  };

  const loadAndInspectFile = (file: File) => {
    setRestoreFile(file);
    setInspectionResult(null);
    setRestoreSummary(null);
    setIsInspecting(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        setRawParsedPackage(parsed);

        const res = await fetch("/api/backup/restore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "inspect", backupPackage: parsed }),
        });

        const data = await res.json();
        if (data.success && data.manifest) {
          setInspectionResult(data);
          setSelectedRestoreCollections(data.comparison.map((c: any) => c.collection));
          showToast("Backup file verified successfully.");
        } else {
          setInspectionResult({
            manifest: data.manifest || null,
            comparison: data.comparison || [],
            errors: data.errors || [data.error || "Invalid backup file structure."],
          });
          showToast("Backup file inspection revealed warnings.", "error");
        }
      } catch (err: any) {
        showToast(`Failed to parse file: ${err.message || "Invalid JSON"}`, "error");
      } finally {
        setIsInspecting(false);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteRestore = async () => {
    if (!rawParsedPackage) return;
    if (restoreMode === "overwrite" && confirmInput.trim().toUpperCase() !== "RESTORE") {
      showToast("Please type 'RESTORE' to authorize clean overwrite recovery.", "error");
      return;
    }

    try {
      setIsRestoring(true);
      const res = await fetch("/api/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "restore",
          backupPackage: rawParsedPackage,
          mode: restoreMode,
          selectedCollections: selectedRestoreCollections,
          confirmation: confirmInput,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setRestoreSummary(data.restoredSummary);
        setShowConfirmModal(false);
        showToast("Database restore completed successfully!");
        fetchHistory();
      } else {
        showToast(data.error || "Database restore encountered errors.", "error");
      }
    } catch {
      showToast("Failed to process restore request.", "error");
    } finally {
      setIsRestoring(false);
    }
  };

  // ── UNIVERSAL TABULAR IMPORTER STATE ───────────────────────────────────────
  const [importTarget, setImportTarget] = useState<string>("User");
  const [tabularFile, setTabularFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const [isImportingTabular, setIsImportingTabular] = useState(false);
  const [tabularImportResult, setTabularImportResult] = useState<{
    importedCount: number;
    totalRows: number;
    errors: string[];
  } | null>(null);

  const tabularInputRef = useRef<HTMLInputElement>(null);

  const handleTabularFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setTabularFile(file);
    setTabularImportResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

        if (data.length > 0) {
          setDetectedColumns(Object.keys(data[0]));
          setParsedRows(data);
          showToast(`Loaded ${data.length} records from ${file.name}`);
        } else {
          showToast("Spreadsheet appears to be empty.", "error");
        }
      } catch (err: any) {
        showToast(`Failed reading file: ${err.message}`, "error");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDownloadSampleTemplate = (target: string) => {
    let headers: string[] = [];
    let sample: any[][] = [];

    if (target === "User") {
      headers = ["Full Name", "Email Address", "Role", "Department", "Phone", "Monthly Salary", "Shift Name"];
      sample = [
        ["Jane Doe", "jane@company.com", "Employee", "Engineering", "9876543210", 65000, "Standard Day Shift"],
        ["John Smith", "john@company.com", "Manager", "Operations", "9876543211", 85000, "Standard Day Shift"],
      ];
    } else if (target === "Lead") {
      headers = ["Lead Name", "Company", "Email", "Phone", "Status", "Lead Source", "Value", "Notes"];
      sample = [
        ["Sarah Jenkins", "Acme Logistics", "sarah@acme.com", "9123456780", "New", "Referral", 15000, "Interested in enterprise CRM"],
      ];
    } else if (target === "Client") {
      headers = ["Company Name", "Contact Email", "Phone", "Industry", "Retainer Hours", "Status"];
      sample = [
        ["Apex Global", "billing@apex.com", "9876500000", "Software", 40, "Active"],
      ];
    } else if (target === "Task") {
      headers = ["Task Title", "Description", "Priority", "Stage", "Due Date"];
      sample = [
        ["Implement SSO Login", "Configure SAML / OAuth", "High", "To Do", "2026-11-20"],
      ];
    } else if (target === "Holiday") {
      headers = ["Holiday Name", "Date", "Type", "Category", "Description"];
      sample = [
        ["Republic Day", "2026-01-26", "Mandatory", "National", "National holiday"],
      ];
    } else if (target === "ITDevice") {
      headers = ["Asset Tag", "Device Model", "Device Type", "Serial Number", "Condition", "Assigned To"];
      sample = [
        ["ASSET-00123", "MacBook Pro 16", "Laptop", "C02G1234XYZ", "Excellent", "Jane Doe"],
      ];
    }

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sample]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `nexace_${target.toLowerCase()}_template.xlsx`);
    showToast(`Downloaded sample template for ${target}`);
  };

  const handleCommitTabularImport = async () => {
    if (parsedRows.length === 0) return;

    try {
      setIsImportingTabular(true);
      const res = await fetch("/api/backup/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collection: importTarget,
          rows: parsedRows,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTabularImportResult(data);
        showToast(`Successfully imported ${data.importedCount} of ${data.totalRows} records!`);
        fetchHistory();
      } else {
        setTabularImportResult({
          importedCount: data.importedCount || 0,
          totalRows: parsedRows.length,
          errors: data.errors || [data.error || "Import failed"],
        });
        showToast("Tabular import completed with warnings.", "error");
      }
    } catch {
      showToast("Failed to process tabular import.", "error");
    } finally {
      setIsImportingTabular(false);
    }
  };

  // ── HISTORY STATE ─────────────────────────────────────────────────────────
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await fetch("/api/backup/history");
      if (res.ok) {
        const data = await res.json();
        setHistoryLogs(data.logs || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === "history") {
      fetchHistory();
    }
  }, [activeSubTab]);

  return (
    <div className="space-y-6">
      {/* Toast Notification Container */}
      {toast && (
        <div
          className={cn(
            "fixed top-5 right-5 z-[99999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-semibold max-w-sm animate-in slide-in-from-right-5",
            toast.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
          )}
        >
          <i className={cn("fa-solid text-base", toast.type === "success" ? "fa-circle-check" : "fa-circle-xmark")} />
          <div className="flex-1">{toast.message}</div>
          <button onClick={() => setToast(null)} className="text-muted-foreground hover:text-foreground">
            <i className="fa-solid fa-xmark text-xs" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-gradient-to-r from-teal-500/10 via-emerald-500/5 to-transparent border border-teal-500/20 rounded-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 text-lg">
              <i className="fa-solid fa-database" />
            </span>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Universal Data Backup, Export & Disaster Recovery Desk
            </h2>
          </div>
          <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
            Protect your workspace with complete snapshot backups, restore from database archive files with merge or overwrite protection, and universally import or export tabular data.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="gap-1.5 py-1 px-3 border-teal-500/30 text-teal-600 dark:text-teal-400 font-semibold text-xs">
            <i className="fa-solid fa-shield-halved text-[10px]" /> Enterprise Recovery
          </Badge>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto no-scrollbar">
        {[
          { id: "export", label: "Full Backup & Export", icon: "fa-solid fa-cloud-arrow-down" },
          { id: "restore", label: "Database Restore & Recovery", icon: "fa-solid fa-rotate-left" },
          { id: "import", label: "Universal Tabular Importer", icon: "fa-solid fa-file-import" },
          { id: "history", label: "Audit Trail & Snapshots", icon: "fa-solid fa-clock-rotate-left" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer min-h-[38px]",
              activeSubTab === tab.id
                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            )}
          >
            <i className={tab.icon} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── TAB 1: FULL WORKSPACE BACKUP & EXPORT ─────────────────────────── */}
      {activeSubTab === "export" && (
        <div className="space-y-6">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <i className="fa-solid fa-box-archive text-teal-600" /> Full Workspace Database Snapshot
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    Export all collections into an encrypted, SHA-256 checksummed portable database archive (<code className="text-xs bg-muted px-1.5 py-0.5 rounded">.nexace.json</code>).
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={handleSelectAllDomains} className="text-xs h-8 cursor-pointer">
                    <i className="fa-solid fa-check-double text-xs mr-1.5" />
                    {selectedDomains.length === BACKUP_DOMAINS.length ? "Deselect All" : "Select All Domains"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Domain Grid Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {BACKUP_DOMAINS.map((domain) => {
                  const isChecked = selectedDomains.includes(domain.id);
                  return (
                    <div
                      key={domain.id}
                      onClick={() => toggleDomain(domain.id)}
                      className={cn(
                        "p-3.5 rounded-xl border transition-all cursor-pointer select-none space-y-1.5",
                        isChecked
                          ? "bg-primary/5 border-primary/40 shadow-xs"
                          : "bg-card border-border hover:border-border/80 opacity-70"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                          <i className={cn(domain.icon, isChecked ? "text-primary" : "text-muted-foreground")} />
                          <span>{domain.name}</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="h-4 w-4 rounded border-input text-primary focus:ring-primary cursor-pointer"
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                        {domain.description}
                      </p>
                      <div className="text-[10px] text-muted-foreground font-mono pt-1">
                        {domain.collections.length} Collections
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Sanitize Option */}
              <div className="flex items-center justify-between p-3.5 bg-muted/40 border border-border/80 rounded-xl">
                <div className="space-y-0.5">
                  <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                    <i className="fa-solid fa-user-shield text-primary" /> Sanitize Sensitive Information (Staging / Demo Mode)
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Replaces password hashes with defaults and masks employee bank account numbers for sharing or testing.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={sanitizeExport}
                  onChange={(e) => setSanitizeExport(e.target.checked)}
                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary cursor-pointer"
                />
              </div>

              {/* Trigger Download */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-border/60">
                <div className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{selectedDomains.length}</span> of {BACKUP_DOMAINS.length} domains selected
                </div>
                <Button
                  onClick={handleTriggerExport}
                  disabled={isExporting || selectedDomains.length === 0}
                  className="gap-2 font-semibold min-h-[40px] px-5 w-full sm:w-auto cursor-pointer"
                >
                  {isExporting ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin text-xs" /> Generating Backup Package...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-download text-xs" /> Download Full Workspace Backup (.nexace.json)
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Tabular CSV Exports */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <i className="fa-solid fa-file-csv text-emerald-600" /> Quick Tabular CSV Exports
              </CardTitle>
              <CardDescription className="text-xs">
                Download spreadsheet-ready CSV tables for specific operational modules.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-2.5">
                {CSV_EXPORTABLE_ENTITIES.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => handleExportCsv(item.key)}
                    className="flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:bg-muted/50 hover:border-primary/40 transition-all text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <i className={cn(item.icon, "text-xs")} />
                      </span>
                      <span className="text-xs font-semibold text-foreground truncate">{item.name}</span>
                    </div>
                    <i className="fa-solid fa-arrow-down-to-bracket text-xs text-muted-foreground group-hover:text-primary shrink-0 ml-1" />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── TAB 2: DATABASE RESTORE & DISASTER RECOVERY ────────────────────── */}
      {activeSubTab === "restore" && (
        <div className="space-y-6">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <i className="fa-solid fa-rotate-left text-amber-500" /> Database File Restore & Disaster Recovery
              </CardTitle>
              <CardDescription className="text-xs">
                Upload a verified <code className="text-xs bg-muted px-1.5 py-0.5 rounded">.nexace.json</code> database backup file to restore records into this workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border hover:border-primary/60 rounded-2xl p-6 text-center transition-colors cursor-pointer bg-muted/20 hover:bg-muted/40 space-y-2"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".json,.nexace.json"
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto text-xl">
                  <i className="fa-solid fa-cloud-arrow-up" />
                </div>
                <div className="text-xs font-semibold text-foreground">
                  {restoreFile ? restoreFile.name : "Click or drag & drop your database backup archive (.nexace.json)"}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Supports JSON backup packages exported from any NexAce workspace.
                </p>
                {restoreFile && (
                  <Badge variant="outline" className="mt-2 text-[10px] font-mono border-primary/30 text-primary">
                    {(restoreFile.size / 1024).toFixed(1)} KB
                  </Badge>
                )}
              </div>

              {isInspecting && (
                <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
                  <i className="fa-solid fa-spinner fa-spin text-primary" /> Inspecting manifest and verifying SHA-256 checksum...
                </div>
              )}

              {/* Inspection Card */}
              {inspectionResult && inspectionResult.manifest && (
                <div className="border border-border rounded-xl p-4 bg-card space-y-4 animate-in fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                    <div>
                      <div className="font-bold text-sm text-foreground flex items-center gap-2">
                        <i className="fa-solid fa-circle-check text-emerald-500" />
                        Valid Backup Package Verified
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Source Workspace: <strong>{inspectionResult.manifest.tenantName}</strong> ({inspectionResult.manifest.tenantSlug})
                      </div>
                    </div>
                    <div className="text-[11px] text-muted-foreground font-mono">
                      Exported on {new Date(inspectionResult.manifest.exportedAt).toLocaleString("en-IN")}
                    </div>
                  </div>

                  {inspectionResult.errors.length > 0 && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 rounded-lg text-xs space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <i className="fa-solid fa-triangle-exclamation" /> Checksum / Integrity Notice:
                      </div>
                      <ul className="list-disc list-inside text-[11px]">
                        {inspectionResult.errors.map((e, idx) => (
                          <li key={idx}>{e}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Mode Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Select Restore Strategy
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div
                        onClick={() => setRestoreMode("merge")}
                        className={cn(
                          "p-3.5 rounded-xl border cursor-pointer transition-all space-y-1",
                          restoreMode === "merge"
                            ? "bg-primary/10 border-primary shadow-xs"
                            : "bg-card border-border hover:border-border/80 opacity-70"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                            <i className="fa-solid fa-code-merge text-primary" /> Safe Merge & Upsert
                          </span>
                          <span className="text-[10px] bg-primary/20 text-primary font-bold px-1.5 py-0.5 rounded">
                            Recommended
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Updates existing matching records and inserts new ones. Existing data is NEVER deleted.
                        </p>
                      </div>

                      <div
                        onClick={() => setRestoreMode("overwrite")}
                        className={cn(
                          "p-3.5 rounded-xl border cursor-pointer transition-all space-y-1",
                          restoreMode === "overwrite"
                            ? "bg-rose-500/10 border-rose-500 shadow-xs"
                            : "bg-card border-border hover:border-border/80 opacity-70"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                            <i className="fa-solid fa-trash-can" /> Clean Overwrite / Full Recovery
                          </span>
                          <span className="text-[10px] bg-rose-500/20 text-rose-600 font-bold px-1.5 py-0.5 rounded">
                            Destructive
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Cleanses existing tenant collections and restores exact snapshot state. Requires confirmation.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Collections Comparison Table */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Collections to Restore ({selectedRestoreCollections.length} of {inspectionResult.comparison.length})
                      </label>
                      <button
                        onClick={() => {
                          if (selectedRestoreCollections.length === inspectionResult.comparison.length) {
                            setSelectedRestoreCollections([]);
                          } else {
                            setSelectedRestoreCollections(inspectionResult.comparison.map((c) => c.collection));
                          }
                        }}
                        className="text-xs text-primary font-semibold hover:underline cursor-pointer"
                      >
                        Toggle All
                      </button>
                    </div>

                    <div className="border border-border rounded-xl overflow-hidden overflow-x-auto max-h-56">
                      <table className="w-full text-xs min-w-[500px]">
                        <thead className="bg-muted text-muted-foreground font-semibold border-b border-border">
                          <tr>
                            <th className="p-2.5 text-left w-10">Select</th>
                            <th className="p-2.5 text-left">Collection Name</th>
                            <th className="p-2.5 text-right">In Backup File</th>
                            <th className="p-2.5 text-right">Current in DB</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {inspectionResult.comparison.map((item) => {
                            const checked = selectedRestoreCollections.includes(item.collection);
                            return (
                              <tr key={item.collection} className="hover:bg-muted/30">
                                <td className="p-2.5 text-center">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => {
                                      setSelectedRestoreCollections((prev) =>
                                        prev.includes(item.collection)
                                          ? prev.filter((c) => c !== item.collection)
                                          : [...prev, item.collection]
                                      );
                                    }}
                                    className="h-3.5 w-3.5 rounded border-input text-primary focus:ring-primary cursor-pointer"
                                  />
                                </td>
                                <td className="p-2.5 font-medium text-foreground">{item.collection}</td>
                                <td className="p-2.5 text-right font-mono text-primary font-bold">
                                  {item.backupCount}
                                </td>
                                <td className="p-2.5 text-right font-mono text-muted-foreground">
                                  {item.currentCount}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Restore Action Button */}
                  <div className="flex justify-end pt-2">
                    <Button
                      onClick={() => setShowConfirmModal(true)}
                      disabled={selectedRestoreCollections.length === 0}
                      variant={restoreMode === "overwrite" ? "destructive" : "default"}
                      className="gap-2 font-semibold min-h-[40px] px-6 cursor-pointer"
                    >
                      <i className="fa-solid fa-rotate-left text-xs" />
                      {restoreMode === "overwrite" ? "Proceed to Clean Recovery" : "Execute Merge & Upsert"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Restore Results Summary */}
              {restoreSummary && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-2">
                  <div className="font-bold text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <i className="fa-solid fa-circle-check" /> Database Restore Completed Successfully
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                    {Object.entries(restoreSummary).map(([col, cnt]) => (
                      <div key={col} className="p-2 bg-background/60 rounded-lg border border-border/50">
                        <div className="text-[11px] text-muted-foreground">{col}</div>
                        <div className="font-bold text-foreground text-sm">{cnt} records</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── TAB 3: UNIVERSAL TABULAR IMPORTER ─────────────────────────────── */}
      {activeSubTab === "import" && (
        <div className="space-y-6">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <i className="fa-solid fa-file-import text-teal-600" /> Universal Tabular Importer (CSV & Excel)
              </CardTitle>
              <CardDescription className="text-xs">
                Import bulk records into any business collection with intelligent column auto-mapping and validation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Select Target & Download Template */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Target Business Collection
                  </label>
                  <select
                    value={importTarget}
                    onChange={(e) => {
                      setImportTarget(e.target.value);
                      setParsedRows([]);
                      setTabularFile(null);
                      setTabularImportResult(null);
                    }}
                    className="w-full h-10 rounded-xl border border-input bg-background px-3 text-xs text-foreground focus:ring-1 focus:ring-primary cursor-pointer font-medium"
                  >
                    <option value="User">Employees & Personnel Directory (User)</option>
                    <option value="Lead">Sales Leads Pipeline (Lead)</option>
                    <option value="Client">Client Accounts & Retainers (Client)</option>
                    <option value="Task">Project Tasks & Backlog (Task)</option>
                    <option value="Holiday">Corporate Holiday Calendar (Holiday)</option>
                    <option value="ITDevice">Hardware & Device Inventory (ITDevice)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Sample Spreadsheet
                  </label>
                  <Button
                    variant="outline"
                    onClick={() => handleDownloadSampleTemplate(importTarget)}
                    className="w-full h-10 gap-2 text-xs font-semibold cursor-pointer"
                  >
                    <i className="fa-solid fa-file-excel text-emerald-600" /> Download Template (.xlsx)
                  </Button>
                </div>
              </div>

              {/* Upload Dropzone */}
              <div
                onClick={() => tabularInputRef.current?.click()}
                className="border-2 border-dashed border-border hover:border-primary/60 rounded-2xl p-6 text-center transition-colors cursor-pointer bg-muted/20 hover:bg-muted/40 space-y-2"
              >
                <input
                  type="file"
                  ref={tabularInputRef}
                  onChange={handleTabularFileChange}
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-600 flex items-center justify-center mx-auto text-xl">
                  <i className="fa-solid fa-table-list" />
                </div>
                <div className="text-xs font-semibold text-foreground">
                  {tabularFile ? tabularFile.name : "Click or drag & drop CSV or Excel spreadsheet"}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Headers will be automatically mapped to {importTarget} schema fields.
                </p>
                {parsedRows.length > 0 && (
                  <Badge variant="outline" className="mt-2 text-[10px] font-mono border-primary/30 text-primary">
                    {parsedRows.length} Rows Detected
                  </Badge>
                )}
              </div>

              {/* Preview Table */}
              {parsedRows.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-foreground">
                      Data Preview (Showing first 5 of {parsedRows.length} rows)
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Detected Columns: {detectedColumns.join(", ")}
                    </div>
                  </div>

                  <div className="border border-border rounded-xl overflow-hidden overflow-x-auto max-h-56">
                    <table className="w-full text-xs min-w-[640px]">
                      <thead className="bg-muted text-muted-foreground font-semibold border-b border-border">
                        <tr>
                          {detectedColumns.map((col) => (
                            <th key={col} className="p-2.5 text-left whitespace-nowrap">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {parsedRows.slice(0, 5).map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-muted/30">
                            {detectedColumns.map((col) => (
                              <td key={col} className="p-2.5 whitespace-nowrap text-foreground">
                                {String(row[col] ?? "")}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      onClick={handleCommitTabularImport}
                      disabled={isImportingTabular}
                      className="gap-2 font-semibold min-h-[40px] px-6 cursor-pointer"
                    >
                      {isImportingTabular ? (
                        <>
                          <i className="fa-solid fa-spinner fa-spin text-xs" /> Importing Records...
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-circle-check text-xs" /> Import {parsedRows.length} Records into {importTarget}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Import Results Banner */}
              {tabularImportResult && (
                <div
                  className={cn(
                    "p-4 rounded-xl border space-y-2",
                    tabularImportResult.errors.length === 0
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                      : "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                  )}
                >
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <i className="fa-solid fa-circle-info" />
                    Import Complete: {tabularImportResult.importedCount} of {tabularImportResult.totalRows} records successfully processed.
                  </div>
                  {tabularImportResult.errors.length > 0 && (
                    <div className="space-y-1 text-[11px] text-muted-foreground">
                      <div className="font-semibold text-foreground">Skipped Rows / Notices:</div>
                      <ul className="list-disc list-inside max-h-32 overflow-y-auto">
                        {tabularImportResult.errors.map((e, idx) => (
                          <li key={idx}>{e}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── TAB 4: AUDIT TRAIL & HISTORY ──────────────────────────────────── */}
      {activeSubTab === "history" && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <i className="fa-solid fa-clock-rotate-left text-teal-600" /> Backup, Export & Restore Audit History
                </CardTitle>
                <CardDescription className="text-xs">
                  Immutable record of all snapshot exports, database restores, and bulk imports.
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchHistory} disabled={loadingHistory} className="h-8 gap-1.5 text-xs cursor-pointer">
                <i className={cn("fa-solid fa-rotate-right text-xs", loadingHistory && "fa-spin")} /> Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingHistory ? (
              <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
                <i className="fa-solid fa-spinner fa-spin text-primary" /> Loading audit trail...
              </div>
            ) : historyLogs.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground space-y-1">
                <i className="fa-solid fa-box-open text-2xl opacity-40" />
                <p>No recent backup, export, or restore activities recorded yet.</p>
              </div>
            ) : (
              <div className="border border-border rounded-xl overflow-hidden overflow-x-auto">
                <table className="w-full text-xs min-w-[640px]">
                  <thead className="bg-muted text-muted-foreground font-semibold border-b border-border">
                    <tr>
                      <th className="p-2.5 text-left">Action</th>
                      <th className="p-2.5 text-left">Target / Details</th>
                      <th className="p-2.5 text-left">Executed By</th>
                      <th className="p-2.5 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {historyLogs.map((log) => (
                      <tr key={log._id} className="hover:bg-muted/30">
                        <td className="p-2.5">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] font-bold py-0.5 px-2",
                              log.action === "BACKUP_EXPORT"
                                ? "border-teal-500/40 text-teal-600 dark:text-teal-400 bg-teal-500/10"
                                : log.action === "BACKUP_RESTORE"
                                ? "border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10"
                                : "border-indigo-500/40 text-indigo-600 dark:text-indigo-400 bg-indigo-500/10"
                            )}
                          >
                            <i
                              className={cn(
                                "mr-1 text-[9px]",
                                log.action === "BACKUP_EXPORT"
                                  ? "fa-solid fa-download"
                                  : log.action === "BACKUP_RESTORE"
                                  ? "fa-solid fa-rotate-left"
                                  : "fa-solid fa-file-import"
                              )}
                            />
                            {log.action}
                          </Badge>
                        </td>
                        <td className="p-2.5 font-medium text-foreground">
                          {log.targetName || log.targetType || "System Snapshot"}
                        </td>
                        <td className="p-2.5 text-muted-foreground">
                          {log.actorName} <span className="text-[10px]">({log.actorRole})</span>
                        </td>
                        <td className="p-2.5 text-right font-mono text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── SECURITY CONFIRMATION MODAL ────────────────────────────────────── */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
          onClick={() => setShowConfirmModal(false)}
        >
          <div
            className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <div
                className={cn(
                  "w-11 h-11 rounded-full flex items-center justify-center shrink-0 border",
                  restoreMode === "overwrite"
                    ? "bg-rose-500/15 text-rose-600 border-rose-500/30"
                    : "bg-teal-500/15 text-teal-600 border-teal-500/30"
                )}
              >
                <i
                  className={cn(
                    "text-lg",
                    restoreMode === "overwrite" ? "fa-solid fa-triangle-exclamation" : "fa-solid fa-circle-question"
                  )}
                />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">
                  {restoreMode === "overwrite" ? "Authorize Clean Database Overwrite" : "Confirm Database Merge & Upsert"}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {restoreMode === "overwrite"
                    ? "Warning: Clean overwrite deletes existing records in the selected collections before inserting backup documents. This action is irreversible."
                    : "Merge mode updates existing matching records and inserts new ones. Existing data not in the backup file will remain untouched."}
                </p>
              </div>
            </div>

            {restoreMode === "overwrite" && (
              <div className="space-y-1.5 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                <label className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase">
                  Type RESTORE to confirm:
                </label>
                <Input
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  placeholder="RESTORE"
                  className="h-9 text-xs font-mono border-rose-500/40 bg-background"
                />
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConfirmModal(false)}
                disabled={isRestoring}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                variant={restoreMode === "overwrite" ? "destructive" : "default"}
                size="sm"
                onClick={handleExecuteRestore}
                disabled={
                  isRestoring ||
                  (restoreMode === "overwrite" && confirmInput.trim().toUpperCase() !== "RESTORE")
                }
                className="gap-2 font-semibold cursor-pointer"
              >
                {isRestoring ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin text-xs" /> Restoring Records...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-circle-check text-xs" /> Confirm & Restore
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

