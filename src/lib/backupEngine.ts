import "server-only";
import crypto from "crypto";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";

// Direct imports of all 56 domain models
import { ActivityLog } from "@/models/ActivityLog";
import { Announcement } from "@/models/Announcement";
import { Attendance } from "@/models/Attendance";
import { Availability } from "@/models/Availability";
import { AvailabilityConfirmation } from "@/models/AvailabilityConfirmation";
import { BirthdayWish } from "@/models/BirthdayWish";
import { Channel } from "@/models/Channel";
import { ChatMessage } from "@/models/ChatMessage";
import { ChecklistPreset } from "@/models/ChecklistPreset";
import { Client } from "@/models/Client";
import { ClientContract } from "@/models/ClientContract";
import { CompensationPolicy } from "@/models/CompensationPolicy";
import { Department } from "@/models/Department";
import { DriveFile } from "@/models/DriveFile";
import { EmailVerification } from "@/models/EmailVerification";
import { Event } from "@/models/Event";
import { ExternalTeam } from "@/models/ExternalTeam";
import { FeatureBroadcast } from "@/models/FeatureBroadcast";
import { FinanceExpense } from "@/models/FinanceExpense";
import { FinanceInvoice } from "@/models/FinanceInvoice";
import { Holiday } from "@/models/Holiday";
import { HRAppraisal } from "@/models/HRAppraisal";
import { HRCase } from "@/models/HRCase";
import { HRDocument } from "@/models/HRDocument";
import { HRFnFSettlement } from "@/models/HRFnFSettlement";
import { HRMeeting } from "@/models/HRMeeting";
import { HROnboarding } from "@/models/HROnboarding";
import { HRResourceAllocation } from "@/models/HRResourceAllocation";
import { HRSandbox } from "@/models/HRSandbox";
import { ITAccessEntry } from "@/models/ITAccessEntry";
import { ITDevice } from "@/models/ITDevice";
import { ITDriveLink } from "@/models/ITDriveLink";
import { ITInvoice } from "@/models/ITInvoice";
import { ITSubscription } from "@/models/ITSubscription";
import { Kudos } from "@/models/Kudos";
import { Lead } from "@/models/Lead";
import { LeaveBalance } from "@/models/LeaveBalance";
import { LeaveRequest } from "@/models/LeaveRequest";
import { Notification } from "@/models/Notification";
import { OKR } from "@/models/OKR";
import { OneOnOneMeeting } from "@/models/OneOnOneMeeting";
import { Project } from "@/models/Project";
import { Proposal } from "@/models/Proposal";
import { PulseSurvey } from "@/models/PulseSurvey";
import { RateLimit } from "@/models/RateLimit";
import { Referral } from "@/models/Referral";
import { RolePermission } from "@/models/RolePermission";
import { SalarySlip } from "@/models/SalarySlip";
import { SalesDeal } from "@/models/SalesDeal";
import { Sprint } from "@/models/Sprint";
import { Task } from "@/models/Task";
import { Tenant } from "@/models/Tenant";
import { TenantSubscription } from "@/models/TenantSubscription";
import { TimeEntry } from "@/models/TimeEntry";
import { User } from "@/models/User";
import { Wiki } from "@/models/Wiki";

export interface DomainCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  collections: string[];
}

