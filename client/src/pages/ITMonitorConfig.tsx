import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/PageHeader";
import {
  Network, Plus, Pencil, Trash2, Wifi, WifiOff, Camera, Globe, GitMerge,
  Printer, Monitor, Server, HardDrive, Cpu, Smartphone, Tv, Shield,
  Zap, Activity, Layers, ExternalLink, RefreshCw, CheckCircle2, AlertCircle,
  Cctv, Webcam, ScanEye, Eye, Video, Router, Database, DatabaseBackup,
  ShieldCheck, ShieldAlert, Lock, KeyRound, Fingerprint,
  BellRing, Siren, AlarmSmoke, RadioTower, Antenna, Signal, MonitorPlay, Scan
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import type { ItHostWithStatus, ItKpi, ItKpiValue, ItHostType, InsertItMonitoredHost, InsertItKpi, InsertItKpiValue } from "@shared/schema";

type Host = ItHostWithStatus;
type Kpi = ItKpi;

// Icon registry for the icon picker — organized by category
const ICON_OPTIONS: { name: string; icon: React.ElementType; label: string }[] = [
  // Surveillance & Cameras
  { name: "cctv",            icon: Cctv,           label: "CCTV Camera" },
  { name: "webcam",          icon: Webcam,          label: "IP Camera / Webcam" },
  { name: "scan-eye",        icon: ScanEye,         label: "Surveillance Eye" },
  { name: "eye",             icon: Eye,             label: "Eye / Monitor" },
  { name: "video",           icon: Video,           label: "Video / DVR" },
  { name: "camera",          icon: Camera,          label: "Camera" },
  { name: "scan",            icon: Scan,            label: "Scanner" },
  // Storage & Recording
  { name: "database",        icon: Database,        label: "NVR / Database" },
  { name: "database-backup", icon: DatabaseBackup,  label: "NVR Backup" },
  { name: "hard-drive",      icon: HardDrive,       label: "Hard Drive / Storage" },
  { name: "server",          icon: Server,          label: "Server" },
  { name: "cpu",             icon: Cpu,             label: "CPU / Computer" },
  // Network
  { name: "router",          icon: Router,          label: "Router" },
  { name: "wifi",            icon: Wifi,            label: "WiFi / Access Point" },
  { name: "git-merge",       icon: GitMerge,        label: "Network Switch" },
  { name: "antenna",         icon: Antenna,         label: "Antenna" },
  { name: "radio-tower",     icon: RadioTower,      label: "Radio Tower" },
  { name: "signal",          icon: Signal,          label: "Signal" },
  { name: "network",         icon: Network,         label: "Network" },
  { name: "globe",           icon: Globe,           label: "Internet Link" },
  // Security & Access Control
  { name: "shield-check",    icon: ShieldCheck,     label: "Security OK" },
  { name: "shield-alert",    icon: ShieldAlert,     label: "Security Alert" },
  { name: "shield",          icon: Shield,          label: "Security" },
  { name: "lock",            icon: Lock,            label: "Access Control" },
  { name: "key-round",       icon: KeyRound,        label: "Key / Auth" },
  { name: "fingerprint",     icon: Fingerprint,     label: "Biometrics" },
  // Alarms & Alerts
  { name: "siren",           icon: Siren,           label: "Alarm / Siren" },
  { name: "bell-ring",       icon: BellRing,        label: "Alert / Bell" },
  { name: "alarm-smoke",     icon: AlarmSmoke,      label: "Smoke Detector" },
  // Displays & Output
  { name: "monitor-play",    icon: MonitorPlay,     label: "Display / Screen" },
  { name: "monitor",         icon: Monitor,         label: "Monitor" },
  { name: "tv",              icon: Tv,              label: "TV / Display" },
  { name: "printer",         icon: Printer,         label: "Printer" },
  { name: "smartphone",      icon: Smartphone,      label: "Phone / Mobile" },
  // General
  { name: "zap",             icon: Zap,             label: "Power / UPS" },
  { name: "activity",        icon: Activity,        label: "Activity / Health" },
  { name: "layers",          icon: Layers,          label: "Layers / Stack" },
];

const ICON_MAP: Record<string, React.ElementType> = Object.fromEntries(
  ICON_OPTIONS.map(o => [o.name, o.icon])
);

// Color options for the color picker
const COLOR_OPTIONS = [
  { name: "blue",   bg: "bg-blue-500",   text: "text-blue-600" },
  { name: "cyan",   bg: "bg-cyan-500",   text: "text-cyan-600" },
  { name: "green",  bg: "bg-green-500",  text: "text-green-600" },
  { name: "violet", bg: "bg-violet-500", text: "text-violet-600" },
  { name: "rose",   bg: "bg-rose-500",   text: "text-rose-600" },
  { name: "amber",  bg: "bg-amber-500",  text: "text-amber-600" },
  { name: "orange", bg: "bg-orange-500", text: "text-orange-600" },
  { name: "teal",   bg: "bg-teal-500",   text: "text-teal-600" },
  { name: "gray",   bg: "bg-gray-500",   text: "text-gray-600" },
  { name: "purple", bg: "bg-purple-500", text: "text-purple-600" },
];

function getIcon(iconName: string): React.ElementType {
  return ICON_MAP[iconName] || Monitor;
}

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

const BLANK_HOST = {
  name: "", ipAddress: "", hostType: "camera", isActive: true,
  sortOrder: "0", notes: "", departmentId: "",
};

const BLANK_KPI = {
  name: "", labelEn: "", labelPt: "", unit: "", sortOrder: "0", isActive: true,
};

const BLANK_HOST_TYPE = {
  slug: "", labelEn: "", labelPt: "", icon: "monitor",
  color: "blue", isInternetLink: false, isActive: true, sortOrder: "0",
};

function StatusBadge({ status }: { status: Host["status"] }) {
  if (!status) return <Badge variant="secondary">Never checked</Badge>;
  if (status.isOnline) {
    return (
      <Badge className="bg-green-600 text-white gap-1">
        <Wifi className="w-3 h-3" />
        Online {status.responseTimeMs != null ? `${status.responseTimeMs}ms` : ""}
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="gap-1">
      <WifiOff className="w-3 h-3" />
      Offline
    </Badge>
  );
}

function HostTypeIcon({ type, hostTypes }: { type: string; hostTypes: ItHostType[] }) {
  const typeInfo = hostTypes.find(t => t.slug === type);
  const iconName = typeInfo?.icon || "monitor";
  const Icon = getIcon(iconName);
  const colorClass = typeInfo?.color === "green" ? "text-green-500"
    : typeInfo?.color === "cyan" ? "text-cyan-500"
    : typeInfo?.color === "violet" ? "text-violet-500"
    : typeInfo?.color === "rose" ? "text-rose-500"
    : typeInfo?.color === "blue" ? "text-blue-500"
    : typeInfo?.color === "amber" ? "text-amber-500"
    : typeInfo?.color === "teal" ? "text-teal-500"
    : typeInfo?.color === "purple" ? "text-purple-500"
    : "text-gray-400";
  return <Icon className={`w-4 h-4 ${colorClass}`} />;
}

export default function ITMonitorConfig() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("hosts");

  // Host state
  const [hostDialog, setHostDialog] = useState(false);
  const [editHost, setEditHost] = useState<Host | null>(null);
  const [hostForm, setHostForm] = useState(BLANK_HOST);

  // KPI state
  const [kpiDialog, setKpiDialog] = useState(false);
  const [editKpi, setEditKpi] = useState<Kpi | null>(null);
  const [kpiForm, setKpiForm] = useState(BLANK_KPI);

  // Host Type state
  const [typeDialog, setTypeDialog] = useState(false);
  const [editType, setEditType] = useState<ItHostType | null>(null);
  const [typeForm, setTypeForm] = useState(BLANK_HOST_TYPE);
  const [slugManual, setSlugManual] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: number; name: string } | null>(null);

  // GLPI state
  const [glpiForm, setGlpiForm] = useState({ url: "", appToken: "", userToken: "", syncIntervalMinutes: "15", enabled: false });

  // Data entry
  const [dataEntryPeriodType, setDataEntryPeriodType] = useState("daily");
  const [dataEntryDate, setDataEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [kpiValues, setKpiValues] = useState<Record<number, string>>({});

  // Queries
  const { data: hostTypes = [] } = useQuery<ItHostType[]>({ queryKey: ["/api/it/host-types"] });
  const { data: hosts = [] } = useQuery<Host[]>({ queryKey: ["/api/it/hosts"], refetchInterval: 30000 });
  const { data: kpis = [] } = useQuery<Kpi[]>({ queryKey: ["/api/it/kpis"] });
  const { data: existingValues = [] } = useQuery<ItKpiValue[]>({
    queryKey: ["/api/it/kpi-values", dataEntryPeriodType, dataEntryDate],
    queryFn: async () => {
      const res = await fetch(`/api/it/kpi-values?periodType=${dataEntryPeriodType}&periodDate=${dataEntryDate}`);
      return res.json();
    },
  });

  useEffect(() => { setKpiValues({}); }, [dataEntryDate, dataEntryPeriodType]);

  // Host type mutations
  const createTypeMutation = useMutation({
    mutationFn: (data: object) => apiRequest("POST", "/api/it/host-types", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/it/host-types"] }); setTypeDialog(false); toast({ title: "Device type added" }); },
    onError: () => toast({ title: "Failed to add device type", variant: "destructive" }),
  });
  const updateTypeMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: object }) => apiRequest("PUT", `/api/it/host-types/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/it/host-types"] }); setTypeDialog(false); toast({ title: "Device type updated" }); },
    onError: () => toast({ title: "Failed to update device type", variant: "destructive" }),
  });
  const deleteTypeMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/it/host-types/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/it/host-types"] }); setDeleteTarget(null); toast({ title: "Device type deleted" }); },
    onError: () => toast({ title: "Failed to delete device type", variant: "destructive" }),
  });

  // Host mutations
  const createHostMutation = useMutation({
    mutationFn: (data: InsertItMonitoredHost) => apiRequest("POST", "/api/it/hosts", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/it/hosts"] }); setHostDialog(false); toast({ title: t.itMonitor?.hostAdded || "Host added" }); },
  });
  const updateHostMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertItMonitoredHost> }) => apiRequest("PUT", `/api/it/hosts/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/it/hosts"] }); setHostDialog(false); toast({ title: t.itMonitor?.hostUpdated || "Host updated" }); },
  });
  const deleteHostMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/it/hosts/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/it/hosts"] }); setDeleteTarget(null); toast({ title: t.itMonitor?.hostDeleted || "Host deleted" }); },
  });

  // KPI mutations
  const createKpiMutation = useMutation({
    mutationFn: (data: InsertItKpi) => apiRequest("POST", "/api/it/kpis", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/it/kpis"] }); setKpiDialog(false); toast({ title: t.itMonitor?.kpiAdded || "KPI added" }); },
  });
  const updateKpiMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertItKpi> }) => apiRequest("PUT", `/api/it/kpis/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/it/kpis"] }); setKpiDialog(false); toast({ title: t.itMonitor?.kpiUpdated || "KPI updated" }); },
  });
  const deleteKpiMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/it/kpis/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/it/kpis"] }); setDeleteTarget(null); toast({ title: t.itMonitor?.kpiDeleted || "KPI deleted" }); },
  });

  const saveValuesMutation = useMutation({
    mutationFn: (values: InsertItKpiValue[]) => apiRequest("POST", "/api/it/kpi-values", { values }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/it/kpi-values"] }); toast({ title: t.tvDashboard?.saveValues || "Values saved" }); },
  });

  // GLPI query & mutations — poll every 30s while tab is open to reflect auto-sync status
  const { data: glpiSettings, refetch: refetchGlpi } = useQuery<any>({
    queryKey: ["/api/it/glpi-settings"],
    queryFn: async () => {
      const res = await fetch("/api/it/glpi-settings");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: activeTab === "glpi" ? 30000 : false,
  });

  useEffect(() => {
    if (glpiSettings) {
      setGlpiForm({
        url: glpiSettings.url || "",
        appToken: glpiSettings.appToken || "",
        userToken: glpiSettings.userToken || "",
        syncIntervalMinutes: String(glpiSettings.syncIntervalMinutes ?? 15),
        enabled: !!glpiSettings.enabled,
      });
    }
  }, [glpiSettings]);

  const saveGlpiMutation = useMutation({
    mutationFn: (data: object) => apiRequest("PUT", "/api/it/glpi-settings", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/it/glpi-settings"] }); toast({ title: "GLPI settings saved" }); },
    onError: () => toast({ title: "Failed to save GLPI settings", variant: "destructive" }),
  });

  const syncGlpiMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/it/glpi-sync", {}),
    onSuccess: () => { refetchGlpi(); queryClient.invalidateQueries({ queryKey: ["/api/it/kpis"] }); queryClient.invalidateQueries({ queryKey: ["/api/it/kpi-values"] }); toast({ title: "GLPI sync complete" }); },
    onError: (err: any) => { refetchGlpi(); toast({ title: err?.message || "GLPI sync failed", variant: "destructive" }); },
  });

  // Dialog handlers
  const openTypeDialog = (ht?: ItHostType) => {
    if (ht) {
      setEditType(ht);
      setTypeForm({ slug: ht.slug, labelEn: ht.labelEn, labelPt: ht.labelPt, icon: ht.icon, color: ht.color, isInternetLink: ht.isInternetLink, isActive: ht.isActive, sortOrder: ht.sortOrder.toString() });
      setSlugManual(true);
    } else {
      setEditType(null);
      setTypeForm(BLANK_HOST_TYPE);
      setSlugManual(false);
    }
    setTypeDialog(true);
  };

  const submitType = () => {
    const data = { ...typeForm, sortOrder: parseInt(typeForm.sortOrder) || 0 };
    if (editType) updateTypeMutation.mutate({ id: editType.id, data });
    else createTypeMutation.mutate(data);
  };

  const openHostDialog = (host?: Host) => {
    if (host) {
      setEditHost(host);
      setHostForm({ name: host.name, ipAddress: host.ipAddress, hostType: host.hostType, isActive: host.isActive, sortOrder: host.sortOrder.toString(), notes: host.notes || "", departmentId: host.departmentId?.toString() || "" });
    } else {
      setEditHost(null);
      const defaultType = hostTypes.find(t => t.isActive && !t.isInternetLink)?.slug || "camera";
      setHostForm({ ...BLANK_HOST, hostType: defaultType });
    }
    setHostDialog(true);
  };

  const submitHost = () => {
    const data = { ...hostForm, sortOrder: parseInt(hostForm.sortOrder) || 0, departmentId: hostForm.departmentId ? parseInt(hostForm.departmentId) : null, notes: hostForm.notes || null };
    if (editHost) updateHostMutation.mutate({ id: editHost.id, data });
    else createHostMutation.mutate(data);
  };

  const openKpiDialog = (kpi?: Kpi) => {
    if (kpi) {
      setEditKpi(kpi);
      setKpiForm({ name: kpi.name, labelEn: kpi.labelEn, labelPt: kpi.labelPt, unit: kpi.unit || "", sortOrder: kpi.sortOrder.toString(), isActive: kpi.isActive });
    } else {
      setEditKpi(null);
      setKpiForm(BLANK_KPI);
    }
    setKpiDialog(true);
  };

  const submitKpi = () => {
    const data = { ...kpiForm, sortOrder: parseInt(kpiForm.sortOrder) || 0, unit: kpiForm.unit || null };
    if (editKpi) updateKpiMutation.mutate({ id: editKpi.id, data });
    else createKpiMutation.mutate(data);
  };

  const handleSaveValues = () => {
    const values = kpis
      .filter(k => k.isActive && kpiValues[k.id] !== undefined && kpiValues[k.id] !== "")
      .map(k => ({ kpiId: k.id, periodType: dataEntryPeriodType, periodDate: dataEntryDate, value: kpiValues[k.id] }));
    if (values.length > 0) saveValuesMutation.mutate(values);
  };

  const getExistingValue = (kpiId: number) => {
    const v = existingValues.find(v => v.kpiId === kpiId);
    return v ? String(v.value) : "";
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "host") deleteHostMutation.mutate(deleteTarget.id);
    else if (deleteTarget.type === "kpi") deleteKpiMutation.mutate(deleteTarget.id);
    else if (deleteTarget.type === "hosttype") deleteTypeMutation.mutate(deleteTarget.id);
  };

  const it = t.itMonitor;
  const tvT = t.tvDashboard;

  const getTypeLabel = (slug: string) => {
    const ht = hostTypes.find(t => t.slug === slug);
    return ht ? ht.labelEn : slug;
  };

  return (
    <div>
      <PageHeader
        icon={<Network className="w-5 h-5 text-primary" />}
        title={it.configTitle || "IT Monitor Configuration"}
        description={it.configSubtitle || "Manage monitored hosts, cameras, and IT dashboard KPIs"}
        actions={
          <a href="/it-dashboard" target="_blank" rel="noopener noreferrer" data-testid="button-view-it-dashboard">
            <Button variant="outline">
              <ExternalLink className="w-4 h-4 mr-2" />
              {it.viewDashboard || "View IT Dashboard"}
            </Button>
          </a>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList>
          <TabsTrigger value="hosts" data-testid="tab-hosts">{it.hostsTab || "Monitored Hosts"}</TabsTrigger>
          <TabsTrigger value="types" data-testid="tab-types">Device Types</TabsTrigger>
          <TabsTrigger value="kpis" data-testid="tab-kpis">{it.kpisTab || "KPIs"}</TabsTrigger>
          <TabsTrigger value="dataentry" data-testid="tab-data-entry">{it.dataEntryTab || "Data Entry"}</TabsTrigger>
          <TabsTrigger value="glpi" data-testid="tab-glpi">GLPI</TabsTrigger>
        </TabsList>

        {/* ── Monitored Hosts tab ── */}
        <TabsContent value="hosts" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button onClick={() => openHostDialog()} data-testid="button-add-host">
              <Plus className="w-4 h-4 mr-2" />
              {it.addHost || "Add Host"}
            </Button>
          </div>
          {hosts.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <Network className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">{it.noHosts || "No hosts configured"}</p>
              <p className="text-sm mt-1">{it.noHostsMessage || "Add internet links and cameras to start monitoring."}</p>
            </CardContent></Card>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full" data-testid="table-hosts">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left p-3 text-sm font-medium">{it.hostName || "Name"}</th>
                    <th className="text-left p-3 text-sm font-medium">{it.ipAddress || "IP Address"}</th>
                    <th className="text-left p-3 text-sm font-medium">{it.hostType || "Type"}</th>
                    <th className="text-left p-3 text-sm font-medium">{it.status || "Status"}</th>
                    <th className="text-center p-3 text-sm font-medium">{it.active || "Active"}</th>
                    <th className="text-right p-3 text-sm font-medium w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  {hosts.map(host => (
                    <tr key={host.id} className="border-t hover:bg-muted/30" data-testid={`row-host-${host.id}`}>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <HostTypeIcon type={host.hostType} hostTypes={hostTypes} />
                          <span className="font-medium">{host.name}</span>
                        </div>
                        {host.notes && <p className="text-xs text-muted-foreground mt-0.5">{host.notes}</p>}
                      </td>
                      <td className="p-3 font-mono text-sm text-muted-foreground">{host.ipAddress}</td>
                      <td className="p-3 text-sm">{getTypeLabel(host.hostType)}</td>
                      <td className="p-3"><StatusBadge status={host.status} /></td>
                      <td className="p-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs ${host.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500"}`}>
                          {host.isActive ? (it.active || "Active") : (it.inactive || "Inactive")}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <Button variant="ghost" size="icon" onClick={() => openHostDialog(host)} data-testid={`button-edit-host-${host.id}`}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ type: "host", id: host.id, name: host.name })} data-testid={`button-delete-host-${host.id}`}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ── Device Types tab ── */}
        <TabsContent value="types" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button onClick={() => openTypeDialog()} data-testid="button-add-type">
              <Plus className="w-4 h-4 mr-2" />
              Add Device Type
            </Button>
          </div>
          {hostTypes.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <Monitor className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No device types configured</p>
              <p className="text-sm mt-1">Add device types to categorise your monitored hosts.</p>
            </CardContent></Card>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full" data-testid="table-types">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left p-3 text-sm font-medium">Icon</th>
                    <th className="text-left p-3 text-sm font-medium">Label (EN)</th>
                    <th className="text-left p-3 text-sm font-medium">Label (PT)</th>
                    <th className="text-left p-3 text-sm font-medium">Slug</th>
                    <th className="text-center p-3 text-sm font-medium">Internet Link</th>
                    <th className="text-center p-3 text-sm font-medium">Active</th>
                    <th className="text-right p-3 text-sm font-medium w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  {hostTypes.map(ht => {
                    const Icon = getIcon(ht.icon);
                    const colorOpt = COLOR_OPTIONS.find(c => c.name === ht.color);
                    return (
                      <tr key={ht.id} className="border-t hover:bg-muted/30" data-testid={`row-type-${ht.id}`}>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-lg ${colorOpt?.bg || "bg-gray-500"} bg-opacity-20 flex items-center justify-center`}>
                              <Icon className={`w-4 h-4 ${colorOpt?.text || "text-gray-500"}`} />
                            </div>
                          </div>
                        </td>
                        <td className="p-3 font-medium">{ht.labelEn}</td>
                        <td className="p-3 text-sm text-muted-foreground">{ht.labelPt}</td>
                        <td className="p-3 font-mono text-xs text-muted-foreground">{ht.slug}</td>
                        <td className="p-3 text-center">
                          {ht.isInternetLink ? <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Pill</Badge> : <Badge variant="outline">Card</Badge>}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs ${ht.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500"}`}>
                            {ht.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <Button variant="ghost" size="icon" onClick={() => openTypeDialog(ht)} data-testid={`button-edit-type-${ht.id}`}><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ type: "hosttype", id: ht.id, name: ht.labelEn })} data-testid={`button-delete-type-${ht.id}`}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ── KPIs tab ── */}
        <TabsContent value="kpis" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button onClick={() => openKpiDialog()} data-testid="button-add-kpi">
              <Plus className="w-4 h-4 mr-2" />
              {it.addKpi || "Add KPI"}
            </Button>
          </div>
          {kpis.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <p className="font-medium">{it.noKpis || "No KPIs configured"}</p>
              <p className="text-sm mt-1">{it.noKpisMessage || "Add KPIs to track on the IT dashboard."}</p>
            </CardContent></Card>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full" data-testid="table-kpis">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left p-3 text-sm font-medium">{tvT.kpiName || "Name"}</th>
                    <th className="text-left p-3 text-sm font-medium">{tvT.labelEn || "Label (EN)"}</th>
                    <th className="text-left p-3 text-sm font-medium">{tvT.labelPt || "Label (PT)"}</th>
                    <th className="text-left p-3 text-sm font-medium">{tvT.kpiUnit || "Unit"}</th>
                    <th className="text-center p-3 text-sm font-medium">{tvT.active || "Active"}</th>
                    <th className="text-right p-3 text-sm font-medium w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  {kpis.map(kpi => (
                    <tr key={kpi.id} className="border-t hover:bg-muted/30" data-testid={`row-kpi-${kpi.id}`}>
                      <td className="p-3 font-medium">{kpi.name}</td>
                      <td className="p-3 text-sm text-muted-foreground">{kpi.labelEn || "-"}</td>
                      <td className="p-3 text-sm text-muted-foreground">{kpi.labelPt || "-"}</td>
                      <td className="p-3 text-sm text-muted-foreground">{kpi.unit || "-"}</td>
                      <td className="p-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs ${kpi.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500"}`}>
                          {kpi.isActive ? (it.active || "Active") : (it.inactive || "Inactive")}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <Button variant="ghost" size="icon" onClick={() => openKpiDialog(kpi)} data-testid={`button-edit-kpi-${kpi.id}`}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ type: "kpi", id: kpi.id, name: kpi.name })} data-testid={`button-delete-kpi-${kpi.id}`}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ── Data Entry tab ── */}
        <TabsContent value="dataentry" className="mt-4">
          <div className="flex items-center gap-4 mb-6">
            <div>
              <Label className="text-sm mb-1 block">{tvT.periodType || "Period Type"}</Label>
              <Select value={dataEntryPeriodType} onValueChange={setDataEntryPeriodType}>
                <SelectTrigger className="w-40" data-testid="select-period-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{tvT.daily || "Daily"}</SelectItem>
                  <SelectItem value="monthly">{tvT.monthly || "Monthly"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm mb-1 block">{tvT.periodDate || "Date"}</Label>
              <Input
                type={dataEntryPeriodType === "monthly" ? "month" : "date"}
                value={dataEntryPeriodType === "monthly" ? dataEntryDate.substring(0, 7) : dataEntryDate}
                onChange={e => setDataEntryDate(dataEntryPeriodType === "monthly" ? e.target.value + "-01" : e.target.value)}
                className="w-48"
                data-testid="input-period-date"
              />
            </div>
          </div>
          {kpis.filter(k => k.isActive).length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <p className="font-medium">{tvT.noDataEntry || "No KPIs available"}</p>
              <p className="text-sm mt-1">{tvT.noDataEntryMessage || "Define KPIs first."}</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-4">
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full" data-testid="table-data-entry">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left p-3 text-sm font-medium">{tvT.kpiName || "KPI"}</th>
                      <th className="text-left p-3 text-sm font-medium">{tvT.kpiUnit || "Unit"}</th>
                      <th className="text-left p-3 text-sm font-medium">{tvT.value || "Value"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kpis.filter(k => k.isActive).map(kpi => (
                      <tr key={kpi.id} className="border-t" data-testid={`row-data-${kpi.id}`}>
                        <td className="p-3 font-medium">{kpi.labelEn || kpi.name}</td>
                        <td className="p-3 text-sm text-muted-foreground">{kpi.unit || "-"}</td>
                        <td className="p-3">
                          <Input
                            type="number" step="any"
                            placeholder={tvT.enterValue || "Enter value"}
                            value={kpiValues[kpi.id] ?? getExistingValue(kpi.id)}
                            onChange={e => setKpiValues(prev => ({ ...prev, [kpi.id]: e.target.value }))}
                            className="w-48"
                            data-testid={`input-value-${kpi.id}`}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveValues} disabled={saveValuesMutation.isPending} data-testid="button-save-values">
                  {saveValuesMutation.isPending ? (tvT.savingValues || "Saving...") : (tvT.saveValues || "Save Values")}
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── GLPI Integration tab ── */}
        <TabsContent value="glpi" className="mt-4">
          <div className="max-w-xl space-y-6">
            <Card>
              <CardContent className="pt-6 space-y-5">
                <div className="flex items-center gap-3 pb-2 border-b">
                  <Database className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-semibold">GLPI Integration</p>
                    <p className="text-sm text-muted-foreground">Automatically pull ticket counts into IT Dashboard KPIs</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>GLPI URL</Label>
                  <Input
                    value={glpiForm.url}
                    onChange={e => setGlpiForm(p => ({ ...p, url: e.target.value }))}
                    placeholder="http://192.168.1.100/glpi"
                    data-testid="input-glpi-url"
                  />
                  <p className="text-xs text-muted-foreground">Base URL of your GLPI installation (no trailing slash)</p>
                </div>

                <div className="space-y-1">
                  <Label>Application Token</Label>
                  <Input
                    value={glpiForm.appToken}
                    onChange={e => setGlpiForm(p => ({ ...p, appToken: e.target.value }))}
                    placeholder="Your GLPI App-Token"
                    data-testid="input-glpi-app-token"
                  />
                  <p className="text-xs text-muted-foreground">Found in GLPI → Setup → General → API (Application token)</p>
                </div>

                <div className="space-y-1">
                  <Label>User API Token</Label>
                  <Input
                    type="password"
                    value={glpiForm.userToken}
                    onChange={e => setGlpiForm(p => ({ ...p, userToken: e.target.value }))}
                    placeholder="Your GLPI User Token"
                    data-testid="input-glpi-user-token"
                  />
                  <p className="text-xs text-muted-foreground">Found in GLPI → User profile → Remote access keys (API token)</p>
                </div>

                <div className="space-y-1">
                  <Label>Sync Interval (minutes)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="1440"
                    value={glpiForm.syncIntervalMinutes}
                    onChange={e => setGlpiForm(p => ({ ...p, syncIntervalMinutes: e.target.value }))}
                    className="w-32"
                    data-testid="input-glpi-interval"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <Switch
                    checked={glpiForm.enabled}
                    onCheckedChange={v => setGlpiForm(p => ({ ...p, enabled: v }))}
                    data-testid="switch-glpi-enabled"
                  />
                  <Label>Enable automatic sync</Label>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={() => saveGlpiMutation.mutate({ ...glpiForm, syncIntervalMinutes: parseInt(glpiForm.syncIntervalMinutes) || 15 })}
                    disabled={saveGlpiMutation.isPending}
                    data-testid="button-save-glpi"
                  >
                    {saveGlpiMutation.isPending ? "Saving..." : "Save Settings"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => syncGlpiMutation.mutate()}
                    disabled={syncGlpiMutation.isPending || !glpiSettings?.url}
                    data-testid="button-sync-glpi-now"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${syncGlpiMutation.isPending ? "animate-spin" : ""}`} />
                    {syncGlpiMutation.isPending ? "Syncing..." : "Sync Now"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Sync Status */}
            {(glpiSettings?.lastSyncAt || glpiSettings?.lastError) && (
              <Card>
                <CardContent className="pt-6 space-y-3">
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Sync Status</p>
                  {glpiSettings?.lastSyncAt && (
                    <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      Last synced: {new Date(glpiSettings.lastSyncAt).toLocaleString()}
                    </div>
                  )}
                  {glpiSettings?.lastError && (
                    <div className="flex items-start gap-2 text-sm text-destructive">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span className="font-mono text-xs bg-destructive/10 rounded px-2 py-1 break-all">{glpiSettings.lastError}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card className="border-muted/50">
              <CardContent className="pt-6">
                <p className="text-sm font-semibold mb-3">KPIs created automatically</p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />Open Tickets — active tickets (New, Processing, Pending)</li>
                  <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />New Today — tickets opened today</li>
                  <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />Resolved Today — tickets resolved or closed today</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Device Type Dialog ── */}
      <Dialog open={typeDialog} onOpenChange={setTypeDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editType ? "Edit Device Type" : "Add Device Type"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Label (English) *</Label>
                <Input
                  value={typeForm.labelEn}
                  onChange={e => {
                    const v = e.target.value;
                    setTypeForm(p => ({ ...p, labelEn: v, ...(!slugManual ? { slug: slugify(v) } : {}) }));
                  }}
                  placeholder="e.g. Camera"
                  data-testid="input-type-label-en"
                />
              </div>
              <div className="space-y-1">
                <Label>Label (Portuguese) *</Label>
                <Input
                  value={typeForm.labelPt}
                  onChange={e => setTypeForm(p => ({ ...p, labelPt: e.target.value }))}
                  placeholder="e.g. Câmera"
                  data-testid="input-type-label-pt"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Slug (machine key)</Label>
              <Input
                value={typeForm.slug}
                onChange={e => { setTypeForm(p => ({ ...p, slug: e.target.value })); setSlugManual(true); }}
                placeholder="camera"
                disabled={!!editType}
                className="font-mono text-sm"
                data-testid="input-type-slug"
              />
              <p className="text-xs text-muted-foreground">Auto-generated from English label. Cannot be changed after creation.</p>
            </div>
            <div className="space-y-2">
              <Label>Icon</Label>
              <div className="grid grid-cols-8 gap-1.5 p-2 border rounded-lg bg-muted/30">
                {ICON_OPTIONS.map(opt => {
                  const Icon = opt.icon;
                  const selected = typeForm.icon === opt.name;
                  return (
                    <button
                      key={opt.name}
                      type="button"
                      title={opt.label}
                      onClick={() => setTypeForm(p => ({ ...p, icon: opt.name }))}
                      className={`p-2 rounded-md flex items-center justify-center transition-colors ${selected ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                      data-testid={`icon-option-${opt.name}`}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2 p-2 border rounded-lg bg-muted/30">
                {COLOR_OPTIONS.map(c => (
                  <button
                    key={c.name}
                    type="button"
                    title={c.name}
                    onClick={() => setTypeForm(p => ({ ...p, color: c.name }))}
                    className={`w-7 h-7 rounded-full ${c.bg} transition-transform ${typeForm.color === c.name ? "ring-2 ring-offset-2 ring-foreground scale-110" : "opacity-70 hover:opacity-100"}`}
                    data-testid={`color-option-${c.name}`}
                  />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Sort Order</Label>
                <Input type="number" value={typeForm.sortOrder} onChange={e => setTypeForm(p => ({ ...p, sortOrder: e.target.value }))} data-testid="input-type-sort-order" />
              </div>
              <div className="space-y-3 pt-5">
                <div className="flex items-center gap-2">
                  <Switch checked={typeForm.isInternetLink} onCheckedChange={v => setTypeForm(p => ({ ...p, isInternetLink: v }))} data-testid="switch-type-internet-link" />
                  <Label className="text-sm">Internet Link (pill display)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={typeForm.isActive} onCheckedChange={v => setTypeForm(p => ({ ...p, isActive: v }))} data-testid="switch-type-active" />
                  <Label className="text-sm">Active</Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setTypeDialog(false)}>{t.buttons.cancel}</Button>
            <Button
              onClick={submitType}
              disabled={!typeForm.labelEn || !typeForm.labelPt || !typeForm.slug || createTypeMutation.isPending || updateTypeMutation.isPending}
              data-testid="button-submit-type"
            >
              {t.buttons.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Host Dialog ── */}
      <Dialog open={hostDialog} onOpenChange={setHostDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editHost ? (it.editHost || "Edit Host") : (it.addHost || "Add Host")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label>{it.hostName || "Name"}</Label>
              <Input value={hostForm.name} onChange={e => setHostForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Main Gate Camera" data-testid="input-host-name" />
            </div>
            <div className="space-y-1">
              <Label>{it.ipAddress || "IP Address"}</Label>
              <Input value={hostForm.ipAddress} onChange={e => setHostForm(p => ({ ...p, ipAddress: e.target.value }))} placeholder="192.168.1.100" data-testid="input-ip-address" />
              <p className="text-xs text-muted-foreground">IPv4 only (e.g. 192.168.1.100)</p>
            </div>
            <div className="space-y-1">
              <Label>{it.hostType || "Type"}</Label>
              <Select value={hostForm.hostType} onValueChange={v => setHostForm(p => ({ ...p, hostType: v }))}>
                <SelectTrigger data-testid="select-host-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {hostTypes.filter(ht => ht.isActive).map(ht => {
                    const Icon = getIcon(ht.icon);
                    return (
                      <SelectItem key={ht.slug} value={ht.slug} data-testid={`type-option-${ht.slug}`}>
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          {ht.labelEn}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{it.sortOrder || "Sort Order"}</Label>
              <Input type="number" value={hostForm.sortOrder} onChange={e => setHostForm(p => ({ ...p, sortOrder: e.target.value }))} data-testid="input-sort-order" />
            </div>
            <div className="space-y-1">
              <Label>{it.notes || "Notes (optional)"}</Label>
              <Input value={hostForm.notes} onChange={e => setHostForm(p => ({ ...p, notes: e.target.value }))} data-testid="input-notes" />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={hostForm.isActive} onCheckedChange={v => setHostForm(p => ({ ...p, isActive: v }))} data-testid="switch-active" />
              <Label>{it.active || "Active"}</Label>
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setHostDialog(false)}>{t.buttons.cancel}</Button>
            <Button onClick={submitHost} disabled={!hostForm.name || !hostForm.ipAddress || createHostMutation.isPending || updateHostMutation.isPending} data-testid="button-submit-host">
              {t.buttons.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── KPI Dialog ── */}
      <Dialog open={kpiDialog} onOpenChange={setKpiDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editKpi ? (it.editKpi || "Edit KPI") : (it.addKpi || "Add KPI")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label>{tvT.kpiName || "Name"}</Label>
              <Input value={kpiForm.name} onChange={e => setKpiForm(p => ({ ...p, name: e.target.value }))} data-testid="input-kpi-name" />
            </div>
            <div className="space-y-1">
              <Label>{tvT.labelEn || "Label (English)"}</Label>
              <Input value={kpiForm.labelEn} onChange={e => setKpiForm(p => ({ ...p, labelEn: e.target.value }))} data-testid="input-label-en" />
            </div>
            <div className="space-y-1">
              <Label>{tvT.labelPt || "Label (Portuguese)"}</Label>
              <Input value={kpiForm.labelPt} onChange={e => setKpiForm(p => ({ ...p, labelPt: e.target.value }))} data-testid="input-label-pt" />
            </div>
            <div className="space-y-1">
              <Label>{tvT.kpiUnit || "Unit (optional)"}</Label>
              <Input value={kpiForm.unit} onChange={e => setKpiForm(p => ({ ...p, unit: e.target.value }))} placeholder="e.g. tickets, hrs" data-testid="input-kpi-unit" />
            </div>
            <div className="space-y-1">
              <Label>{tvT.sortOrder || "Sort Order"}</Label>
              <Input type="number" value={kpiForm.sortOrder} onChange={e => setKpiForm(p => ({ ...p, sortOrder: e.target.value }))} data-testid="input-kpi-sort-order" />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={kpiForm.isActive} onCheckedChange={v => setKpiForm(p => ({ ...p, isActive: v }))} data-testid="switch-kpi-active" />
              <Label>{tvT.active || "Active"}</Label>
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setKpiDialog(false)}>{t.buttons.cancel}</Button>
            <Button onClick={submitKpi} disabled={!kpiForm.name || createKpiMutation.isPending || updateKpiMutation.isPending} data-testid="button-submit-kpi">
              {t.buttons.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.buttons.delete}</AlertDialogTitle>
            <AlertDialogDescription>Delete "{deleteTarget?.name}"? This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.buttons.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t.buttons.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
