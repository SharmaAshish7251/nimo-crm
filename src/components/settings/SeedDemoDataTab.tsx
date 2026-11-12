"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SeedCounts {
  departments: number;
  users: number;
  projects: number;
  tasks: number;
  leads: number;
  deals: number;
  invoices: number;
  devices: number;
  channels: number;
  wikis: number;
}

export function SeedDemoDataTab() {
  const [counts, setCounts] = useState<SeedCounts | null>(null);
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [purging, setPurging] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showPurgeConfirmModal, setShowPurgeConfirmModal] = useState(false);
  const [seedResult, setSeedResult] = useState<any | null>(null);
  const [purgeResult, setPurgeResult] = useState<any | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchCounts = async () => {
    try {
      setLoadingCounts(true);
      const res = await fetch("/api/settings/seed-data");
      const data = await res.json();
      if (res.ok && data.counts) {
        setCounts(data.counts);
      }
    } catch {
      // Non-critical, ignore
    } finally {
      setLoadingCounts(false);
    }
  };

  useEffect(() => {
    fetchCounts();
  }, []);

  const handleExecuteSeed = async () => {
    try {
      setSeeding(true);
      setShowConfirmModal(false);
      setPurgeResult(null);
      const res = await fetch("/api/settings/seed-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSeedResult(data.summary);
        showToast(data.message || "Dummy data populated successfully!", "success");
        await fetchCounts();
      } else {
        showToast(data.error || "Failed to populate dummy data.", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Network error while seeding data.", "error");
    } finally {
      setSeeding(false);
    }
  };

  const handleExecutePurge = async () => {
    try {
      setPurging(true);
      setShowPurgeConfirmModal(false);
      setSeedResult(null);
      const res = await fetch("/api/settings/seed-data", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPurgeResult(data.summary);
        showToast(data.message || "Dummy demo data deleted successfully!", "success");
        await fetchCounts();
      } else {
        showToast(data.error || "Failed to delete dummy data.", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Network error while purging data.", "error");
    } finally {
      setPurging(false);
    }
  };

  const FEATURE_DOMAINS = [
    {
      title: "Organization & Directory",
      icon: "fa-solid fa-building-user",
      color: "text-sky-500",
      description: "6 standard departments, role permissions, and 7 diverse employee accounts with roles, bios, and skill tags.",
      badge: `${counts?.users ?? 0} Users`,
    },
    {
      title: "Projects, Sprints & Tasks",
      icon: "fa-solid fa-diagram-project",
      color: "text-indigo-500",
      description: "4 multi-stage projects, active Sprint 16, and 15+ Kanban tasks (Todo, In Progress, Review, Done) with subtasks.",
      badge: `${counts?.projects ?? 0} Projects · ${counts?.tasks ?? 0} Tasks`,
    },
    {
      title: "Time & Attendance",
      icon: "fa-solid fa-clock",
      color: "text-emerald-500",
      description: "Live shift clock-ins with daily hour calculations, break logs, and weekly project timesheets.",
      badge: "Shift Rosters",
    },
    {
      title: "Sales Pipeline & Deals",
      icon: "fa-solid fa-briefcase",
      color: "text-amber-500",
      description: "Inbound leads, deals across discovery & negotiation ($18k-$95k), sent proposals, and candidate referrals.",
      badge: `${counts?.leads ?? 0} Leads · ${counts?.deals ?? 0} Deals`,
    },
    {
      title: "HRMS & People Operations",
      icon: "fa-solid fa-user-tie",
      color: "text-rose-500",
      description: "Annual/sick leave balances, approved leave requests, calendar holidays, onboarding checklist, and salary slips.",
      badge: "HR Suite",
    },
    {
      title: "Finance & Invoicing",
      icon: "fa-solid fa-file-invoice-dollar",
      color: "text-teal-500",
      description: "Corporate client accounts, downloadable invoices (Paid, Approved), and team expense reimbursement claims.",
      badge: `${counts?.invoices ?? 0} Invoices`,
    },
    {
      title: "IT Assets & Inventory",
      icon: "fa-solid fa-laptop",
      color: "text-cyan-500",
      description: "Assigned hardware inventory (MacBook Pro, Dell XPS), cloud access permissions, SaaS subscriptions, and drive links.",
      badge: `${counts?.devices ?? 0} Devices`,
    },
    {
      title: "Communications & Culture",
      icon: "fa-solid fa-comments",
      color: "text-purple-500",
      description: "Channels (#general, #engineering), threaded messages, company announcements, peer kudos, 1:1 meetings, and surveys.",
      badge: `${counts?.channels ?? 0} Channels`,
    },
    {
      title: "Knowledge Base (Wiki)",
      icon: "fa-solid fa-book",
      color: "text-blue-500",
      description: "Engineering Git flow standards, employee expense SOP, and company security hygiene guidelines.",
      badge: `${counts?.wikis ?? 0} Articles`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-xs sm:text-sm font-semibold transition-all border animate-in slide-in-from-bottom-3 ${
            toast.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
          }`}
        >
          <i className={`fa-solid ${toast.type === "success" ? "fa-circle-check" : "fa-circle-xmark"}`} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <Card className="border border-border/80 bg-gradient-to-br from-card via-card to-amber-500/5 shadow-xs">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
                  <i className="fa-solid fa-flask-vial text-amber-500" />
                  Seed & Demo Data Generator
                </CardTitle>
                <Badge color="warning" className="text-[10px] font-bold">
                  SANDBOX TOOL
                </Badge>
              </div>
              <CardDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Populate your blank database with realistic showcase dummy records across every CRM module (Projects, Tasks, Attendance, Leads, Deals, HRMS, Invoices, IT Devices &amp; Chat).
              </CardDescription>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center shrink-0">
              <Button
                onClick={() => setShowConfirmModal(true)}
                disabled={seeding || purging}
                color="primary"
                className="gap-2 font-bold min-h-[40px] px-4 shadow-sm cursor-pointer justify-center"
              >
                {seeding ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin text-xs" />
                    Populating Dummy Data...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-wand-magic-sparkles text-xs" />
                    Seed Dummy Data
                  </>
                )}
              </Button>

              <Button
                onClick={() => setShowPurgeConfirmModal(true)}
                disabled={seeding || purging}
                color="destructive"
                className="gap-2 font-bold min-h-[40px] px-4 shadow-sm cursor-pointer justify-center bg-rose-600 hover:bg-rose-700 text-white"
              >
                {purging ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin text-xs text-white" />
                    Deleting Dummy Data...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-trash-can text-xs text-white" />
                    Delete Dummy Data
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex items-start gap-3">
            <i className="fa-solid fa-shield-halved text-emerald-500 mt-0.5 text-sm shrink-0" />
            <div className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">Safe &amp; Non-Destructive:</span> This generator safely injects demo records pinned to your company workspace. It will <span className="font-semibold text-foreground">never</span> overwrite, delete, or modify your current Admin account or active session credentials.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone: Dedicated Delete Dummy Data Card */}
      <Card className="border-2 border-rose-500/40 bg-gradient-to-br from-rose-500/10 via-card to-card shadow-xs">
        <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-500 flex items-center justify-center shrink-0 border border-rose-500/30">
                <i className="fa-solid fa-trash-can text-sm" />
              </div>
              <span className="font-bold text-sm sm:text-base text-foreground">
                Delete All Workspace Dummy Data
              </span>
              <Badge color="destructive" className="text-[10px] font-bold">
                PURGE OPTION
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
              Permanently wipe all generated mock records across all 10+ CRM features (Projects, Tasks, Attendance, Leads, Deals, Invoices, IT Assets, Comms &amp; Wikis). Your Admin user credentials and workspace setup will remain 100% active and safe.
            </p>
          </div>

          <Button
            onClick={() => setShowPurgeConfirmModal(true)}
            disabled={seeding || purging}
            color="destructive"
            className="gap-2 font-bold min-h-[42px] px-5 shadow-sm cursor-pointer shrink-0 bg-rose-600 hover:bg-rose-700 text-white justify-center"
          >
            {purging ? (
              <>
                <i className="fa-solid fa-spinner fa-spin text-xs text-white" />
                Deleting Dummy Data...
              </>
            ) : (
              <>
                <i className="fa-solid fa-trash-can text-xs text-white" />
                Delete Dummy Data
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Seed Results Banner */}
      {seedResult && (
        <Card className="border border-emerald-500/40 bg-emerald-500/10 shadow-xs animate-in fade-in">
          <CardContent className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
              <i className="fa-solid fa-circle-check text-base" />
              <span>Workspace Seed Complete — {seedResult.totalRecords} Records Generated</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 text-xs">
              <div className="bg-background/80 p-2.5 rounded-lg border border-border">
                <span className="text-muted-foreground block text-[11px]">Users</span>
                <span className="font-bold text-foreground text-sm">+{seedResult.users}</span>
              </div>
              <div className="bg-background/80 p-2.5 rounded-lg border border-border">
                <span className="text-muted-foreground block text-[11px]">Projects</span>
                <span className="font-bold text-foreground text-sm">+{seedResult.projects}</span>
              </div>
              <div className="bg-background/80 p-2.5 rounded-lg border border-border">
                <span className="text-muted-foreground block text-[11px]">Tasks</span>
                <span className="font-bold text-foreground text-sm">+{seedResult.tasks}</span>
              </div>
              <div className="bg-background/80 p-2.5 rounded-lg border border-border">
                <span className="text-muted-foreground block text-[11px]">Leads &amp; Deals</span>
                <span className="font-bold text-foreground text-sm">+{seedResult.leads + seedResult.deals}</span>
              </div>
              <div className="bg-background/80 p-2.5 rounded-lg border border-border">
                <span className="text-muted-foreground block text-[11px]">Invoices</span>
                <span className="font-bold text-foreground text-sm">+{seedResult.invoices}</span>
              </div>
              <div className="bg-background/80 p-2.5 rounded-lg border border-border">
                <span className="text-muted-foreground block text-[11px]">IT Devices</span>
                <span className="font-bold text-foreground text-sm">+{seedResult.devices}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Purge Results Banner */}
      {purgeResult && (
        <Card className="border border-rose-500/40 bg-rose-500/10 shadow-xs animate-in fade-in">
          <CardContent className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
              <i className="fa-solid fa-trash-can text-base" />
              <span>Workspace Demo Data Purged — {purgeResult.totalDeleted} Records Cleared</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 text-xs">
              <div className="bg-background/80 p-2.5 rounded-lg border border-border">
                <span className="text-muted-foreground block text-[11px]">Users</span>
                <span className="font-bold text-foreground text-sm">-{purgeResult.users}</span>
              </div>
              <div className="bg-background/80 p-2.5 rounded-lg border border-border">
                <span className="text-muted-foreground block text-[11px]">Projects</span>
                <span className="font-bold text-foreground text-sm">-{purgeResult.projects}</span>
              </div>
              <div className="bg-background/80 p-2.5 rounded-lg border border-border">
                <span className="text-muted-foreground block text-[11px]">Tasks</span>
                <span className="font-bold text-foreground text-sm">-{purgeResult.tasks}</span>
              </div>
              <div className="bg-background/80 p-2.5 rounded-lg border border-border">
                <span className="text-muted-foreground block text-[11px]">Leads &amp; Deals</span>
                <span className="font-bold text-foreground text-sm">-{purgeResult.leads + purgeResult.deals}</span>
              </div>
              <div className="bg-background/80 p-2.5 rounded-lg border border-border">
                <span className="text-muted-foreground block text-[11px]">Invoices</span>
                <span className="font-bold text-foreground text-sm">-{purgeResult.invoices}</span>
              </div>
              <div className="bg-background/80 p-2.5 rounded-lg border border-border">
                <span className="text-muted-foreground block text-[11px]">IT Devices</span>
                <span className="font-bold text-foreground text-sm">-{purgeResult.devices}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feature Domains Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2">
            <i className="fa-solid fa-cubes text-muted-foreground" />
            CRM Feature Modules Covered
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchCounts}
            disabled={loadingCounts}
            className="text-xs h-7 gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground"
          >
            <i className={`fa-solid fa-arrows-rotate text-[10px] ${loadingCounts ? "fa-spin" : ""}`} />
            Refresh Counts
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {FEATURE_DOMAINS.map((domain, idx) => (
            <Card key={idx} className="border border-border/70 hover:border-border transition-all shadow-2xs hover:shadow-xs">
              <CardContent className="p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <i className={`${domain.icon} ${domain.color} text-sm`} />
                    </div>
                    <span className="text-xs font-bold text-foreground">{domain.title}</span>
                  </div>
                  <Badge color="default" className="text-[10px] font-mono shrink-0">
                    {domain.badge}
                  </Badge>
                </div>
                <p className="text-[11.5px] text-muted-foreground leading-relaxed line-clamp-2">
                  {domain.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div
            className="w-full max-w-md bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5 animate-in zoom-in-95 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
                <i className="fa-solid fa-wand-magic-sparkles text-lg" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">Populate CRM with Showcase Data?</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  This action will populate your company workspace with realistic dummy records for all 10+ CRM features (Projects, Tasks, Employees, Leads, Deals, Attendance, HRMS &amp; Invoices).
                </p>
              </div>
            </div>

            <div className="p-3 bg-muted/50 rounded-xl border border-border text-xs text-muted-foreground space-y-1 shrink-0">
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <i className="fa-solid fa-circle-info text-primary text-[11px]" />
                What to expect:
              </div>
              <p>• Your current Admin profile and credentials remain completely unchanged.</p>
              <p>• 7 diverse employee accounts will be created (default password: <code className="font-mono text-foreground">Password@123</code>).</p>
              <p>• All generated documents can be updated, moved, or deleted at any time.</p>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-border shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConfirmModal(false)}
                disabled={seeding}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                color="primary"
                size="sm"
                onClick={handleExecuteSeed}
                disabled={seeding}
                className="gap-2 font-bold cursor-pointer"
              >
                {seeding ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin text-xs" />
                    Generating...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-check text-xs" />
                    Confirm &amp; Generate Data
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Purge / Delete Confirmation Modal */}
      {showPurgeConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div
            className="w-full max-w-md bg-card border border-rose-500/30 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5 animate-in zoom-in-95 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 border border-rose-500/20">
                <i className="fa-solid fa-triangle-exclamation text-lg" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">Delete All Workspace Dummy Data?</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  This action will permanently delete all generated dummy records across all functional CRM features (Users, Projects, Sprints, Tasks, Attendance, Leads, Deals, Invoices, IT Assets, Comms &amp; Wikis).
                </p>
              </div>
            </div>

            <div className="p-3 bg-rose-500/5 rounded-xl border border-rose-500/20 text-xs text-muted-foreground space-y-1.5 shrink-0">
              <div className="flex items-center gap-1.5 font-semibold text-rose-600 dark:text-rose-400">
                <i className="fa-solid fa-shield-halved text-[11px]" />
                Safety Guarantee:
              </div>
              <p>• Your Admin account (<span className="font-semibold text-foreground">email, password &amp; role</span>) is strictly preserved.</p>
              <p>• Your Tenant workspace configuration remains active.</p>
              <p>• You can re-populate fresh demo data at any time using the seed generator.</p>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-border shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPurgeConfirmModal(false)}
                disabled={purging}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                color="destructive"
                size="sm"
                onClick={handleExecutePurge}
                disabled={purging}
                className="gap-2 font-bold cursor-pointer bg-rose-600 hover:bg-rose-700 text-white"
              >
                {purging ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin text-xs" />
                    Purging Data...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-trash-can text-xs" />
                    Yes, Delete Dummy Data
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

