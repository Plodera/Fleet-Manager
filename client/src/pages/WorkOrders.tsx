import { useState } from "react";
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
import { Plus, Eye, Trash2, Printer, X } from "lucide-react";
import { format } from "date-fns";

interface WorkItem {
  subEquipmentId?: number | null;
  activityTypeId?: number | null;
  startTime: string;
  endTime: string;
  descriptions: string[];
}

export default function WorkOrders() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { vehicles } = useVehicles();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewWorkOrder, setViewWorkOrder] = useState<any>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const [vehicleId, setVehicleId] = useState("");
  const [maintenanceType, setMaintenanceType] = useState<string>("");
  const [shiftId, setShiftId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [status, setStatus] = useState("open");
  const [items, setItems] = useState<WorkItem[]>([
    { subEquipmentId: null, activityTypeId: null, startTime: "", endTime: "", descriptions: [""] }
  ]);

  const { data: workOrders, isLoading } = useQuery<any[]>({
    queryKey: [api.workOrders.list.path],
  });

  const { data: shiftsData } = useQuery<any[]>({
    queryKey: [api.shifts.list.path],
  });

  const { data: subEquipmentData } = useQuery<any[]>({
    queryKey: [api.subEquipment.list.path],
  });

  const { data: activityTypesData } = useQuery<any[]>({
    queryKey: [api.activityTypes.list.path],
  });

  const { data: maintenanceTypeConfigs } = useQuery<any[]>({
    queryKey: [api.maintenanceTypeConfigs.list.path],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", api.workOrders.create.path, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.workOrders.list.path] });
      toast({ title: t.workOrders.title, description: t.workOrders.creating });
      resetForm();
      setIsCreateOpen(false);
    },
    onError: (err: Error) => {
      toast({ title: t.labels.error, description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.workOrders.delete.path, { id });
      await apiRequest("DELETE", url);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.workOrders.list.path] });
      toast({ title: t.buttons.delete, description: t.workOrders.deleteConfirm });
    },
    onError: () => {
      toast({ title: t.labels.error, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setVehicleId("");
    setMaintenanceType("");
    setShiftId("");
    setDate(new Date().toISOString().split("T")[0]);
    setStatus("open");
    setItems([{ subEquipmentId: null, activityTypeId: null, startTime: "", endTime: "", descriptions: [""] }]);
  };

  const handleCreate = () => {
    if (!vehicleId || !maintenanceType || !date) return;
    const validItems = items.filter(i => i.startTime && i.endTime && i.descriptions.some(d => d.trim()));
    if (validItems.length === 0) {
      toast({ title: t.labels.error, description: t.workOrders.addAtLeastOneItem, variant: "destructive" });
      return;
    }
    createMutation.mutate({
      vehicleId: Number(vehicleId),
      maintenanceType,
      shiftId: shiftId ? Number(shiftId) : null,
      date,
      status,
      items: validItems.map(i => ({
        subEquipmentId: i.subEquipmentId || null,
        activityTypeId: i.activityTypeId || null,
        startTime: i.startTime,
        endTime: i.endTime,
        descriptions: i.descriptions.filter(d => d.trim()),
      })),
    });
  };

  const handleViewWorkOrder = async (id: number) => {
    try {
      const url = buildUrl(api.workOrders.get.path, { id });
      const res = await apiRequest("GET", url);
      const data = await res.json();
      setViewWorkOrder(data);
      setIsViewOpen(true);
    } catch {
      toast({ title: t.labels.error, variant: "destructive" });
    }
  };

  const addItem = () => {
    setItems([...items, { subEquipmentId: null, activityTypeId: null, startTime: "", endTime: "", descriptions: [""] }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof WorkItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const getMaintenanceTypeBadge = (type: string) => {
    const mtConfig = maintenanceTypeConfigs?.find(m => m.name === type);
    const label = mtConfig ? (language === "pt" ? mtConfig.labelPt : mtConfig.labelEn) : type;
    const variants: Record<string, "destructive" | "secondary" | "outline"> = {
      breakdown: "destructive",
      preventive: "secondary",
    };
    return <Badge variant={variants[type] || "outline"} data-testid={`badge-maintenance-type-${type}`}>{label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const labels: Record<string, string> = {
      open: t.workOrders.open,
      in_progress: t.workOrders.inProgress,
      completed: t.workOrders.completed,
    };
    const variants: Record<string, "outline" | "secondary" | "default"> = {
      open: "outline",
      in_progress: "secondary",
      completed: "default",
    };
    return <Badge variant={variants[status] || "outline"} data-testid={`badge-status-${status}`}>{labels[status] || status}</Badge>;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight" data-testid="text-work-orders-title">{t.workOrders.title}</h1>
          <p className="text-muted-foreground mt-1" data-testid="text-work-orders-subtitle">{t.workOrders.subtitle}</p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="shadow-lg shadow-primary/25" data-testid="button-new-work-order">
              <Plus className="w-4 h-4 mr-2" /> {t.workOrders.newWorkOrder}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t.workOrders.newWorkOrder}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t.workOrders.equipment}</Label>
                  <Select value={vehicleId} onValueChange={setVehicleId}>
                    <SelectTrigger data-testid="select-vehicle">
                      <SelectValue placeholder={t.workOrders.selectVehicle} />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles?.map((v: any) => (
                        <SelectItem key={v.id} value={String(v.id)} data-testid={`select-vehicle-option-${v.id}`}>
                          {v.make} {v.model} ({v.licensePlate || v.vin})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t.workOrders.maintenanceType}</Label>
                  <Select value={maintenanceType} onValueChange={(v) => {
                      setMaintenanceType(v);
                      setItems(prev => prev.map(item => ({ ...item, subEquipmentId: null })));
                    }}>
                    <SelectTrigger data-testid="select-maintenance-type">
                      <SelectValue placeholder={t.workOrders.maintenanceType} />
                    </SelectTrigger>
                    <SelectContent>
                      {maintenanceTypeConfigs?.map(mt => (
                        <SelectItem key={mt.name} value={mt.name} data-testid={`select-maintenance-type-${mt.name}`}>
                          {language === "pt" ? mt.labelPt : mt.labelEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{t.workOrders.shift}</Label>
                  <Select value={shiftId} onValueChange={setShiftId}>
                    <SelectTrigger data-testid="select-shift">
                      <SelectValue placeholder={t.workOrders.selectShift} />
                    </SelectTrigger>
                    <SelectContent>
                      {shiftsData?.map((s: any) => (
                        <SelectItem key={s.id} value={String(s.id)} data-testid={`select-shift-option-${s.id}`}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t.workOrders.date}</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} data-testid="input-date" />
                </div>
                <div className="space-y-2">
                  <Label>{t.workOrders.status}</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger data-testid="select-status">
                      <SelectValue placeholder={t.workOrders.selectStatus} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open" data-testid="select-status-open">{t.workOrders.open}</SelectItem>
                      <SelectItem value="in_progress" data-testid="select-status-in-progress">{t.workOrders.inProgress}</SelectItem>
                      <SelectItem value="completed" data-testid="select-status-completed">{t.workOrders.completed}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <Label className="text-base font-semibold">{t.workOrders.items}</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem} data-testid="button-add-item">
                    <Plus className="w-4 h-4 mr-1" /> {t.workOrders.addItem}
                  </Button>
                </div>

                {items.map((item, index) => (
                  <Card key={index} className="p-4 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-sm font-medium text-muted-foreground">{language === "pt" ? `Item Nº ${index + 1}` : `Item No. ${index + 1}`}</span>
                      {items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(index)}
                          data-testid={`button-remove-item-${index}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">{t.workOrders.subEquipment}</Label>
                        <Select
                          value={item.subEquipmentId ? String(item.subEquipmentId) : ""}
                          onValueChange={(v) => updateItem(index, "subEquipmentId", v ? Number(v) : null)}
                        >
                          <SelectTrigger data-testid={`select-sub-equipment-${index}`}>
                            <SelectValue placeholder={t.workOrders.selectSubEquipment} />
                          </SelectTrigger>
                          <SelectContent>
                            {subEquipmentData
                              ?.filter((se: any) => !maintenanceType || !se.maintenanceTypes?.length || se.maintenanceTypes.includes(maintenanceType))
                              ?.map((se: any) => (
                              <SelectItem key={se.id} value={String(se.id)}>{se.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {maintenanceType === "breakdown" && (
                        <div className="space-y-1">
                          <Label className="text-xs">{t.workOrders.activityType}</Label>
                          <Select
                            value={item.activityTypeId ? String(item.activityTypeId) : ""}
                            onValueChange={(v) => updateItem(index, "activityTypeId", v ? Number(v) : null)}
                          >
                            <SelectTrigger data-testid={`select-activity-type-${index}`}>
                              <SelectValue placeholder={t.workOrders.selectActivityType} />
                            </SelectTrigger>
                            <SelectContent>
                              {activityTypesData?.map((at: any) => (
                                <SelectItem key={at.id} value={String(at.id)}>{at.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">{t.workOrders.startTime}</Label>
                        <Input
                          type="time"
                          value={item.startTime}
                          onChange={(e) => updateItem(index, "startTime", e.target.value)}
                          data-testid={`input-start-time-${index}`}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{t.workOrders.endTime}</Label>
                        <Input
                          type="time"
                          value={item.endTime}
                          onChange={(e) => updateItem(index, "endTime", e.target.value)}
                          data-testid={`input-end-time-${index}`}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <Label className="text-xs">{t.workOrders.description}</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const updated = [...items];
                            updated[index] = { ...updated[index], descriptions: [...updated[index].descriptions, ""] };
                            setItems(updated);
                          }}
                          data-testid={`button-add-description-${index}`}
                        >
                          <Plus className="w-3 h-3 mr-1" /> {t.workOrders.addDescription}
                        </Button>
                      </div>
                      {item.descriptions.map((desc, dIdx) => (
                        <div key={dIdx} className="flex items-center gap-2">
                          <Input
                            value={desc}
                            onChange={(e) => {
                              const updated = [...items];
                              const newDescs = [...updated[index].descriptions];
                              newDescs[dIdx] = e.target.value;
                              updated[index] = { ...updated[index], descriptions: newDescs };
                              setItems(updated);
                            }}
                            placeholder={t.workOrders.descriptionPlaceholder}
                            data-testid={`input-description-${index}-${dIdx}`}
                          />
                          {item.descriptions.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const updated = [...items];
                                const newDescs = updated[index].descriptions.filter((_, i) => i !== dIdx);
                                updated[index] = { ...updated[index], descriptions: newDescs };
                                setItems(updated);
                              }}
                              data-testid={`button-remove-description-${index}-${dIdx}`}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)} data-testid="button-cancel-create">
                {t.buttons.cancel}
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending || !vehicleId || !maintenanceType || !date}
                data-testid="button-submit-work-order"
              >
                {createMutation.isPending ? t.workOrders.creating : t.buttons.create}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-md overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead data-testid="th-job-no">{t.workOrders.jobNo}</TableHead>
              <TableHead data-testid="th-equipment">{t.workOrders.equipment}</TableHead>
              <TableHead data-testid="th-equipment-no">{t.workOrders.equipmentNo}</TableHead>
              <TableHead data-testid="th-maintenance-type">{t.workOrders.maintenanceType}</TableHead>
              <TableHead data-testid="th-date">{t.workOrders.date}</TableHead>
              <TableHead data-testid="th-status">{t.workOrders.status}</TableHead>
              <TableHead data-testid="th-created-by">{t.workOrders.createdBy}</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center" data-testid="text-loading">
                  {t.labels.loading}
                </TableCell>
              </TableRow>
            ) : workOrders?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground" data-testid="text-no-work-orders">
                  <div className="flex flex-col items-center gap-1">
                    <span>{t.workOrders.noWorkOrders}</span>
                    <span className="text-sm">{t.workOrders.noWorkOrdersMessage}</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              workOrders?.map((wo: any) => (
                <TableRow key={wo.id} data-testid={`row-work-order-${wo.id}`}>
                  <TableCell className="font-medium" data-testid={`text-job-no-${wo.id}`}>{wo.jobNo}</TableCell>
                  <TableCell data-testid={`text-equipment-${wo.id}`}>
                    {wo.vehicle ? `${wo.vehicle.make} ${wo.vehicle.model}` : "-"}
                  </TableCell>
                  <TableCell data-testid={`text-equipment-no-${wo.id}`}>
                    {wo.vehicle ? (wo.vehicle.licensePlate || wo.vehicle.vin) : "-"}
                  </TableCell>
                  <TableCell>{getMaintenanceTypeBadge(wo.maintenanceType)}</TableCell>
                  <TableCell data-testid={`text-date-${wo.id}`}>
                    {wo.date ? format(new Date(wo.date), "MMM d, yyyy") : "-"}
                  </TableCell>
                  <TableCell>{getStatusBadge(wo.status)}</TableCell>
                  <TableCell data-testid={`text-created-by-${wo.id}`}>
                    {wo.createdBy?.fullName || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewWorkOrder(wo.id)}
                        data-testid={`button-view-${wo.id}`}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`button-delete-${wo.id}`}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t.buttons.delete}</AlertDialogTitle>
                            <AlertDialogDescription>{t.workOrders.deleteConfirm}</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel data-testid={`button-cancel-delete-${wo.id}`}>{t.buttons.cancel}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(wo.id)}
                              data-testid={`button-confirm-delete-${wo.id}`}
                            >
                              {t.buttons.delete}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.workOrders.viewWorkOrder}</DialogTitle>
          </DialogHeader>
          {viewWorkOrder && (
            <div className="space-y-6 print:space-y-4" data-testid="view-work-order-details">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">{t.workOrders.jobNo}</span>
                  <p className="font-semibold" data-testid="view-job-no">{viewWorkOrder.jobNo}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">{t.workOrders.date}</span>
                  <p className="font-semibold" data-testid="view-date">
                    {viewWorkOrder.date ? format(new Date(viewWorkOrder.date), "MMM d, yyyy") : "-"}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">{t.workOrders.equipment}</span>
                  <p className="font-semibold" data-testid="view-equipment">
                    {viewWorkOrder.vehicle ? `${viewWorkOrder.vehicle.make} ${viewWorkOrder.vehicle.model}` : "-"}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">{t.workOrders.equipmentNo}</span>
                  <p className="font-semibold" data-testid="view-equipment-no">
                    {viewWorkOrder.vehicle ? (viewWorkOrder.vehicle.licensePlate || viewWorkOrder.vehicle.vin) : "-"}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">{t.workOrders.maintenanceType}</span>
                  <div className="mt-1">{getMaintenanceTypeBadge(viewWorkOrder.maintenanceType)}</div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">{t.workOrders.status}</span>
                  <div className="mt-1">{getStatusBadge(viewWorkOrder.status)}</div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">{t.workOrders.shift}</span>
                  <p className="font-semibold" data-testid="view-shift">
                    {viewWorkOrder.shift?.name || "-"}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">{t.workOrders.createdBy}</span>
                  <p className="font-semibold" data-testid="view-created-by">
                    {viewWorkOrder.createdBy?.fullName || "-"}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">{t.workOrders.items}</h3>
                {viewWorkOrder.items && viewWorkOrder.items.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>{t.workOrders.subEquipment}</TableHead>
                        {viewWorkOrder.maintenanceType === "breakdown" && (
                          <TableHead>{t.workOrders.activityType}</TableHead>
                        )}
                        <TableHead>{t.workOrders.startTime}</TableHead>
                        <TableHead>{t.workOrders.endTime}</TableHead>
                        <TableHead>{t.workOrders.description}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewWorkOrder.items.map((item: any, idx: number) => (
                        <TableRow key={item.id || idx} data-testid={`view-item-row-${idx}`}>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell>{item.subEquipment?.name || item.subEquipmentName || "-"}</TableCell>
                          {viewWorkOrder.maintenanceType === "breakdown" && (
                            <TableCell>{item.activityType?.name || item.activityTypeName || "-"}</TableCell>
                          )}
                          <TableCell>{item.startTime}</TableCell>
                          <TableCell>{item.endTime}</TableCell>
                          <TableCell>
                            {Array.isArray(item.descriptions)
                              ? item.descriptions.map((d: string, di: number) => (
                                  <div key={di} data-testid={`view-description-${idx}-${di}`}>{d}</div>
                                ))
                              : item.description || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground text-sm" data-testid="text-no-items">{t.workOrders.noItems}</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="print:hidden gap-2">
            <Button variant="outline" onClick={handlePrint} data-testid="button-print-work-order">
              <Printer className="w-4 h-4 mr-2" /> {t.workOrders.printWorkOrder}
            </Button>
            <Button variant="outline" onClick={() => setIsViewOpen(false)} data-testid="button-close-view">
              {t.buttons.close}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
