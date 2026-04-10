import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/hooks/use-auth";
import {
  ShieldCheck, Plus, Pencil, Trash2, Bell, BellOff, Play, CheckCircle2,
  AlertTriangle, XCircle, Clock, MapPin, Hash, Calendar, Package
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Tracker = {
  id: number; name: string; description: string | null; departmentId: number | null;
  isActive: boolean; createdAt: string;
  department?: { id: number; name: string } | null;
};
type TrackerItem = {
  id: number; trackerId: number; name: string; serialNumber: string | null;
  location: string | null; quantity: number | null; purchaseDate: string | null;
  expiryDate: string | null; notes: string | null; isActive: boolean; createdAt: string;
};
type NotificationRule = {
  id: number; trackerId: number; triggerType: string; thresholdDays: number | null;
  recipients: string[]; isActive: boolean; lastRunAt: string | null; lastMatchCount: number | null;
};

function daysDiff(expiryDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(expiryDate);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function ExpiryBadge({ expiryDate, t }: { expiryDate: string | null; t: any }) {
  if (!expiryDate) {
    return <span className="text-xs text-muted-foreground">{t.noExpiry}</span>;
  }
  const diff = daysDiff(expiryDate);
  if (diff < 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
        <XCircle className="w-3 h-3" />
        {t.statusExpired} · {Math.abs(diff)} {t.daysOverdue}
      </span>
    );
  }
  if (diff === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
        <AlertTriangle className="w-3 h-3" />
        {t.today}
      </span>
    );
  }
  if (diff <= 30) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
        <Clock className="w-3 h-3" />
        {t.statusExpiring} · {diff} {t.daysRemaining}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
      <CheckCircle2 className="w-3 h-3" />
      {t.statusValid} · {diff} {t.daysRemaining}
    </span>
  );
}

const BLANK_TRACKER = { name: "", description: "", departmentId: "", isActive: true };
const BLANK_ITEM = { name: "", serialNumber: "", location: "", quantity: "1", purchaseDate: "", expiryDate: "", notes: "", isActive: true };
const BLANK_RULE = { triggerType: "expiry_approaching", thresholdDays: "30", recipients: [] as string[], isActive: true };

