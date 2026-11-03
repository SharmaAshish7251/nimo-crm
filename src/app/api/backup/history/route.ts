import { NextResponse } from "next/server";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";
import { connectToDatabase } from "@/lib/db";
import { ActivityLog } from "@/models/ActivityLog";

export async function GET(request: Request) {
  try {
    const authResult = await requireTenantSession(["Admin", "OPS", "Sub Admin"]);
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId } = authResult;

    await connectToDatabase();

    const logs = await ActivityLog.find({
      tenantId: tenantObjectId,
      action: { $in: ["BACKUP_EXPORT", "BACKUP_RESTORE", "TABULAR_IMPORT"] },
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({
      success: true,
      logs,
    });
  } catch (err: any) {
    console.error("Backup history fetch error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch backup history" }, { status: 500 });
  }
}

