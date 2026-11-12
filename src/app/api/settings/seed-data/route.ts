import { NextResponse } from "next/server";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";
import { connectToDatabase } from "@/lib/db";
import { seedWorkspaceDummyData } from "@/lib/dummyDataSeeder";
import { Department } from "@/models/Department";
import { User } from "@/models/User";
import { Project } from "@/models/Project";
import { Task } from "@/models/Task";
import { Lead } from "@/models/Lead";
import { SalesDeal } from "@/models/SalesDeal";
import { FinanceInvoice } from "@/models/FinanceInvoice";
import { ITDevice } from "@/models/ITDevice";
import { Channel } from "@/models/Channel";
import { Wiki } from "@/models/Wiki";

export async function GET() {
  try {
    const authResult = await requireTenantSession(["Admin"]);
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId } = authResult;

    await connectToDatabase();

    // Fetch live summary counts to show admin what is currently in their workspace
    const [
      departments,
      users,
      projects,
      tasks,
      leads,
      deals,
      invoices,
      devices,
      channels,
      wikis,
    ] = await Promise.all([
      Department.countDocuments({ tenantId: tenantObjectId }),
      User.countDocuments({ tenantId: tenantObjectId }),
      Project.countDocuments({ tenantId: tenantObjectId }),
      Task.countDocuments({ tenantId: tenantObjectId }),
      Lead.countDocuments({ tenantId: tenantObjectId }),
      SalesDeal.countDocuments({ tenantId: tenantObjectId }),
      FinanceInvoice.countDocuments({ tenantId: tenantObjectId }),
      ITDevice.countDocuments({ tenantId: tenantObjectId }),
      Channel.countDocuments({ tenantId: tenantObjectId }),
      Wiki.countDocuments({ tenantId: tenantObjectId }),
    ]);

    return NextResponse.json({
      success: true,
      counts: {
        departments,
        users,
        projects,
        tasks,
        leads,
        deals,
        invoices,
        devices,
        channels,
        wikis,
      },
    });
  } catch (err: any) {
    console.error("Seed data status query error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch seed status" }, { status: 500 });
  }
}

export async function POST() {
  try {
    const authResult = await requireTenantSession(["Admin"]);
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, session } = authResult;

    const summary = await seedWorkspaceDummyData(tenantObjectId, session);

    return NextResponse.json({
      success: true,
      summary,
      message: `Successfully populated workspace with ${summary.totalRecords} showcase dummy records across all functional CRM features!`,
    });
  } catch (err: any) {
    console.error("Workspace dummy data seeding error:", err);
    return NextResponse.json({ error: err.message || "Failed to populate dummy data" }, { status: 500 });
  }
}