export default function StatusTracker() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const st = t.statusTracker;
  const isAdmin = user?.role === "admin";

  const [selectedTrackerId, setSelectedTrackerId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("items");

  // Tracker dialog
  const [trackerDialog, setTrackerDialog] = useState(false);
  const [editTracker, setEditTracker] = useState<Tracker | null>(null);
  const [trackerForm, setTrackerForm] = useState(BLANK_TRACKER);

  // Item dialog
  const [itemDialog, setItemDialog] = useState(false);
  const [editItem, setEditItem] = useState<TrackerItem | null>(null);
  const [itemForm, setItemForm] = useState(BLANK_ITEM);

  // Notification rule dialog
  const [ruleDialog, setRuleDialog] = useState(false);
  const [editRule, setEditRule] = useState<NotificationRule | null>(null);
  const [ruleForm, setRuleForm] = useState(BLANK_RULE);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: number; name: string } | null>(null);

  const [runningCheck, setRunningCheck] = useState(false);

  // Queries
  const { data: trackers = [], isLoading: trackersLoading } = useQuery<Tracker[]>({ queryKey: ["/api/trackers"] });
  const { data: departments = [] } = useQuery<any[]>({ queryKey: ["/api/departments"] });
  const { data: users = [] } = useQuery<any[]>({ queryKey: ["/api/users"] });
  const { data: items = [] } = useQuery<TrackerItem[]>({
    queryKey: ["/api/trackers", selectedTrackerId, "items"],
    queryFn: async () => {
      if (!selectedTrackerId) return [];
      const res = await fetch(`/api/trackers/${selectedTrackerId}/items`);
      return res.json();
    },
    enabled: !!selectedTrackerId,
  });
  const { data: rules = [] } = useQuery<NotificationRule[]>({
    queryKey: ["/api/trackers", selectedTrackerId, "notification-rules"],
    queryFn: async () => {
      if (!selectedTrackerId) return [];
      const res = await fetch(`/api/trackers/${selectedTrackerId}/notification-rules`);
      return res.json();
    },
    enabled: !!selectedTrackerId && isAdmin,
  });

  const selectedTracker = trackers.find(t => t.id === selectedTrackerId);

  // Mutations — Trackers
  const createTrackerMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/trackers", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/trackers"] }); setTrackerDialog(false); toast({ title: st.addTracker }); },
  });
  const updateTrackerMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PUT", `/api/trackers/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/trackers"] }); setTrackerDialog(false); toast({ title: st.editTracker }); },
  });
  const deleteTrackerMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/trackers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trackers"] });
      if (deleteTarget?.id === selectedTrackerId) setSelectedTrackerId(null);
      setDeleteTarget(null);
    },
  });

  // Mutations — Items
  const createItemMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/trackers/${selectedTrackerId}/items`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/trackers", selectedTrackerId, "items"] }); setItemDialog(false); toast({ title: st.addItem }); },
  });
  const updateItemMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PUT", `/api/tracker-items/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/trackers", selectedTrackerId, "items"] }); setItemDialog(false); toast({ title: st.editItem }); },
  });
  const deleteItemMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/tracker-items/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/trackers", selectedTrackerId, "items"] }); setDeleteTarget(null); },
  });

  // Mutations — Rules
  const createRuleMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/trackers/${selectedTrackerId}/notification-rules`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/trackers", selectedTrackerId, "notification-rules"] }); setRuleDialog(false); toast({ title: st.addRule }); },
  });
  const updateRuleMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PUT", `/api/tracker-rules/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/trackers", selectedTrackerId, "notification-rules"] }); setRuleDialog(false); toast({ title: st.editRule }); },
  });
  const deleteRuleMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/tracker-rules/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/trackers", selectedTrackerId, "notification-rules"] }); setDeleteTarget(null); },
  });

  // Dialog openers
  const openTrackerDialog = (tracker?: Tracker) => {
    if (tracker) {
      setEditTracker(tracker);
      setTrackerForm({ name: tracker.name, description: tracker.description || "", departmentId: tracker.departmentId?.toString() || "", isActive: tracker.isActive });
    } else {
      setEditTracker(null);
      setTrackerForm(BLANK_TRACKER);
    }
    setTrackerDialog(true);
  };

  const submitTracker = () => {
    const data = { ...trackerForm, departmentId: trackerForm.departmentId ? parseInt(trackerForm.departmentId) : null, description: trackerForm.description || null };
    if (editTracker) updateTrackerMut.mutate({ id: editTracker.id, data });
    else createTrackerMut.mutate(data);
  };

  const openItemDialog = (item?: TrackerItem) => {
    if (item) {
      setEditItem(item);
      setItemForm({
        name: item.name, serialNumber: item.serialNumber || "", location: item.location || "",
        quantity: (item.quantity ?? 1).toString(), purchaseDate: item.purchaseDate || "",
        expiryDate: item.expiryDate || "", notes: item.notes || "", isActive: item.isActive,
      });
    } else {
      setEditItem(null);
      setItemForm(BLANK_ITEM);
    }
    setItemDialog(true);
  };

  const submitItem = () => {
    const data = {
      name: itemForm.name, serialNumber: itemForm.serialNumber || null, location: itemForm.location || null,
      quantity: parseInt(itemForm.quantity) || 1, purchaseDate: itemForm.purchaseDate || null,
      expiryDate: itemForm.expiryDate || null, notes: itemForm.notes || null, isActive: itemForm.isActive,
    };
    if (editItem) updateItemMut.mutate({ id: editItem.id, data });
    else createItemMut.mutate(data);
  };

  const openRuleDialog = (rule?: NotificationRule) => {
    if (rule) {
      setEditRule(rule);
      setRuleForm({ triggerType: rule.triggerType, thresholdDays: (rule.thresholdDays ?? 30).toString(), recipients: rule.recipients, isActive: rule.isActive });
    } else {
      setEditRule(null);
      setRuleForm(BLANK_RULE);
    }
    setRuleDialog(true);
  };

  const toggleRecipient = (email: string) => {
    setRuleForm(p => ({
      ...p,
      recipients: p.recipients.includes(email)
        ? p.recipients.filter(r => r !== email)
        : [...p.recipients, email],
    }));
  };

  const submitRule = () => {
    const data = {
      triggerType: ruleForm.triggerType,
      thresholdDays: ruleForm.triggerType === "expiry_approaching" ? (parseInt(ruleForm.thresholdDays) || 30) : null,
      recipients: ruleForm.recipients,
      isActive: ruleForm.isActive,
    };
    if (editRule) updateRuleMut.mutate({ id: editRule.id, data });
    else createRuleMut.mutate(data);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "tracker") deleteTrackerMut.mutate(deleteTarget.id);
    else if (deleteTarget.type === "item") deleteItemMut.mutate(deleteTarget.id);
    else if (deleteTarget.type === "rule") deleteRuleMut.mutate(deleteTarget.id);
  };

  const handleRunCheck = async () => {
    if (!selectedTrackerId) return;
    setRunningCheck(true);
    try {
      const res = await apiRequest("POST", `/api/trackers/${selectedTrackerId}/run-check`, {});
      const json = await res.json() as { success: boolean; matchCount: number };
      toast({
        title: st.checkComplete,
        description: st.checkCompleteDesc?.replace("{count}", String(json.matchCount ?? 0)),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/trackers", selectedTrackerId, "notification-rules"] });
    } catch {
      toast({ title: st.errorGeneric, variant: "destructive" });
    } finally {
      setRunningCheck(false);
    }
  };

  const activeItems = items.filter(i => i.isActive);
  const expiredCount = activeItems.filter(i => i.expiryDate && daysDiff(i.expiryDate) < 0).length;
  const expiringCount = activeItems.filter(i => i.expiryDate && daysDiff(i.expiryDate) >= 0 && daysDiff(i.expiryDate) <= 30).length;

  return (
    <div>
      <PageHeader
        icon={<ShieldCheck className="w-5 h-5 text-primary" />}
        title={st.pageTitle || "Status Tracker & Notifications"}
        description={st.pageSubtitle || "Track items with expiry dates and configure email alerts"}
        actions={isAdmin ? (
          <Button onClick={() => openTrackerDialog()} data-testid="button-add-tracker">
            <Plus className="w-4 h-4 mr-2" />
            {st.addTracker}
          </Button>
        ) : undefined}
      />

      <div className="mt-6 flex gap-4 min-h-[70vh]">
        {/* Left panel — tracker list */}
        <div className="w-64 shrink-0 flex flex-col gap-1" data-testid="panel-trackers">
          {trackersLoading ? (
            <div className="text-sm text-muted-foreground p-3">{st.loading}</div>
          ) : trackers.length === 0 ? (
            <div className="border rounded-xl p-6 text-center text-muted-foreground">
              <ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">{st.noTrackers}</p>
              <p className="text-xs mt-1">{st.noTrackersMessage}</p>
            </div>
          ) : (
            trackers.map(tracker => (
              <div
                key={tracker.id}
                onClick={() => setSelectedTrackerId(tracker.id)}
                className={cn(
                  "rounded-xl border px-3 py-2.5 cursor-pointer transition-all group",
                  selectedTrackerId === tracker.id
                    ? "bg-primary/10 border-primary/30 shadow-sm"
                    : "bg-card hover:bg-muted/50 border-border"
                )}
                data-testid={`tracker-item-${tracker.id}`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className={cn("text-sm font-medium truncate", selectedTrackerId === tracker.id ? "text-primary" : "text-foreground")}>
                    {tracker.name}
                  </span>
                  {isAdmin && (
                    <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); openTrackerDialog(tracker); }} data-testid={`button-edit-tracker-${tracker.id}`}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); setDeleteTarget({ type: "tracker", id: tracker.id, name: tracker.name }); }} data-testid={`button-delete-tracker-${tracker.id}`}>
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
                {tracker.department && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{tracker.department.name}</p>
                )}
                {!tracker.isActive && (
                  <Badge variant="outline" className="text-[10px] mt-1 px-1.5 py-0">{st.inactive}</Badge>
                )}
              </div>
            ))
          )}
        </div>

        {/* Right panel — items & notifications */}
        <div className="flex-1 min-w-0">
          {!selectedTrackerId ? (
            <div className="h-full flex items-center justify-center text-muted-foreground border rounded-xl">
              <div className="text-center">
                <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">{st.selectTracker}</p>
              </div>
            </div>
          ) : (
            <div className="border rounded-xl overflow-hidden h-full flex flex-col">
              {/* Header */}
              <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-foreground">{selectedTracker?.name}</h2>
                  {selectedTracker?.description && (
                    <p className="text-xs text-muted-foreground">{selectedTracker.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {expiredCount > 0 && (
                    <Badge variant="destructive" className="text-xs" data-testid="badge-expired-count">
                      <XCircle className="w-3 h-3 mr-1" />
                      {expiredCount} {st.expiredBadge}
                    </Badge>
                  )}
                  {expiringCount > 0 && (
                    <Badge className="text-xs bg-amber-500 hover:bg-amber-500" data-testid="badge-expiring-count">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      {expiringCount} {st.expiringBadge}
                    </Badge>
                  )}
                </div>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1">
                <div className="px-4 pt-3 border-b">
                  <TabsList>
                    <TabsTrigger value="items" data-testid="tab-items">{st.tabItems} ({items.length})</TabsTrigger>
                    {isAdmin && <TabsTrigger value="notifications" data-testid="tab-notifications">{st.tabNotifications}</TabsTrigger>}
                  </TabsList>
                </div>

                {/* Items Tab */}
                <TabsContent value="items" className="flex-1 p-4 m-0">
                  <div className="flex justify-end mb-3">
                    <Button size="sm" onClick={() => openItemDialog()} data-testid="button-add-item">
                      <Plus className="w-4 h-4 mr-1" />
                      {st.addItem}
                    </Button>
                  </div>

                  {items.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-medium">{st.noItems}</p>
                      <p className="text-xs mt-1">{st.noItemsMessage}</p>
                    </div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm" data-testid="table-items">
                        <thead>
                          <tr className="bg-muted/50 text-left">
                            <th className="p-3 font-medium">{st.itemName}</th>
                            <th className="p-3 font-medium hidden md:table-cell">{st.serialNumber}</th>
                            <th className="p-3 font-medium hidden lg:table-cell">{st.location}</th>
                            <th className="p-3 font-medium">{st.expiryDate}</th>
                            <th className="p-3 font-medium w-20"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map(item => (
                            <tr key={item.id} className="border-t hover:bg-muted/20 transition-colors" data-testid={`row-item-${item.id}`}>
                              <td className="p-3">
                                <div className="font-medium">{item.name}</div>
                                {item.notes && <div className="text-xs text-muted-foreground truncate max-w-[200px]">{item.notes}</div>}
                              </td>
                              <td className="p-3 text-muted-foreground hidden md:table-cell">
                                {item.serialNumber ? (
                                  <span className="flex items-center gap-1"><Hash className="w-3 h-3" />{item.serialNumber}</span>
                                ) : "—"}
                              </td>
                              <td className="p-3 text-muted-foreground hidden lg:table-cell">
                                {item.location ? (
                                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{item.location}</span>
                                ) : "—"}
                              </td>
                              <td className="p-3">
                                {item.expiryDate && (
                                  <div className="text-xs text-muted-foreground mb-1">{item.expiryDate}</div>
                                )}
                                <ExpiryBadge expiryDate={item.expiryDate} t={st} />
                              </td>
                              <td className="p-3 text-right">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openItemDialog(item)} data-testid={`button-edit-item-${item.id}`}>
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteTarget({ type: "item", id: item.id, name: item.name })} data-testid={`button-delete-item-${item.id}`}>
                                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </TabsContent>

                {/* Notifications Tab */}
                {isAdmin && (
                  <TabsContent value="notifications" className="flex-1 p-4 m-0">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => openRuleDialog()} data-testid="button-add-rule">
                          <Plus className="w-4 h-4 mr-1" />
                          {st.addRule}
                        </Button>
                        <Button
                          size="sm" variant="outline"
                          onClick={handleRunCheck}
                          disabled={runningCheck || rules.length === 0}
                          data-testid="button-run-check"
                        >
                          <Play className="w-4 h-4 mr-1" />
                          {runningCheck ? st.runningCheck : st.runCheckNow}
                        </Button>
                      </div>
                    </div>

                    {rules.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm font-medium">{st.noNotificationRules}</p>
                        <p className="text-xs mt-1">{st.noNotificationRulesMessage}</p>
                      </div>
                    ) : (
                      <div className="space-y-3" data-testid="list-rules">
                        {rules.map(rule => (
                          <div key={rule.id} className="border rounded-xl p-4 bg-card" data-testid={`rule-${rule.id}`}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  {rule.isActive
                                    ? <Bell className="w-4 h-4 text-primary shrink-0" />
                                    : <BellOff className="w-4 h-4 text-muted-foreground shrink-0" />}
                                  <span className="font-medium text-sm">
                                    {rule.triggerType === "expired" ? st.triggerExpired : `${st.triggerApproaching}: ${rule.thresholdDays} ${st.days}`}
                                  </span>
                                  {!rule.isActive && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{st.inactive}</Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground truncate">
                                  → {rule.recipients.map(email => {
                                    const u = users.find((usr: any) => usr.email === email);
                                    return u ? u.fullName : email;
                                  }).join(", ")}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {st.lastRun}: {rule.lastRunAt ? new Date(rule.lastRunAt).toLocaleString() : st.never}
                                  {rule.lastMatchCount !== null && ` · ${st.lastMatchCount}: ${rule.lastMatchCount}`}
                                </p>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openRuleDialog(rule)} data-testid={`button-edit-rule-${rule.id}`}>
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteTarget({ type: "rule", id: rule.id, name: `Rule #${rule.id}` })} data-testid={`button-delete-rule-${rule.id}`}>
                                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                )}
              </Tabs>
            </div>
          )}
        </div>
      </div>

      {/* Tracker Dialog */}
      <Dialog open={trackerDialog} onOpenChange={setTrackerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTracker ? st.editTracker : st.addTracker}</DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{st.trackerName} *</Label>
              <Input
                value={trackerForm.name}
                onChange={e => setTrackerForm(p => ({ ...p, name: e.target.value }))}
                placeholder={st.trackerNamePlaceholder}
                data-testid="input-tracker-name"
              />
            </div>
            <div>
              <Label>{st.description}</Label>
              <Textarea
                value={trackerForm.description}
                onChange={e => setTrackerForm(p => ({ ...p, description: e.target.value }))}
                placeholder={st.descriptionPlaceholder}
                rows={2}
                data-testid="input-tracker-description"
              />
            </div>
            <div>
              <Label>{st.department}</Label>
              <Select value={trackerForm.departmentId || "none"} onValueChange={v => setTrackerForm(p => ({ ...p, departmentId: v === "none" ? "" : v }))}>
                <SelectTrigger data-testid="select-tracker-department">
                  <SelectValue placeholder={st.selectDepartment} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{st.selectDepartment}</SelectItem>
                  {departments.map((d: any) => (
                    <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={trackerForm.isActive} onCheckedChange={v => setTrackerForm(p => ({ ...p, isActive: v }))} data-testid="switch-tracker-active" />
              <Label>{st.active}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={submitTracker} disabled={!trackerForm.name || createTrackerMut.isPending || updateTrackerMut.isPending} data-testid="button-submit-tracker">
              {t.buttons.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item Dialog */}
      <Dialog open={itemDialog} onOpenChange={setItemDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editItem ? st.editItem : st.addItem}</DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>{st.itemName} *</Label>
              <Input value={itemForm.name} onChange={e => setItemForm(p => ({ ...p, name: e.target.value }))} data-testid="input-item-name" />
            </div>
            <div>
              <Label>{st.serialNumber}</Label>
              <Input value={itemForm.serialNumber} onChange={e => setItemForm(p => ({ ...p, serialNumber: e.target.value }))} data-testid="input-item-serial" />
            </div>
            <div>
              <Label>{st.location}</Label>
              <Input value={itemForm.location} onChange={e => setItemForm(p => ({ ...p, location: e.target.value }))} data-testid="input-item-location" />
            </div>
            <div>
              <Label>{st.quantity}</Label>
              <Input type="number" min="1" value={itemForm.quantity} onChange={e => setItemForm(p => ({ ...p, quantity: e.target.value }))} data-testid="input-item-quantity" />
            </div>
            <div>
              <Label>{st.purchaseDate}</Label>
              <Input type="date" value={itemForm.purchaseDate} onChange={e => setItemForm(p => ({ ...p, purchaseDate: e.target.value }))} data-testid="input-item-purchase-date" />
            </div>
            <div className="col-span-2">
              <Label>{st.expiryDate}</Label>
              <Input type="date" value={itemForm.expiryDate} onChange={e => setItemForm(p => ({ ...p, expiryDate: e.target.value }))} data-testid="input-item-expiry-date" />
            </div>
            <div className="col-span-2">
              <Label>{st.notes}</Label>
              <Textarea value={itemForm.notes} onChange={e => setItemForm(p => ({ ...p, notes: e.target.value }))} rows={2} data-testid="input-item-notes" />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <Switch checked={itemForm.isActive} onCheckedChange={v => setItemForm(p => ({ ...p, isActive: v }))} data-testid="switch-item-active" />
              <Label>{st.active}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={submitItem} disabled={!itemForm.name || createItemMut.isPending || updateItemMut.isPending} data-testid="button-submit-item">
              {t.buttons.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notification Rule Dialog */}
      <Dialog open={ruleDialog} onOpenChange={setRuleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editRule ? st.editRule : st.addRule}</DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{st.triggerType}</Label>
              <Select value={ruleForm.triggerType} onValueChange={v => setRuleForm(p => ({ ...p, triggerType: v }))}>
                <SelectTrigger data-testid="select-trigger-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expiry_approaching">{st.triggerApproaching}</SelectItem>
                  <SelectItem value="expired">{st.triggerExpired}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {ruleForm.triggerType === "expiry_approaching" && (
              <div>
                <Label>{st.thresholdDays}</Label>
                <Input
                  type="number" min="1" max="365"
                  value={ruleForm.thresholdDays}
                  onChange={e => setRuleForm(p => ({ ...p, thresholdDays: e.target.value }))}
                  data-testid="input-threshold-days"
                />
              </div>
            )}
            <div>
              <Label className="mb-2 block">{st.recipients}</Label>
              <div className="border rounded-lg max-h-52 overflow-y-auto" data-testid="list-recipients">
                {users.filter((u: any) => u.email).length === 0 ? (
                  <p className="text-xs text-muted-foreground p-3 text-center">{st.noUsersWithEmail}</p>
                ) : (
                  users.filter((u: any) => u.email).map((u: any) => (
                    <label
                      key={u.id}
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 cursor-pointer border-b last:border-b-0"
                      data-testid={`recipient-user-${u.id}`}
                    >
                      <input
                        type="checkbox"
                        className="rounded accent-primary"
                        checked={ruleForm.recipients.includes(u.email)}
                        onChange={() => toggleRecipient(u.email)}
                        data-testid={`checkbox-recipient-${u.id}`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-none">{u.fullName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{u.email}</p>
                      </div>
                    </label>
                  ))
                )}
              </div>
              {ruleForm.recipients.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  {ruleForm.recipients.length} {st.recipientsSelected}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={ruleForm.isActive} onCheckedChange={v => setRuleForm(p => ({ ...p, isActive: v }))} data-testid="switch-rule-active" />
              <Label>{st.active}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={submitRule} disabled={ruleForm.recipients.length === 0 || createRuleMut.isPending || updateRuleMut.isPending} data-testid="button-submit-rule">
              {t.buttons.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.buttons.delete}</AlertDialogTitle>
            <AlertDialogDescription>
              {st.deleteConfirmDesc.replace("{name}", deleteTarget?.name ?? "")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.buttons.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              {t.buttons.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
