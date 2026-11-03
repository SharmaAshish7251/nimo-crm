"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface IntegrationState {
  email: {
    provider: string;
    activeEmail: string;
    senderName: string;
    isConfigured: boolean;
    hasGoogleOAuth: boolean;
    hasSystemSmtp: boolean;
  };
  database: {
    status: string;
    latencyMs: number;
    host: string;
    databaseName: string;
    isCustom: boolean;
    customMongoUri: string;
  };
}

export default function IntegrationsAndDatabaseTab() {
  const [data, setData] = useState<IntegrationState | null>(null);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Email test modal state
  const [testEmail, setTestEmail] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Custom SMTP state
  const [showSmtpForm, setShowSmtpForm] = useState(false);
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpSenderName, setSmtpSenderName] = useState("");
  const [isSavingSmtp, setIsSavingSmtp] = useState(false);

  // Custom Database state
  const [customUri, setCustomUri] = useState("");
  const [isTestingDb, setIsTestingDb] = useState(false);
  const [testDbResult, setTestDbResult] = useState<{ success: boolean; msg: string; latency?: number } | null>(null);
  const [isSavingDb, setIsSavingDb] = useState(false);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4500);
  };

  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/settings/integrations");
      if (!res.ok) throw new Error("Failed to load integrations status");
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      showToast(err.message || "Failed to load integrations", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const handleSendTestEmail = async () => {
    if (!testEmail || !testEmail.includes("@")) {
      showToast("Please enter a valid recipient email address.", "error");
      return;
    }
    try {
      setIsSendingTest(true);
      const res = await fetch("/api/settings/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test_email", toEmail: testEmail }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to send test email");
      showToast(json.message || "Test email dispatched successfully!");
    } catch (err: any) {
      showToast(err.message || "Failed to send test email", "error");
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingSmtp(true);
      const res = await fetch("/api/settings/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_smtp",
          host: smtpHost,
          port: smtpPort,
          user: smtpUser,
          pass: smtpPass,
          senderName: smtpSenderName,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save SMTP settings");
      showToast(json.message || "Custom SMTP credentials saved!");
      setShowSmtpForm(false);
      fetchIntegrations();
    } catch (err: any) {
      showToast(err.message || "Failed to save SMTP settings", "error");
    } finally {
      setIsSavingSmtp(false);
    }
  };

  const handleTestDatabase = async () => {
    if (!customUri || !customUri.startsWith("mongodb")) {
      showToast("Please enter a valid MongoDB connection URI string.", "error");
      return;
    }
    try {
      setIsTestingDb(true);
      setTestDbResult(null);
      const res = await fetch("/api/settings/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test_database", mongoUri: customUri }),
      });
      const json = await res.json();
      if (!res.ok) {
        setTestDbResult({ success: false, msg: json.error || "Connection failed" });
      } else {
        setTestDbResult({
          success: true,
          msg: `Connected to ${json.clusterHost}! Ping: ${json.latencyMs}ms`,
          latency: json.latencyMs,
        });
        showToast("MongoDB connection test succeeded!");
      }
    } catch (err: any) {
      setTestDbResult({ success: false, msg: err.message || "Failed to test database connection" });
    } finally {
      setIsTestingDb(false);
    }
  };

  const handleSaveDatabase = async (useDefault = false) => {
    try {
      setIsSavingDb(true);
      const res = await fetch("/api/settings/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_database",
          customMongoUri: customUri,
          useDefault,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save database configuration");
      showToast(json.message || "Database configuration updated!");
      setCustomUri("");
      setTestDbResult(null);
      fetchIntegrations();
    } catch (err: any) {
      showToast(err.message || "Failed to update database config", "error");
    } finally {
      setIsSavingDb(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-xs text-muted-foreground">
        <i className="fa-solid fa-spinner fa-spin mr-2 text-primary text-base" /> Loading integrations & database configuration...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed bottom-6 right-6 z-[99999] px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2 ${
            toastMsg.type === "success"
              ? "bg-emerald-500 text-white border-emerald-600 shadow-emerald-500/20"
              : "bg-red-500 text-white border-red-600 shadow-red-500/20"
          }`}
        >
          <i className={toastMsg.type === "success" ? "fa-solid fa-circle-check text-sm" : "fa-solid fa-triangle-exclamation text-sm"} />
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-500/10 via-emerald-500/5 to-transparent border border-teal-500/20 rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base sm:text-lg font-extrabold text-foreground flex items-center gap-2">
              <i className="fa-solid fa-plug text-teal-600 dark:text-teal-400" />
              <span>Integrations & Cloud Database Switcher</span>
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
              Manage your live email dispatch providers (Google OAuth2 / Gmail & custom SMTP) and switch between shared or dedicated MongoDB Atlas clusters.
            </p>
          </div>
          <Button
            onClick={fetchIntegrations}
            variant="outline"
            size="sm"
            className="text-xs h-9 min-h-[38px] gap-2 shrink-0 cursor-pointer"
          >
            <i className="fa-solid fa-rotate text-xs" /> Refresh Telemetry
          </Button>
        </div>
      </div>

      {/* Grid: Gmail & Email vs MongoDB Database */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── CARD 1: GMAIL & EMAIL DISPATCH DESK ── */}
        <Card className="border-border flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2 text-foreground">
                  <i className="fa-solid fa-envelope-open-text text-teal-600" />
                  <span>Email & Gmail Dispatch Engine</span>
                </CardTitle>
                <Badge
                  variant="outline"
                  className={`text-[10px] font-semibold uppercase tracking-wider ${
                    data?.email.isConfigured
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${data?.email.isConfigured ? "bg-emerald-500" : "bg-amber-500"}`} />
                  {data?.email.isConfigured ? "Operational" : "Not Configured"}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Active provider used to deliver invoices, verification codes, and system notifications.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Active Provider Card */}
              <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Active Provider:</span>
                  <span className="font-bold text-foreground flex items-center gap-1.5">
                    {data?.email.provider === "google_oauth" ? (
                      <>
                        <i className="fa-brands fa-google text-red-500" /> Google OAuth (Gmail API)
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-server text-teal-600" /> Standard SMTP Server
                      </>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Sender Address:</span>
                  <span className="font-mono font-semibold text-foreground truncate max-w-[200px] sm:max-w-[260px]">
                    {data?.email.activeEmail || "None (Using System Fallback)"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Display Name:</span>
                  <span className="font-semibold text-foreground">{data?.email.senderName}</span>
                </div>
              </div>

              {/* 1-Click Connect with Google */}
              <div className="p-3.5 rounded-xl border border-teal-500/30 bg-teal-500/5 space-y-2.5">
                <div className="flex items-center gap-2">
                  <i className="fa-brands fa-google text-red-500 text-sm" />
                  <span className="font-bold text-xs text-foreground">Zero-Setup Google Sign-in & Gmail</span>
                </div>
                <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                  Authorize your Gmail account via Google OAuth to automatically route CRM emails directly through Google's trusted mail servers with zero manual password configuration.
                </p>
                <a
                  href="/api/auth/google?intent=connect_gmail&redirect=/dashboard/settings?tab=integrations"
                  className="inline-flex items-center justify-center gap-2 min-h-[38px] px-4 py-2 rounded-lg bg-white dark:bg-[#1a222d] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#222c3a] text-xs font-semibold transition-all no-underline shadow-2xs cursor-pointer"
                >
                  <i className="fa-brands fa-google text-red-500 text-xs" />
                  <span>Connect / Switch Google Account</span>
                </a>
              </div>

              {/* 1-Click Test Email Dispatcher */}
              <div className="pt-2 border-t border-border space-y-2">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <i className="fa-solid fa-paper-plane text-xs text-primary" /> Send Instant Test Email
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    type="email"
                    placeholder="Enter email to receive test message..."
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="text-xs h-9 min-h-[38px]"
                  />
                  <Button
                    onClick={handleSendTestEmail}
                    disabled={isSendingTest || !testEmail}
                    size="sm"
                    className="text-xs h-9 min-h-[38px] shrink-0 font-semibold gap-1.5 cursor-pointer"
                  >
                    {isSendingTest ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin text-xs" /> Sending...
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-paper-plane text-xs" /> Test Dispatch
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Custom SMTP Toggle */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowSmtpForm(!showSmtpForm)}
                  className="text-xs text-primary font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <i className={`fa-solid ${showSmtpForm ? "fa-chevron-up" : "fa-chevron-down"} text-[10px]`} />
                  <span>{showSmtpForm ? "Hide Custom SMTP Configuration" : "Configure Custom SMTP Manually"}</span>
                </button>

                {showSmtpForm && (
                  <form onSubmit={handleSaveSmtp} className="mt-3 p-3.5 rounded-xl border border-border bg-card space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground">SMTP Host</label>
                        <Input
                          placeholder="smtp.gmail.com"
                          value={smtpHost}
                          onChange={(e) => setSmtpHost(e.target.value)}
                          className="text-xs h-8"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground">Port</label>
                        <Input
                          placeholder="587"
                          value={smtpPort}
                          onChange={(e) => setSmtpPort(e.target.value)}
                          className="text-xs h-8"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground">Username / Email</label>
                        <Input
                          placeholder="user@example.com"
                          value={smtpUser}
                          onChange={(e) => setSmtpUser(e.target.value)}
                          className="text-xs h-8"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground">Password / App Key</label>
                        <Input
                          type="password"
                          placeholder="••••••••••••"
                          value={smtpPass}
                          onChange={(e) => setSmtpPass(e.target.value)}
                          className="text-xs h-8"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground">Sender Display Name</label>
                      <Input
                        placeholder="NIMO-CRM Notifications"
                        value={smtpSenderName}
                        onChange={(e) => setSmtpSenderName(e.target.value)}
                        className="text-xs h-8"
                      />
                    </div>

                    <Button type="submit" disabled={isSavingSmtp} size="sm" className="w-full text-xs h-8 min-h-[36px] font-semibold">
                      {isSavingSmtp ? "Saving SMTP..." : "Save Custom SMTP Credentials"}
                    </Button>
                  </form>
                )}
              </div>
            </CardContent>
          </div>
        </Card>

        {/* ── CARD 2: MONGODB DATABASE & CLUSTER SWITCHER DESK ── */}
        <Card className="border-border flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2 text-foreground">
                  <i className="fa-solid fa-database text-teal-600" />
                  <span>MongoDB Database Switcher</span>
                </CardTitle>
                <Badge
                  variant="outline"
                  className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-semibold uppercase tracking-wider"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
                  {data?.database.status} ({data?.database.latencyMs}ms)
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Live connection status to your MongoDB cluster and options to connect to dedicated databases.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Active DB Telemetry */}
              <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Active Cluster Host:</span>
                  <span className="font-mono font-semibold text-foreground truncate max-w-[200px] sm:max-w-[260px]">
                    {data?.database.host}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Database Partition:</span>
                  <span className="font-mono font-bold text-foreground">{data?.database.databaseName}</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Storage Mode:</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {data?.database.isCustom ? "Dedicated Private Cluster" : "Default Shared Cloud Cluster"}
                  </Badge>
                </div>
              </div>

              {/* Dedicated Database Configuration */}
              <div className="space-y-2.5">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Connect Dedicated / External MongoDB URI:</span>
                  <span className="text-[10px] text-muted-foreground font-mono">mongodb+srv://...</span>
                </label>
                <Input
                  type="password"
                  placeholder="mongodb+srv://username:password@cluster.mongodb.net/dbname"
                  value={customUri}
                  onChange={(e) => setCustomUri(e.target.value)}
                  className="text-xs h-9 min-h-[38px] font-mono"
                />

                {/* Test Feedback Alert */}
                {testDbResult && (
                  <div
                    className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                      testDbResult.success
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                        : "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
                    }`}
                  >
                    <i className={testDbResult.success ? "fa-solid fa-circle-check mt-0.5" : "fa-solid fa-circle-xmark mt-0.5"} />
                    <span className="leading-relaxed">{testDbResult.msg}</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                  <Button
                    type="button"
                    onClick={handleTestDatabase}
                    disabled={isTestingDb || !customUri}
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto text-xs h-9 min-h-[38px] gap-1.5 cursor-pointer font-semibold"
                  >
                    {isTestingDb ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin text-xs" /> Ping Testing...
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-vial text-xs" /> Test Connection
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    onClick={() => handleSaveDatabase(false)}
                    disabled={isSavingDb || !customUri}
                    size="sm"
                    className="w-full sm:w-auto text-xs h-9 min-h-[38px] gap-1.5 cursor-pointer font-semibold"
                  >
                    {isSavingDb ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin text-xs" /> Switching...
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-database text-xs" /> Switch to This Database
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Reset to Default */}
              {data?.database.isCustom && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between gap-3">
                  <div className="text-xs text-amber-700 dark:text-amber-400">
                    Currently operating on a custom dedicated cluster.
                  </div>
                  <Button
                    onClick={() => handleSaveDatabase(true)}
                    variant="destructive"
                    size="sm"
                    className="text-xs h-8 min-h-[36px] cursor-pointer"
                  >
                    Revert to Default
                  </Button>
                </div>
              )}
            </CardContent>
          </div>
        </Card>
      </div>
    </div>
  );
}

