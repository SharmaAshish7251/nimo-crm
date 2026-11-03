import { NextResponse } from "next/server";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";
import { exportTenantBackup, convertRecordsToCsv, MODEL_MAP } from "@/lib/backupEngine";
import { connectToDatabase } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const authResult = await requireTenantSession(["Admin", "OPS", "Sub Admin"]);
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, session } = authResult;

    const { searchParams } = new URL(request.url);
    const format = (searchParams.get("format") || "json").toLowerCase();
    const sanitize = searchParams.get("sanitize") === "true";
    const collectionsParam = searchParams.get("collections") || "all";
    const collections = collectionsParam === "all" ? ["all"] : collectionsParam.split(",").map((c) => c.trim());

    if (format === "csv") {
      const colName = searchParams.get("collection") || "User";
      const Model = MODEL_MAP[colName];
      if (!Model) {
        return NextResponse.json({ error: `Unknown collection '${colName}' for CSV export` }, { status: 400 });
      }

      await connectToDatabase();
      let records: any[] = [];
      if (colName === "Tenant") {
        const { Tenant } = await import("@/models/Tenant");
        const tDoc = await Tenant.findById(tenantObjectId).lean();
        if (tDoc) records = [tDoc];
      } else {
        records = await Model.find({ tenantId: tenantObjectId }).lean();
      }

      const csvContent = convertRecordsToCsv(records);
      const filename = `nexace_${colName.toLowerCase()}_${Date.now()}.csv`;

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // Default: JSON Full / Selective Workspace Backup Package
    const backupPackage = await exportTenantBackup(tenantObjectId, session, collections, { sanitize });
    const filename = `nexace_backup_${backupPackage.manifest.tenantSlug}_${new Date().toISOString().replace(/[:.]/g, "-")}.nexace.json`;

    return new NextResponse(JSON.stringify(backupPackage, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    console.error("Backup export error:", err);
    return NextResponse.json({ error: err.message || "Failed to generate backup export" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireTenantSession(["Admin", "OPS", "Sub Admin"]);
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, session } = authResult;

    const body = await request.json();
    const { collections = ["all"], sanitize = false, format = "json" } = body;

    const backupPackage = await exportTenantBackup(tenantObjectId, session, collections, { sanitize });

    return NextResponse.json({
      success: true,
      manifest: backupPackage.manifest,
      data: backupPackage.data,
    });
  } catch (err: any) {
    console.error("Backup export error:", err);
    return NextResponse.json({ error: err.message || "Failed to generate backup export" }, { status: 500 });
  }
}

