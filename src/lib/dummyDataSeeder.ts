import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db";
import { Department } from "@/models/Department";
import { RolePermission } from "@/models/RolePermission";
import { User } from "@/models/User";
import { Project } from "@/models/Project";
import { Sprint } from "@/models/Sprint";
import { Task } from "@/models/Task";
import { Attendance } from "@/models/Attendance";
import { TimeEntry } from "@/models/TimeEntry";
import { Lead } from "@/models/Lead";
import { SalesDeal } from "@/models/SalesDeal";
import { Proposal } from "@/models/Proposal";
import { Referral } from "@/models/Referral";
import { LeaveBalance } from "@/models/LeaveBalance";
import { LeaveRequest } from "@/models/LeaveRequest";
import { Holiday } from "@/models/Holiday";
import { ChecklistPreset } from "@/models/ChecklistPreset";
import { SalarySlip } from "@/models/SalarySlip";
import { Client } from "@/models/Client";
import { FinanceInvoice } from "@/models/FinanceInvoice";
import { FinanceExpense } from "@/models/FinanceExpense";
import { ITDevice } from "@/models/ITDevice";
import { ITAccessEntry } from "@/models/ITAccessEntry";
import { ITSubscription } from "@/models/ITSubscription";
import { ITDriveLink } from "@/models/ITDriveLink";
import { Channel } from "@/models/Channel";
import { ChatMessage } from "@/models/ChatMessage";
import { Announcement } from "@/models/Announcement";
import { BirthdayWish } from "@/models/BirthdayWish";
import { Kudos } from "@/models/Kudos";
import { OneOnOneMeeting } from "@/models/OneOnOneMeeting";
import { PulseSurvey } from "@/models/PulseSurvey";
import { Wiki } from "@/models/Wiki";
import { ActivityLog } from "@/models/ActivityLog";

export interface SeedSummary {
  departments: number;
  rolePermissions: number;
  users: number;
  projects: number;
  sprints: number;
  tasks: number;
  attendance: number;
  timeEntries: number;
  leads: number;
  deals: number;
  proposals: number;
  referrals: number;
  leaveBalances: number;
  leaveRequests: number;
  holidays: number;
  checklists: number;
  salarySlips: number;
  clients: number;
  invoices: number;
  expenses: number;
  devices: number;
  itAccess: number;
  subscriptions: number;
  driveLinks: number;
  channels: number;
  chatMessages: number;
  announcements: number;
  kudos: number;
  birthdayWishes: number;
  oneOnOneMeetings: number;
  pulseSurveys: number;
  wikis: number;
  totalRecords: number;
}