export const BACKUP_DOMAINS: DomainCategory[] = [
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

export const MODEL_MAP: Record<string, any> = {
  ActivityLog,
  Announcement,
  Attendance,
  Availability,
  AvailabilityConfirmation,
  BirthdayWish,
  Channel,
  ChatMessage,
  ChecklistPreset,
  Client,
  ClientContract,
  CompensationPolicy,
  Department,
  DriveFile,
  EmailVerification,
  Event,
  ExternalTeam,
  FeatureBroadcast,
  FinanceExpense,
  FinanceInvoice,
  Holiday,
  HRAppraisal,
  HRCase,
  HRDocument,
  HRFnFSettlement,
  HRMeeting,
  HROnboarding,
  HRResourceAllocation,
  HRSandbox,
  ITAccessEntry,
  ITDevice,
  ITDriveLink,
  ITInvoice,
  ITSubscription,
  Kudos,
  Lead,
  LeaveBalance,
  LeaveRequest,
  Notification,
  OKR,
  OneOnOneMeeting,
  Project,
  Proposal,
  PulseSurvey,
  RateLimit,
  Referral,
  RolePermission,
  SalarySlip,
  SalesDeal,
  Sprint,
  Task,
  Tenant,
  TenantSubscription,
  TimeEntry,
  User,
  Wiki,
};

export interface BackupManifest {
  format: "nimo-database-backup" | "nimo-database-backup";
  version: "1.0";
  exportedAt: string;
  environment: string;
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  exportedBy: {
    userId: string;
    userName: string;
    userRole: string;
  };
  isSanitized: boolean;
  checksum: string;
  totalCollections: number;
  totalRecords: number;
  collectionSummary: Record<string, number>;
}

export interface BackupPackage {
  manifest: BackupManifest;
  data: Record<string, any[]>;
}

/**
 * Generates an SHA-256 hash string for payload integrity verification
 */
export function computeChecksum(payload: string): string {
  return "sha256:" + crypto.createHash("sha256").update(payload, "utf8").digest("hex");
}

/**
 * Sanitizes sensitive employee & payment information (for demo/staging data dumps)
 */
function sanitizeRecord(collectionName: string, doc: Record<string, any>): Record<string, any> {
  const clone = { ...doc };
  if (collectionName === "User") {
    clone.passwordHash = "$2a$10$e8wVqF3sW35qA94o959q.OqXyE1uE1W.k3o3l6W1fW8G7A5J8sFqm"; // dummy hash of 'Password123!'
    if (clone.bankDetails) {
      clone.bankDetails = {
        bankName: clone.bankDetails.bankName || "HDFC Bank (Masked)",
        accountNo: clone.bankDetails.accountNo ? `****${String(clone.bankDetails.accountNo).slice(-4)}` : "****0000",
        ifscCode: "HDFC0000001",
        upiId: "user@okhdfcbank",
      };
    }
    delete clone.deviceTokens;
    delete clone.loginHistory;
  }
  if (collectionName === "FinanceInvoice" || collectionName === "ITInvoice") {
    if (clone.bankDetails && clone.bankDetails.accountNo) {
      clone.bankDetails.accountNo = `****${String(clone.bankDetails.accountNo).slice(-4)}`;
    }
  }
  return clone;
}

/**
 * Exports data for a tenant across requested collections
 */
export async function exportTenantBackup(
  tenantObjectId: mongoose.Types.ObjectId,
  session: { userId: string; userName: string; role: string; tenantName: string; tenantId: string },
  selectedCollections: string[] = ["all"],
  options: { sanitize?: boolean } = {}
): Promise<BackupPackage> {
  await connectToDatabase();

  const tenant = await Tenant.findById(tenantObjectId).lean();
  const tenantSlug = tenant?.slug || "workspace";
  const tenantName = tenant?.name || session.tenantName || "NIMO Workspace";

  const allCollectionNames = Object.keys(MODEL_MAP).filter((c) => c !== "RateLimit" && c !== "EmailVerification");
  const targetCollections =
    selectedCollections.includes("all")
      ? allCollectionNames
      : selectedCollections.filter((c) => allCollectionNames.includes(c));

  const dataPayload: Record<string, any[]> = {};
  const collectionSummary: Record<string, number> = {};
  let totalRecords = 0;

  for (const colName of targetCollections) {
    const Model = MODEL_MAP[colName];
    if (!Model) continue;

    let records: any[] = [];
    if (colName === "Tenant") {
      const tDoc = await Tenant.findById(tenantObjectId).lean();
      if (tDoc) records = [tDoc];
    } else {
      // Query collection filtered strictly by tenantId
      records = await Model.find({ tenantId: tenantObjectId }).lean();
    }

    if (options.sanitize) {
      records = records.map((r) => sanitizeRecord(colName, r));
    }

    dataPayload[colName] = records;
    collectionSummary[colName] = records.length;
    totalRecords += records.length;
  }

  const rawDataString = JSON.stringify(dataPayload);
  const checksum = computeChecksum(rawDataString);

  const manifest: BackupManifest = {
    format: "nimo-database-backup",
    version: "1.0",
    exportedAt: new Date().toISOString(),
    environment: process.env.NODE_ENV || "production",
    tenantId: tenantObjectId.toString(),
    tenantSlug,
    tenantName,
    exportedBy: {
      userId: session.userId,
      userName: session.userName,
      userRole: session.role,
    },
    isSanitized: Boolean(options.sanitize),
    checksum,
    totalCollections: Object.keys(dataPayload).length,
    totalRecords,
    collectionSummary,
  };

  // Record export event in immutable ActivityLog
  try {
    await ActivityLog.create({
      tenantId: tenantObjectId,
      actorId: new mongoose.Types.ObjectId(session.userId),
      actorName: session.userName,
      actorRole: session.role,
      action: "BACKUP_EXPORT",
      verb: "EXPORT",
      targetType: "WorkspaceBackup",
      targetName: `${tenantSlug}_backup.nexace.json`,
      metadata: {
        totalCollections: manifest.totalCollections,
        totalRecords: manifest.totalRecords,
        isSanitized: manifest.isSanitized,
      },
    });
  } catch (err) {
    console.warn("Failed to write ActivityLog for backup export:", err);
  }

  return {
    manifest,
    data: dataPayload,
  };
}

/**
 * Inspects a backup file before committing restore
 */
export async function inspectBackupPackage(
  backupPackage: any,
  currentTargetTenantId: mongoose.Types.ObjectId
): Promise<{
  isValid: boolean;
  errors: string[];
  manifest: BackupManifest | null;
  comparison: Array<{
    collection: string;
    backupCount: number;
    currentCount: number;
  }>;
}> {
  await connectToDatabase();
  const errors: string[] = [];

  if (!backupPackage || typeof backupPackage !== "object") {
    return { isValid: false, errors: ["Invalid backup file: Not a valid JSON object."], manifest: null, comparison: [] };
  }

  const manifest = backupPackage.manifest as BackupManifest;
  if (!manifest || (manifest.format !== "nimo-database-backup" && manifest.format !== "nimo-database-backup")) {
    errors.push("Invalid file format: Missing 'nimo-database-backup' manifest header.");
  }

  const data = backupPackage.data;
  if (!data || typeof data !== "object") {
    errors.push("Invalid backup file: Data payload is missing or empty.");
  }

  if (errors.length > 0) {
    return { isValid: false, errors, manifest: null, comparison: [] };
  }

  // Checksum verification
  const computedHash = computeChecksum(JSON.stringify(data));
  if (manifest.checksum && manifest.checksum !== computedHash) {
    errors.push("Integrity Warning: The backup file SHA-256 checksum does not match its payload (possible file corruption).");
  }

  // Build comparison stats
  const comparison: Array<{ collection: string; backupCount: number; currentCount: number }> = [];
  for (const colName of Object.keys(data)) {
    const Model = MODEL_MAP[colName];
    if (!Model) continue;

    const backupCount = Array.isArray(data[colName]) ? data[colName].length : 0;
    let currentCount = 0;
    try {
      if (colName === "Tenant") {
        currentCount = 1;
      } else {
        currentCount = await Model.countDocuments({ tenantId: currentTargetTenantId });
      }
    } catch {
      currentCount = 0;
    }

    comparison.push({
      collection: colName,
      backupCount,
      currentCount,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    manifest,
    comparison,
  };
}

/**
 * Restores tenant data from an inspected backup package
 */
export async function restoreTenantBackup(
  targetTenantId: mongoose.Types.ObjectId,
  backupPackage: BackupPackage,
  session: { userId: string; userName: string; role: string },
  options: {
    mode: "merge" | "overwrite";
    selectedCollections?: string[];
  }
): Promise<{
  success: boolean;
  restoredSummary: Record<string, number>;
  errors: string[];
}> {
  await connectToDatabase();
  const errors: string[] = [];
  const restoredSummary: Record<string, number> = {};

  const { data, manifest } = backupPackage;
  if (!data) {
    return { success: false, restoredSummary: {}, errors: ["No data found in backup package."] };
  }

  const collectionsToRestore =
    options.selectedCollections && options.selectedCollections.length > 0 && !options.selectedCollections.includes("all")
      ? options.selectedCollections
      : Object.keys(data);

  for (const colName of collectionsToRestore) {
    const Model = MODEL_MAP[colName];
    const docs = data[colName];
    if (!Model || !Array.isArray(docs) || docs.length === 0) continue;

    try {
      if (colName === "Tenant") {
        // Safe update of tenant metadata (exclude overriding id or slug)
        const tDoc = docs[0];
        if (tDoc) {
          const { _id, slug, ...safeFields } = tDoc;
          await Tenant.findByIdAndUpdate(targetTenantId, { $set: safeFields });
          restoredSummary[colName] = 1;
        }
        continue;
      }

      // Strict tenant stamping: EVERY record restored must be pinned to the target tenant!
      const stampedDocs = docs.map((doc: any) => {
        const stamped = { ...doc };
        stamped.tenantId = targetTenantId;
        // Ensure _id is valid ObjectId if present
        if (stamped._id && typeof stamped._id === "string") {
          try {
            stamped._id = new mongoose.Types.ObjectId(stamped._id);
          } catch {}
        }
        return stamped;
      });

      if (options.mode === "overwrite") {
        // Wipes existing tenant records for this collection, then re-inserts
        // Safeguard: Never delete current admin user from User collection during overwrite!
        if (colName === "User") {
          await User.deleteMany({
            tenantId: targetTenantId,
            _id: { $ne: new mongoose.Types.ObjectId(session.userId) },
          });
        } else {
          await Model.deleteMany({ tenantId: targetTenantId });
        }

        // Batch insert in chunks of 500
        const CHUNK_SIZE = 500;
        let count = 0;
        for (let i = 0; i < stampedDocs.length; i += CHUNK_SIZE) {
          const chunk = stampedDocs.slice(i, i + CHUNK_SIZE);
          try {
            const res = await Model.insertMany(chunk, { ordered: false });
            count += res.length;
          } catch (insertErr: any) {
            // Partial insert if duplicates
            if (insertErr.insertedDocs) {
              count += insertErr.insertedDocs.length;
            } else {
              throw insertErr;
            }
          }
        }
        restoredSummary[colName] = count;
      } else {
        // "merge" mode: Bulk upsert by _id or unique matching
        const bulkOps = stampedDocs.map((doc: any) => ({
          updateOne: {
            filter: { _id: doc._id, tenantId: targetTenantId },
            update: { $set: doc },
            upsert: true,
          },
        }));

        const CHUNK_SIZE = 500;
        let count = 0;
        for (let i = 0; i < bulkOps.length; i += CHUNK_SIZE) {
          const chunk = bulkOps.slice(i, i + CHUNK_SIZE);
          const res = await Model.bulkWrite(chunk, { ordered: false });
          count += (res.upsertedCount || 0) + (res.modifiedCount || 0) + (res.matchedCount || 0);
        }
        restoredSummary[colName] = count;
      }
    } catch (colErr: any) {
      console.error(`Error restoring collection ${colName}:`, colErr);
      errors.push(`Failed restoring ${colName}: ${colErr.message || "Unknown error"}`);
    }
  }

  // Record restore action in immutable ActivityLog
  try {
    await ActivityLog.create({
      tenantId: targetTenantId,
      actorId: new mongoose.Types.ObjectId(session.userId),
      actorName: session.userName,
      actorRole: session.role,
      action: "BACKUP_RESTORE",
      verb: "RESTORE",
      targetType: "WorkspaceBackup",
      targetName: manifest?.tenantSlug || "database_archive",
      metadata: {
        mode: options.mode,
        collectionsRestored: Object.keys(restoredSummary),
        recordCounts: restoredSummary,
        sourceExportDate: manifest?.exportedAt,
      },
    });
  } catch (err) {
    console.warn("Failed to write ActivityLog for backup restore:", err);
  }

  return {
    success: errors.length === 0,
    restoredSummary,
    errors,
  };
}

/**
 * Universal CSV Serializer
 * Flattens nested fields (e.g. bankDetails.bankName) into comma-separated rows
 */
export function convertRecordsToCsv(records: any[]): string {
  if (!records || records.length === 0) return "";

  // Flatten nested objects
  const flattenObject = (obj: any, prefix = ""): Record<string, any> => {
    return Object.keys(obj || {}).reduce((acc: any, k) => {
      const pre = prefix.length ? prefix + "." : "";
      if (
        typeof obj[k] === "object" &&
        obj[k] !== null &&
        !(obj[k] instanceof Date) &&
        !Array.isArray(obj[k])
      ) {
        Object.assign(acc, flattenObject(obj[k], pre + k));
      } else if (Array.isArray(obj[k])) {
        acc[pre + k] = obj[k].map((item: any) => (typeof item === "object" ? JSON.stringify(item) : String(item))).join("; ");
      } else {
        acc[pre + k] = obj[k];
      }
      return acc;
    }, {});
  };

  const flatRecords = records.map((r) => flattenObject(r));
  const headers = Array.from(new Set(flatRecords.flatMap((r) => Object.keys(r))));

  const escapeCsv = (val: any) => {
    if (val === null || val === undefined) return "";
    let str = typeof val === "object" ? JSON.stringify(val) : String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      str = `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvRows = [headers.join(",")];
  for (const r of flatRecords) {
    const row = headers.map((h) => escapeCsv(r[h]));
    csvRows.push(row.join(","));
  }

  return csvRows.join("\r\n");
}

/**
 * Universal CSV / Tabular Parser
 */
export function parseCsvToRecords(csvText: string): Array<Record<string, string>> {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(cur.trim());
        cur = "";
      } else {
        cur += char;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const headers = parseRow(lines[0]);
  const rows: Array<Record<string, string>> = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseRow(lines[i]);
    const obj: Record<string, string> = {};
    for (let h = 0; h < headers.length; h++) {
      obj[headers[h]] = cols[h] || "";
    }
    rows.push(obj);
  }

  return rows;
}

