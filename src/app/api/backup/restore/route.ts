import { NextResponse } from "next/server";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";
import { inspectBackupPackage, restoreTenantBackup, BackupPackage } from "@/lib/backupEngine";

export async function POST(request: Request) {
  try {
    // Strictly restricted to Workspace Admin
    const authResult = await requireTenantSession(["Admin"]);
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, session } = authResult;

    const body = await request.json();
    const { action = "inspect", backupPackage, mode = "merge", selectedCollections = ["all"], confirmation = "" } = body;

    if (!backupPackage || typeof backupPackage !== "object") {
      return NextResponse.json({ error: "Missing or invalid backupPackage payload." }, { status: 400 });
    }

    if (action === "inspect") {
      const inspectionResult = await inspectBackupPackage(backupPackage, tenantObjectId);
      return NextResponse.json({
        success: inspectionResult.isValid,
        errors: inspectionResult.errors,
        manifest: inspectionResult.manifest,
        comparison: inspectionResult.comparison,
      });
    }

    if (action === "restore") {
      // Security guard: If overwrite mode is requested, mandatory confirmation text check
      if (mode === "overwrite" && confirmation.trim().toUpperCase() !== "RESTORE") {
        return NextResponse.json(
          {
            error: "Security Confirmation Required: You must type 'RESTORE' in all caps to authorize overwriting workspace data.",
          },
          { status: 400 }
        );
      }

      const restoreResult = await restoreTenantBackup(
        tenantObjectId,
        backupPackage as BackupPackage,
        session,
        {
          mode,
          selectedCollections,
        }
      );

      return NextResponse.json({
        success: restoreResult.success,
        restoredSummary: restoreResult.restoredSummary,
        errors: restoreResult.errors,
      });
    }

    return NextResponse.json({ error: `Unsupported action '${action}'` }, { status: 400 });
  } catch (err: any) {
    console.error("Backup restore error:", err);
    return NextResponse.json({ error: err.message || "Failed to process backup restore" }, { status: 500 });
  }
}

