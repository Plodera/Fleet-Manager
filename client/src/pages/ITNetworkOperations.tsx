import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, AlertTriangle, ArrowLeft, CheckCircle2, Clock3, FileText, Gauge, RefreshCw, Save, WifiOff } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLanguage } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import type { ItHostWithStatus, ItIssueAssignee } from "@shared/schema";

const isoDay = (date: Date) => date.toISOString().slice(0, 10);
const rangeQuery = (fromDay: string, toDay: string) => {
  return `from=${encodeURIComponent(`${fromDay}T00:00:00.000Z`)}&to=${encodeURIComponent(`${toDay}T23:59:59.999Z`)}`;
};

function StatCard({ icon: Icon, label, value, detail }: { icon: React.ElementType; label: string; value: string; detail?: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="rounded-lg bg-blue-50 text-blue-600 p-2"><Icon className="w-5 h-5" /></div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold truncate">{value}</p>
          {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ITNetworkOperations() {
  const { t, language } = useLanguage();
  const it = t.itMonitor;
  const { toast } = useToast();
  const [selectedHost, setSelectedHost] = useState<number | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<any | null>(null);
  const [month, setMonth] = useState(isoDay(new Date()).slice(0, 7));
  const [bandwidthInterface, setBandwidthInterface] = useState("all");
  const defaultTo = isoDay(new Date());
  const defaultFrom = isoDay(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const [fromDay, setFromDay] = useState(defaultFrom);
  const [toDay, setToDay] = useState(defaultTo);
  const [issueStatus, setIssueStatus] = useState("all");
  const [issueSeverity, setIssueSeverity] = useState("all");
  const [issueHostId, setIssueHostId] = useState("all");
  const [issueOwnerId, setIssueOwnerId] = useState("");
  const [reportEmail, setReportEmail] = useState(false);
  const [settings, setSettings] = useState<any>({ reportsEnabled: true, reportDayOfWeek: 1, reportHour: 8, reportRecipients: [], emailReports: false });

  const { data: hosts = [] } = useQuery<ItHostWithStatus[]>({ queryKey: ["/api/it/hosts"], queryFn: async () => { const res = await fetch("/api/it/hosts"); return res.ok ? res.json() : []; }, refetchInterval: 30000 });
  const { data: issueAssignees = [] } = useQuery<ItIssueAssignee[]>({ queryKey: ["/api/it/issue-assignees"], queryFn: async () => { const res = await fetch("/api/it/issue-assignees"); return res.ok ? res.json() : []; } });
  const { data: summary = [], isFetching: summaryFetching } = useQuery<any[]>({ queryKey: ["/api/it/monitoring/summary", fromDay, toDay], queryFn: async () => { const res = await fetch(`/api/it/monitoring/summary?${rangeQuery(fromDay, toDay)}`); return res.ok ? res.json() : []; }, refetchInterval: 60000 });
  const issueQuery = new URLSearchParams({ status: issueStatus, severity: issueSeverity, hostId: issueHostId });
  if (issueOwnerId) issueQuery.set("assignedToId", issueOwnerId);
  const { data: issues = [], isFetching: issuesFetching } = useQuery<any[]>({ queryKey: ["/api/it/issues", issueStatus, issueSeverity, issueHostId, issueOwnerId], queryFn: async () => { const res = await fetch(`/api/it/issues?${issueQuery.toString()}`); return res.ok ? res.json() : []; }, refetchInterval: 30000 });
  const { data: issueUpdates = [] } = useQuery<any[]>({ queryKey: ["/api/it/issues", selectedIssue?.id, "updates"], enabled: !!selectedIssue, queryFn: async () => { const res = await fetch(`/api/it/issues/${selectedIssue.id}/updates`); return res.ok ? res.json() : []; } });
  const { data: reports = [] } = useQuery<any[]>({ queryKey: ["/api/it/reports"], queryFn: async () => { const res = await fetch("/api/it/reports"); return res.ok ? res.json() : []; } });
  const { data: bandwidth = [] } = useQuery<any[]>({ queryKey: ["/api/it/fortigate/bandwidth/monthly", month, bandwidthInterface], queryFn: async () => { const res = await fetch(`/api/it/fortigate/bandwidth/monthly?month=${month}&interface=${encodeURIComponent(bandwidthInterface)}`); return res.ok ? res.json() : []; } });
  const { data: history = [] } = useQuery<any[]>({
    queryKey: ["/api/it/monitoring/history", selectedHost],
    enabled: !!selectedHost,
    queryFn: async () => {
      const to = new Date();
      const from = new Date(to.getTime() - 24 * 60 * 60 * 1000);
      return (await fetch(`/api/it/monitoring/history?hostId=${selectedHost}&from=${from.toISOString()}&to=${to.toISOString()}`)).json();
    },
  });

  useEffect(() => {
    fetch("/api/it/report-settings").then(res => res.ok ? res.json() : null).then(value => value && setSettings(value)).catch(() => {});
  }, []);

  const saveIssue = useMutation({
    mutationFn: (payload: any) => apiRequest("PATCH", `/api/it/issues/${selectedIssue.id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/it/issues"] });
      toast({ title: it.saveIssue });
    },
  });
  const addFollowUp = useMutation({
    mutationFn: (payload: any) => apiRequest("POST", `/api/it/issues/${selectedIssue.id}/updates`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/it/issues"] });
      queryClient.invalidateQueries({ queryKey: ["/api/it/issues", selectedIssue.id, "updates"] });
      toast({ title: it.followUpSaved });
    },
  });
  const generateReport = useMutation({
    mutationFn: () => apiRequest("POST", "/api/it/reports/generate", { email: reportEmail }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/it/reports"] });
      toast({ title: it.reportGenerated });
    },
  });
  const saveSettings = useMutation({
    mutationFn: () => apiRequest("PUT", "/api/it/report-settings", settings),
    onSuccess: () => toast({ title: it.reportSettings }),
  });

  const totals = useMemo(() => ({
    availability: summary.length ? summary.reduce((total, row) => total + Number(row.availability || 0), 0) / summary.length : 0,
    failed: summary.reduce((total, row) => total + Number(row.failedChecks || 0), 0),
    open: issues.filter(issue => issue.status !== "resolved").length,
  }), [summary, issues]);
  const interfaces = Array.from(new Set(bandwidth.map(row => row.interfaceName)));
  const bandwidthChart = Object.values(bandwidth.reduce((acc: Record<string, any>, row: any) => {
    acc[row.day] ||= { day: row.day };
    acc[row.day].tx = Number(acc[row.day].tx || 0) + Number(row.txMbpsTotal || 0);
    acc[row.day].rx = Number(acc[row.day].rx || 0) + Number(row.rxMbpsTotal || 0);
    return acc;
  }, {}));
  const historyChart = [...history].reverse().map(row => ({ time: new Date(row.checkedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), latency: row.responseTimeMs || 0, online: row.isOnline ? 1 : 0 }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={it.operationsTitle}
        description={it.operationsSubtitle}
        actions={<div className="flex gap-2">
          <Link href="/it-monitor-config"><Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />{t.nav.itMonitorConfig}</Button></Link>
          <Link href="/it-dashboard"><Button variant="outline"><Activity className="w-4 h-4 mr-2" />{it.viewDashboard}</Button></Link>
          <Button onClick={() => queryClient.invalidateQueries()} variant="outline"><RefreshCw className={`w-4 h-4 mr-2 ${summaryFetching || issuesFetching ? "animate-spin" : ""}`} />{t.labels.search}</Button>
        </div>}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={Gauge} label={it.availability} value={`${totals.availability.toFixed(2)}%`} detail="Last 7 days" />
        <StatCard icon={WifiOff} label={it.failedChecks} value={String(totals.failed)} detail={`${summary.length} ${it.checks.toLowerCase()}`} />
        <StatCard icon={AlertTriangle} label={it.openIssues} value={String(totals.open)} detail={it.unresolved} />
      </div>

      <Card>
        <CardContent className="p-4 grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
          <div><Label>{it.history} · {t.labels.from || "From"}</Label><Input type="date" value={fromDay} onChange={event => setFromDay(event.target.value)} /></div>
          <div><Label>{t.labels.to || "To"}</Label><Input type="date" value={toDay} onChange={event => setToDay(event.target.value)} /></div>
          <div><Label>{it.hostName}</Label><select className="h-10 w-full rounded-md border bg-background px-2 text-sm" value={issueHostId} onChange={event => setIssueHostId(event.target.value)}><option value="all">{t.labels.all}</option>{hosts.map(host => <option key={host.id} value={host.id}>{host.name}</option>)}</select></div>
          <div><Label>{it.status}</Label><select className="h-10 w-full rounded-md border bg-background px-2 text-sm" value={issueStatus} onChange={event => setIssueStatus(event.target.value)}><option value="all">{t.labels.all}</option><option value="open">open</option><option value="investigating">investigating</option><option value="resolved">{it.resolved}</option></select></div>
          <div><Label>{it.severity}</Label><select className="h-10 w-full rounded-md border bg-background px-2 text-sm" value={issueSeverity} onChange={event => setIssueSeverity(event.target.value)}><option value="all">{t.labels.all}</option><option value="low">low</option><option value="medium">medium</option><option value="high">high</option><option value="critical">critical</option></select></div>
          <div className="col-span-2 md:col-span-5 md:w-56"><Label>{it.owner}</Label><select className="h-10 w-full rounded-md border bg-background px-2 text-sm" value={issueOwnerId} onChange={event => setIssueOwnerId(event.target.value)}><option value="">{it.unassigned}</option>{issueAssignees.map(assignee => <option key={assignee.id} value={assignee.id}>{assignee.fullName}</option>)}</select></div>
        </CardContent>
      </Card>

      <Tabs defaultValue="status">
        <TabsList>
          <TabsTrigger value="status">{it.history}</TabsTrigger>
          <TabsTrigger value="issues">{it.issues}</TabsTrigger>
          <TabsTrigger value="bandwidth">{it.monthlyBandwidth}</TabsTrigger>
          <TabsTrigger value="reports">{it.reports}</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>{it.availability} · 7 days</CardTitle></CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-muted-foreground"><th className="p-3">{it.hostName}</th><th className="p-3">{it.availability}</th><th className="p-3">{it.averageLatency}</th><th className="p-3">{it.failedChecks}</th><th className="p-3">{it.history}</th></tr></thead>
                <tbody>{summary.map(row => <tr key={row.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{row.name}<div className="text-xs text-muted-foreground">{row.ipAddress}</div></td>
                  <td className="p-3"><Badge variant={Number(row.availability) >= 99 ? "default" : "destructive"}>{Number(row.availability).toFixed(2)}%</Badge></td>
                  <td className="p-3">{row.averageLatencyMs ? `${row.averageLatencyMs} ms` : "—"}</td><td className="p-3">{row.failedChecks}</td>
                  <td className="p-3"><Button size="sm" variant="ghost" onClick={() => setSelectedHost(row.id)}>{it.viewDetails}</Button></td>
                </tr>)}</tbody>
              </table>
              {summary.length === 0 && <p className="p-8 text-center text-muted-foreground">{it.noHosts}</p>}
            </CardContent>
          </Card>
          {selectedHost && <Card>
            <CardHeader><CardTitle>{it.history} · {hosts.find(host => host.id === selectedHost)?.name || selectedHost}</CardTitle></CardHeader>
            <CardContent><div className="h-56">
              <ResponsiveContainer width="100%" height="100%"><LineChart data={historyChart}><XAxis dataKey="time" tick={{ fontSize: 10 }} /><YAxis /><Tooltip /><Line type="monotone" dataKey="latency" name={`${it.averageLatency} (ms)`} stroke="#2563eb" dot={false} /></LineChart></ResponsiveContainer>
            </div><p className="text-xs text-muted-foreground mt-2">{history.filter(row => !row.isOnline).length} {it.failedChecks.toLowerCase()} in the last 24 hours</p></CardContent>
          </Card>}
        </TabsContent>

        <TabsContent value="issues" className="grid lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] gap-4">
          <Card><CardHeader><CardTitle>{it.issues}</CardTitle></CardHeader><CardContent className="space-y-2">
            {issues.map(issue => <button key={issue.id} onClick={() => setSelectedIssue({ ...issue })} className={`w-full text-left rounded-lg border p-3 hover:bg-muted/50 ${selectedIssue?.id === issue.id ? "border-primary" : ""}`}>
              <div className="flex items-center justify-between gap-2"><span className="font-medium">{issue.title}</span><Badge variant={issue.status === "resolved" ? "secondary" : issue.severity === "critical" || issue.severity === "high" ? "destructive" : "outline"}>{issue.status}</Badge></div>
              <p className="text-xs text-muted-foreground mt-1">{issue.hostName || "Network"} · {issue.issueType} · {new Date(issue.startedAt).toLocaleString(language === "pt" ? "pt-PT" : "en-US")}</p>
              <p className="text-xs text-muted-foreground">{it.owner}: {issue.assigneeName || it.unassigned}</p>
            </button>)}
            {issues.length === 0 && <p className="p-6 text-center text-muted-foreground">{it.noIssues}</p>}
          </CardContent></Card>
          {selectedIssue ? <IssueEditor issue={selectedIssue} updates={issueUpdates} assignees={issueAssignees} it={it} onSave={(payload: any) => saveIssue.mutate(payload)} onFollowUp={(payload: any) => addFollowUp.mutate(payload)} saving={saveIssue.isPending || addFollowUp.isPending} /> :
            <Card><CardContent className="p-8 text-center text-muted-foreground"><AlertTriangle className="w-8 h-8 mx-auto mb-2" />{it.viewDetails}</CardContent></Card>}
        </TabsContent>

        <TabsContent value="bandwidth" className="space-y-4">
          <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>{it.monthlyBandwidth}</CardTitle><div className="flex gap-2"><Input type="month" value={month} onChange={event => setMonth(event.target.value)} className="w-40" /><select value={bandwidthInterface} onChange={event => setBandwidthInterface(event.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="all">{t.labels.all}</option>{interfaces.map(name => <option key={name}>{name}</option>)}</select></div></CardHeader>
            <CardContent><div className="h-72">{bandwidthChart.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={bandwidthChart}><XAxis dataKey="day" tick={{ fontSize: 10 }} /><YAxis /><Tooltip /><Line type="monotone" dataKey="tx" name={`${it.tx} Mbps`} stroke="#2563eb" dot={false} /><Line type="monotone" dataKey="rx" name={`${it.rx} Mbps`} stroke="#16a34a" dot={false} /></LineChart></ResponsiveContainer> : <p className="py-20 text-center text-muted-foreground">{it.noDataMessage}</p>}</div>
              <div className="mt-4 text-xs text-muted-foreground">{bandwidth.reduce((sum, row) => sum + Number(row.samples || 0), 0)} {it.samples.toLowerCase()} · {interfaces.length} {it.hostType.toLowerCase()}</div>
            </CardContent></Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" />{it.reports}</CardTitle></CardHeader><CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3"><Button onClick={() => generateReport.mutate()} disabled={generateReport.isPending}><FileText className="w-4 h-4 mr-2" />{it.generateReport}</Button><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={reportEmail} onChange={event => setReportEmail(event.target.checked)} />{it.reportEmail}</label></div>
            <div className="space-y-2">{reports.map(report => <div key={report.id} className="border rounded-lg p-3 flex items-center justify-between"><div><p className="font-medium">{report.weekStart} → {report.weekEnd}</p><p className="text-xs text-muted-foreground">{new Date(report.generatedAt).toLocaleString(language === "pt" ? "pt-PT" : "en-US")} · {report.emailedAt ? "Emailed" : "Stored"}</p></div><Badge variant="outline">{Object.keys(report.reportJson || {}).length} sections</Badge></div>)}</div>
            {reports.length === 0 && <p className="text-muted-foreground">{it.noReports}</p>}
          </CardContent></Card>
          <Card><CardHeader><CardTitle>{it.reportSettings}</CardTitle></CardHeader><CardContent className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>{it.reportRecipients}</Label><textarea className="min-h-24 w-full rounded-md border bg-background p-2 text-sm" value={(settings.reportRecipients || []).join("\n")} onChange={event => setSettings({ ...settings, reportRecipients: event.target.value.split(/\r?\n/).map((value: string) => value.trim()).filter(Boolean) })} /><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!settings.emailReports} onChange={event => setSettings({ ...settings, emailReports: event.target.checked })} />{it.reportEmail}</label></div>
            <div className="space-y-2"><Label>Schedule</Label><div className="flex gap-2"><Input type="number" min="0" max="6" value={settings.reportDayOfWeek ?? 1} onChange={event => setSettings({ ...settings, reportDayOfWeek: Number(event.target.value) })} /><Input type="number" min="0" max="23" value={settings.reportHour ?? 8} onChange={event => setSettings({ ...settings, reportHour: Number(event.target.value) })} /></div><Button variant="outline" onClick={() => saveSettings.mutate()} disabled={saveSettings.isPending}><Save className="w-4 h-4 mr-2" />{t.buttons.save}</Button></div>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function IssueEditor({ issue, updates, assignees, it, onSave, onFollowUp, saving }: { issue: any; updates: any[]; assignees: ItIssueAssignee[]; it: any; onSave: (payload: any) => void; onFollowUp: (payload: any) => void; saving: boolean }) {
  const [form, setForm] = useState(issue);
  const [updateNote, setUpdateNote] = useState("");
  useEffect(() => setForm(issue), [issue]);
  const set = (key: string, value: unknown) => setForm((current: any) => ({ ...current, [key]: value }));
  return <Card><CardHeader><CardTitle className="text-base">{issue.title}</CardTitle></CardHeader><CardContent className="space-y-3">
    <div className="grid grid-cols-2 gap-3"><div><Label>{it.severity}</Label><select className="mt-1 h-10 w-full rounded-md border bg-background px-2 text-sm" value={form.severity} onChange={event => set("severity", event.target.value)}><option>low</option><option>medium</option><option>high</option><option>critical</option></select></div><div><Label>{it.status}</Label><select className="mt-1 h-10 w-full rounded-md border bg-background px-2 text-sm" value={form.status} onChange={event => set("status", event.target.value)}><option>open</option><option>investigating</option><option>resolved</option></select></div></div>
    <div className="grid grid-cols-2 gap-3"><div><Label>{it.owner}</Label><select className="mt-1 h-10 w-full rounded-md border bg-background px-2 text-sm" value={form.assignedToId?.toString() || ""} onChange={event => set("assignedToId", event.target.value ? Number(event.target.value) : null)}><option value="">{it.unassigned}</option>{assignees.map(assignee => <option key={assignee.id} value={assignee.id}>{assignee.fullName}</option>)}</select></div><div><Label>{it.targetDate}</Label><Input className="mt-1" type="date" value={form.targetDate || ""} onChange={event => set("targetDate", event.target.value || null)} /></div></div>
    <div><Label>{it.investigation}</Label><textarea className="mt-1 min-h-20 w-full rounded-md border bg-background p-2 text-sm" value={form.investigationNotes || ""} onChange={event => set("investigationNotes", event.target.value)} /></div>
    <div><Label>{it.correctiveAction}</Label><textarea className="mt-1 min-h-20 w-full rounded-md border bg-background p-2 text-sm" value={form.correctiveAction || ""} onChange={event => set("correctiveAction", event.target.value)} /></div>
    <div><Label>{it.resolution}</Label><textarea className="mt-1 min-h-20 w-full rounded-md border bg-background p-2 text-sm" value={form.resolutionDetails || ""} onChange={event => set("resolutionDetails", event.target.value)} /></div>
    <Button onClick={() => onSave({ ...form, updateNote })} disabled={saving}><Save className="w-4 h-4 mr-2" />{it.saveIssue}</Button>
    <div className="border-t pt-3"><Label>{it.updateNote}</Label><textarea className="mt-1 min-h-16 w-full rounded-md border bg-background p-2 text-sm" value={updateNote} onChange={event => setUpdateNote(event.target.value)} /><Button className="mt-2" variant="outline" onClick={() => { onFollowUp({ note: updateNote, status: form.status }); setUpdateNote(""); }} disabled={saving || !updateNote.trim()}><Clock3 className="w-4 h-4 mr-2" />{it.addFollowUp}</Button></div>
    {updates.length > 0 && <div className="border-t pt-3 space-y-2"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{it.history}</p>{updates.map(update => <div key={update.id} className="text-xs rounded bg-muted/40 p-2"><div className="flex justify-between gap-2"><span>{update.status || it.updateNote}</span><span className="text-muted-foreground">{new Date(update.createdAt).toLocaleString()}</span></div><p className="mt-1">{update.note || update.correctiveAction || update.resolutionDetails}</p><p className="mt-1 text-muted-foreground">{it.updatedBy}: {update.createdByName || it.unknownUser}</p></div>)}</div>}
  </CardContent></Card>;
}