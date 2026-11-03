import { NextResponse } from "next/server";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";
import { MODEL_MAP } from "@/lib/backupEngine";
import { connectToDatabase } from "@/lib/db";
import { ActivityLog } from "@/models/ActivityLog";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

/**
 * Intelligent key normalizer for CSV/Excel header synonyms
 */
function normalizeRow(row: Record<string, any>, targetModel: string): Record<string, any> {
  const norm: Record<string, any> = {};
  const lowerMap: Record<string, any> = {};

  for (const [k, v] of Object.entries(row)) {
    const cleanKey = k.trim().toLowerCase().replace(/[\s_-]+/g, "");
    lowerMap[cleanKey] = v;
  }

  const getVal = (...keys: string[]) => {
    for (const key of keys) {
      const clean = key.toLowerCase().replace(/[\s_-]+/g, "");
      if (lowerMap[clean] !== undefined && lowerMap[clean] !== "") {
        return lowerMap[clean];
      }
    }
    return undefined;
  };

  if (targetModel === "User") {
    norm.name = getVal("name", "fullname", "employeename", "user");
    norm.email = getVal("email", "workemail", "emailaddress");
    norm.role = getVal("role", "designation", "userrole") || "Employee";
    norm.department = getVal("department", "dept");
    norm.phone = getVal("phone", "phonenumber", "mobile");
    norm.salary = Number(getVal("salary", "ctc", "monthlysalary")) || 0;
    norm.shiftName = getVal("shift", "shiftname") || "Standard Day Shift";
    norm.status = getVal("status", "accountstatus") || "Active";
  } else if (targetModel === "Lead") {
    norm.name = getVal("name", "contactname", "leadname");
    norm.email = getVal("email", "contactemail");
    norm.phone = getVal("phone", "mobile");
    norm.company = getVal("company", "organization", "account");
    norm.status = getVal("status", "leadstatus") || "New";
    norm.source = getVal("source", "leadsource") || "Import";
    norm.value = Number(getVal("value", "leadvalue", "dealvalue")) || 0;
    norm.notes = getVal("notes", "remark", "description");
  } else if (targetModel === "Client") {
    norm.name = getVal("name", "clientname", "company", "accountname");
    norm.email = getVal("email", "billingemail", "contactemail");
    norm.phone = getVal("phone", "contactphone");
    norm.status = getVal("status", "clientstatus") || "Active";
    norm.industry = getVal("industry", "sector") || "Technology";
    norm.retainerHours = Number(getVal("retainerhours", "hours")) || 0;
  } else if (targetModel === "Task") {
    norm.title = getVal("title", "taskname", "name", "subject");
    norm.description = getVal("description", "details", "notes") || "";
    norm.priority = getVal("priority", "urgency") || "Medium";
    norm.status = getVal("status", "stage") || "To Do";
    norm.dueDate = getVal("duedate", "deadline") ? new Date(getVal("duedate", "deadline")) : undefined;
  } else if (targetModel === "Holiday") {
    norm.title = getVal("title", "holidayname", "name");
    norm.date = getVal("date", "holidaydate") ? new Date(getVal("date", "holidaydate")) : new Date();
    norm.type = getVal("type", "holidaytype") || "Mandatory";
    norm.category = getVal("category") || "National";
    norm.description = getVal("description") || "";
  } else if (targetModel === "ITDevice") {
    norm.assetTag = getVal("assettag", "tag", "assetid") || `ASSET-${Date.now().toString().slice(-6)}`;
    norm.name = getVal("name", "devicename", "model");
    norm.type = getVal("type", "devicetype") || "Laptop";
    norm.serialNumber = getVal("serialnumber", "serial", "imei") || "";
    norm.condition = getVal("condition") || "Good";
    norm.assignedToName = getVal("assignedto", "employee", "user");
  } else {
    // Generic copy
    Object.assign(norm, row);
  }

  return norm;
}

