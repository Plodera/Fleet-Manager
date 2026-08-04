import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { Monitor, Plus, Pencil, Trash2, Save, ExternalLink, Upload, X, Image, Film, Eye, RefreshCw, MessageSquare, CheckCircle, AlertCircle, Info, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

type Dashboard = { id: number; name: string; departmentId: number | null; labelEn: string; labelPt: string; isActive: boolean; showVideo: boolean; videoPosition: string; videoSizePercent: number; kpiRotationSeconds: number; kpiTransitionStyle: string; shimmerDurationSeconds: number; kpisPerPage: number; kpiFontScale: number; tickerText: string; tickerPosition: string; bannerText: string; bannerStyle: string; bannerFontSize: number; bannerScrollSpeed: number; bannerVerticalPosition: number; displayMode: string; sequentialVideoSeconds: number; department?: { name: string } };
type KPI = { id: number; dashboardId: number; name: string; labelEn: string; labelPt: string; unit: string | null; sortOrder: number; isActive: boolean };
type TeamsSettingsType = { tenantId: string; clientId: string; clientSecret: string; teamId: string; channelId: string; enabled: boolean; lastSyncAt: string | null; lastError: string | null };
type TeamsKpiMappingType = { id?: number; dashboardId: number; teamsFieldKey: string; teamsFieldLabel: string; kpiId: number | null; periodType: string };
type ExtractedFieldType = { key: string; label: string; value: string };
type FetchResultType = { ok: boolean; messageId?: string; messageDate?: string; messageText?: string; fields: ExtractedFieldType[]; error?: string };
type VideoEntry = { id: number; dashboardId: number; title: string; videoType: string; url: string; isActive: boolean; sortOrder: number };

export default function TVDashboardConfig() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedDashboardId, setSelectedDashboardId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("dashboards");

  const userPermissions: string[] = (() => {
    if (!user?.permissions) return [];
    if (Array.isArray(user.permissions)) return user.permissions;
    try { return JSON.parse(user.permissions as string); } catch { return []; }
  })();
  const isAdmin = user?.role === "admin";
  const canDashboards = isAdmin || userPermissions.includes("manage_tv_dashboards");
  const canKpis      = isAdmin || userPermissions.includes("manage_tv_kpis");
  const canDataEntry = isAdmin || userPermissions.includes("tv_data_entry");
  const canVideos    = isAdmin || userPermissions.includes("manage_tv_videos");

  const TAB_ORDER = ["dashboards","kpis","dataentry","videos","teamssync"];
  const allowedTabs = TAB_ORDER.filter(tab =>
    (tab === "dashboards" && canDashboards) ||
    (tab === "kpis"       && canKpis)       ||
    (tab === "dataentry"  && canDataEntry)  ||
    (tab === "videos"     && canVideos)     ||
    (tab === "teamssync"  && isAdmin)
  );

  useEffect(() => {
    if (allowedTabs.length > 0 && !allowedTabs.includes(activeTab)) {
      setActiveTab(allowedTabs[0]);
    }
  }, [allowedTabs.join(","), activeTab]);

  const [bulkDialog, setBulkDialog] = useState(false);
  const [bulkPreviewMode, setBulkPreviewMode] = useState(false);
  const [bulkSelectAll, setBulkSelectAll] = useState(true);
  const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<number>>(new Set());
  const [bulkGroups, setBulkGroups] = useState({ ticker: false, banner: false, display: false, videoLayout: false });
  const [bulkForm, setBulkForm] = useState({
    tickerPosition: "off", tickerText: "",
    bannerStyle: "off", bannerText: "", bannerFontSize: "36", bannerScrollSpeed: "5", bannerVerticalPosition: "75",
    displayMode: "simultaneous", sequentialVideoSeconds: "30", kpiRotationSeconds: "8", kpiTransitionStyle: "fade",
    videoPosition: "bottom", videoSizePercent: "55",
  });

  const [dashDialog, setDashDialog] = useState(false);
  const [editDash, setEditDash] = useState<Dashboard | null>(null);
  const [dashForm, setDashForm] = useState({ name: "", departmentId: "", labelEn: "", labelPt: "", isActive: true, showVideo: true, videoPosition: "bottom", videoSizePercent: "55", kpiRotationSeconds: "8", kpiTransitionStyle: "fade", shimmerDurationSeconds: "6", kpisPerPage: "6", kpiFontScale: "1.0", tickerText: "", tickerPosition: "off", bannerText: "", bannerStyle: "off", bannerFontSize: "36", bannerScrollSpeed: "5", bannerVerticalPosition: "75", displayMode: "simultaneous", sequentialVideoSeconds: "30" });
  const [seqMappings, setSeqMappings] = useState<Record<number, number[]>>({});

  const [kpiDialog, setKpiDialog] = useState(false);
  const [editKpi, setEditKpi] = useState<KPI | null>(null);
  const [kpiForm, setKpiForm] = useState({ name: "", labelEn: "", labelPt: "", unit: "", sortOrder: "0", isActive: true });

  const [videoDialog, setVideoDialog] = useState(false);
  const [editVideo, setEditVideo] = useState<VideoEntry | null>(null);
  const [videoForm, setVideoForm] = useState({ title: "", videoType: "youtube", url: "", sortOrder: "0", isActive: true });
  const [uploading, setUploading] = useState(false);
  const [uploadedName, setUploadedName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: number; name: string } | null>(null);

  const [dataEntryPeriodType, setDataEntryPeriodType] = useState("daily");
  const [dataEntryDate, setDataEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [kpiValues, setKpiValues] = useState<Record<number, string>>({});

  // Teams Sync state
  const [teamsForm, setTeamsForm] = useState<TeamsSettingsType>({ tenantId: "", clientId: "", clientSecret: "", teamId: "", channelId: "", enabled: false, lastSyncAt: null, lastError: null });
  const [teamsMappings, setTeamsMappings] = useState<TeamsKpiMappingType[]>([]);
  const [syncPreview, setSyncPreview] = useState<FetchResultType | null>(null);
  const [syncPreviewOpen, setSyncPreviewOpen] = useState(false);
  const [previewValues, setPreviewValues] = useState<Record<string, string>>({}); // kpiId -> value override

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
  const { data: kpiPageVideosData = [] } = useQuery<any[]>({
    queryKey: ["/api/tv-dashboards", selectedDashboardId, "kpi-page-videos"],
    queryFn: async () => {
      if (!selectedDashboardId) return [];
      const res = await fetch(`/api/tv-dashboards/${selectedDashboardId}/kpi-page-videos`);
      return res.json();
    },
    enabled: !!selectedDashboardId,
  });
  useEffect(() => {
    const m: Record<number, number[]> = {};
    kpiPageVideosData.forEach((pv: any) => {
      if (pv.videoId != null) {
        if (!m[pv.pageIndex]) m[pv.pageIndex] = [];
        m[pv.pageIndex].push(pv.videoId);
      }
    });
    setSeqMappings(m);
  }, [JSON.stringify(kpiPageVideosData)]);

  const saveSeqMappingsMutation = useMutation({
    mutationFn: (mappings: { pageIndex: number; videoIds: number[] }[]) =>
      apiRequest("PUT", `/api/tv-dashboards/${selectedDashboardId}/kpi-page-videos`, { mappings }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tv-dashboards", selectedDashboardId, "kpi-page-videos"] });
      toast({ title: "Sequential mapping saved" });
    },
    onError: (err: any) => toast({ title: "Save failed", description: err.message, variant: "destructive" }),
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

  // Teams queries & mutations
  const { data: teamsSettingsData } = useQuery<TeamsSettingsType>({
    queryKey: ["/api/settings/teams"],
    queryFn: async () => { const res = await fetch("/api/settings/teams"); return res.json(); },
  });
  useEffect(() => {
    if (teamsSettingsData) setTeamsForm(teamsSettingsData);
  }, [teamsSettingsData]);

  const { data: teamsMappingsData } = useQuery<TeamsKpiMappingType[]>({
    queryKey: ["/api/settings/teams/kpi-mappings", selectedDashboardId],
    queryFn: async () => {
      if (!selectedDashboardId) return [];
      const res = await fetch(`/api/settings/teams/kpi-mappings/${selectedDashboardId}`);
      return res.json();
    },
    enabled: !!selectedDashboardId,
  });
  useEffect(() => {
    if (teamsMappingsData) setTeamsMappings(teamsMappingsData);
  }, [teamsMappingsData]);

  const saveTeamsSettingsMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", "/api/settings/teams", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/teams"] });
      toast({ title: "Teams settings saved" });
    },
    onError: (err: any) => toast({ title: "Failed to save", description: err.message, variant: "destructive" }),
  });

  const saveTeamsMappingsMutation = useMutation({
    mutationFn: ({ dashboardId, mappings }: { dashboardId: number; mappings: any[] }) =>
      apiRequest("PUT", `/api/settings/teams/kpi-mappings/${dashboardId}`, { mappings }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/teams/kpi-mappings", selectedDashboardId] });
      toast({ title: "KPI mappings saved" });
    },
    onError: (err: any) => toast({ title: "Failed to save mappings", description: err.message, variant: "destructive" }),
  });

  const fetchFieldsMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/teams/fetch-fields", {}),
    onSuccess: (data: any) => {
      setSyncPreview(data);
      if (data.ok && data.fields.length > 0) {
        // Pre-fill preview values from mappings
        const initial: Record<string, string> = {};
        const activeKpis = kpis.filter(k => k.isActive);
        for (const mapping of teamsMappings) {
          const field = data.fields.find((f: ExtractedFieldType) => f.key === mapping.teamsFieldKey);
          if (field && mapping.kpiId) initial[String(mapping.kpiId)] = field.value;
        }
        // Also try to match by label similarity for any unmapped fields
        for (const field of data.fields) {
          const matched = teamsMappings.find(m => m.teamsFieldKey === field.key);
          if (!matched) {
            const kpi = activeKpis.find(k =>
              k.name.toLowerCase().replace(/\s+/g, "_") === field.key ||
              k.labelEn.toLowerCase().includes(field.label.toLowerCase().split(" ")[0])
            );
            if (kpi && !initial[String(kpi.id)]) initial[String(kpi.id)] = field.value;
          }
        }
        setPreviewValues(initial);
      }
      setSyncPreviewOpen(true);
    },
    onError: (err: any) => toast({ title: "Sync failed", description: err.message, variant: "destructive" }),
  });

  const handleConfirmSync = () => {
    if (!selectedDashboardId) return;
    const values = Object.entries(previewValues)
      .filter(([, v]) => v !== "")
      .map(([kpiId, value]) => ({
        kpiId: parseInt(kpiId),
        periodType: dataEntryPeriodType,
        periodDate: dataEntryDate,
        value,
      }));
    if (values.length > 0) {
      saveValuesMutation.mutate(values);
    }
    setSyncPreviewOpen(false);
    toast({ title: `Saved ${values.length} KPI value(s) from Teams` });
  };

  const handleAddMapping = () => {
    if (!selectedDashboardId) return;
    setTeamsMappings(prev => [...prev, { dashboardId: selectedDashboardId, teamsFieldKey: "", teamsFieldLabel: "", kpiId: null, periodType: "daily" }]);
  };

  const handleRemoveMapping = (idx: number) => {
    setTeamsMappings(prev => prev.filter((_, i) => i !== idx));
  };

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
    onError: (err: any) => { toast({ title: "Save failed", description: err.message, variant: "destructive" }); },
  });

  const updateVideoMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PUT", `/api/tv-videos/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tv-dashboards", selectedDashboardId, "videos"] });
      setVideoDialog(false);
      toast({ title: "Video updated" });
    },
    onError: (err: any) => { toast({ title: "Save failed", description: err.message, variant: "destructive" }); },
  });

  const deleteVideoMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/tv-videos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tv-dashboards", selectedDashboardId, "videos"] });
      setDeleteTarget(null);
      toast({ title: "Video deleted" });
    },
    onError: (err: any) => { toast({ title: "Delete failed", description: err.message, variant: "destructive" }); },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: (body: { ids: number[]; fields: Record<string, any> }) =>
      apiRequest("POST", "/api/tv-dashboards/bulk-update", body),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tv-dashboards"] });
      setBulkDialog(false);
      toast({ title: `Updated ${res.updated ?? "?"} dashboard${res.updated !== 1 ? "s" : ""}` });
    },
    onError: (err: any) => { toast({ title: "Bulk update failed", description: err.message, variant: "destructive" }); },
  });

  type BulkFieldDiff = { label: string; oldVal: string; newVal: string; willChange: boolean };
  type BulkDashboardDiff = { dashboard: Dashboard; changes: BulkFieldDiff[] };

  const buildBulkFields = (): Record<string, any> => {
    const fields: Record<string, any> = {};
    if (bulkGroups.ticker) {
      fields.tickerPosition = bulkForm.tickerPosition;
      fields.tickerText = bulkForm.tickerText;
    }
    if (bulkGroups.banner) {
      fields.bannerStyle = bulkForm.bannerStyle;
      fields.bannerText = bulkForm.bannerText;
      fields.bannerFontSize = parseInt(bulkForm.bannerFontSize) || 36;
      fields.bannerScrollSpeed = parseInt(bulkForm.bannerScrollSpeed) || 5;
      fields.bannerVerticalPosition = parseInt(bulkForm.bannerVerticalPosition) || 75;
    }
    if (bulkGroups.display) {
      fields.displayMode = bulkForm.displayMode;
      fields.sequentialVideoSeconds = parseInt(bulkForm.sequentialVideoSeconds) || 30;
      fields.kpiRotationSeconds = parseInt(bulkForm.kpiRotationSeconds) || 8;
      fields.kpiTransitionStyle = bulkForm.kpiTransitionStyle;
    }
    if (bulkGroups.videoLayout) {
      fields.videoPosition = bulkForm.videoPosition;
      fields.videoSizePercent = parseInt(bulkForm.videoSizePercent) || 55;
    }
    return fields;
  };

  const buildBulkPreview = (): BulkDashboardDiff[] => {
    const ids = bulkSelectAll ? dashboards.map((d: Dashboard) => d.id) : Array.from(bulkSelectedIds);
    const targetDashboards = (dashboards as Dashboard[]).filter(d => ids.includes(d.id));
    const fields = buildBulkFields();

    const fieldMeta: { key: string; label: string; fmt?: (v: any) => string }[] = [
      { key: "tickerPosition", label: "Ticker Position" },
      { key: "tickerText",     label: "Ticker Text" },
      { key: "bannerStyle",    label: "Banner Style" },
      { key: "bannerText",     label: "Banner Text" },
      { key: "bannerFontSize", label: "Banner Font Size", fmt: v => `${v}px` },
      { key: "bannerScrollSpeed", label: "Scroll Speed" },
      { key: "bannerVerticalPosition", label: "Banner V. Position", fmt: v => `${v}%` },
      { key: "displayMode",    label: "Display Mode" },
      { key: "sequentialVideoSeconds", label: "Sequential Seconds", fmt: v => `${v}s` },
      { key: "kpiRotationSeconds", label: "KPI Rotation", fmt: v => `${v}s` },
      { key: "kpiTransitionStyle", label: "KPI Transition" },
      { key: "videoPosition",  label: "Video Position" },
      { key: "videoSizePercent", label: "Video Size", fmt: v => `${v}%` },
    ];

    return targetDashboards.map(d => {
      const changes: BulkFieldDiff[] = Object.keys(fields).map(key => {
        const meta = fieldMeta.find(m => m.key === key);
        const label = meta?.label ?? key;
        const fmt = meta?.fmt ?? ((v: any) => String(v ?? "—"));
        const oldRaw = (d as any)[key];
        const newRaw = fields[key];
        return {
          label,
          oldVal: fmt(oldRaw ?? "—"),
          newVal: fmt(newRaw),
          willChange: String(oldRaw) !== String(newRaw),
        };
      });
      return { dashboard: d, changes };
    });
  };

  const submitBulkUpdate = () => {
    const ids = bulkSelectAll ? dashboards.map((d: Dashboard) => d.id) : Array.from(bulkSelectedIds);
    if (ids.length === 0) { toast({ title: "Select at least one dashboard", variant: "destructive" }); return; }
    const fields = buildBulkFields();
    if (Object.keys(fields).length === 0) { toast({ title: "Enable at least one field group to apply", variant: "destructive" }); return; }
    bulkUpdateMutation.mutate({ ids, fields });
  };

  const openBulkPreview = () => {
    const ids = bulkSelectAll ? dashboards.map((d: Dashboard) => d.id) : Array.from(bulkSelectedIds);
    if (ids.length === 0) { toast({ title: "Select at least one dashboard", variant: "destructive" }); return; }
    const fields = buildBulkFields();
    if (Object.keys(fields).length === 0) { toast({ title: "Enable at least one field group to apply", variant: "destructive" }); return; }
    setBulkPreviewMode(true);
  };

  const bulkTargetCount = bulkSelectAll ? dashboards.length : bulkSelectedIds.size;

  const normFontScale = (v: number) => {
    if (v >= 1.9) return "2.0";
    if (v >= 1.5) return "1.6";
    if (v >= 1.2) return "1.3";
    return "1.0";
  };

  const openDashDialog = (dash?: Dashboard) => {
    if (dash) {
      setEditDash(dash);
      setDashForm({ name: dash.name, departmentId: dash.departmentId?.toString() || "", labelEn: dash.labelEn, labelPt: dash.labelPt, isActive: dash.isActive, showVideo: dash.showVideo !== false, videoPosition: dash.videoPosition || "bottom", videoSizePercent: (dash.videoSizePercent ?? 55).toString(), kpiRotationSeconds: (dash.kpiRotationSeconds ?? 8).toString(), kpiTransitionStyle: dash.kpiTransitionStyle || "fade", shimmerDurationSeconds: (dash.shimmerDurationSeconds ?? 6).toString(), kpisPerPage: (dash.kpisPerPage ?? 6).toString(), kpiFontScale: normFontScale(dash.kpiFontScale ?? 1.0), tickerText: dash.tickerText || "", tickerPosition: dash.tickerPosition || "off", bannerText: dash.bannerText || "", bannerStyle: dash.bannerStyle || "off", bannerFontSize: (dash.bannerFontSize ?? 36).toString(), bannerScrollSpeed: (dash.bannerScrollSpeed ?? 5).toString(), bannerVerticalPosition: (dash.bannerVerticalPosition ?? 75).toString(), displayMode: dash.displayMode || "simultaneous", sequentialVideoSeconds: (dash.sequentialVideoSeconds ?? 30).toString() });
    } else {
      setEditDash(null);
      setDashForm({ name: "", departmentId: "", labelEn: "", labelPt: "", isActive: true, showVideo: true, videoPosition: "bottom", videoSizePercent: "55", kpiRotationSeconds: "8", kpiTransitionStyle: "fade", shimmerDurationSeconds: "6", kpisPerPage: "6", kpiFontScale: "1.0", tickerText: "", tickerPosition: "off", bannerText: "", bannerStyle: "off", bannerFontSize: "36", bannerScrollSpeed: "5", bannerVerticalPosition: "75", displayMode: "simultaneous", sequentialVideoSeconds: "30" });
    }
    setDashDialog(true);
  };

  const submitDash = () => {
    const data = { ...dashForm, departmentId: dashForm.departmentId ? parseInt(dashForm.departmentId) : null, videoSizePercent: parseInt(dashForm.videoSizePercent) || 55, kpiRotationSeconds: parseInt(dashForm.kpiRotationSeconds) || 8, shimmerDurationSeconds: parseInt(dashForm.shimmerDurationSeconds) || 6, kpisPerPage: parseInt(dashForm.kpisPerPage) || 6, kpiFontScale: parseFloat(dashForm.kpiFontScale) || 1.0, bannerFontSize: parseInt(dashForm.bannerFontSize) || 36, bannerScrollSpeed: parseInt(dashForm.bannerScrollSpeed) || 5, bannerVerticalPosition: parseInt(dashForm.bannerVerticalPosition) || 75, sequentialVideoSeconds: parseInt(dashForm.sequentialVideoSeconds) || 30 };
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
      setUploadedName(video.videoType !== "youtube" && video.url ? video.url.split("/").pop() || null : null);
    } else {
      setEditVideo(null);
      setVideoForm({ title: "", videoType: "youtube", url: "", sortOrder: "0", isActive: true });
      setUploadedName(null);
    }
    setVideoDialog(true);
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        let message = `Upload failed (${res.status})`;
        try { const err = await res.json(); message = err.message || message; } catch {}
        throw new Error(message);
      }
      const data = await res.json();
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      setVideoForm(p => ({ ...p, url: data.url, title: p.title || nameWithoutExt }));
      setUploadedName(file.name);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const submitVideo = () => {
    const titleFallback = videoForm.title.trim() || uploadedName?.replace(/\.[^/.]+$/, "") || "Untitled";
    const data = { ...videoForm, title: titleFallback, sortOrder: parseInt(videoForm.sortOrder) || 0 };
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
          <a href="/tv-dashboard" target="_blank" rel="noopener noreferrer" data-testid="button-view-all-dashboards">
            <Button variant="outline">
              <ExternalLink className="w-4 h-4 mr-2" />
              {t.tvDashboard.viewAllDashboards}
            </Button>
          </a>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList>
          {canDashboards && <TabsTrigger value="dashboards" data-testid="tab-dashboards">{t.tvDashboard.dashboardsTab}</TabsTrigger>}
          {canKpis       && <TabsTrigger value="kpis"       data-testid="tab-kpis">{t.tvDashboard.kpisTab}</TabsTrigger>}
          {canDataEntry  && <TabsTrigger value="dataentry"  data-testid="tab-data-entry">{t.tvDashboard.dataEntryTab}</TabsTrigger>}
          {canVideos     && <TabsTrigger value="videos"     data-testid="tab-videos">{t.tvDashboard.videosTab}</TabsTrigger>}
          {isAdmin       && <TabsTrigger value="teamssync"  data-testid="tab-teams-sync"><MessageSquare className="w-3.5 h-3.5 mr-1.5" />Teams Sync</TabsTrigger>}
        </TabsList>

        <TabsContent value="dashboards" className="mt-4">
          <div className="flex justify-end gap-2 mb-4">
            {dashboards.length > 1 && (
              <Button variant="outline" onClick={() => setBulkDialog(true)} data-testid="button-bulk-update">
                <Layers className="w-4 h-4 mr-2" />
                Bulk Update
              </Button>
            )}
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
                        <a href={`/tv-dashboard/${d.id}`} target="_blank" rel="noopener noreferrer" title={t.tvDashboard.viewDashboard} data-testid={`button-view-dashboard-${d.id}`}>
                          <Button variant="ghost" size="icon">
                            <Eye className="w-4 h-4 text-blue-500" />
                          </Button>
                        </a>
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
          {selectedDashboardId && (() => {
            const selDash = dashboards.find(d => d.id === selectedDashboardId);
            const isSequential = selDash?.displayMode === "sequential";
            const kpisPerPage = selDash?.kpisPerPage ?? 6;
            const activeKpis = kpis.filter(k => k.isActive);
            const totalPages = Math.ceil(activeKpis.length / kpisPerPage);
            const activeVideos = videos.filter(v => v.isActive);

            return (
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
                            <td className="p-3 text-sm text-muted-foreground">{v.videoType === "youtube" ? t.tvDashboard.youtube : v.videoType === "image" ? t.tvDashboard.imageType : t.tvDashboard.upload}</td>
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

                {/* Sequential Mapping Section */}
                {isSequential && (
                  <Card className="mt-6">
                    <CardContent className="pt-5 space-y-4">
                      <div>
                        <p className="font-semibold text-sm">Sequential Playback — KPI Page → Video Mapping</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          For each KPI page, choose which video plays after it. Leave a page set to "None" to skip straight to the next KPI page.
                        </p>
                      </div>
                      {activeKpis.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No active KPIs configured. Add KPIs first to see pages here.</p>
                      ) : activeVideos.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No active videos available. Add videos above first.</p>
                      ) : (
                        <>
                          <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm" data-testid="table-seq-mappings">
                              <thead>
                                <tr className="bg-muted/50">
                                  <th className="text-left p-3 font-medium">KPI Page</th>
                                  <th className="text-left p-3 font-medium">KPIs on this page</th>
                                  <th className="text-left p-3 font-medium">Video that plays after</th>
                                </tr>
                              </thead>
                              <tbody>
                                {Array.from({ length: totalPages }, (_, i) => {
                                  const pageKpis = activeKpis.slice(i * kpisPerPage, (i + 1) * kpisPerPage);
                                  const pageVideoIds = seqMappings[i] || [];
                                  const availableToAdd = activeVideos.filter(v => !pageVideoIds.includes(v.id));
                                  return (
                                    <tr key={i} className="border-t">
                                      <td className="p-3 font-medium text-muted-foreground whitespace-nowrap">Page {i + 1}</td>
                                      <td className="p-3 text-xs text-muted-foreground">
                                        {pageKpis.map(k => k.labelEn || k.name).join(", ")}
                                      </td>
                                      <td className="p-3">
                                        <div className="flex flex-col gap-2">
                                          {/* Video chips */}
                                          {pageVideoIds.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                              {pageVideoIds.map((vidId, order) => {
                                                const vid = activeVideos.find(v => v.id === vidId);
                                                return vid ? (
                                                  <span key={vidId} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 bg-primary/10 border border-primary/20 rounded text-xs">
                                                    <span className="text-muted-foreground mr-0.5">{order + 1}.</span>
                                                    {vid.title}
                                                    <button
                                                      type="button"
                                                      className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                                                      onClick={() => setSeqMappings(prev => ({ ...prev, [i]: (prev[i] || []).filter(id => id !== vidId) }))}
                                                    >×</button>
                                                  </span>
                                                ) : null;
                                              })}
                                            </div>
                                          )}
                                          {/* Add video dropdown */}
                                          {availableToAdd.length > 0 && (
                                            <Select
                                              value="__add__"
                                              onValueChange={v => {
                                                if (v !== "__add__") {
                                                  const vidId = parseInt(v);
                                                  setSeqMappings(prev => ({ ...prev, [i]: [...(prev[i] || []), vidId] }));
                                                }
                                              }}
                                            >
                                              <SelectTrigger className="w-48 h-7 text-xs" data-testid={`select-seq-video-${i}`}>
                                                <SelectValue placeholder="+ Add video…" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="__add__" disabled>+ Add video…</SelectItem>
                                                {availableToAdd.map(v => (
                                                  <SelectItem key={v.id} value={String(v.id)}>{v.title}</SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          )}
                                          {pageVideoIds.length === 0 && availableToAdd.length === 0 && (
                                            <span className="text-xs text-muted-foreground italic">All videos added</span>
                                          )}
                                          {pageVideoIds.length === 0 && availableToAdd.length > 0 && (
                                            <span className="text-xs text-muted-foreground">— skips to next KPI page —</span>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                          <div className="flex justify-end">
                            <Button
                              onClick={() => {
                                const mappings = Object.entries(seqMappings).map(([pageIndex, videoIds]) => ({
                                  pageIndex: parseInt(pageIndex),
                                  videoIds: videoIds || [],
                                }));
                                saveSeqMappingsMutation.mutate(mappings);
                              }}
                              disabled={saveSeqMappingsMutation.isPending}
                              data-testid="button-save-seq-mappings"
                            >
                              <Save className="w-4 h-4 mr-2" />
                              {saveSeqMappingsMutation.isPending ? "Saving…" : "Save Sequential Mapping"}
                            </Button>
                          
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            );
          })()}
        </TabsContent>

        {/* ── Teams Sync Tab ── */}
        <TabsContent value="teamssync" className="mt-4 space-y-6">

          {/* Azure Setup Instructions */}
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                <div className="text-sm space-y-2">
                  <p className="font-semibold">How to set up an Azure App Registration</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Go to <strong>portal.azure.com</strong> → Azure Active Directory → App registrations → New registration.</li>
                    <li>Name it (e.g. "AAMS Teams Sync"), choose <em>Single tenant</em>, click Register.</li>
                    <li>Copy the <strong>Application (client) ID</strong> and <strong>Directory (tenant) ID</strong> into the fields below.</li>
                    <li>Go to <strong>Certificates &amp; secrets</strong> → New client secret → copy the <em>Value</em> (not the ID).</li>
                    <li>Go to <strong>API permissions</strong> → Add permission → Microsoft Graph → Application permissions → add <code>ChannelMessage.Read.All</code> → Grant admin consent.</li>
                    <li>Find your <strong>Team ID</strong>: open Teams → right-click the team → Get link to team → copy the ID after <code>groupId=</code>.</li>
                    <li>Find your <strong>Channel ID</strong>: right-click the channel → Get link to channel → copy the ID after <code>channel=</code> (starts with <code>19:</code>).</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Azure Credentials Form */}
          <Card>
            <CardContent className="pt-5 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-sm">Azure Credentials</p>
                <div className="flex items-center gap-2">
                  <Switch checked={teamsForm.enabled} onCheckedChange={v => setTeamsForm(p => ({ ...p, enabled: v }))} data-testid="switch-teams-enabled" />
                  <Label className="text-sm">Enabled</Label>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Tenant ID</Label>
                  <Input value={teamsForm.tenantId} onChange={e => setTeamsForm(p => ({ ...p, tenantId: e.target.value }))} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" data-testid="input-teams-tenant-id" />
                </div>
                <div>
                  <Label className="text-sm">Client ID (App ID)</Label>
                  <Input value={teamsForm.clientId} onChange={e => setTeamsForm(p => ({ ...p, clientId: e.target.value }))} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" data-testid="input-teams-client-id" />
                </div>
                <div>
                  <Label className="text-sm">Client Secret</Label>
                  <Input type="password" value={teamsForm.clientSecret} onChange={e => setTeamsForm(p => ({ ...p, clientSecret: e.target.value }))} placeholder="Secret value (not ID)" data-testid="input-teams-client-secret" />
                </div>
                <div>
                  <Label className="text-sm">Team ID</Label>
                  <Input value={teamsForm.teamId} onChange={e => setTeamsForm(p => ({ ...p, teamId: e.target.value }))} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" data-testid="input-teams-team-id" />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-sm">Channel ID</Label>
                  <Input value={teamsForm.channelId} onChange={e => setTeamsForm(p => ({ ...p, channelId: e.target.value }))} placeholder="19:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx@thread.tacv2" data-testid="input-teams-channel-id" />
                </div>
              </div>
              {teamsForm.lastError && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded text-sm text-destructive">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>Last error: {teamsForm.lastError}</span>
                </div>
              )}
              {teamsForm.lastSyncAt && (
                <p className="text-xs text-muted-foreground">Last successful sync: {new Date(teamsForm.lastSyncAt).toLocaleString()}</p>
              )}
              <div className="flex justify-end">
                <Button onClick={() => saveTeamsSettingsMutation.mutate(teamsForm)} disabled={saveTeamsSettingsMutation.isPending} data-testid="button-save-teams-settings">
                  <Save className="w-4 h-4 mr-2" />
                  {saveTeamsSettingsMutation.isPending ? "Saving…" : "Save Azure Settings"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* KPI Field Mappings */}
          <Card>
            <CardContent className="pt-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">KPI Field Mappings</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Map Teams message fields to your dashboard KPIs. Select a dashboard first.</p>
                </div>
              </div>
              <DashboardSelector />
              {selectedDashboardId && (
                <>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm" data-testid="table-teams-mappings">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="text-left p-3 font-medium">Teams Field Label</th>
                          <th className="text-left p-3 font-medium">Field Key (auto)</th>
                          <th className="text-left p-3 font-medium">Maps to KPI</th>
                          <th className="text-left p-3 font-medium">Period</th>
                          <th className="w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamsMappings.map((m, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="p-2">
                              <Input
                                value={m.teamsFieldLabel}
                                onChange={e => {
                                  const label = e.target.value;
                                  const key = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
                                  setTeamsMappings(prev => prev.map((x, i) => i === idx ? { ...x, teamsFieldLabel: label, teamsFieldKey: key } : x));
                                }}
                                placeholder="e.g. Total kwh"
                                data-testid={`input-teams-field-label-${idx}`}
                              />
                            </td>
                            <td className="p-2 text-muted-foreground font-mono text-xs">{m.teamsFieldKey || "—"}</td>
                            <td className="p-2">
                              <Select value={m.kpiId?.toString() ?? ""} onValueChange={v => setTeamsMappings(prev => prev.map((x, i) => i === idx ? { ...x, kpiId: v ? parseInt(v) : null } : x))}>
                                <SelectTrigger className="w-44" data-testid={`select-teams-kpi-${idx}`}>
                                  <SelectValue placeholder="Select KPI…" />
                                </SelectTrigger>
                                <SelectContent>
                                  {kpis.filter(k => k.isActive).map(k => (
                                    <SelectItem key={k.id} value={k.id.toString()}>{k.labelEn || k.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-2">
                              <Select value={m.periodType} onValueChange={v => setTeamsMappings(prev => prev.map((x, i) => i === idx ? { ...x, periodType: v } : x))}>
                                <SelectTrigger className="w-28" data-testid={`select-teams-period-${idx}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="daily">Daily</SelectItem>
                                  <SelectItem value="monthly">Monthly</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-2">
                              <Button variant="ghost" size="icon" onClick={() => handleRemoveMapping(idx)} data-testid={`button-remove-mapping-${idx}`}>
                                <X className="w-4 h-4 text-destructive" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                        {teamsMappings.length === 0 && (
                          <tr><td colSpan={5} className="p-6 text-center text-muted-foreground text-sm">No mappings yet. Add one below.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-between">
                    <Button variant="outline" onClick={handleAddMapping} data-testid="button-add-mapping">
                      <Plus className="w-4 h-4 mr-2" />Add Mapping
                    </Button>
                    <Button onClick={() => saveTeamsMappingsMutation.mutate({ dashboardId: selectedDashboardId, mappings: teamsMappings })} disabled={saveTeamsMappingsMutation.isPending} data-testid="button-save-mappings">
                      <Save className="w-4 h-4 mr-2" />
                      {saveTeamsMappingsMutation.isPending ? "Saving…" : "Save Mappings"}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Sync from Teams */}
          {selectedDashboardId && (
            <Card>
              <CardContent className="pt-5 space-y-3">
                <p className="font-semibold text-sm">Sync Data from Teams</p>
                <p className="text-xs text-muted-foreground">Fetches the latest message from the configured channel, extracts numeric fields, and lets you review before saving.</p>
                <div className="flex items-center gap-4 flex-wrap">
                  <div>
                    <Label className="text-sm mb-1 block">Period Type</Label>
                    <Select value={dataEntryPeriodType} onValueChange={setDataEntryPeriodType}>
                      <SelectTrigger className="w-36" data-testid="select-teams-sync-period-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm mb-1 block">Period Date</Label>
                    <Input
                      type={dataEntryPeriodType === "monthly" ? "month" : "date"}
                      value={dataEntryPeriodType === "monthly" ? dataEntryDate.substring(0, 7) : dataEntryDate}
                      onChange={e => setDataEntryDate(dataEntryPeriodType === "monthly" ? e.target.value + "-01" : e.target.value)}
                      className="w-48"
                      data-testid="input-teams-sync-date"
                    />
                  </div>
                  <div className="mt-5">
                    <Button onClick={() => fetchFieldsMutation.mutate()} disabled={fetchFieldsMutation.isPending} data-testid="button-sync-from-teams">
                      <RefreshCw className={`w-4 h-4 mr-2 ${fetchFieldsMutation.isPending ? "animate-spin" : ""}`} />
                      {fetchFieldsMutation.isPending ? "Fetching…" : "Sync from Teams"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Teams Sync Preview Dialog */}
      <Dialog open={syncPreviewOpen} onOpenChange={setSyncPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Teams Sync Preview
            </DialogTitle>
            <DialogDescription>
              {syncPreview?.ok
                ? `Extracted from message dated ${syncPreview.messageDate ? new Date(syncPreview.messageDate).toLocaleString() : "unknown"}. Review and adjust values before saving.`
                : "Could not fetch Teams data."}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 space-y-4 pr-1">
            {syncPreview && !syncPreview.ok && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded text-sm text-destructive">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{syncPreview.error}</span>
              </div>
            )}
            {syncPreview?.ok && (
              <>
                {/* Extracted fields table */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Fields extracted from message ({syncPreview.fields.length})</p>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead><tr className="bg-muted/50"><th className="text-left p-2 font-medium">Field</th><th className="text-left p-2 font-medium">Extracted Value</th></tr></thead>
                      <tbody>
                        {syncPreview.fields.map((f, i) => (
                          <tr key={i} className="border-t">
                            <td className="p-2 font-mono text-xs text-muted-foreground">{f.label}</td>
                            <td className="p-2 font-semibold">{f.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* KPI value review */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Values to save (edit if needed)</p>
                  {kpis.filter(k => k.isActive).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No active KPIs configured for this dashboard.</p>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead><tr className="bg-muted/50"><th className="text-left p-2 font-medium">KPI</th><th className="text-left p-2 font-medium">Value</th><th className="text-left p-2 font-medium w-28">Status</th></tr></thead>
                        <tbody>
                          {kpis.filter(k => k.isActive).map(kpi => {
                            const val = previewValues[String(kpi.id)] ?? "";
                            const hasVal = val !== "";
                            return (
                              <tr key={kpi.id} className="border-t">
                                <td className="p-2 font-medium">{kpi.labelEn || kpi.name}<span className="text-muted-foreground text-xs ml-1">{kpi.unit ? `(${kpi.unit})` : ""}</span></td>
                                <td className="p-2">
                                  <Input
                                    type="number"
                                    step="any"
                                    value={val}
                                    onChange={e => setPreviewValues(prev => ({ ...prev, [String(kpi.id)]: e.target.value }))}
                                    className="w-36"
                                    placeholder="not mapped"
                                    data-testid={`input-preview-value-${kpi.id}`}
                                  />
                                </td>
                                <td className="p-2">
                                  {hasVal
                                    ? <span className="flex items-center gap-1 text-green-600 text-xs"><CheckCircle className="w-3.5 h-3.5" />Mapped</span>
                                    : <span className="text-muted-foreground text-xs">Not mapped</span>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Raw message (collapsible) */}
                {syncPreview.messageText && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">View raw message text</summary>
                    <pre className="mt-2 p-3 bg-muted rounded whitespace-pre-wrap font-mono text-xs max-h-48 overflow-y-auto">{syncPreview.messageText}</pre>
                  </details>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSyncPreviewOpen(false)} data-testid="button-cancel-sync">Cancel</Button>
            {syncPreview?.ok && (
              <Button onClick={handleConfirmSync} disabled={saveValuesMutation.isPending} data-testid="button-confirm-sync">
                <Save className="w-4 h-4 mr-2" />
                {saveValuesMutation.isPending ? "Saving…" : `Save ${Object.values(previewValues).filter(v => v !== "").length} values`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dashDialog} onOpenChange={setDashDialog}>
        <DialogContent className="max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editDash ? t.tvDashboard.editDashboard : t.tvDashboard.addDashboard}</DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 pr-1">
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
            <div className="border-t border-border pt-3">
              <p className="text-sm font-semibold mb-2">Video Display Mode</p>
              <Select value={dashForm.displayMode} onValueChange={v => setDashForm(p => ({ ...p, displayMode: v }))} data-testid="select-display-mode">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simultaneous">Simultaneous — KPIs and video share the screen</SelectItem>
                  <SelectItem value="sequential">Sequential — KPI page shows, then video plays full-screen</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {dashForm.displayMode === "sequential"
                  ? "Each KPI page shows full-screen, then its linked video plays. Configure the page→video links in the Videos tab."
                  : "KPIs and video are displayed on the same screen at the same time."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={dashForm.showVideo} onCheckedChange={v => setDashForm(p => ({ ...p, showVideo: v }))} data-testid="switch-show-video" />
              <Label>{t.tvDashboard.showVideo}</Label>
            </div>
            {dashForm.showVideo && dashForm.displayMode === "simultaneous" && (
              <>
                <div>
                  <Label>{t.tvDashboard.videoPosition}</Label>
                  <Select value={dashForm.videoPosition} onValueChange={v => setDashForm(p => ({ ...p, videoPosition: v }))}>
                    <SelectTrigger data-testid="select-video-position">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bottom">{t.tvDashboard.positionBottom}</SelectItem>
                      <SelectItem value="top">{t.tvDashboard.positionTop}</SelectItem>
                      <SelectItem value="right">{t.tvDashboard.positionRight}</SelectItem>
                      <SelectItem value="left">{t.tvDashboard.positionLeft}</SelectItem>
                      <SelectItem value="center">{t.tvDashboard.positionCenter}</SelectItem>
                      <SelectItem value="top-right">{t.tvDashboard.positionTopRight}</SelectItem>
                      <SelectItem value="top-left">{t.tvDashboard.positionTopLeft}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t.tvDashboard.videoSize}</Label>
                  <Select value={dashForm.videoSizePercent} onValueChange={v => setDashForm(p => ({ ...p, videoSizePercent: v }))}>
                    <SelectTrigger data-testid="select-video-size">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">{t.tvDashboard.videoSizeSmall}</SelectItem>
                      <SelectItem value="40">{t.tvDashboard.videoSizeMedium}</SelectItem>
                      <SelectItem value="55">{t.tvDashboard.videoSizeLarge}</SelectItem>
                      <SelectItem value="65">{t.tvDashboard.videoSizeXLarge}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            {dashForm.displayMode === "sequential" && (
              <div>
                <Label>Video duration per page (seconds)</Label>
                <Input type="number" min="5" max="300" value={dashForm.sequentialVideoSeconds} onChange={e => setDashForm(p => ({ ...p, sequentialVideoSeconds: e.target.value }))} data-testid="input-sequential-video-seconds" />
                <p className="text-xs text-muted-foreground mt-1">How long each linked video plays before moving to the next KPI page (default: 30s).</p>
              </div>
            )}
            <div>
              <Label>{t.tvDashboard.kpiRotation}</Label>
              <Input type="number" min="1" value={dashForm.kpiRotationSeconds} onChange={e => setDashForm(p => ({ ...p, kpiRotationSeconds: e.target.value }))} data-testid="input-kpi-rotation-seconds" />
            </div>
            <div>
              <Label>Bar Shimmer Speed (seconds)</Label>
              <Input type="number" min="1" max="30" value={dashForm.shimmerDurationSeconds} onChange={e => setDashForm(p => ({ ...p, shimmerDurationSeconds: e.target.value }))} data-testid="input-shimmer-duration-seconds" />
              <p className="text-xs text-muted-foreground mt-1">Higher = slower shimmer (default: 6)</p>
            </div>
            <div>
              <Label>{t.tvDashboard.kpiTransition}</Label>
              <Select value={dashForm.kpiTransitionStyle} onValueChange={v => setDashForm(p => ({ ...p, kpiTransitionStyle: v }))}>
                <SelectTrigger data-testid="select-kpi-transition">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fade">{t.tvDashboard.transitionFade}</SelectItem>
                  <SelectItem value="slide-left">{t.tvDashboard.transitionSlideLeft}</SelectItem>
                  <SelectItem value="slide-up">{t.tvDashboard.transitionSlideUp}</SelectItem>
                  <SelectItem value="zoom">{t.tvDashboard.transitionZoom}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t.tvDashboard.kpisPerPage || "Cards per page"}</Label>
              <Select value={dashForm.kpisPerPage} onValueChange={v => setDashForm(p => ({ ...p, kpisPerPage: v }))}>
                <SelectTrigger data-testid="select-kpis-per-page">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 card (1×1)</SelectItem>
                  <SelectItem value="2">2 cards (2×1)</SelectItem>
                  <SelectItem value="3">3 cards (3×1)</SelectItem>
                  <SelectItem value="4">4 cards (2×2)</SelectItem>
                  <SelectItem value="6">6 cards (3×2) — default</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">{t.tvDashboard.kpisPerPageHint || "Number of KPI cards visible at once. Fewer cards = larger cards."}</p>
            </div>
            <div>
              <Label>{t.tvDashboard.kpiFontScale || "Text size"}</Label>
              <Select value={dashForm.kpiFontScale} onValueChange={v => setDashForm(p => ({ ...p, kpiFontScale: v }))}>
                <SelectTrigger data-testid="select-kpi-font-scale">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1.0">{t.tvDashboard.fontScaleNormal || "Normal (default)"}</SelectItem>
                  <SelectItem value="1.3">{t.tvDashboard.fontScaleLarge || "Large"}</SelectItem>
                  <SelectItem value="1.6">{t.tvDashboard.fontScaleXLarge || "Extra Large"}</SelectItem>
                  <SelectItem value="2.0">{t.tvDashboard.fontScaleMax || "Maximum"}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">{t.tvDashboard.kpiFontScaleHint || "Increase for TVs viewed from a distance."}</p>
            </div>
            <div>
              <Label>Scrolling Ticker Position</Label>
              <Select value={dashForm.tickerPosition} onValueChange={v => setDashForm(p => ({ ...p, tickerPosition: v }))}>
                <SelectTrigger data-testid="select-ticker-position">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="off">Off (disabled)</SelectItem>
                  <SelectItem value="below">Below image / video</SelectItem>
                  <SelectItem value="above">Above image / video</SelectItem>
                  <SelectItem value="bottom-bar">Full-width bottom bar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {dashForm.tickerPosition !== "off" && (
              <div>
                <Label>Ticker Text</Label>
                <Input
                  value={dashForm.tickerText}
                  onChange={e => setDashForm(p => ({ ...p, tickerText: e.target.value }))}
                  placeholder="Enter scrolling message..."
                  data-testid="input-ticker-text"
                />
                <p className="text-xs text-muted-foreground mt-1">This text will scroll across the screen on the TV dashboard.</p>
              </div>
            )}
            <div className="border-t border-border pt-3">
              <p className="text-sm font-semibold mb-2">Banner Panel (below video in corner layout)</p>
              <div className="flex flex-col gap-3">
                <div>
                  <Label>Banner Animation Style</Label>
                  <Select value={dashForm.bannerStyle} onValueChange={v => setDashForm(p => ({ ...p, bannerStyle: v }))}>
                    <SelectTrigger data-testid="select-banner-style">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="off">Off (disabled)</SelectItem>
                      <SelectItem value="slide-fade">Slide-up Fade — fades in from below, holds, fades out</SelectItem>
                      <SelectItem value="marquee">Scrolling Marquee — moves across continuously</SelectItem>
                      <SelectItem value="pulse">Pulsing Glow — stationary with neon pulse effect</SelectItem>
                      <SelectItem value="typewriter">Typewriter — types letter by letter then resets</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {dashForm.bannerStyle !== "off" && (
                  <>
                    <div>
                      <Label>Banner Text</Label>
                      <Input
                        value={dashForm.bannerText}
                        onChange={e => setDashForm(p => ({ ...p, bannerText: e.target.value }))}
                        placeholder="Enter banner message..."
                        data-testid="input-banner-text"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Displayed in the space below the video (corner layouts only).</p>
                    </div>
                    <div>
                      <Label>Font Size (px): {dashForm.bannerFontSize}</Label>
                      <input
                        type="range"
                        min={16}
                        max={120}
                        step={2}
                        value={dashForm.bannerFontSize}
                        onChange={e => setDashForm(p => ({ ...p, bannerFontSize: e.target.value }))}
                        className="w-full mt-1"
                        data-testid="range-banner-font-size"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>16px (small)</span>
                        <span>120px (huge)</span>
                      </div>
                    </div>
                    {(dashForm.bannerStyle === "marquee" || dashForm.tickerPosition !== "off") && (
                      <>
                        <div>
                          <Label>
                            Scroll Speed: {["", "1 – Very Slow", "2 – Slow", "3 – Moderate", "4 – Medium", "5 – Normal", "6 – Slightly Fast", "7 – Fast", "8 – Faster", "9 – Very Fast", "10 – Maximum"][parseInt(dashForm.bannerScrollSpeed) || 5]}
                          </Label>
                          <input
                            type="range"
                            min={1}
                            max={10}
                            step={1}
                            value={dashForm.bannerScrollSpeed}
                            onChange={e => setDashForm(p => ({ ...p, bannerScrollSpeed: e.target.value }))}
                            className="w-full mt-1"
                            data-testid="range-banner-scroll-speed"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>1 (very slow)</span>
                            <span>10 (maximum)</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Controls scroll speed for both the banner marquee and the ticker bar.</p>
                        </div>
                        {dashForm.bannerStyle !== "off" && dashForm.bannerText.trim().length > 0 && (
                          <div>
                            <Label>Banner Vertical Position: {dashForm.bannerVerticalPosition}% from top</Label>
                            <p className="text-xs text-muted-foreground mb-1">Move the banner up or down on the KPI screen (sequential mode only).</p>
                            <input
                              type="range" min={0} max={100} step={5}
                              value={dashForm.bannerVerticalPosition}
                              onChange={e => setDashForm(p => ({ ...p, bannerVerticalPosition: e.target.value }))}
                              className="w-full mt-1"
                              data-testid="range-banner-vertical-position"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>0% (top)</span>
                              <span>50% (center)</span>
                              <span>100% (bottom)</span>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
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

      <Dialog open={videoDialog} onOpenChange={open => { setVideoDialog(open); if (!open) setUploadedName(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editVideo ? t.tvDashboard.editVideo : t.tvDashboard.addVideo}</DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t.tvDashboard.videoTitle}</Label>
              <Input value={videoForm.title} onChange={e => setVideoForm(p => ({ ...p, title: e.target.value }))} placeholder="Auto-filled from filename if left blank" data-testid="input-video-title" />
            </div>
            <div>
              <Label>{t.tvDashboard.videoType}</Label>
              <Select value={videoForm.videoType} onValueChange={v => { setVideoForm(p => ({ ...p, videoType: v, url: "" })); setUploadedName(null); }}>
                <SelectTrigger data-testid="select-video-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="youtube"><span className="flex items-center gap-2"><Film className="w-4 h-4" />{t.tvDashboard.youtube}</span></SelectItem>
                  <SelectItem value="upload"><span className="flex items-center gap-2"><Upload className="w-4 h-4" />{t.tvDashboard.upload}</span></SelectItem>
                  <SelectItem value="image"><span className="flex items-center gap-2"><Image className="w-4 h-4" />{t.tvDashboard.imageType || "Image / Photo"}</span></SelectItem>
                </SelectContent>
              </Select>
            </div>

            {videoForm.videoType === "youtube" ? (
              <div>
                <Label>{t.tvDashboard.videoUrl}</Label>
                <Input
                  value={videoForm.url}
                  onChange={e => setVideoForm(p => ({ ...p, url: e.target.value }))}
                  placeholder={t.tvDashboard.youtubeUrlPlaceholder}
                  data-testid="input-video-url"
                />
              </div>
            ) : (
              <div>
                <Label>{videoForm.videoType === "image" ? (t.tvDashboard.imageType || "Image / Photo") : t.tvDashboard.upload}</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={videoForm.videoType === "image" ? "image/*" : "video/*"}
                  className="hidden"
                  data-testid="input-file-upload"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }}
                />
                <div
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/60 hover:bg-muted/30 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="dropzone-upload"
                >
                  {uploading ? (
                    <p className="text-sm text-muted-foreground animate-pulse">Uploading...</p>
                  ) : uploadedName || videoForm.url ? (
                    <div className="flex items-center justify-center gap-2">
                      {videoForm.videoType === "image" ? <Image className="w-5 h-5 text-primary" /> : <Film className="w-5 h-5 text-primary" />}
                      <span className="text-sm font-medium truncate max-w-[200px]">{uploadedName || videoForm.url.split("/").pop()}</span>
                      <button type="button" onClick={e => { e.stopPropagation(); setVideoForm(p => ({ ...p, url: "" })); setUploadedName(null); }} className="ml-1 text-muted-foreground hover:text-destructive">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {videoForm.videoType === "image" ? "Click to select a photo (JPG, PNG, GIF…)" : "Click to select a video (MP4, WebM…)"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

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
            <Button onClick={submitVideo} disabled={createVideoMutation.isPending || updateVideoMutation.isPending || uploading} data-testid="button-submit-video">
              {(createVideoMutation.isPending || updateVideoMutation.isPending) ? t.tvDashboard.creating : t.buttons?.save || "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk Update Dialog ─────────────────────────────────── */}
      <Dialog open={bulkDialog} onOpenChange={open => { setBulkDialog(open); if (!open) setBulkPreviewMode(false); }}>
        <DialogContent className="max-h-[90vh] flex flex-col max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Layers className="w-4 h-4" /> Bulk Update Dashboards</DialogTitle>
            <DialogDescription>
              {bulkPreviewMode
                ? "Review changes below. Only fields marked as changed will differ from their current values."
                : "Push shared settings to multiple dashboards at once. Only enabled groups are written."}
            </DialogDescription>
          </DialogHeader>

          {/* ── Preview panel ── */}
          {bulkPreviewMode ? (() => {
            const diff = buildBulkPreview();
            const totalChanges = diff.reduce((sum, d) => sum + d.changes.filter(c => c.willChange).length, 0);
            return (
              <div className="overflow-y-auto flex-1 pr-1 space-y-3">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-sm">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="text-amber-800 dark:text-amber-300">
                    <strong>{diff.length} dashboard{diff.length !== 1 ? "s" : ""}</strong> will be updated
                    {totalChanges > 0 ? ` with ${totalChanges} field change${totalChanges !== 1 ? "s" : ""}` : " (no fields differ from current values)"}.
                  </span>
                </div>
                {diff.map(({ dashboard, changes }) => {
                  const changed = changes.filter(c => c.willChange);
                  const unchanged = changes.filter(c => !c.willChange);
                  return (
                    <div key={dashboard.id} className="border rounded-lg overflow-hidden">
                      <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b">
                        <Monitor className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">{dashboard.name}</span>
                        {changed.length === 0
                          ? <span className="ml-auto text-xs text-muted-foreground">no changes</span>
                          : <span className="ml-auto text-xs font-medium text-amber-600 dark:text-amber-400">{changed.length} field{changed.length !== 1 ? "s" : ""} changing</span>}
                      </div>
                      {changes.length > 0 && (
                        <table className="w-full text-xs">
                          <tbody>
                            {changed.map(c => (
                              <tr key={c.label} className="border-t bg-amber-50/50 dark:bg-amber-950/10">
                                <td className="px-3 py-1.5 text-muted-foreground w-36">{c.label}</td>
                                <td className="px-3 py-1.5 line-through text-muted-foreground">{c.oldVal}</td>
                                <td className="px-1 py-1.5 text-muted-foreground">→</td>
                                <td className="px-3 py-1.5 font-semibold text-foreground">{c.newVal}</td>
                              </tr>
                            ))}
                            {unchanged.map(c => (
                              <tr key={c.label} className="border-t">
                                <td className="px-3 py-1.5 text-muted-foreground w-36">{c.label}</td>
                                <td className="px-3 py-1.5 text-muted-foreground" colSpan={3}>{c.oldVal} <span className="italic">(no change)</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })() : (
          <div className="space-y-5 overflow-y-auto flex-1 pr-1">
            {/* Dashboard selector */}
            <div className="border rounded-lg p-3 space-y-2">
              <p className="text-sm font-semibold">Apply to</p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={bulkSelectAll}
                  onChange={e => { setBulkSelectAll(e.target.checked); if (e.target.checked) setBulkSelectedIds(new Set()); }}
                  className="h-4 w-4" />
                <span className="text-sm font-medium">All dashboards ({dashboards.length})</span>
              </label>
              {!bulkSelectAll && (
                <div className="ml-1 space-y-1 max-h-40 overflow-y-auto border rounded p-2 bg-muted/30">
                  {(dashboards as Dashboard[]).map(d => (
                    <label key={d.id} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox"
                        checked={bulkSelectedIds.has(d.id)}
                        onChange={e => setBulkSelectedIds(prev => {
                          const next = new Set(prev);
                          e.target.checked ? next.add(d.id) : next.delete(d.id);
                          return next;
                        })}
                        className="h-4 w-4" />
                      <span className="text-sm">{d.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Ticker group */}
            <div className="border rounded-lg p-3 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={bulkGroups.ticker}
                  onChange={e => setBulkGroups(p => ({ ...p, ticker: e.target.checked }))}
                  className="h-4 w-4" />
                <span className="text-sm font-semibold">Scrolling Ticker</span>
              </label>
              {bulkGroups.ticker && (
                <div className="space-y-2 ml-1">
                  <div>
                    <Label className="text-xs">Ticker Position</Label>
                    <Select value={bulkForm.tickerPosition} onValueChange={v => setBulkForm(p => ({ ...p, tickerPosition: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="off">Off (disabled)</SelectItem>
                        <SelectItem value="below">Below image / video</SelectItem>
                        <SelectItem value="above">Above image / video</SelectItem>
                        <SelectItem value="bottom-bar">Full-width bottom bar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {bulkForm.tickerPosition !== "off" && (
                    <div>
                      <Label className="text-xs">Ticker Text</Label>
                      <Input className="mt-1" value={bulkForm.tickerText}
                        onChange={e => setBulkForm(p => ({ ...p, tickerText: e.target.value }))}
                        placeholder="Enter scrolling message..." />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Banner group */}
            <div className="border rounded-lg p-3 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={bulkGroups.banner}
                  onChange={e => setBulkGroups(p => ({ ...p, banner: e.target.checked }))}
                  className="h-4 w-4" />
                <span className="text-sm font-semibold">Banner Panel</span>
              </label>
              {bulkGroups.banner && (
                <div className="space-y-3 ml-1">
                  <div>
                    <Label className="text-xs">Banner Style</Label>
                    <Select value={bulkForm.bannerStyle} onValueChange={v => setBulkForm(p => ({ ...p, bannerStyle: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="off">Off (disabled)</SelectItem>
                        <SelectItem value="slide-fade">Slide-up Fade</SelectItem>
                        <SelectItem value="marquee">Scrolling Marquee</SelectItem>
                        <SelectItem value="pulse">Pulsing Glow</SelectItem>
                        <SelectItem value="typewriter">Typewriter</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {bulkForm.bannerStyle !== "off" && (
                    <>
                      <div>
                        <Label className="text-xs">Banner Text</Label>
                        <Input className="mt-1" value={bulkForm.bannerText}
                          onChange={e => setBulkForm(p => ({ ...p, bannerText: e.target.value }))}
                          placeholder="Enter banner message..." />
                      </div>
                      <div>
                        <Label className="text-xs">Font Size: {bulkForm.bannerFontSize}px</Label>
                        <input type="range" min={16} max={120} step={2}
                          value={bulkForm.bannerFontSize}
                          onChange={e => setBulkForm(p => ({ ...p, bannerFontSize: e.target.value }))}
                          className="w-full mt-1" />
                      </div>
                      {bulkForm.bannerStyle === "marquee" && (
                        <div>
                          <Label className="text-xs">Scroll Speed: {["","1–Very Slow","2–Slow","3–Moderate","4–Medium","5–Normal","6–Slightly Fast","7–Fast","8–Faster","9–Very Fast","10–Maximum"][parseInt(bulkForm.bannerScrollSpeed)||5]}</Label>
                          <input type="range" min={1} max={10} step={1}
                            value={bulkForm.bannerScrollSpeed}
                            onChange={e => setBulkForm(p => ({ ...p, bannerScrollSpeed: e.target.value }))}
                            className="w-full mt-1" />
                        </div>
                      )}
                      <div>
                        <Label className="text-xs">Vertical Position: {bulkForm.bannerVerticalPosition}% from top</Label>
                        <input type="range" min={0} max={100} step={5}
                          value={bulkForm.bannerVerticalPosition}
                          onChange={e => setBulkForm(p => ({ ...p, bannerVerticalPosition: e.target.value }))}
                          className="w-full mt-1" />
                        <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
                          <span>0% top</span><span>100% bottom</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Display behaviour group */}
            <div className="border rounded-lg p-3 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={bulkGroups.display}
                  onChange={e => setBulkGroups(p => ({ ...p, display: e.target.checked }))}
                  className="h-4 w-4" />
                <span className="text-sm font-semibold">Display Behaviour</span>
              </label>
              {bulkGroups.display && (
                <div className="space-y-3 ml-1">
                  <div>
                    <Label className="text-xs">Display Mode</Label>
                    <Select value={bulkForm.displayMode} onValueChange={v => setBulkForm(p => ({ ...p, displayMode: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="simultaneous">Simultaneous — KPIs and video share screen</SelectItem>
                        <SelectItem value="sequential">Sequential — KPI page then full-screen video</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {bulkForm.displayMode === "sequential" && (
                    <div>
                      <Label className="text-xs">Video Duration per Page (seconds)</Label>
                      <Input type="number" min="5" max="300" className="mt-1"
                        value={bulkForm.sequentialVideoSeconds}
                        onChange={e => setBulkForm(p => ({ ...p, sequentialVideoSeconds: e.target.value }))} />
                    </div>
                  )}
                  <div>
                    <Label className="text-xs">KPI Rotation (seconds)</Label>
                    <Input type="number" min="1" className="mt-1"
                      value={bulkForm.kpiRotationSeconds}
                      onChange={e => setBulkForm(p => ({ ...p, kpiRotationSeconds: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">KPI Transition Style</Label>
                    <Select value={bulkForm.kpiTransitionStyle} onValueChange={v => setBulkForm(p => ({ ...p, kpiTransitionStyle: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fade">Fade</SelectItem>
                        <SelectItem value="slide-left">Slide Left</SelectItem>
                        <SelectItem value="slide-up">Slide Up</SelectItem>
                        <SelectItem value="zoom">Zoom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            {/* Video Layout group */}
            <div className="border rounded-lg p-3 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={bulkGroups.videoLayout}
                  onChange={e => setBulkGroups(p => ({ ...p, videoLayout: e.target.checked }))}
                  className="h-4 w-4" />
                <span className="text-sm font-semibold">Video Layout</span>
              </label>
              <p className="text-xs text-muted-foreground -mt-1 ml-6">Only applies to dashboards in simultaneous display mode.</p>
              {bulkGroups.videoLayout && (
                <div className="space-y-3 ml-1">
                  <div>
                    <Label className="text-xs">Video Position</Label>
                    <Select value={bulkForm.videoPosition} onValueChange={v => setBulkForm(p => ({ ...p, videoPosition: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bottom">Bottom</SelectItem>
                        <SelectItem value="top">Top</SelectItem>
                        <SelectItem value="right">Right</SelectItem>
                        <SelectItem value="left">Left</SelectItem>
                        <SelectItem value="center">Center</SelectItem>
                        <SelectItem value="top-right">Top Right</SelectItem>
                        <SelectItem value="top-left">Top Left</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Video Size</Label>
                    <Select value={bulkForm.videoSizePercent} onValueChange={v => setBulkForm(p => ({ ...p, videoSizePercent: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="25">25% — Small</SelectItem>
                        <SelectItem value="40">40% — Medium</SelectItem>
                        <SelectItem value="55">55% — Large</SelectItem>
                        <SelectItem value="65">65% — Extra Large</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </div>
          )}

          <DialogFooter className="pt-2 border-t">
            <Button variant="outline" onClick={() => { if (bulkPreviewMode) { setBulkPreviewMode(false); } else { setBulkDialog(false); } }}>
              {bulkPreviewMode ? "← Back" : "Cancel"}
            </Button>
            {bulkPreviewMode ? (
              <Button
                onClick={submitBulkUpdate}
                disabled={bulkUpdateMutation.isPending}
                data-testid="button-bulk-update-confirm"
              >
                {bulkUpdateMutation.isPending ? "Saving…" : `Confirm & Save to ${bulkTargetCount} dashboard${bulkTargetCount !== 1 ? "s" : ""}`}
              </Button>
            ) : (
              <Button
                onClick={openBulkPreview}
                disabled={bulkTargetCount === 0}
                data-testid="button-bulk-update-submit"
              >
                Review Changes →
              </Button>
            )}
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
