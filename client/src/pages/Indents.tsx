import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { useVehicles } from "@/hooks/use-vehicles";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Plus, Eye, Trash2, PackageSearch, X, Check, XCircle, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { PageHeader } from "@/components/PageHeader";

const UNITS = ["pcs", "litres", "kg", "metres", "sets", "boxes", "rolls"];

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getUserPermissions(user: any): string[] {
  if (!user?.permissions) return [];
  if (Array.isArray(user.permissions)) return user.permissions;
  try { return JSON.parse(user.permissions as string); } catch { return []; }
}

interface IndentItem {
  itemName: string;
  quantity: number;
  unit: string;
  notes?: string | null;
}

export default function Indents() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { vehicles } = useVehicles();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const it = t.indents;

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewIndent, setViewIndent] = useState<any>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [approveIndent, setApproveIndent] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [monthFilter, setMonthFilter] = useState(getCurrentMonth());

  const [vehicleId, setVehicleId] = useState("");
  const [priority, setPriority] = useState("medium");
  const [departmentId, setDepartmentId] = useState("");
  const [items, setItems] = useState<IndentItem[]>([{ itemName: "", quantity: 1, unit: "pcs", notes: "" }]);

  const [erpIndentNo, setErpIndentNo] = useState("");
  const [approvalNotes, setApprovalNotes] = useState("");

  const { data: indents, isLoading } = useQuery<any[]>({
    queryKey: [api.indents.list.path],
  });

  const { data: departments } = useQuery<any[]>({
    queryKey: [api.departments.list.path],
  });

  const { data: myApproverDepts } = useQuery<number[]>({
    queryKey: ["/api/indent-approvers/mine"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", api.indents.create.path, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.indents.list.path] });
      setIsCreateOpen(false);
      resetForm();
      toast({ title: "Indent created successfully" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", buildUrl(api.indents.update.path, { id }), data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.indents.list.path] });
      setIsApproveOpen(false);
      setIsRejectOpen(false);
      setApproveIndent(null);
      setErpIndentNo("");
      setApprovalNotes("");
      toast({ title: "Indent updated successfully" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", buildUrl(api.indents.delete.path, { id }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.indents.list.path] });
      toast({ title: "Indent deleted" });
    },
  });

  function resetForm() {
    setVehicleId("");
    setPriority("medium");
    setDepartmentId("");
    setItems([{ itemName: "", quantity: 1, unit: "pcs", notes: "" }]);
  }

  function addItem() {
    setItems([...items, { itemName: "", quantity: 1, unit: "pcs", notes: "" }]);
  }

  function removeItem(index: number) {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  }

  function updateItem(index: number, field: keyof IndentItem, value: any) {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  }

  function handleCreate() {
    const validItems = items.filter(i => i.itemName.trim());
    if (validItems.length === 0) {
      toast({ title: "Error", description: it.noItems, variant: "destructive" });
      return;
    }
    createMutation.mutate({
      vehicleId: vehicleId && vehicleId !== "none" ? Number(vehicleId) : null,
      priority,
      departmentId: departmentId && departmentId !== "none" ? Number(departmentId) : null,
      items: validItems,
    });
  }

  function handleApprove() {
    if (!erpIndentNo.trim()) {
      toast({ title: "Error", description: it.erpIndentNoRequired, variant: "destructive" });
      return;
    }
    updateMutation.mutate({
      id: approveIndent.id,
      data: { status: "approved", erpIndentNo, approvalNotes: approvalNotes || null },
    });
  }

  function handleReject() {
    updateMutation.mutate({
      id: approveIndent.id,
      data: { status: "rejected", approvalNotes: approvalNotes || null },
    });
  }

  function handleFulfill(id: number) {
    updateMutation.mutate({ id, data: { status: "fulfilled" } });
  }

  function canApproveIndent(indent: any): boolean {
    if (!user) return false;
    if (user.role === "admin") return true;
    const perms = getUserPermissions(user);
    if (!perms.includes("approve_indents")) return false;
    if (!indent.departmentId) return true;
    return (myApproverDepts || []).includes(indent.departmentId);
  }

  const statusColor = (s: string) => {
    switch (s) {
      case "pending": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "approved": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "rejected": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "fulfilled": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "cancelled": return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
      default: return "";
    }
  };

  const priorityColor = (p: string) => {
    switch (p) {
      case "low": return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
      case "medium": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "high": return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
      case "urgent": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      default: return "";
    }
  };

  const statusLabel = (s: string) => (it as any)[s] || s;
  const priorityLabel = (p: string) => (it as any)[p] || p;

  const filtered = useMemo(() => {
    return (indents || []).filter((indent: any) => {
      if (statusFilter && statusFilter !== "all" && indent.status !== statusFilter) return false;
      if (priorityFilter && priorityFilter !== "all" && indent.priority !== priorityFilter) return false;
      if (monthFilter && monthFilter !== "all") {
        if (indent.createdAt) {
          const d = new Date(indent.createdAt);
          const indentMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          if (indentMonth !== monthFilter) return false;
        }
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match = indent.indentNo?.toLowerCase().includes(q)
          || indent.erpIndentNo?.toLowerCase().includes(q)
          || indent.requestedBy?.fullName?.toLowerCase().includes(q)
          || indent.items?.some((i: any) => i.itemName?.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [indents, statusFilter, priorityFilter, monthFilter, searchQuery]);

  return (
    <div className="p-6" data-testid="indents-page">
      <PageHeader
        title={it.title}
        description={it.subtitle}
        icon={<PackageSearch className="w-5 h-5 text-primary" />}
        actions={
          <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-indent">
                <Plus className="w-4 h-4 mr-2" /> {it.newIndent}
              </Button>
            </DialogTrigger>
          </Dialog>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-4 flex-wrap">
        <Input
          placeholder={it.search}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
          data-testid="input-search-indents"
        />
        <div className="flex items-center gap-1">
          <Input
            type="month"
            value={monthFilter === "all" ? "" : monthFilter}
            onChange={(e) => setMonthFilter(e.target.value || "all")}
            className="w-[180px]"
            data-testid="input-month-filter"
          />
          {monthFilter !== "all" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => setMonthFilter("all")}
              data-testid="button-clear-month-filter"
              title={it.allMonths}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
            <SelectValue placeholder={it.allStatuses} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{it.allStatuses}</SelectItem>
            <SelectItem value="pending">{it.pending}</SelectItem>
            <SelectItem value="approved">{it.approved}</SelectItem>
            <SelectItem value="rejected">{it.rejected}</SelectItem>
            <SelectItem value="fulfilled">{it.fulfilled}</SelectItem>
            <SelectItem value="cancelled">{it.cancelled}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-priority-filter">
            <SelectValue placeholder={it.allPriorities} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{it.allPriorities}</SelectItem>
            <SelectItem value="low">{it.low}</SelectItem>
            <SelectItem value="medium">{it.medium}</SelectItem>
            <SelectItem value="high">{it.high}</SelectItem>
            <SelectItem value="urgent">{it.urgent}</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground self-center" data-testid="text-indent-count">
          {it.showingCount.replace("{count}", String(filtered.length)).replace("{total}", String(indents?.length || 0))}
        </span>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center" data-testid="empty-indents">
          <PackageSearch className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="text-lg font-semibold">{it.noIndents}</h3>
          <p className="text-muted-foreground">{it.noIndentsMessage}</p>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{it.indentNo}</TableHead>
                <TableHead>{it.erpIndentNo}</TableHead>
                <TableHead>{it.vehicle}</TableHead>
                <TableHead>{it.department}</TableHead>
                <TableHead>{it.requestedBy}</TableHead>
                <TableHead>{it.status}</TableHead>
                <TableHead>{it.priority}</TableHead>
                <TableHead>{it.items}</TableHead>
                <TableHead>{it.date}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((indent: any) => (
                <TableRow key={indent.id} data-testid={`row-indent-${indent.id}`}>
                  <TableCell className="font-mono text-sm" data-testid={`text-indent-no-${indent.id}`}>{indent.indentNo}</TableCell>
                  <TableCell className="font-mono text-sm" data-testid={`text-erp-no-${indent.id}`}>{indent.erpIndentNo || "—"}</TableCell>
                  <TableCell>{indent.vehicle ? `${indent.vehicle.make} ${indent.vehicle.model}` : "—"}</TableCell>
                  <TableCell>{indent.department?.name || "—"}</TableCell>
                  <TableCell>{indent.requestedBy?.fullName}</TableCell>
                  <TableCell>
                    <Badge className={statusColor(indent.status)} data-testid={`badge-status-${indent.id}`}>
                      {statusLabel(indent.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={priorityColor(indent.priority)} data-testid={`badge-priority-${indent.id}`}>
                      {priorityLabel(indent.priority)}
                    </Badge>
                  </TableCell>
                  <TableCell data-testid={`text-item-count-${indent.id}`}>{indent.items?.length || 0}</TableCell>
                  <TableCell className="text-sm">{indent.createdAt ? format(new Date(indent.createdAt), "dd/MM/yyyy") : ""}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost" size="icon"
                        onClick={() => { setViewIndent(indent); setIsViewOpen(true); }}
                        data-testid={`button-view-indent-${indent.id}`}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {indent.status === "pending" && canApproveIndent(indent) && (
                        <>
                          <Button
                            variant="ghost" size="icon"
                            className="text-green-600 hover:text-green-700"
                            onClick={() => { setApproveIndent(indent); setIsApproveOpen(true); }}
                            data-testid={`button-approve-indent-${indent.id}`}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => { setApproveIndent(indent); setIsRejectOpen(true); }}
                            data-testid={`button-reject-indent-${indent.id}`}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {indent.status === "approved" && canApproveIndent(indent) && (
                        <Button
                          variant="ghost" size="icon"
                          className="text-blue-600 hover:text-blue-700"
                          onClick={() => handleFulfill(indent.id)}
                          data-testid={`button-fulfill-indent-${indent.id}`}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      )}
                      {indent.status === "pending" && (user?.role === "admin" || indent.requestedById === user?.id) && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive" data-testid={`button-delete-indent-${indent.id}`}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t.buttons.delete}</AlertDialogTitle>
                              <AlertDialogDescription>{it.deleteConfirm}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t.buttons.cancel}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMutation.mutate(indent.id)}>{t.buttons.delete}</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-create-indent">
          <DialogHeader>
            <DialogTitle>{it.newIndent}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label>{it.priority}</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger data-testid="select-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{it.low}</SelectItem>
                    <SelectItem value="medium">{it.medium}</SelectItem>
                    <SelectItem value="high">{it.high}</SelectItem>
                    <SelectItem value="urgent">{it.urgent}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{it.department}</Label>
                <Select value={departmentId} onValueChange={setDepartmentId}>
                  <SelectTrigger data-testid="select-department">
                    <SelectValue placeholder={it.selectDepartment} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{it.selectDepartment}</SelectItem>
                    {(departments || []).map((d: any) => (
                      <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{it.vehicle}</Label>
                <Select value={vehicleId} onValueChange={setVehicleId}>
                  <SelectTrigger data-testid="select-vehicle">
                    <SelectValue placeholder={it.selectVehicle} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{it.selectVehicle}</SelectItem>
                    {(vehicles || []).map((v: any) => (
                      <SelectItem key={v.id} value={String(v.id)}>
                        {v.make} {v.model} ({v.licensePlate})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base font-semibold">{it.items} *</Label>
                <Button variant="outline" size="sm" onClick={addItem} data-testid="button-add-item">
                  <Plus className="w-3 h-3 mr-1" /> {it.addItem}
                </Button>
              </div>
              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-start border rounded-lg p-3" data-testid={`indent-item-${idx}`}>
                    <div className="flex-1 space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <Input
                          placeholder={it.itemName}
                          value={item.itemName}
                          onChange={(e) => updateItem(idx, "itemName", e.target.value)}
                          data-testid={`input-item-name-${idx}`}
                        />
                        <Input
                          type="number"
                          min={1}
                          placeholder={it.quantity}
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))}
                          data-testid={`input-item-qty-${idx}`}
                        />
                        <Select value={item.unit} onValueChange={(v) => updateItem(idx, "unit", v)}>
                          <SelectTrigger data-testid={`select-item-unit-${idx}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {UNITS.map(u => (
                              <SelectItem key={u} value={u}>{u}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Input
                        placeholder={it.itemNotes}
                        value={item.notes || ""}
                        onChange={(e) => updateItem(idx, "notes", e.target.value)}
                        data-testid={`input-item-notes-${idx}`}
                      />
                    </div>
                    {items.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="text-destructive shrink-0" data-testid={`button-remove-item-${idx}`}>
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>{t.buttons.cancel}</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending} data-testid="button-submit-indent">
              {createMutation.isPending ? "..." : t.buttons.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-view-indent">
          <DialogHeader>
            <DialogTitle>{it.viewIndent} — {viewIndent?.indentNo}</DialogTitle>
          </DialogHeader>
          {viewIndent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">{it.indentNo}:</span>
                  <span className="ml-2 font-mono">{viewIndent.indentNo}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{it.erpIndentNo}:</span>
                  <span className="ml-2 font-mono">{viewIndent.erpIndentNo || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{it.status}:</span>
                  <Badge className={`ml-2 ${statusColor(viewIndent.status)}`}>{statusLabel(viewIndent.status)}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">{it.priority}:</span>
                  <Badge className={`ml-2 ${priorityColor(viewIndent.priority)}`}>{priorityLabel(viewIndent.priority)}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">{it.requestedBy}:</span>
                  <span className="ml-2">{viewIndent.requestedBy?.fullName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{it.approvedBy}:</span>
                  <span className="ml-2">{viewIndent.approvedBy?.fullName || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{it.vehicle}:</span>
                  <span className="ml-2">{viewIndent.vehicle ? `${viewIndent.vehicle.make} ${viewIndent.vehicle.model}` : "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{it.department}:</span>
                  <span className="ml-2">{viewIndent.department?.name || "—"}</span>
                </div>
                {viewIndent.approvalNotes && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">{it.approvalNotes}:</span>
                    <p className="mt-1">{viewIndent.approvalNotes}</p>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-base font-semibold">{it.items} ({viewIndent.items?.length || 0})</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>{it.itemName}</TableHead>
                      <TableHead>{it.quantity}</TableHead>
                      <TableHead>{it.unit}</TableHead>
                      <TableHead>{it.itemNotes}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(viewIndent.items || []).map((item: any, idx: number) => (
                      <TableRow key={item.id || idx}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>{item.itemName}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell>{item.notes || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={isApproveOpen} onOpenChange={(open) => { setIsApproveOpen(open); if (!open) { setErpIndentNo(""); setApprovalNotes(""); } }}>
        <DialogContent data-testid="dialog-approve-indent">
          <DialogHeader>
            <DialogTitle>{it.approveConfirm}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{it.erpIndentNo} *</Label>
              <Input
                value={erpIndentNo}
                onChange={(e) => setErpIndentNo(e.target.value)}
                placeholder={it.erpIndentNo}
                data-testid="input-erp-indent-no"
              />
            </div>
            <div>
              <Label>{it.approvalNotes}</Label>
              <Textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder={it.approvalNotesPlaceholder}
                data-testid="input-approval-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApproveOpen(false)}>{t.buttons.cancel}</Button>
            <Button onClick={handleApprove} disabled={updateMutation.isPending} data-testid="button-confirm-approve">
              {t.buttons.approve}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectOpen} onOpenChange={(open) => { setIsRejectOpen(open); if (!open) { setApprovalNotes(""); } }}>
        <DialogContent data-testid="dialog-reject-indent">
          <DialogHeader>
            <DialogTitle>{it.rejectConfirm}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{it.approvalNotes}</Label>
              <Textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder={it.approvalNotesPlaceholder}
                data-testid="input-rejection-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectOpen(false)}>{t.buttons.cancel}</Button>
            <Button variant="destructive" onClick={handleReject} disabled={updateMutation.isPending} data-testid="button-confirm-reject">
              {t.buttons.reject}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