export async function POST(request: Request) {
  try {
    const authResult = await requireTenantSession(["Admin", "OPS", "HR"]);
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, session } = authResult;

    const body = await request.json();
    const { collection = "User", rows = [] } = body;

    const Model = MODEL_MAP[collection];
    if (!Model) {
      return NextResponse.json({ error: `Unsupported collection '${collection}' for tabular import` }, { status: 400 });
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No data rows provided for import." }, { status: 400 });
    }

    await connectToDatabase();

    const preparedDocs: any[] = [];
    const errors: string[] = [];
    const defaultPasswordHash = await bcrypt.hash("Password123!", 10);

    for (let i = 0; i < rows.length; i++) {
      const rawRow = rows[i];
      const normalized = normalizeRow(rawRow, collection);
      normalized.tenantId = tenantObjectId;

      // Collection-specific validations
      if (collection === "User") {
        if (!normalized.name || !normalized.email) {
          errors.push(`Row #${i + 1}: Skipped (Missing required 'name' or 'email')`);
          continue;
        }
        normalized.email = normalized.email.toLowerCase().trim();
        normalized.passwordHash = defaultPasswordHash;
      } else if (collection === "Lead") {
        if (!normalized.name && !normalized.company) {
          errors.push(`Row #${i + 1}: Skipped (Lead requires either a name or company)`);
          continue;
        }
      } else if (collection === "Client") {
        if (!normalized.name) {
          errors.push(`Row #${i + 1}: Skipped (Client requires 'name')`);
          continue;
        }
      } else if (collection === "Task") {
        if (!normalized.title) {
          errors.push(`Row #${i + 1}: Skipped (Task requires 'title')`);
          continue;
        }
      } else if (collection === "Holiday") {
        if (!normalized.title || !normalized.date) {
          errors.push(`Row #${i + 1}: Skipped (Holiday requires 'title' and 'date')`);
          continue;
        }
      }

      preparedDocs.push(normalized);
    }

    if (preparedDocs.length === 0) {
      return NextResponse.json(
        {
          success: false,
          importedCount: 0,
          errors: errors.length > 0 ? errors : ["No valid rows found to import."],
        },
        { status: 400 }
      );
    }

    // Bulk upsert / insert
    let successCount = 0;
    try {
      if (collection === "User") {
        const bulkOps = preparedDocs.map((doc) => ({
          updateOne: {
            filter: { email: doc.email, tenantId: tenantObjectId },
            update: { $set: doc },
            upsert: true,
          },
        }));
        const res = await Model.bulkWrite(bulkOps, { ordered: false });
        successCount = (res.upsertedCount || 0) + (res.modifiedCount || 0) + (res.matchedCount || 0);
      } else {
        const res = await Model.insertMany(preparedDocs, { ordered: false });
        successCount = res.length;
      }
    } catch (insertErr: any) {
      if (insertErr.insertedDocs) {
        successCount = insertErr.insertedDocs.length;
      } else if (insertErr.writeErrors) {
        errors.push(...insertErr.writeErrors.map((we: any) => we.errmsg || "Write error"));
      }
    }

    // Write audit log
    try {
      await ActivityLog.create({
        tenantId: tenantObjectId,
        actorId: new mongoose.Types.ObjectId(session.userId),
        actorName: session.userName,
        actorRole: session.role,
        action: "TABULAR_IMPORT",
        verb: "IMPORT",
        targetType: collection,
        targetName: `Batch Import (${successCount} records)`,
        metadata: {
          collection,
          totalRows: rows.length,
          successCount,
          skippedErrors: errors.slice(0, 10),
        },
      });
    } catch (logErr) {
      console.warn("Failed to write ActivityLog for tabular import:", logErr);
    }

    return NextResponse.json({
      success: true,
      importedCount: successCount,
      totalRows: rows.length,
      errors,
    });
  } catch (err: any) {
    console.error("Tabular import error:", err);
    return NextResponse.json({ error: err.message || "Failed to process tabular import" }, { status: 500 });
  }
}

