import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { Monitor, Plus, Pencil, Trash2, Save, ExternalLink, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

type Dashboard = { id: number; name: string; departmentId: number | null; labelEn: string; labelPt: string; isActive: boolean };
type KPI = { id: number; dashboardId: number; name: string; labelEn: string; labelPt: string; unit: string | null; sortOrder: number; isActive: boolean };
type VideoEntry = { id: number; dashboardId: number; title: string; videoType: string; url: string; isActive: boolean; sortOrder: number };

export default function TVDashboardConfig() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [selectedDashboardId, setSelectedDashboardId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("dashboards");

  const [dashDialog, setDashDialog] = useState(false);
  const [editDash, setEditDash] = useState<Dashboard | null>(null);
  const [dashForm, setDashForm] = useState({ name: "", departmentId: "", labelEn: "", labelPt: "", isActive: true });

  const [kpiDialog, setKpiDialog] = useState(false);
  const [editKpi, setEditKpi] = useState<KPI | null>(null);
  const [kpiForm, setKpiForm] = useState({ name: "", labelEn: "", labelPt: "", unit: "", sortOrder: "0", isActive: true });

  const [videoDialog, setVideoDialog] = useState(false);
  const [editVideo, setEditVideo] = useState<VideoEntry | null>(null);
  const [videoForm, setVideoForm] = useState({ title: "", videoType: "youtube", url: "", sortOrder: "0", isActive: true });

  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: number; name: string } | null>(null);

  const [dataEntryPeriodType, setDataEntryPeriodType] = useState("daily");
  const [dataEntryDate, setDataEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [kpiValues, setKpiValues] = useState<Record<number, string>>({});

  const { data: dashboards = [] } = useQuery<Dashboard[]>({ queryKey: ["/api/tv-dashboards"] });
  const { data: departments = [] } = useQuery<any[]>({ queryKey: ["/api/departments"] });
  const { data: kpis = [] } = useQuery<KPI[]>({
    queryKey: ["/api/tv-dashboards", selectedDashboardId, "kpis"],
    queryFn: async () => {
      if (!selectedDashboardId) return [];
      const res = await fetch(`/api/tv-dashboards/${selectedDashboardId}/kpis`);
      return res.json();
    },
    enabled: !!selectedDashboardId,
  });
  const { data: videos = [] } = useQuery<VideoEntry[]>({
    queryKey: ["/api/tv-dashboards", selectedDashboardId, "videos"],
    queryFn: async () => {
      if (!selectedDashboardId) return [];
      const res = await fetch(`/api/tv-dashboards/${selectedDashboardId}/videos`);
      return res.json();
    },
    enabled: !!selectedDashboardId,
  });
  const { data: existingValues = [] } = useQuery<any[]>({
    queryKey: ["/api/tv-kpi-values", selectedDashboardId, dataEntryPeriodType, dataEntryDate],
    queryFn: async () => {
      if (!selectedDashboardId || kpis.length === 0) return [];
      const ids = kpis.map(k => k.id).join(",");
      const res = await fetch(`/api/tv-kpi-values?kpiIds=${ids}&periodType=${dataEntryPeriodType}&periodDate=${dataEntryDate}`);
      return res.json();
    },
    enabled: !!selectedDashboardId && kpis.length > 0,
  });

  const createDashMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/tv-dashboards", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tv-dashboards"] });
      setDashDialog(false);
      toast({ title: "Dashboard created" });
    },
  });

  const updateDashMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PUT", `/api/tv-dashboards/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tv-dashboards"] });
      setDashDialog(false);
      toast({ title: "Dashboard updated" });
    },
  });

  const deleteDashMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/tv-dashboards/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tv-dashboards"] });
      if (deleteTarget?.id === selectedDashboardId) setSelectedDashboardId(null);
      setDeleteTarget(null);
      toast({ title: "Dashboard deleted" });
    },
  });

  const createKpiMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/tv-dashboards/${selectedDashboardId}/kpis`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tv-dashboards", selectedDashboardId, "kpis"] });
      setKpiDialog(false);
      toast({ title: "KPI created" });
    },
  });

  const updateKpiMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PUT", `/api/tv-kpis/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tv-dashboards", selectedDashboardId, "kpis"] });
      setKpiDialog(false);
      toast({ title: "KPI updated" });
    },
  });

  const deleteKpiMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/tv-kpis/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tv-dashboards", selectedDashboardId, "kpis"] });
      setDeleteTarget(null);
      toast({ title: "KPI deleted" });
    },
  });

  const saveValuesMutation = useMutation({
    mutationFn: (values: any[]) => apiRequest("POST", "/api/tv-kpi-values", { values }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tv-kpi-values"] });
      toast({ title: t.tvDashboard.saveValues });
    },
  });

  const createVideoMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/tv-dashboards/${selectedDashboardId}/videos`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tv-dashboards", selectedDashboardId, "videos"] });
      setVideoDialog(false);
      toast({ title: "Video added" });
    },
  });

  const updateVideoMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PUT", `/api/tv-videos/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tv-dashboards", selectedDashboardId, "videos"] });
      setVideoDialog(false);
      toast({ title: "Video updated" });
    },
  });

  const deleteVideoMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/tv-videos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tv-dashboards", selectedDashboardId, "videos"] });
      setDeleteTarget(null);
      toast({ title: "Video deleted" });
    },
  });

  const openDashDialog = (dash?: Dashboard) => {
    if (dash) {
      setEditDash(dash);
      setDashForm({ name: dash.name, departmentId: dash.departmentId?.toString() || "", labelEn: dash.labelEn, labelPt: dash.labelPt, isActive: dash.isActive });
    } else {
      setEditDash(null);
      setDashForm({ name: "", departmentId: "", labelEn: "", labelPt: "", isActive: true });
    }
    setDashDialog(true);
  };

  const submitDash = () => {
    const data = { ...dashForm, departmentId: dashForm.departmentId ? parseInt(dashForm.departmentId) : null };
    if (editDash) {
      updateDashMutation.mutate({ id: editDash.id, data });
    } else {
      createDashMutation.mutate(data);
    }
  };

  const openKpiDialog = (kpi?: KPI) => {
    if (kpi) {
      setEditKpi(kpi);
      setKpiForm({ name: kpi.name, labelEn: kpi.labelEn, labelPt: kpi.labelPt, unit: kpi.unit || "", sortOrder: kpi.sortOrder.toString(), isActive: kpi.isActive });
    } else {
      setEditKpi(null);
      setKpiForm({ name: "", labelEn: "", labelPt: "", unit: "", sortOrder: "0", isActive: true });
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

  const openVideoDialog = (video?: VideoEntry) => {
    if (video) {
      setEditVideo(video);
      setVideoForm({ title: video.title, videoType: video.videoType, url: video.url, sortOrder: video.sortOrder.toString(), isActive: video.isActive });
    } else {
      setEditVideo(null);
      setVideoForm({ title: "", videoType: "youtube", url: "", sortOrder: "0", isActive: true });
    }
    setVideoDialog(true);
  };

  const submitVideo = () => {
    const data = { ...videoForm, sortOrder: parseInt(videoForm.sortOrder) || 0 };
    if (editVideo) {
      updateVideoMutation.mutate({ id: editVideo.id, data });
    } else {
      createVideoMutation.mutate(data);
    }
  };

  const handleSaveValues = () => {
    const values = kpis
      .filter(kpi => kpiValues[kpi.id] !== undefined && kpiValues[kpi.id] !== "")
      .map(kpi => ({
        kpiId: kpi.id,
        periodType: dataEntryPeriodType,
        periodDate: dataEntryDate,
        value: kpiValues[kpi.id],
      }));
    if (values.length > 0) {
      saveValuesMutation.mutate(values);
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "dashboard") deleteDashMutation.mutate(deleteTarget.id);
    else if (deleteTarget.type === "kpi") deleteKpiMutation.mutate(deleteTarget.id);
    else if (deleteTarget.type === "video") deleteVideoMutation.mutate(deleteTarget.id);
  };

  const getExistingValue = (kpiId: number) => {
    const existing = existingValues.find((v: any) => v.kpiId === kpiId);
    return existing ? existing.value : "";
  };

  const DashboardSelector = () => (
    <div className="mb-6">
      <Label className="text-sm font-medium mb-2 block">{t.tvDashboard.selectDashboard}</Label>
      <Select value={selectedDashboardId?.toString() || ""} onValueChange={v => setSelectedDashboardId(parseInt(v))}>
        <SelectTrigger className="w-80" data-testid="select-dashboard">
          <SelectValue placeholder={t.tvDashboard.selectDashboardFirst} />
        </SelectTrigger>
        <SelectContent>
          {dashboards.map(d => (
            <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div>
      <PageHeader
        icon={<Monitor className="w-5 h-5 text-primary" />}
        title={t.tvDashboard.configTitle}
        description={t.tvDashboard.configSubtitle}
        actions={
          <Button variant="outline" onClick={() => window.open("/tv-dashboard", "_blank")} data-testid="button-view-all-dashboards">
            <ExternalLink className="w-4 h-4 mr-2" />
            {t.tvDashboard.viewAllDashboards}
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList>
          <TabsTrigger value="dashboards" data-testid="tab-dashboards">{t.tvDashboard.dashboardsTab}</TabsTrigger>
          <TabsTrigger value="kpis" data-testid="tab-kpis">{t.tvDashboard.kpisTab}</TabsTrigger>
          <TabsTrigger value="dataentry" data-testid="tab-data-entry">{t.tvDashboard.dataEntryTab}</TabsTrigger>
          <TabsTrigger value="videos" data-testid="tab-videos">{t.tvDashboard.videosTab}</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboards" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button onClick={() => openDashDialog()} data-testid="button-add-dashboard">
              <Plus className="w-4 h-4 mr-2" />
              {t.tvDashboard.addDashboard}
            </Button>
          </div>

          {dashboards.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <Monitor className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">{t.tvDashboard.noDashboards}</p>
              <p className="text-sm mt-1">{t.tvDashboard.noDashboardsMessage}</p>
            </CardContent></Card>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full" data-testid="table-dashboards">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left p-3 text-sm font-medium">{t.tvDashboard.dashboardName}</th>
                    <th className="text-left p-3 text-sm font-medium">{t.tvDashboard.department}</th>
                    <th className="text-left p-3 text-sm font-medium">{t.tvDashboard.labelEn}</th>
                    <th className="text-left p-3 text-sm font-medium">{t.tvDashboard.labelPt}</th>
                    <th className="text-center p-3 text-sm font-medium">{t.tvDashboard.active}</th>
                    <th className="text-right p-3 text-sm font-medium w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  {dashboards.map(d => (
                    <tr key={d.id} className="border-t hover:bg-muted/30" data-testid={`row-dashboard-${d.id}`}>
                      <td className="p-3 font-medium">{d.name}</td>
                      <td className="p-3 text-muted-foreground">{departments.find((dept: any) => dept.id === d.departmentId)?.name || "-"}</td>
                      <td className="p-3 text-sm text-muted-foreground">{d.labelEn || "-"}</td>
                      <td className="p-3 text-sm text-muted-foreground">{d.labelPt || "-"}</td>
                      <td className="p-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs ${d.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>
                          {d.isActive ? t.tvDashboard.active : t.tvDashboard.inactive}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <Button variant="ghost" size="icon" onClick={() => window.open(`/tv-dashboard/${d.id}`, "_blank")} title={t.tvDashboard.viewDashboard} data-testid={`button-view-dashboard-${d.id}`}>
                          <Eye className="w-4 h-4 text-blue-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openDashDialog(d)} data-testid={`button-edit-dashboard-${d.id}`}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ type: "dashboard", id: d.id, name: d.name })} data-testid={`button-delete-dashboard-${d.id}`}>
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
          <DashboardSelector />
          {selectedDashboardId && (
            <>
              <div className="flex justify-end mb-4">
                <Button onClick={() => openKpiDialog()} data-testid="button-add-kpi">
                  <Plus className="w-4 h-4 mr-2" />
                  {t.tvDashboard.addKpi}
                </Button>
              </div>
              {kpis.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground">
                  <p className="font-medium">{t.tvDashboard.noKpis}</p>
                  <p className="text-sm mt-1">{t.tvDashboard.noKpisMessage}</p>
                </CardContent></Card>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full" data-testid="table-kpis">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left p-3 text-sm font-medium">{t.tvDashboard.kpiName}</th>
                        <th className="text-left p-3 text-sm font-medium">{t.tvDashboard.labelEn}</th>
                        <th className="text-left p-3 text-sm font-medium">{t.tvDashboard.labelPt}</th>
                        <th className="text-left p-3 text-sm font-medium">{t.tvDashboard.kpiUnit}</th>
                        <th className="text-center p-3 text-sm font-medium">{t.tvDashboard.sortOrder}</th>
                        <th className="text-center p-3 text-sm font-medium">{t.tvDashboard.active}</th>
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
                          <td className="p-3 text-center text-sm">{kpi.sortOrder}</td>
                          <td className="p-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs ${kpi.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500"}`}>
                              {kpi.isActive ? t.tvDashboard.active : t.tvDashboard.inactive}
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
            </>
          )}
        </TabsContent>

        <TabsContent value="dataentry" className="mt-4">
          <DashboardSelector />
          {selectedDashboardId && (
            <>
              <div className="flex items-center gap-4 mb-6">
                <div>
                  <Label className="text-sm mb-1 block">{t.tvDashboard.periodType}</Label>
                  <Select value={dataEntryPeriodType} onValueChange={setDataEntryPeriodType}>
                    <SelectTrigger className="w-40" data-testid="select-period-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">{t.tvDashboard.daily}</SelectItem>
                      <SelectItem value="monthly">{t.tvDashboard.monthly}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm mb-1 block">{t.tvDashboard.periodDate}</Label>
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
                  <p className="font-medium">{t.tvDashboard.noDataEntry}</p>
                  <p className="text-sm mt-1">{t.tvDashboard.noDataEntryMessage}</p>
                </CardContent></Card>
              ) : (
                <div className="space-y-4">
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full" data-testid="table-data-entry">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="text-left p-3 text-sm font-medium">{t.tvDashboard.kpiName}</th>
                          <th className="text-left p-3 text-sm font-medium">{t.tvDashboard.kpiUnit}</th>
                          <th className="text-left p-3 text-sm font-medium">{t.tvDashboard.value}</th>
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
                                placeholder={t.tvDashboard.enterValue}
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
                      <Save className="w-4 h-4 mr-2" />
                      {saveValuesMutation.isPending ? t.tvDashboard.savingValues : t.tvDashboard.saveValues}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="videos" className="mt-4">
          <DashboardSelector />
          {selectedDashboardId && (
            <>
              <div className="flex justify-end mb-4">
                <Button onClick={() => openVideoDialog()} data-testid="button-add-video">
                  <Plus className="w-4 h-4 mr-2" />
                  {t.tvDashboard.addVideo}
                </Button>
              </div>
              {videos.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground">
                  <p className="font-medium">{t.tvDashboard.noVideos}</p>
                  <p className="text-sm mt-1">{t.tvDashboard.noVideosMessage}</p>
                </CardContent></Card>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full" data-testid="table-videos">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left p-3 text-sm font-medium">{t.tvDashboard.videoTitle}</th>
                        <th className="text-left p-3 text-sm font-medium">{t.tvDashboard.videoType}</th>
                        <th className="text-left p-3 text-sm font-medium">{t.tvDashboard.videoUrl}</th>
                        <th className="text-center p-3 text-sm font-medium">{t.tvDashboard.sortOrder}</th>
                        <th className="text-center p-3 text-sm font-medium">{t.tvDashboard.active}</th>
                        <th className="text-right p-3 text-sm font-medium w-24"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {videos.map(v => (
                        <tr key={v.id} className="border-t hover:bg-muted/30" data-testid={`row-video-${v.id}`}>
                          <td className="p-3 font-medium">{v.title}</td>
                          <td className="p-3 text-sm text-muted-foreground">{v.videoType === "youtube" ? t.tvDashboard.youtube : t.tvDashboard.upload}</td>
                          <td className="p-3 text-sm text-muted-foreground truncate max-w-[200px]">{v.url}</td>
                          <td className="p-3 text-center text-sm">{v.sortOrder}</td>
                          <td className="p-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs ${v.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500"}`}>
                              {v.isActive ? t.tvDashboard.active : t.tvDashboard.inactive}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <Button variant="ghost" size="icon" onClick={() => openVideoDialog(v)} data-testid={`button-edit-video-${v.id}`}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ type: "video", id: v.id, name: v.title })} data-testid={`button-delete-video-${v.id}`}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={dashDialog} onOpenChange={setDashDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editDash ? t.tvDashboard.editDashboard : t.tvDashboard.addDashboard}</DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t.tvDashboard.dashboardName}</Label>
              <Input value={dashForm.name} onChange={e => setDashForm(p => ({ ...p, name: e.target.value }))} data-testid="input-dashboard-name" />
            </div>
            <div>
              <Label>{t.tvDashboard.department}</Label>
              <Select value={dashForm.departmentId} onValueChange={v => setDashForm(p => ({ ...p, departmentId: v }))}>
                <SelectTrigger data-testid="select-dashboard-department">
                  <SelectValue placeholder={t.tvDashboard.selectDepartment} />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept: any) => (
                    <SelectItem key={dept.id} value={dept.id.toString()}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t.tvDashboard.labelEn}</Label>
              <Input value={dashForm.labelEn} onChange={e => setDashForm(p => ({ ...p, labelEn: e.target.value }))} data-testid="input-dashboard-label-en" />
            </div>
            <div>
              <Label>{t.tvDashboard.labelPt}</Label>
              <Input value={dashForm.labelPt} onChange={e => setDashForm(p => ({ ...p, labelPt: e.target.value }))} data-testid="input-dashboard-label-pt" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={dashForm.isActive} onCheckedChange={v => setDashForm(p => ({ ...p, isActive: v }))} data-testid="switch-dashboard-active" />
              <Label>{t.tvDashboard.active}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={submitDash} disabled={createDashMutation.isPending || updateDashMutation.isPending} data-testid="button-submit-dashboard">
              {(createDashMutation.isPending || updateDashMutation.isPending) ? t.tvDashboard.creating : t.buttons?.save || "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={kpiDialog} onOpenChange={setKpiDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editKpi ? t.tvDashboard.editKpi : t.tvDashboard.addKpi}</DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t.tvDashboard.kpiName}</Label>
              <Input value={kpiForm.name} onChange={e => setKpiForm(p => ({ ...p, name: e.target.value }))} data-testid="input-kpi-name" />
            </div>
            <div>
              <Label>{t.tvDashboard.labelEn}</Label>
              <Input value={kpiForm.labelEn} onChange={e => setKpiForm(p => ({ ...p, labelEn: e.target.value }))} data-testid="input-kpi-label-en" />
            </div>
            <div>
              <Label>{t.tvDashboard.labelPt}</Label>
              <Input value={kpiForm.labelPt} onChange={e => setKpiForm(p => ({ ...p, labelPt: e.target.value }))} data-testid="input-kpi-label-pt" />
            </div>
            <div>
              <Label>{t.tvDashboard.kpiUnit}</Label>
              <Input placeholder={t.tvDashboard.kpiUnitPlaceholder} value={kpiForm.unit} onChange={e => setKpiForm(p => ({ ...p, unit: e.target.value }))} data-testid="input-kpi-unit" />
            </div>
            <div>
              <Label>{t.tvDashboard.sortOrder}</Label>
              <Input type="number" value={kpiForm.sortOrder} onChange={e => setKpiForm(p => ({ ...p, sortOrder: e.target.value }))} data-testid="input-kpi-sort-order" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={kpiForm.isActive} onCheckedChange={v => setKpiForm(p => ({ ...p, isActive: v }))} data-testid="switch-kpi-active" />
              <Label>{t.tvDashboard.active}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={submitKpi} disabled={createKpiMutation.isPending || updateKpiMutation.isPending} data-testid="button-submit-kpi">
              {(createKpiMutation.isPending || updateKpiMutation.isPending) ? t.tvDashboard.creating : t.buttons?.save || "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={videoDialog} onOpenChange={setVideoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editVideo ? t.tvDashboard.editVideo : t.tvDashboard.addVideo}</DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t.tvDashboard.videoTitle}</Label>
              <Input value={videoForm.title} onChange={e => setVideoForm(p => ({ ...p, title: e.target.value }))} data-testid="input-video-title" />
            </div>
            <div>
              <Label>{t.tvDashboard.videoType}</Label>
              <Select value={videoForm.videoType} onValueChange={v => setVideoForm(p => ({ ...p, videoType: v }))}>
                <SelectTrigger data-testid="select-video-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="youtube">{t.tvDashboard.youtube}</SelectItem>
                  <SelectItem value="upload">{t.tvDashboard.upload}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t.tvDashboard.videoUrl}</Label>
              <Input
                value={videoForm.url}
                onChange={e => setVideoForm(p => ({ ...p, url: e.target.value }))}
                placeholder={videoForm.videoType === "youtube" ? t.tvDashboard.youtubeUrlPlaceholder : t.tvDashboard.uploadUrlPlaceholder}
                data-testid="input-video-url"
              />
            </div>
            <div>
              <Label>{t.tvDashboard.sortOrder}</Label>
              <Input type="number" value={videoForm.sortOrder} onChange={e => setVideoForm(p => ({ ...p, sortOrder: e.target.value }))} data-testid="input-video-sort-order" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={videoForm.isActive} onCheckedChange={v => setVideoForm(p => ({ ...p, isActive: v }))} data-testid="switch-video-active" />
              <Label>{t.tvDashboard.active}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={submitVideo} disabled={createVideoMutation.isPending || updateVideoMutation.isPending} data-testid="button-submit-video">
              {(createVideoMutation.isPending || updateVideoMutation.isPending) ? t.tvDashboard.creating : t.buttons?.save || "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.tvDashboard.deleteConfirm}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.name}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.buttons?.cancel || "Cancel"}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} data-testid="button-confirm-delete">
              {t.buttons?.delete || "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
