import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { Network, Plus, Pencil, Trash2, Wifi, WifiOff, Camera, Globe } from "lucide-react";
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
import { ExternalLink } from "lucide-react";
import type { ItHostWithStatus, ItKpi, ItKpiValue, InsertItMonitoredHost, InsertItKpi, InsertItKpiValue } from "@shared/schema";

type Host = ItHostWithStatus;
type Kpi = ItKpi;

const BLANK_HOST = {
  name: "",
  ipAddress: "",
  hostType: "camera" as const,
  isActive: true,
  sortOrder: "0",
  notes: "",
  departmentId: "",
};

const BLANK_KPI = {
  name: "",
  labelEn: "",
  labelPt: "",
  unit: "",
  sortOrder: "0",
  isActive: true,
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

function HostTypeIcon({ type }: { type: string }) {
  if (type === "camera") return <Camera className="w-4 h-4 text-blue-500" />;
  if (type === "internet_link") return <Globe className="w-4 h-4 text-green-500" />;
  return <Network className="w-4 h-4 text-gray-400" />;
}

export default function ITMonitorConfig() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("hosts");
  const [hostDialog, setHostDialog] = useState(false);
  const [editHost, setEditHost] = useState<Host | null>(null);
  const [hostForm, setHostForm] = useState(BLANK_HOST);
  const [kpiDialog, setKpiDialog] = useState(false);
  const [editKpi, setEditKpi] = useState<Kpi | null>(null);
  const [kpiForm, setKpiForm] = useState(BLANK_KPI);
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: number; name: string } | null>(null);

  const [dataEntryPeriodType, setDataEntryPeriodType] = useState("daily");
  const [dataEntryDate, setDataEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [kpiValues, setKpiValues] = useState<Record<number, string>>({});

  const { data: hosts = [], refetch: refetchHosts } = useQuery<Host[]>({
    queryKey: ["/api/it/hosts"],
    refetchInterval: 30000,
  });

  const { data: kpis = [] } = useQuery<Kpi[]>({ queryKey: ["/api/it/kpis"] });

  const { data: existingValues = [] } = useQuery<ItKpiValue[]>({
    queryKey: ["/api/it/kpi-values", dataEntryPeriodType, dataEntryDate],
    queryFn: async () => {
      const res = await fetch(`/api/it/kpi-values?periodType=${dataEntryPeriodType}&periodDate=${dataEntryDate}`);
      return res.json();
    },
  });

  useEffect(() => {
    setKpiValues({});
  }, [dataEntryDate, dataEntryPeriodType]);

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

  const openHostDialog = (host?: Host) => {
    if (host) {
      setEditHost(host);
      setHostForm({ name: host.name, ipAddress: host.ipAddress, hostType: host.hostType, isActive: host.isActive, sortOrder: host.sortOrder.toString(), notes: host.notes || "", departmentId: host.departmentId?.toString() || "" });
    } else {
      setEditHost(null);
      setHostForm(BLANK_HOST);
    }
    setHostDialog(true);
  };

  const submitHost = () => {
    const data = { ...hostForm, sortOrder: parseInt(hostForm.sortOrder) || 0, departmentId: hostForm.departmentId ? parseInt(hostForm.departmentId) : null, notes: hostForm.notes || null };
    if (editHost) {
      updateHostMutation.mutate({ id: editHost.id, data });
    } else {
      createHostMutation.mutate(data);
    }
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
    if (editKpi) {
      updateKpiMutation.mutate({ id: editKpi.id, data });
    } else {
      createKpiMutation.mutate(data);
    }
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
  };

  const it = t.itMonitor;
  const tvT = t.tvDashboard;

  return (
    <div>
      <PageHeader
        icon={<Network className="w-5 h-5 text-primary" />}
        title={it.configTitle || "IT Monitor Configuration"}
        description={it.configSubtitle || "Manage monitored hosts and IT dashboard KPIs"}
        actions={
          <Button variant="outline" onClick={() => window.open("/it-dashboard", "_blank")} data-testid="button-view-it-dashboard">
            <ExternalLink className="w-4 h-4 mr-2" />
            {it.viewDashboard || "View IT Dashboard"}
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList>
          <TabsTrigger value="hosts" data-testid="tab-hosts">{it.hostsTab || "Monitored Hosts"}</TabsTrigger>
          <TabsTrigger value="kpis" data-testid="tab-kpis">{it.kpisTab || "KPIs"}</TabsTrigger>
          <TabsTrigger value="dataentry" data-testid="tab-data-entry">{it.dataEntryTab || "Data Entry"}</TabsTrigger>
        </TabsList>

        <TabsContent value="hosts" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button onClick={() => openHostDialog()} data-testid="button-add-host">
              <Plus className="w-4 h-4 mr-2" />
              {it.addHost || "Add Host"}
            </Button>
          </div>

          {hosts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Network className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">{it.noHosts || "No hosts configured"}</p>
                <p className="text-sm mt-1">{it.noHostsMessage || "Add internet links and cameras to start monitoring."}</p>
              </CardContent>
            </Card>
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
                          <HostTypeIcon type={host.hostType} />
                          <span className="font-medium">{host.name}</span>
                        </div>
                        {host.notes && <p className="text-xs text-muted-foreground mt-0.5">{host.notes}</p>}
                      </td>
                      <td className="p-3 font-mono text-sm text-muted-foreground">{host.ipAddress}</td>
                      <td className="p-3 text-sm">
                        {host.hostType === "internet_link" ? (it.typeInternetLink || "Internet Link") : host.hostType === "camera" ? (it.typeCamera || "Camera") : (it.typeOther || "Other")}
                      </td>
                      <td className="p-3"><StatusBadge status={host.status} /></td>
                      <td className="p-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs ${host.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500"}`}>
                          {host.isActive ? (it.active || "Active") : (it.inactive || "Inactive")}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <Button variant="ghost" size="icon" onClick={() => openHostDialog(host)} data-testid={`button-edit-host-${host.id}`}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ type: "host", id: host.id, name: host.name })} data-testid={`button-delete-host-${host.id}`}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="kpis" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button onClick={() => openKpiDialog()} data-testid="button-add-kpi">
              <Plus className="w-4 h-4 mr-2" />
              {it.addKpi || "Add KPI"}
            </Button>
          </div>

          {kpis.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <p className="font-medium">{it.noKpis || "No KPIs configured"}</p>
                <p className="text-sm mt-1">{it.noKpisMessage || "Add KPIs to track on the IT dashboard."}</p>
              </CardContent>
            </Card>
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
                        <Button variant="ghost" size="icon" onClick={() => openKpiDialog(kpi)} data-testid={`button-edit-kpi-${kpi.id}`}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ type: "kpi", id: kpi.id, name: kpi.name })} data-testid={`button-delete-kpi-${kpi.id}`}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="dataentry" className="mt-4">
          <div className="flex items-center gap-4 mb-6">
            <div>
              <Label className="text-sm mb-1 block">{tvT.periodType || "Period Type"}</Label>
              <Select value={dataEntryPeriodType} onValueChange={setDataEntryPeriodType}>
                <SelectTrigger className="w-40" data-testid="select-period-type">
                  <SelectValue />
                </SelectTrigger>
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
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <p className="font-medium">{tvT.noDataEntry || "No KPIs available"}</p>
                <p className="text-sm mt-1">{tvT.noDataEntryMessage || "Define KPIs first."}</p>
              </CardContent>
            </Card>
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
                            type="number"
                            step="any"
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
      </Tabs>

      {/* Host Dialog */}
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
              <Input value={hostForm.ipAddress} onChange={e => setHostForm(p => ({ ...p, ipAddress: e.target.value }))} placeholder="192.168.1.100" pattern="^(\d{1,3}\.){3}\d{1,3}$" data-testid="input-ip-address" />
              <p className="text-xs text-muted-foreground">IPv4 only (e.g. 192.168.1.100)</p>
            </div>
            <div className="space-y-1">
              <Label>{it.hostType || "Type"}</Label>
              <Select value={hostForm.hostType} onValueChange={v => setHostForm(p => ({ ...p, hostType: v as "internet_link" | "camera" | "other" }))}>
                <SelectTrigger data-testid="select-host-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internet_link">{it.typeInternetLink || "Internet Link"}</SelectItem>
                  <SelectItem value="camera">{it.typeCamera || "Camera"}</SelectItem>
                  <SelectItem value="other">{it.typeOther || "Other"}</SelectItem>
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

      {/* KPI Dialog */}
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

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.buttons.delete}</AlertDialogTitle>
            <AlertDialogDescription>
              Delete "{deleteTarget?.name}"? This cannot be undone.
            </AlertDialogDescription>
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