export async function seedWorkspaceDummyData(
  tenantObjectId: mongoose.Types.ObjectId,
  session: { userId: string; userName: string; role: string; tenantName?: string }
): Promise<SeedSummary> {
  await connectToDatabase();

  const adminObjectId = new mongoose.Types.ObjectId(session.userId);
  const now = new Date();
  const summary: Record<string, number> = {};

  // 1. DEPARTMENTS
  const deptDefs = [
    { name: "Engineering", code: "ENG", description: "Product development, architecture, infrastructure & QA" },
    { name: "Product & Design", code: "DES", description: "UI/UX design, design system, user research & wireframing" },
    { name: "Sales & BD", code: "SBD", description: "Inbound leads, client partnerships, and deal closings" },
    { name: "Operations", code: "OPS", description: "Infrastructure compliance, vendor management & IT systems" },
    { name: "Human Resources", code: "HR", description: "Talent acquisition, employee welfare, appraisals & onboarding" },
    { name: "Finance", code: "FIN", description: "Client invoicing, expense auditing, and financial planning" },
  ];

  let deptCount = 0;
  for (const d of deptDefs) {
    const existing = await Department.findOne({ tenantId: tenantObjectId, name: d.name });
    if (!existing) {
      await Department.create({ ...d, tenantId: tenantObjectId });
      deptCount++;
    }
  }
  summary.departments = deptCount;

  // 2. ROLE PERMISSIONS
  const roleDefs = [
    { role: "Admin", code: "ADMIN", description: "Full workspace administrative authority" },
    { role: "OPS", code: "OPS", description: "Operations, client contracts, and system management" },
    { role: "HR", code: "HR", description: "People operations, employee records, and appraisals" },
    { role: "Employee", code: "EMP", description: "Standard employee self-service access" },
  ];

  let roleCount = 0;
  for (const r of roleDefs) {
    const existing = await RolePermission.findOne({ tenantId: tenantObjectId, role: r.role });
    if (!existing) {
      await RolePermission.create({ ...r, tenantId: tenantObjectId });
      roleCount++;
    }
  }
  summary.rolePermissions = roleCount;

  // 3. TEAM MEMBERS / EMPLOYEES
  const defaultPasswordHash = await bcrypt.hash("Password@123", 10);
  const sampleUsers = [
    {
      name: "Sarah Jenkins",
      email: "sarah.jenkins@nimo-demo.com",
      role: "Manager",
      department: "Engineering",
      phone: "+1-555-0142",
      bio: "Engineering Lead & Systems Architect. Passionate about scalable microservices.",
      skills: ["React", "Next.js", "Node.js", "TypeScript", "System Architecture", "PostgreSQL"],
      photoUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face",
    },
    {
      name: "Marcus Vance",
      email: "marcus.vance@nimo-demo.com",
      role: "Employee",
      department: "Product & Design",
      phone: "+1-555-0178",
      bio: "Senior Product Designer focusing on multi-platform SaaS interfaces and design tokens.",
      skills: ["Figma", "UI/UX", "Design Systems", "Prototyping", "User Research", "TailwindCSS"],
      photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    },
    {
      name: "Priya Sharma",
      email: "priya.sharma@nimo-demo.com",
      role: "HR",
      department: "Human Resources",
      phone: "+1-555-0199",
      bio: "Head of People & Culture. Dedicated to building inclusive and high-performance teams.",
      skills: ["Talent Acquisition", "People Ops", "Performance Coaching", "Employee Relations"],
      photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face",
    },
    {
      name: "David Kim",
      email: "david.kim@nimo-demo.com",
      role: "OPS",
      department: "Operations",
      phone: "+1-555-0164",
      bio: "DevOps & Cloud Reliability Engineer. Kubernetes, AWS infra, and automated CI/CD.",
      skills: ["Kubernetes", "AWS", "Terraform", "Docker", "CI/CD", "Security Compliance"],
      photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
    },
    {
      name: "Aisha Al-Mansoor",
      email: "aisha.mansoor@nimo-demo.com",
      role: "Employee",
      department: "Sales & BD",
      phone: "+1-555-0185",
      bio: "Enterprise Account Executive managing Fortune 500 tech partnerships and retainers.",
      skills: ["Enterprise Sales", "B2B Negotiations", "CRM Pipeline", "Contract Structuring"],
      photoUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop&crop=face",
    },
    {
      name: "Michael Chen",
      email: "michael.chen@nimo-demo.com",
      role: "Employee",
      department: "Engineering",
      phone: "+1-555-0121",
      bio: "Full Stack Developer. Building real-time collaboration features and high-throughput APIs.",
      skills: ["TypeScript", "MongoDB", "WebSockets", "GraphQL", "Tailwind CSS"],
      photoUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&h=150&fit=crop&crop=face",
    },
    {
      name: "Elena Rostova",
      email: "elena.rostova@nimo-demo.com",
      role: "Employee",
      department: "Finance",
      phone: "+1-555-0155",
      bio: "Senior Financial Analyst. Corporate cash flow modeling, payroll tax compliance, and auditing.",
      skills: ["Financial Analysis", "QuickBooks", "Tax Compliance", "Invoicing", "Budgeting"],
      photoUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop&crop=face",
    },
  ];

  const createdUserIds: mongoose.Types.ObjectId[] = [adminObjectId];
  let userCount = 0;

  for (const u of sampleUsers) {
    const existing = await User.findOne({ email: u.email });
    if (!existing) {
      const username = u.email.split("@")[0].replace(/[^a-z0-9_.]/g, "");
      const created = await User.create({
        ...u,
        username,
        passwordHash: defaultPasswordHash,
        status: "Active",
        tenantId: tenantObjectId,
        authProvider: "credentials",
      });
      createdUserIds.push(created._id as mongoose.Types.ObjectId);
      userCount++;
    } else {
      createdUserIds.push(existing._id as mongoose.Types.ObjectId);
    }
  }
  summary.users = userCount;

  // 4. CLIENTS
  const sampleClients = [
    {
      projectId: "CLP-101",
      clientAccount: "Nexus Cloud Systems",
      venture: "NIMO Consultancies",
      projectName: "Multi-Region Cloud Architecture Migration",
      deliveryOwner: "David Kim",
      phase: "In Delivery",
      priority: "High",
      startDate: new Date(Date.now() - 30 * 86400000),
      targetEndDate: new Date(Date.now() + 60 * 86400000),
      health: "Green",
      billingType: "Retainer",
      estHours: 320,
      actualHours: 145,
      progressPercent: 48,
      name: "Nexus Cloud Systems",
      company: "Nexus Inc.",
      email: "billing@nexuscloud.io",
      phone: "+1-800-555-0199",
      status: "Active",
      monthlyValue: 18500,
      contactHistory: [],
      tenantId: tenantObjectId,
    },
    {
      projectId: "CLP-102",
      clientAccount: "Apex Global FinTech",
      venture: "NIMO Capital",
      projectName: "Unified Trading & Compliance Web Platform",
      deliveryOwner: "Sarah Jenkins",
      phase: "In Delivery",
      priority: "High",
      startDate: new Date(Date.now() - 45 * 86400000),
      targetEndDate: new Date(Date.now() + 45 * 86400000),
      health: "Green",
      billingType: "Project",
      estHours: 480,
      actualHours: 260,
      progressPercent: 62,
      name: "Apex Global FinTech",
      company: "Apex Global Corp",
      email: "contact@apexfintech.com",
      phone: "+1-800-555-0144",
      status: "Active",
      monthlyValue: 34000,
      contactHistory: [],
      tenantId: tenantObjectId,
    },
    {
      projectId: "CLP-103",
      clientAccount: "Vanguard Logistics Network",
      venture: "NIMO Logistics",
      projectName: "Fleet Telematics & Route Optimization Engine",
      deliveryOwner: "Aisha Al-Mansoor",
      phase: "In Delivery",
      priority: "Medium",
      startDate: new Date(Date.now() - 15 * 86400000),
      targetEndDate: new Date(Date.now() + 90 * 86400000),
      health: "Green",
      billingType: "Retainer",
      estHours: 200,
      actualHours: 65,
      progressPercent: 32,
      name: "Vanguard Logistics Network",
      company: "Vanguard Global",
      email: "support@vanguardlogistics.com",
      phone: "+1-800-555-0122",
      status: "Active",
      monthlyValue: 22000,
      contactHistory: [],
      tenantId: tenantObjectId,
    },
  ];

  let clientCount = 0;
  const createdClientIds: mongoose.Types.ObjectId[] = [];
  for (const c of sampleClients) {
    const existing = await Client.findOne({ tenantId: tenantObjectId, clientAccount: c.clientAccount });
    if (!existing) {
      const created = await Client.create(c);
      createdClientIds.push(created._id as mongoose.Types.ObjectId);
      clientCount++;
    } else {
      createdClientIds.push(existing._id as mongoose.Types.ObjectId);
    }
  }
  summary.clients = clientCount;

  // 5. PROJECTS & SPRINTS
  const sampleProjects = [
    {
      name: "Enterprise Cloud Infrastructure Migration",
      description: "Zero-downtime migration of core databases and API microservices to AWS EKS.",
      status: "In Progress" as const,
      priority: "High" as const,
      startDate: new Date(Date.now() - 25 * 86400000),
      dueDate: new Date(Date.now() + 50 * 86400000),
      cost: 45000,
      isInternal: false,
      members: createdUserIds.slice(0, 4),
      clientId: createdClientIds[0] || undefined,
      clientAccount: "Nexus Cloud Systems",
      tenantId: tenantObjectId,
    },
    {
      name: "NIMO Design System & Mobile App Overhaul",
      description: "Modernizing UI component library with TailwindCSS v4 and Capacitor mobile native plugins.",
      status: "In Progress" as const,
      priority: "Medium" as const,
      startDate: new Date(Date.now() - 15 * 86400000),
      dueDate: new Date(Date.now() + 35 * 86400000),
      cost: 28000,
      isInternal: true,
      members: createdUserIds.slice(1, 5),
      tenantId: tenantObjectId,
    },
    {
      name: "Q4 Enterprise Sales & Revenue Expansion",
      description: "Onboarding new corporate accounts, contract renegotiations, and quotation workflows.",
      status: "In Progress" as const,
      priority: "Urgent" as const,
      startDate: new Date(Date.now() - 10 * 86400000),
      dueDate: new Date(Date.now() + 40 * 86400000),
      cost: 15000,
      isInternal: true,
      members: [createdUserIds[0], createdUserIds[4] || createdUserIds[0]],
      tenantId: tenantObjectId,
    },
    {
      name: "SOC2 & ISO 27001 Security Audit",
      description: "Role permissions auditing, automated backup verification, and data retention policies.",
      status: "Planning" as const,
      priority: "High" as const,
      startDate: new Date(Date.now() + 5 * 86400000),
      dueDate: new Date(Date.now() + 65 * 86400000),
      cost: 32000,
      isInternal: true,
      members: createdUserIds.slice(0, 3),
      tenantId: tenantObjectId,
    },
  ];

  let projectCount = 0;
  const createdProjectIds: mongoose.Types.ObjectId[] = [];
  for (const p of sampleProjects) {
    const existing = await Project.findOne({ tenantId: tenantObjectId, name: p.name });
    if (!existing) {
      const created = await Project.create(p);
      createdProjectIds.push(created._id as mongoose.Types.ObjectId);
      projectCount++;
    } else {
      createdProjectIds.push(existing._id as mongoose.Types.ObjectId);
    }
  }
  summary.projects = projectCount;

  // Active Sprint
  let sprintCount = 0;
  let activeSprintId: mongoose.Types.ObjectId | undefined;
  const existingSprint = await Sprint.findOne({ tenantId: tenantObjectId, name: "Sprint 16: Core Reliability" });
  if (!existingSprint) {
    const sprint = await Sprint.create({
      name: "Sprint 16: Core Reliability",
      goal: "Stabilize data persistence, harden OAuth fallbacks, and optimize mobile dashboard rendering.",
      startDate: new Date(Date.now() - 7 * 86400000),
      endDate: new Date(Date.now() + 7 * 86400000),
      status: "Active",
      tenantId: tenantObjectId,
    });
    activeSprintId = sprint._id as mongoose.Types.ObjectId;
    sprintCount++;
  } else {
    activeSprintId = existingSprint._id as mongoose.Types.ObjectId;
  }
  summary.sprints = sprintCount;

  // 6. TASKS
  const taskDefs = [
    {
      title: "Implement Multi-Region Database Replica Failover",
      description: "Configure MongoDB connection pooling and automatic replica set reconnect on network drop.",
      status: "In Progress" as const,
      priority: "High" as const,
      projectId: createdProjectIds[0],
      assignee: createdUserIds[3] || adminObjectId,
      subtasks: [
        { title: "Review mongod replica lag thresholds", completed: true },
        { title: "Test automated reconnection hook in db.ts", completed: true },
        { title: "Deploy canary worker to AWS EKS", completed: false },
      ],
    },
    {
      title: "Design System Dark Mode & Contrast Compliance",
      description: "Ensure all buttons, badges, and modals pass WCAG AA contrast ratios in dark and light modes.",
      status: "Review" as const,
      priority: "Medium" as const,
      projectId: createdProjectIds[1] || createdProjectIds[0],
      assignee: createdUserIds[1] || adminObjectId,
      subtasks: [
        { title: "Audit Tailwind token palette", completed: true },
        { title: "Update Badge component variants", completed: true },
        { title: "Inspect mobile responsive sheets", completed: false },
      ],
    },
    {
      title: "Automate Monthly Invoicing PDF Generation",
      description: "Build serverless PDF stream generator with corporate branding, tax breakdown, and client address.",
      status: "Done" as const,
      priority: "High" as const,
      projectId: createdProjectIds[2] || createdProjectIds[0],
      assignee: createdUserIds[5] || adminObjectId,
      subtasks: [
        { title: "Integrate jspdf-autotable template", completed: true },
        { title: "Embed QR code payment link", completed: true },
        { title: "Verify email dispatch delivery", completed: true },
      ],
    },
    {
      title: "Data Retention & Encryption Policy Specification",
      description: "Draft comprehensive policy for encrypted backups, audit log immutability, and GDPR deletion compliance.",
      status: "To Do" as const,
      priority: "High" as const,
      projectId: createdProjectIds[3] || createdProjectIds[0],
      assignee: adminObjectId,
      subtasks: [
        { title: "Complete compliance audit questionnaire", completed: false },
        { title: "Archive legacy test clusters", completed: true },
      ],
    },
    {
      title: "Sales Pipeline CRM Stage Automation",
      description: "Add auto-trigger notifications when deals transition from Discovery to Proposal Sent.",
      status: "In Progress" as const,
      priority: "Medium" as const,
      projectId: createdProjectIds[2] || createdProjectIds[0],
      assignee: createdUserIds[4] || adminObjectId,
      subtasks: [
        { title: "Map deal stage transition webhooks", completed: true },
        { title: "Add deal card pulse indicators", completed: false },
      ],
    },
  ];

  let taskCount = 0;
  for (const t of taskDefs) {
    if (!t.projectId) continue;
    const existing = await Task.findOne({ tenantId: tenantObjectId, title: t.title });
    if (!existing) {
      await Task.create({
        ...t,
        sprintId: activeSprintId,
        dueDate: new Date(Date.now() + 10 * 86400000),
        comments: [
          {
            userId: adminObjectId,
            userName: session.userName || "Admin",
            content: "Please ensure this is tested against the live staging cluster before merge.",
            createdAt: new Date(),
          },
        ],
        history: [
          {
            action: "Task created via System Seeder",
            userName: session.userName || "Admin",
            date: new Date(),
          },
        ],
        tenantId: tenantObjectId,
      });
      taskCount++;
    }
  }
  summary.tasks = taskCount;

  // 7. TIME & ATTENDANCE
  let attCount = 0;
  let timeCount = 0;
  const todayISTMidnight = new Date();
  todayISTMidnight.setUTCHours(0, 0, 0, 0);

  for (let i = 0; i < Math.min(5, createdUserIds.length); i++) {
    const uid = createdUserIds[i];
    const existingAtt = await Attendance.findOne({
      tenantId: tenantObjectId,
      userId: uid,
      date: todayISTMidnight,
    });
    if (!existingAtt) {
      const clockIn = new Date(Date.now() - (6 + i) * 3600000);
      await Attendance.create({
        tenantId: tenantObjectId,
        userId: uid,
        userName: sampleUsers[i]?.name || session.userName,
        date: todayISTMidnight,
        clockIn,
        regularHours: 7.5,
        overtimeHours: 0,
        status: "Present",
      });
      attCount++;
    }

    if (createdProjectIds[0]) {
      const existingTime = await TimeEntry.findOne({
        tenantId: tenantObjectId,
        userId: uid,
        project: "Enterprise Cloud Infrastructure Migration",
      });
      if (!existingTime) {
        await TimeEntry.create({
          tenantId: tenantObjectId,
          userId: uid,
          project: "Enterprise Cloud Infrastructure Migration",
          taskName: "Core Architecture & Infrastructure Development",
          hours: 6.5,
          date: new Date(),
          isBillable: true,
          status: "Approved",
          comment: "Core module development, code review, and unit testing.",
        });
        timeCount++;
      }
    }
  }
  summary.attendance = attCount;
  summary.timeEntries = timeCount;

  // 8. SALES PIPELINE & DEALS
  const sampleLeads = [
    {
      leadName: "CloudScale Systems",
      companyName: "CloudScale Inc.",
      email: "inquiries@cloudscale.net",
      phone: "+1-555-0922",
      status: "Qualified" as const,
      stage: "Inpipeline" as const,
      value: 48000,
      currency: "USD",
      source: "Inbound Referral",
      owner: "Aisha Al-Mansoor",
      notes: "Looking to modernize their multi-tenant customer dashboard and billing integration.",
      tenantId: tenantObjectId,
      createdBy: adminObjectId,
    },
    {
      leadName: "Horizon Healthcare Tech",
      companyName: "Horizon Health",
      email: "tech@horizonhealth.org",
      phone: "+1-555-0933",
      status: "Proposal" as const,
      stage: "Conversation" as const,
      value: 62000,
      currency: "USD",
      source: "Conference Outbound",
      owner: "Aisha Al-Mansoor",
      notes: "Requires HIPAA compliant document management, encrypted patient audit trails, and 99.99% uptime.",
      tenantId: tenantObjectId,
      createdBy: adminObjectId,
    },
    {
      leadName: "Starlight Media Network",
      companyName: "Starlight Media",
      email: "partnerships@starlightmedia.com",
      phone: "+1-555-0944",
      status: "Negotiation" as const,
      stage: "Schedule Service" as const,
      value: 85000,
      currency: "USD",
      source: "Website Lead Form",
      owner: session.userName || "Admin",
      notes: "Annual enterprise retainer contract currently under legal review.",
      tenantId: tenantObjectId,
      createdBy: adminObjectId,
    },
  ];

  let leadCount = 0;
  for (const l of sampleLeads) {
    const existing = await Lead.findOne({ tenantId: tenantObjectId, companyName: l.companyName });
    if (!existing) {
      await Lead.create(l);
      leadCount++;
    }
  }
  summary.leads = leadCount;

  const sampleDeals = [
    {
      dealName: "OmniPay FinTech Architecture Migration",
      clientAccount: "OmniPay Technologies",
      dealValue: 45000,
      currency: "USD",
      stage: "Discovery" as const,
      probability: 60,
      expectedClose: new Date(Date.now() + 25 * 86400000).toISOString().slice(0, 10),
      owner: session.userName || "Admin",
      venture: "Ace Consultancys",
      notes: "Requires HIPAA compliant document management, encrypted patient audit trails, and 99.99% uptime.",
      tenantId: tenantObjectId,
      createdBy: adminObjectId,
      stageHistory: [
        {
          fromStage: "Prospecting",
          toStage: "Discovery",
          changedBy: adminObjectId,
          changedByName: session.userName || "Admin",
          notes: "Initial discovery call completed.",
          timestamp: new Date(),
        },
      ],
    },
    {
      dealName: "Nexus Systems Annual Enterprise Retainer",
      clientAccount: "Nexus Cloud Systems",
      dealValue: 95000,
      currency: "USD",
      stage: "Closed Won" as const,
      probability: 100,
      expectedClose: new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10),
      owner: session.userName || "Admin",
      venture: "Ace Consultancys",
      notes: "Annual enterprise retainer contract signed and executed.",
      tenantId: tenantObjectId,
      createdBy: adminObjectId,
      stageHistory: [
        {
          fromStage: "Negotiation",
          toStage: "Closed Won",
          changedBy: adminObjectId,
          changedByName: session.userName || "Admin",
          notes: "Executive sign-off received.",
          timestamp: new Date(),
        },
      ],
    },
    {
      dealName: "Vanguard Telematics Engine Upgrade",
      clientAccount: "Vanguard Global",
      dealValue: 38000,
      currency: "USD",
      stage: "Proposal Sent" as const,
      probability: 80,
      expectedClose: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
      owner: "Aisha Al-Mansoor",
      venture: "Ace Consultancys",
      notes: "Proposal submitted for review.",
      tenantId: tenantObjectId,
      createdBy: adminObjectId,
      stageHistory: [
        {
          fromStage: "Discovery",
          toStage: "Proposal Sent",
          changedBy: adminObjectId,
          changedByName: session.userName || "Admin",
          notes: "Formal proposal sent to Marcus Sterling.",
          timestamp: new Date(),
        },
      ],
    },
  ];

  let dealCount = 0;
  for (const d of sampleDeals) {
    const existing = await SalesDeal.findOne({ tenantId: tenantObjectId, dealName: d.dealName });
    if (!existing) {
      await SalesDeal.create(d);
      dealCount++;
    }
  }
  summary.deals = dealCount;

  // Proposals & Referrals
  let propCount = 0;
  const existingProp = await Proposal.findOne({ tenantId: tenantObjectId, proposalCode: "PROP-2026-001" });
  if (!existingProp) {
    await Proposal.create({
      tenantId: tenantObjectId,
      proposalCode: "PROP-2026-001",
      subject: "OmniPay Modernization Proposal",
      clientName: "Richard Thorne",
      clientEmail: "richard@omnipay.io",
      clientCompany: "OmniPay Technologies",
      items: [
        {
          description: "Cloud Architecture Modernization & High-Throughput Database Tuning",
          quantity: 1,
          unitPrice: 45000,
          amount: 45000,
        },
      ],
      subtotal: 45000,
      taxRate: 0,
      taxAmount: 0,
      totalValue: 45000,
      currency: "USD",
      issueDate: new Date(),
      openTill: new Date(Date.now() + 30 * 86400000),
      status: "Sent",
      createdBy: adminObjectId,
    });
    propCount++;
  }
  summary.proposals = propCount;

  let refCount = 0;
  const existingRef = await Referral.findOne({ tenantId: tenantObjectId, candidateName: "Alexander Hayes" });
  if (!existingRef) {
    await Referral.create({
      tenantId: tenantObjectId,
      candidateName: "Alexander Hayes",
      candidateEmail: "alex.hayes@example.com",
      phone: "+1-555-0811",
      position: "Senior Full Stack Engineer",
      department: "Engineering",
      referrerName: "Sarah Jenkins",
      referrerId: createdUserIds[1] || adminObjectId,
      referralCode: "REF-2026-01",
      status: "Interviewing",
      rewardAmount: 1500,
      payoutStatus: "Pending",
      notes: "Former colleague with strong Distributed Systems and Next.js experience.",
    });
    refCount++;
  }
  summary.referrals = refCount;

  // 9. HRMS, LEAVES, HOLIDAYS & SALARY SLIPS
  let lbCount = 0;
  let lrCount = 0;
  for (const uid of createdUserIds.slice(0, 5)) {
    const existingLb = await LeaveBalance.findOne({ tenantId: tenantObjectId, userId: uid });
    if (!existingLb) {
      await LeaveBalance.create({
        tenantId: tenantObjectId,
        userId: uid,
        annualTotal: 18,
        annualUsed: 3,
        sickTotal: 10,
        sickUsed: 1,
        casualTotal: 6,
        casualUsed: 1,
        year: now.getFullYear(),
      });
      lbCount++;
    }
  }
  summary.leaveBalances = lbCount;

  if (createdUserIds[1]) {
    const existingLr = await LeaveRequest.findOne({ tenantId: tenantObjectId, userId: createdUserIds[1] });
    if (!existingLr) {
      await LeaveRequest.create({
        tenantId: tenantObjectId,
        userId: createdUserIds[1],
        userName: "Sarah Jenkins",
        leaveType: "Annual",
        startDate: new Date(Date.now() + 14 * 86400000),
        endDate: new Date(Date.now() + 18 * 86400000),
        reason: "Family vacation and travel.",
        status: "Approved",
        appliedAt: new Date(),
        reviewedBy: adminObjectId,
        reviewedAt: new Date(),
      });
      lrCount++;
    }
  }
  summary.leaveRequests = lrCount;

  // Company Holidays
  const holidayDefs = [
    { title: "New Year's Day", date: new Date(now.getFullYear(), 0, 1), year: now.getFullYear(), month: 1, type: "Mandatory" as const },
    { title: "Memorial Day", date: new Date(now.getFullYear(), 4, 25), year: now.getFullYear(), month: 5, type: "Mandatory" as const },
    { title: "Independence Day", date: new Date(now.getFullYear(), 6, 4), year: now.getFullYear(), month: 7, type: "Mandatory" as const },
    { title: "Labor Day", date: new Date(now.getFullYear(), 8, 7), year: now.getFullYear(), month: 9, type: "Mandatory" as const },
    { title: "Thanksgiving Day", date: new Date(now.getFullYear(), 10, 26), year: now.getFullYear(), month: 11, type: "Mandatory" as const },
    { title: "Christmas Day", date: new Date(now.getFullYear(), 11, 25), year: now.getFullYear(), month: 12, type: "Mandatory" as const },
  ];

  let holCount = 0;
  for (const h of holidayDefs) {
    const existing = await Holiday.findOne({ tenantId: tenantObjectId, title: h.title, year: h.year });
    if (!existing) {
      await Holiday.create({ ...h, tenantId: tenantObjectId });
      holCount++;
    }
  }
  summary.holidays = holCount;

  // Checklist Presets
  let clCount = 0;
  const existingCp = await ChecklistPreset.findOne({ tenantId: tenantObjectId, name: "Standard Employee Onboarding Checklist" });
  if (!existingCp) {
    await ChecklistPreset.create({
      tenantId: tenantObjectId,
      name: "Standard Employee Onboarding Checklist",
      description: "Standard checklist for newly hired permanent full-time employees.",
      targetEmploymentType: "Permanent",
      items: [
        { id: "chk-1", title: "Sign Employment Agreement & NDA", category: "NDA", required: true },
        { id: "chk-2", title: "Configure Google Workspace & Slack Account", category: "Access", required: true },
        { id: "chk-3", title: "Provision Hardware Laptop & Security Tokens", category: "IT Asset", required: true },
        { id: "chk-4", title: "Complete First-Week 1:1 Introduction Meeting", category: "Other", required: false },
      ],
      isSystemDefault: true,
      createdBy: {
        userId: adminObjectId,
        userName: session.userName || "Admin",
      },
    });
    clCount++;
  }
  summary.checklists = clCount;

  // Salary Slips
  let ssCount = 0;
  const mNum = now.getMonth() + 1;
  const yNum = now.getFullYear();
  const payPeriodStr = `${now.toLocaleString("default", { month: "short" })} ${yNum}`;

  for (let i = 1; i < Math.min(4, createdUserIds.length); i++) {
    const uid = createdUserIds[i];
    const existing = await SalarySlip.findOne({ tenantId: tenantObjectId, userId: uid, month: mNum, year: yNum });
    if (!existing) {
      await SalarySlip.create({
        tenantId: tenantObjectId,
        userId: uid,
        month: mNum,
        year: yNum,
        payPeriod: payPeriodStr,
        employmentType: "Permanent",
        designation: (sampleUsers[i - 1] as any)?.role || "Staff Engineer",
        department: sampleUsers[i - 1]?.department || "Engineering",
        totalDays: 30,
        workingDays: 22,
        presentDays: 22,
        paidLeaveDays: 0,
        unpaidLeaveDays: 0,
        overtimeHours: 0,
        baseSalary: 6500,
        basicPay: 5000,
        hra: 1000,
        specialAllowance: 500,
        grossEarnings: 6500,
        lossOfPayDeduction: 0,
        taxDeduction: 600,
        otherDeductions: 150,
        totalDeductions: 750,
        netPayable: 5750,
        paymentStatus: "Paid",
        disbursedAt: new Date(Date.now() - 5 * 86400000),
        disbursedBy: adminObjectId,
        transactionReference: `TXN-SAL-${yNum}${mNum < 10 ? "0" + mNum : mNum}-00${i}`,
      });
      ssCount++;
    }
  }
  summary.salarySlips = ssCount;

  // 10. FINANCE & INVOICES
  const sampleInvoices = [
    {
      invoiceNo: "INV-2026-001",
      client: "Nexus Cloud Systems",
      amount: 18500,
      currency: "USD",
      status: "Paid" as const,
      issuedDate: new Date(Date.now() - 20 * 86400000).toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10),
      category: "Retainer",
      venture: "NIMO Consultancies",
      lineItems: [
        { description: "Monthly Cloud Operations & Reliability Engineering Retainer", quantity: 1, unitPrice: 18500, amount: 18500 },
      ],
      tenantId: tenantObjectId,
      createdBy: adminObjectId,
    },
    {
      invoiceNo: "INV-2026-002",
      client: "Apex Global FinTech",
      amount: 34000,
      currency: "USD",
      status: "Approved" as const,
      issuedDate: new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 25 * 86400000).toISOString().slice(0, 10),
      category: "Milestone",
      venture: "NIMO Capital",
      lineItems: [
        { description: "Milestone 2: Unified Trading Platform API & Core Database Migration", quantity: 1, unitPrice: 34000, amount: 34000 },
      ],
      tenantId: tenantObjectId,
      createdBy: adminObjectId,
    },
  ];

  let invCount = 0;
  for (const inv of sampleInvoices) {
    const existing = await FinanceInvoice.findOne({ tenantId: tenantObjectId, invoiceNo: inv.invoiceNo });
    if (!existing) {
      await FinanceInvoice.create(inv);
      invCount++;
    }
  }
  summary.invoices = invCount;

  // Finance Expenses
  const sampleExpenses = [
    {
      tenantId: tenantObjectId,
      createdBy: adminObjectId,
      title: "AWS Cloud Infrastructure & Cluster Hosting",
      category: "Software & Hosting",
      amount: 1420.5,
      currency: "USD",
      date: new Date(Date.now() - 10 * 86400000).toISOString().slice(0, 10),
      paidBy: session.userName || "Admin",
      department: "Engineering",
      venture: "Ace Consultancys",
      status: "Approved" as const,
      notes: "Monthly production cluster and managed database hosting.",
    },
    {
      tenantId: tenantObjectId,
      createdBy: createdUserIds[1] || adminObjectId,
      title: "Team Engineering Offsite & Hackathon Lunch",
      category: "Team Events",
      amount: 480.0,
      currency: "USD",
      date: new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10),
      paidBy: "Sarah Jenkins",
      department: "Engineering",
      venture: "Ace Consultancys",
      status: "Approved" as const,
      notes: "Team sprint retrospective catering.",
    },
  ];

  let expCount = 0;
  for (const exp of sampleExpenses) {
    const existing = await FinanceExpense.findOne({ tenantId: tenantObjectId, title: exp.title });
    if (!existing) {
      await FinanceExpense.create(exp);
      expCount++;
    }
  }
  summary.expenses = expCount;

  // 11. IT ASSETS & LICENSES
  const sampleDevices = [
    {
      assetTag: "DEV-APX-001",
      type: "Laptop",
      brand: "Apple",
      modelName: "MacBook Pro 16-inch M3 Max (36GB RAM, 1TB SSD)",
      serialNumber: "C02G9988MD6T",
      specs: "Apple M3 Max / 36GB Unified Memory / 1TB SSD / Space Black",
      assignedTo: "Sarah Jenkins",
      assignedUserId: createdUserIds[1],
      department: "Engineering",
      location: "San Francisco Office",
      os: "macOS Sonoma 14.4",
      condition: "Excellent" as const,
      status: "In Use" as const,
      tenantId: tenantObjectId,
      createdBy: adminObjectId,
    },
    {
      assetTag: "DEV-APX-002",
      type: "Laptop",
      brand: "Dell",
      modelName: "Dell XPS 15 9530 (i9-13900H, 32GB RAM, RTX 4070)",
      serialNumber: "DLXPS-887712",
      specs: "Intel i9 / 32GB DDR5 / 1TB NVMe / NVIDIA RTX 4070 / OLED 3.5K",
      assignedTo: "Marcus Vance",
      assignedUserId: createdUserIds[2],
      department: "Product & Design",
      location: "Remote",
      os: "Windows 11 Pro",
      condition: "Excellent" as const,
      status: "In Use" as const,
      tenantId: tenantObjectId,
      createdBy: adminObjectId,
    },
  ];

  let devCount = 0;
  for (const d of sampleDevices) {
    const existing = await ITDevice.findOne({ tenantId: tenantObjectId, assetTag: d.assetTag });
    if (!existing) {
      await ITDevice.create(d);
      devCount++;
    }
  }
  summary.devices = devCount;

  // IT Access
  let itAccCount = 0;
  const existingAccess = await ITAccessEntry.findOne({ tenantId: tenantObjectId, tool: "AWS Management Console" });
  if (!existingAccess) {
    await ITAccessEntry.create({
      tenantId: tenantObjectId,
      tool: "AWS Management Console",
      category: "Cloud Infrastructure",
      assignee: "David Kim",
      role: "DevOps Lead",
      accessLevel: "Admin Access",
      dateGranted: new Date().toISOString().slice(0, 10),
      status: "Active",
      createdBy: adminObjectId,
    });
    itAccCount++;
  }
  summary.itAccess = itAccCount;

  // IT Subscriptions
  let subCount = 0;
  const existingSub = await ITSubscription.findOne({ tenantId: tenantObjectId, tool: "Slack Enterprise Grid" });
  if (!existingSub) {
    await ITSubscription.create({
      tenantId: tenantObjectId,
      tool: "Slack Enterprise Grid",
      category: "Communication",
      plan: "Business+",
      costPerMonth: 375,
      seats: 25,
      renewalDate: new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10),
      owner: session.userName || "Admin",
      status: "Active",
      createdBy: adminObjectId,
    });
    subCount++;
  }
  summary.subscriptions = subCount;

  // IT Drive Links
  let driveCount = 0;
  const existingDrive = await ITDriveLink.findOne({ tenantId: tenantObjectId, name: "Company Engineering Architecture Blueprint" });
  if (!existingDrive) {
    await ITDriveLink.create({
      tenantId: tenantObjectId,
      name: "Company Engineering Architecture Blueprint",
      category: "Engineering",
      venture: "Ace Consultancys",
      platform: "Google Drive",
      link: "https://drive.google.com/drive/folders/nimo-engineering",
      owner: session.userName || "Admin",
      accessLevel: "Edit - Team",
      shareScope: "All Users",
      sharedWith: [],
      lastUpdated: new Date().toISOString().slice(0, 10),
      reviewFrequency: "Quarterly",
      notes: "Core system architecture, data models, and API interface specifications.",
      createdBy: adminObjectId,
    });
    driveCount++;
  }
  summary.driveLinks = driveCount;

  // 12. COMMUNICATIONS & CULTURE
  const channelDefs = [
    { name: "general", description: "Company-wide general discussions and watercooler chat", isPinned: true },
    { name: "announcements", description: "Official company news, executive updates, and alerts", isPinned: true },
    { name: "engineering", description: "Tech stack architecture, PR reviews, and releases", isPinned: false },
    { name: "random", description: "Memes, coffee breaks, music recommendations & fun", isPinned: false },
  ];

  let chanCount = 0;
  let chatCount = 0;
  for (const ch of channelDefs) {
    let chanDoc = await Channel.findOne({ tenantId: tenantObjectId, name: ch.name });
    if (!chanDoc) {
      chanDoc = await Channel.create({
        ...ch,
        members: createdUserIds,
        createdBy: adminObjectId,
        tenantId: tenantObjectId,
      });
      chanCount++;
    }

    // Add initial message in general
    if (ch.name === "general") {
      const existingMsg = await ChatMessage.findOne({ tenantId: tenantObjectId, channel: "general" });
      if (!existingMsg) {
        await ChatMessage.create({
          tenantId: tenantObjectId,
          channel: "general",
          senderId: adminObjectId,
          senderName: session.userName || "Admin",
          content: "Welcome to the NIMO-CRM workspace! All core operational modules, task boards, and attendance systems are online.",
          isDM: false,
          createdAt: new Date(),
        });
        chatCount++;
      }
    }
  }
  summary.channels = chanCount;
  summary.chatMessages = chatCount;

  // Announcements
  let annCount = 0;
  const existingAnn = await Announcement.findOne({ tenantId: tenantObjectId, title: "Welcome to NIMO-CRM Platform v3.4" });
  if (!existingAnn) {
    await Announcement.create({
      title: "Welcome to NIMO-CRM Platform v3.4",
      content: "We have officially provisioned our company workspace on NIMO-CRM! Explore your profile, project boards, timesheets, and IT asset directory.",
      category: "Company News",
      authorName: session.userName || "Workspace Admin",
      authorId: adminObjectId,
      pinned: true,
      tenantId: tenantObjectId,
    });
    annCount++;
  }
  summary.announcements = annCount;

  // Kudos & Birthday Wishes
  let kudosCount = 0;
  const existingKudos = await Kudos.findOne({ tenantId: tenantObjectId, toUserName: "Sarah Jenkins" });
  if (!existingKudos && createdUserIds[1]) {
    await Kudos.create({
      tenantId: tenantObjectId,
      fromUserId: adminObjectId,
      fromUserName: session.userName || "Admin",
      toUserId: createdUserIds[1],
      toUserName: "Sarah Jenkins",
      companyValue: "Excellence & Teamwork",
      message: "Fantastic leadership on the multi-region database migration and zero-downtime cutover!",
    });
    kudosCount++;
  }
  summary.kudos = kudosCount;

  let bwCount = 0;
  if (createdUserIds[3]) {
    const existingBw = await BirthdayWish.findOne({
      tenantId: tenantObjectId,
      recipientId: createdUserIds[3],
      year: now.getFullYear(),
    });
    if (!existingBw) {
      await BirthdayWish.create({
        tenantId: tenantObjectId,
        recipientId: createdUserIds[3],
        senderId: adminObjectId,
        senderName: session.userName || "Admin",
        message: "Happy Birthday David! Wishing you a fantastic year ahead! 🎂",
        sticker: "cake",
        type: "birthday",
        attachments: [],
        reactions: [],
        year: now.getFullYear(),
        acknowledged: false,
      });
      bwCount++;
    }
  }
  summary.birthdayWishes = bwCount;

  // 1:1 Meetings
  let m11Count = 0;
  if (createdUserIds[2]) {
    const existing11 = await OneOnOneMeeting.findOne({ tenantId: tenantObjectId, employeeName: "Marcus Vance" });
    if (!existing11) {
      await OneOnOneMeeting.create({
        tenantId: tenantObjectId,
        managerId: adminObjectId,
        managerName: session.userName || "Admin",
        employeeId: createdUserIds[2],
        employeeName: "Marcus Vance",
        scheduledDate: new Date(Date.now() + 2 * 86400000),
        status: "Scheduled",
        agenda: "Review Q4 design tokens roadmap and mobile component library sprint items.",
        notes: "Discuss icon system consolidation and mobile responsive breakpoints.",
        actionItems: [
          { text: "Prepare Figma design tokens handoff document", completed: false, carriedOver: false },
        ],
      });
      m11Count++;
    }
  }
  summary.oneOnOneMeetings = m11Count;

  // Pulse Surveys
  let psCount = 0;
  const existingPs = await PulseSurvey.findOne({
    tenantId: tenantObjectId,
    question: "How satisfied are you with our current sprint velocity and tooling?",
  });
  if (!existingPs) {
    await PulseSurvey.create({
      tenantId: tenantObjectId,
      createdBy: adminObjectId,
      question: "How satisfied are you with our current sprint velocity and tooling?",
      category: "Workload",
      active: true,
      responses: [
        {
          userId: adminObjectId,
          userName: session.userName || "Admin",
          rating: 5,
          feedback: "Sprint setup is very clean and efficient.",
          submittedAt: new Date(),
        },
      ],
    });
    psCount++;
  }
  summary.pulseSurveys = psCount;

  // 13. WIKI / KNOWLEDGE BASE
  const wikiDocs = [
    {
      title: "Engineering Best Practices & Git Flow Standards",
      category: "Engineering",
      content: `## Engineering Standards & Review Process
1. **Branch Naming**: Use \`feat/issue-title\`, \`fix/bug-name\`, or \`refactor/description\`.
2. **Mobile First**: All UI components must comply with responsive touch target minimums (38px+).
3. **Database Rules**: Always pin queries by \`tenantId\` for multi-tenant isolation.
4. **Icons**: Use FontAwesome 6 classes (\`<i className="fa-solid fa-..." />\`).`,
      createdBy: adminObjectId,
      tenantId: tenantObjectId,
    },
    {
      title: "Company Travel, Meals & Expense Reimbursement Policy",
      category: "Finance",
      content: `## Expense Policy Guidelines
- **Eligibility**: Valid business trips, client dinners, and software tools required for productivity.
- **Submission Window**: Submit within 14 calendar days of transaction via Finance > Expenses.
- **Receipts**: PDF or image receipt mandatory for all claims over $25.`,
      createdBy: adminObjectId,
      tenantId: tenantObjectId,
    },
    {
      title: "Information Security, Access Control & Device Hygiene",
      category: "Security",
      content: `## Security Hygiene Protocols
- **2FA Required**: Google Workspace, GitHub, and AWS console must enforce multi-factor authentication.
- **Device Lock**: Set screen timeout to 5 minutes or less on all company-issued laptops.
- **Passkeys**: Store company credentials in an approved enterprise password manager.`,
      createdBy: adminObjectId,
      tenantId: tenantObjectId,
    },
  ];

  let wikiCount = 0;
  for (const w of wikiDocs) {
    const existing = await Wiki.findOne({ tenantId: tenantObjectId, title: w.title });
    if (!existing) {
      await Wiki.create(w);
      wikiCount++;
    }
  }
  summary.wikis = wikiCount;

  // Calculate total records generated
  const total = Object.values(summary).reduce((acc, v) => acc + (typeof v === "number" ? v : 0), 0);
  summary.totalRecords = total;

  // Log in immutable ActivityLog
  try {
    await ActivityLog.create({
      tenantId: tenantObjectId,
      userId: adminObjectId,
      userName: session.userName || "Admin",
      userRole: session.role || "Admin",
      action: "WORKSPACE_SEED_DATA",
      targetName: "full_crm_showcase_seed",
      details: `Generated ${total} comprehensive dummy records across all functional CRM modules.`,
    });
  } catch (err) {
    console.warn("Failed to write ActivityLog for seed data:", err);
  }

  return summary as unknown as SeedSummary;
}

export interface DeleteSummary {
  departments: number;
  rolePermissions: number;
  users: number;
  projects: number;
  sprints: number;
  tasks: number;
  clients: number;
  attendance: number;
  timeEntries: number;
  leads: number;
  deals: number;
  proposals: number;
  referrals: number;
  leaveBalances: number;
  leaveRequests: number;
  holidays: number;
  checklists: number;
  salarySlips: number;
  invoices: number;
  expenses: number;
  devices: number;
  itAccess: number;
  subscriptions: number;
  driveLinks: number;
  channels: number;
  chatMessages: number;
  announcements: number;
  kudos: number;
  birthdayWishes: number;
  oneOnOneMeetings: number;
  pulseSurveys: number;
  wikis: number;
  totalDeleted: number;
}

export async function deleteWorkspaceDummyData(
  tenantObjectId: mongoose.Types.ObjectId,
  session: { userId: string; userEmail?: string; userName?: string; role?: string }
): Promise<DeleteSummary> {
  await connectToDatabase();
  const adminObjectId = new mongoose.Types.ObjectId(session.userId);

  // Perform parallel deletion of tenant records across all CRM domains,
  // STRICTLY PRESERVING:
  // 1. The active admin user account (_id: { $ne: adminObjectId })
  // 2. The Tenant document itself (never touched)
  const [
    delUsers,
    delProjects,
    delSprints,
    delTasks,
    delClients,
    delAttendance,
    delTimeEntries,
    delLeads,
    delDeals,
    delProposals,
    delReferrals,
    delLeaveBalances,
    delLeaveRequests,
    delHolidays,
    delChecklists,
    delSalarySlips,
    delInvoices,
    delExpenses,
    delDevices,
    delITAccess,
    delSubscriptions,
    delDriveLinks,
    delChannels,
    delChatMessages,
    delAnnouncements,
    delKudos,
    delBirthdayWishes,
    delOneOnOnes,
    delPulseSurveys,
    delWikis,
    delDepts,
    delRoles,
  ] = await Promise.all([
    User.deleteMany({ tenantId: tenantObjectId, _id: { $ne: adminObjectId } }),
    Project.deleteMany({ tenantId: tenantObjectId }),
    Sprint.deleteMany({ tenantId: tenantObjectId }),
    Task.deleteMany({ tenantId: tenantObjectId }),
    Client.deleteMany({ tenantId: tenantObjectId }),
    Attendance.deleteMany({ tenantId: tenantObjectId }),
    TimeEntry.deleteMany({ tenantId: tenantObjectId }),
    Lead.deleteMany({ tenantId: tenantObjectId }),
    SalesDeal.deleteMany({ tenantId: tenantObjectId }),
    Proposal.deleteMany({ tenantId: tenantObjectId }),
    Referral.deleteMany({ tenantId: tenantObjectId }),
    LeaveBalance.deleteMany({ tenantId: tenantObjectId }),
    LeaveRequest.deleteMany({ tenantId: tenantObjectId }),
    Holiday.deleteMany({ tenantId: tenantObjectId }),
    ChecklistPreset.deleteMany({ tenantId: tenantObjectId }),
    SalarySlip.deleteMany({ tenantId: tenantObjectId }),
    FinanceInvoice.deleteMany({ tenantId: tenantObjectId }),
    FinanceExpense.deleteMany({ tenantId: tenantObjectId }),
    ITDevice.deleteMany({ tenantId: tenantObjectId }),
    ITAccessEntry.deleteMany({ tenantId: tenantObjectId }),
    ITSubscription.deleteMany({ tenantId: tenantObjectId }),
    ITDriveLink.deleteMany({ tenantId: tenantObjectId }),
    Channel.deleteMany({ tenantId: tenantObjectId }),
    ChatMessage.deleteMany({ tenantId: tenantObjectId }),
    Announcement.deleteMany({ tenantId: tenantObjectId }),
    Kudos.deleteMany({ tenantId: tenantObjectId }),
    BirthdayWish.deleteMany({ tenantId: tenantObjectId }),
    OneOnOneMeeting.deleteMany({ tenantId: tenantObjectId }),
    PulseSurvey.deleteMany({ tenantId: tenantObjectId }),
    Wiki.deleteMany({ tenantId: tenantObjectId }),
    Department.deleteMany({ tenantId: tenantObjectId }),
    RolePermission.deleteMany({ tenantId: tenantObjectId }),
  ]);

  const summary: DeleteSummary = {
    users: delUsers.deletedCount || 0,
    projects: delProjects.deletedCount || 0,
    sprints: delSprints.deletedCount || 0,
    tasks: delTasks.deletedCount || 0,
    clients: delClients.deletedCount || 0,
    attendance: delAttendance.deletedCount || 0,
    timeEntries: delTimeEntries.deletedCount || 0,
    leads: delLeads.deletedCount || 0,
    deals: delDeals.deletedCount || 0,
    proposals: delProposals.deletedCount || 0,
    referrals: delReferrals.deletedCount || 0,
    leaveBalances: delLeaveBalances.deletedCount || 0,
    leaveRequests: delLeaveRequests.deletedCount || 0,
    holidays: delHolidays.deletedCount || 0,
    checklists: delChecklists.deletedCount || 0,
    salarySlips: delSalarySlips.deletedCount || 0,
    invoices: delInvoices.deletedCount || 0,
    expenses: delExpenses.deletedCount || 0,
    devices: delDevices.deletedCount || 0,
    itAccess: delITAccess.deletedCount || 0,
    subscriptions: delSubscriptions.deletedCount || 0,
    driveLinks: delDriveLinks.deletedCount || 0,
    channels: delChannels.deletedCount || 0,
    chatMessages: delChatMessages.deletedCount || 0,
    announcements: delAnnouncements.deletedCount || 0,
    kudos: delKudos.deletedCount || 0,
    birthdayWishes: delBirthdayWishes.deletedCount || 0,
    oneOnOneMeetings: delOneOnOnes.deletedCount || 0,
    pulseSurveys: delPulseSurveys.deletedCount || 0,
    wikis: delWikis.deletedCount || 0,
    departments: delDepts.deletedCount || 0,
    rolePermissions: delRoles.deletedCount || 0,
    totalDeleted: 0,
  };

  const total = Object.values(summary).reduce((acc, v) => acc + (typeof v === "number" ? v : 0), 0);
  summary.totalDeleted = total;

  // Log in immutable ActivityLog
  try {
    await ActivityLog.create({
      tenantId: tenantObjectId,
      userId: adminObjectId,
      userName: session.userName || "Admin",
      userRole: session.role || "Admin",
      action: "WORKSPACE_DELETE_DUMMY_DATA",
      targetName: "full_crm_purge_dummy_data",
      details: `Purged ${total} dummy demo records across all CRM modules. Admin account preserved safely.`,
    });
  } catch (err) {
    console.warn("Failed to write ActivityLog for delete dummy data:", err);
  }

  return summary;
}


