import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Cog } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import type { Shift, ActivityType, SubEquipment, MaintenanceTypeConfig, VehicleType } from "@shared/schema";

function extractErrorMessage(error: Error): string {
  const match = error.message.match(/\d+:\s*(.+)/);
  if (match) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed.message) return parsed.message;
    } catch {
      return match[1];
    }
  }
  return error.message;
}

export default function WorkOrderConfig() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: shifts, isLoading: shiftsLoading } = useQuery<Shift[]>({
    queryKey: [api.shifts.list.path],
  });

  const { data: activityTypes, isLoading: activityTypesLoading } = useQuery<ActivityType[]>({
    queryKey: [api.activityTypes.list.path],
  });

  const { data: subEquipmentList, isLoading: subEquipmentLoading } = useQuery<SubEquipment[]>({
    queryKey: [api.subEquipment.list.path],
  });

  const { data: maintenanceTypeConfigs, isLoading: mtConfigLoading } = useQuery<MaintenanceTypeConfig[]>({
    queryKey: [api.maintenanceTypeConfigs.list.path],
  });

  const { data: vehicleTypesList, isLoading: vehicleTypesLoading } = useQuery<VehicleType[]>({
    queryKey: [api.vehicleTypes.list.path],
  });

  const [shiftDialog, setShiftDialog] = useState<{ open: boolean; editing: Shift | null }>({ open: false, editing: null });
  const [shiftForm, setShiftForm] = useState({ name: "", nameEn: "", namePt: "", startTime: "", endTime: "" });

  const [activityDialog, setActivityDialog] = useState<{ open: boolean; editing: ActivityType | null }>({ open: false, editing: null });
  const [activityForm, setActivityForm] = useState({ name: "", labelEn: "", labelPt: "" });

  const [subEquipDialog, setSubEquipDialog] = useState<{ open: boolean; editing: SubEquipment | null }>({ open: false, editing: null });
  const [subEquipForm, setSubEquipForm] = useState({ name: "", labelEn: "", labelPt: "", maintenanceTypes: [] as string[] });

  const [mtDialog, setMtDialog] = useState<{ open: boolean; editing: MaintenanceTypeConfig | null }>({ open: false, editing: null });
  const [mtForm, setMtForm] = useState({ name: "", labelEn: "", labelPt: "", disableActivityType: false });

  const [vtDialog, setVtDialog] = useState<{ open: boolean; editing: VehicleType | null }>({ open: false, editing: null });
  const [vtForm, setVtForm] = useState({ name: "", labelEn: "", labelPt: "", categories: [] as string[], availableForBooking: true });

  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; type: string; id: number | null }>({ open: false, type: "", id: null });

  const createShift = useMutation({
    mutationFn: async (data: typeof shiftForm) => {
      const res = await apiRequest("POST", api.shifts.create.path, { ...data, isActive: true });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.shifts.list.path] });
      setShiftDialog({ open: false, editing: null });
      toast({ title: t.adminConfig.shifts });
    },
    onError: (error: Error) => {
      const msg = extractErrorMessage(error);
      toast({ title: t.labels.error, description: msg, variant: "destructive" });
    },
  });

  const updateShift = useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & typeof shiftForm) => {
      const res = await apiRequest("PATCH", buildUrl(api.shifts.update.path, { id }), data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.shifts.list.path] });
      setShiftDialog({ open: false, editing: null });
      toast({ title: t.adminConfig.shifts });
    },
    onError: (error: Error) => {
      const msg = extractErrorMessage(error);
      toast({ title: t.labels.error, description: msg, variant: "destructive" });
    },
  });

  const deleteShiftMut = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", buildUrl(api.shifts.delete.path, { id }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.shifts.list.path] });
      setDeleteDialog({ open: false, type: "", id: null });
      toast({ title: t.buttons.delete });
    },
    onError: (error: Error) => {
      const msg = extractErrorMessage(error);
      toast({ title: t.labels.error, description: msg, variant: "destructive" });
    },
  });

  const createActivityType = useMutation({
    mutationFn: async (data: typeof activityForm) => {
      const res = await apiRequest("POST", api.activityTypes.create.path, { ...data, isActive: true });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.activityTypes.list.path] });
      setActivityDialog({ open: false, editing: null });
      toast({ title: t.adminConfig.activityTypes });
    },
    onError: (error: Error) => {
      const msg = extractErrorMessage(error);
      toast({ title: t.labels.error, description: msg, variant: "destructive" });
    },
  });

  const updateActivityType = useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & typeof activityForm) => {
      const res = await apiRequest("PATCH", buildUrl(api.activityTypes.update.path, { id }), data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.activityTypes.list.path] });
      setActivityDialog({ open: false, editing: null });
      toast({ title: t.adminConfig.activityTypes });
    },
    onError: (error: Error) => {
      const msg = extractErrorMessage(error);
      toast({ title: t.labels.error, description: msg, variant: "destructive" });
    },
  });

  const deleteActivityTypeMut = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", buildUrl(api.activityTypes.delete.path, { id }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.activityTypes.list.path] });
      setDeleteDialog({ open: false, type: "", id: null });
      toast({ title: t.buttons.delete });
    },
    onError: (error: Error) => {
      const msg = extractErrorMessage(error);
      toast({ title: t.labels.error, description: msg, variant: "destructive" });
    },
  });

  const createSubEquipment = useMutation({
    mutationFn: async (data: typeof subEquipForm) => {
      const res = await apiRequest("POST", api.subEquipment.create.path, { ...data, isActive: true });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.subEquipment.list.path] });
      setSubEquipDialog({ open: false, editing: null });
      toast({ title: t.adminConfig.subEquipment });
    },
    onError: (error: Error) => {
      const msg = extractErrorMessage(error);
      toast({ title: t.labels.error, description: msg, variant: "destructive" });
    },
  });

  const updateSubEquipment = useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & typeof subEquipForm) => {
      const res = await apiRequest("PATCH", buildUrl(api.subEquipment.update.path, { id }), data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.subEquipment.list.path] });
      setSubEquipDialog({ open: false, editing: null });
      toast({ title: t.adminConfig.subEquipment });
    },
    onError: (error: Error) => {
      const msg = extractErrorMessage(error);
      toast({ title: t.labels.error, description: msg, variant: "destructive" });
    },
  });

  const deleteSubEquipmentMut = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", buildUrl(api.subEquipment.delete.path, { id }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.subEquipment.list.path] });
      setDeleteDialog({ open: false, type: "", id: null });
      toast({ title: t.buttons.delete });
    },
    onError: (error: Error) => {
      const msg = extractErrorMessage(error);
      toast({ title: t.labels.error, description: msg, variant: "destructive" });
    },
  });

  const createMtConfig = useMutation({
    mutationFn: async (data: typeof mtForm) => {
      const res = await apiRequest("POST", api.maintenanceTypeConfigs.create.path, { ...data, isActive: true });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.maintenanceTypeConfigs.list.path] });
      setMtDialog({ open: false, editing: null });
      toast({ title: t.adminConfig.maintenanceTypes });
    },
    onError: (error: Error) => {
      const msg = extractErrorMessage(error);
      toast({ title: t.labels.error, description: msg, variant: "destructive" });
    },
  });

  const updateMtConfig = useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & typeof mtForm) => {
      const res = await apiRequest("PATCH", buildUrl(api.maintenanceTypeConfigs.update.path, { id }), data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.maintenanceTypeConfigs.list.path] });
      setMtDialog({ open: false, editing: null });
      toast({ title: t.adminConfig.maintenanceTypes });
    },
    onError: (error: Error) => {
      const msg = extractErrorMessage(error);
      toast({ title: t.labels.error, description: msg, variant: "destructive" });
    },
  });

  const deleteMtConfigMut = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", buildUrl(api.maintenanceTypeConfigs.delete.path, { id }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.maintenanceTypeConfigs.list.path] });
      setDeleteDialog({ open: false, type: "", id: null });
      toast({ title: t.buttons.delete });
    },
    onError: (error: Error) => {
      const msg = extractErrorMessage(error);
      toast({ title: t.labels.error, description: msg, variant: "destructive" });
    },
  });

  const createVehicleType = useMutation({
    mutationFn: async (data: typeof vtForm) => {
      const res = await apiRequest("POST", api.vehicleTypes.create.path, { ...data, isActive: true });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.vehicleTypes.list.path] });
      setVtDialog({ open: false, editing: null });
      toast({ title: t.adminConfig.vehicleTypes });
    },
    onError: (error: Error) => {
      const msg = extractErrorMessage(error);
      toast({ title: t.labels.error, description: msg, variant: "destructive" });
    },
  });

  const updateVehicleType = useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & typeof vtForm) => {
      const res = await apiRequest("PATCH", buildUrl(api.vehicleTypes.update.path, { id }), data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.vehicleTypes.list.path] });
      setVtDialog({ open: false, editing: null });
      toast({ title: t.adminConfig.vehicleTypes });
    },
    onError: (error: Error) => {
      const msg = extractErrorMessage(error);
      toast({ title: t.labels.error, description: msg, variant: "destructive" });
    },
  });

  const deleteVehicleTypeMut = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", buildUrl(api.vehicleTypes.delete.path, { id }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.vehicleTypes.list.path] });
      setDeleteDialog({ open: false, type: "", id: null });
      toast({ title: t.buttons.delete });
    },
    onError: (error: Error) => {
      const msg = extractErrorMessage(error);
      toast({ title: t.labels.error, description: msg, variant: "destructive" });
    },
  });

  const openAddShift = () => {
    setShiftForm({ name: "", nameEn: "", namePt: "", startTime: "", endTime: "" });
    setShiftDialog({ open: true, editing: null });
  };

  const openEditShift = (shift: Shift) => {
    setShiftForm({ name: shift.name, nameEn: shift.nameEn, namePt: shift.namePt, startTime: shift.startTime, endTime: shift.endTime });
    setShiftDialog({ open: true, editing: shift });
  };

  const handleShiftSubmit = () => {
    if (shiftDialog.editing) {
      updateShift.mutate({ id: shiftDialog.editing.id, ...shiftForm });
    } else {
      createShift.mutate(shiftForm);
    }
  };

  const openAddActivity = () => {
    setActivityForm({ name: "", labelEn: "", labelPt: "" });
    setActivityDialog({ open: true, editing: null });
  };

  const openEditActivity = (at: ActivityType) => {
    setActivityForm({ name: at.name, labelEn: at.labelEn, labelPt: at.labelPt });
    setActivityDialog({ open: true, editing: at });
  };

  const handleActivitySubmit = () => {
    if (activityDialog.editing) {
      updateActivityType.mutate({ id: activityDialog.editing.id, ...activityForm });
    } else {
      createActivityType.mutate(activityForm);
    }
  };

  const openAddSubEquip = () => {
    setSubEquipForm({ name: "", labelEn: "", labelPt: "", maintenanceTypes: [] });
    setSubEquipDialog({ open: true, editing: null });
  };

  const openEditSubEquip = (se: SubEquipment) => {
    setSubEquipForm({ name: se.name, labelEn: se.labelEn, labelPt: se.labelPt, maintenanceTypes: (se as any).maintenanceTypes || [] });
    setSubEquipDialog({ open: true, editing: se });
  };

  const toggleMaintenanceType = (type: string) => {
    setSubEquipForm(prev => ({
      ...prev,
      maintenanceTypes: prev.maintenanceTypes.includes(type)
        ? prev.maintenanceTypes.filter(t => t !== type)
        : [...prev.maintenanceTypes, type]
    }));
  };

  const handleSubEquipSubmit = () => {
    if (subEquipDialog.editing) {
      updateSubEquipment.mutate({ id: subEquipDialog.editing.id, ...subEquipForm });
    } else {
      createSubEquipment.mutate(subEquipForm);
    }
  };

  const openAddMtConfig = () => {
    setMtForm({ name: "", labelEn: "", labelPt: "", disableActivityType: false });
    setMtDialog({ open: true, editing: null });
  };

  const openEditMtConfig = (mt: MaintenanceTypeConfig) => {
    setMtForm({ name: mt.name, labelEn: mt.labelEn, labelPt: mt.labelPt, disableActivityType: mt.disableActivityType || false });
    setMtDialog({ open: true, editing: mt });
  };

  const handleMtSubmit = () => {
    if (mtDialog.editing) {
      updateMtConfig.mutate({ id: mtDialog.editing.id, ...mtForm });
    } else {
      createMtConfig.mutate(mtForm);
    }
  };

  const vehicleCategoryOptions = ["car", "van", "bus", "truck"];
  const vehicleCategoryLabels: Record<string, { en: string; pt: string }> = {
    car: { en: "Car", pt: "Carro" },
    van: { en: "Van", pt: "Carrinha" },
    bus: { en: "Bus", pt: "Autocarro" },
    truck: { en: "Truck", pt: "Camião" },
  };

  const openAddVehicleType = () => {
    setVtForm({ name: "", labelEn: "", labelPt: "", categories: [], availableForBooking: true });
    setVtDialog({ open: true, editing: null });
  };

  const openEditVehicleType = (vt: VehicleType) => {
    setVtForm({ name: vt.name, labelEn: vt.labelEn, labelPt: vt.labelPt, categories: vt.categories || [], availableForBooking: vt.availableForBooking ?? true });
    setVtDialog({ open: true, editing: vt });
  };

  const toggleVehicleCategory = (cat: string) => {
    setVtForm(prev => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter(c => c !== cat)
        : [...prev.categories, cat]
    }));
  };

  const handleVtSubmit = () => {
    if (vtDialog.editing) {
      updateVehicleType.mutate({ id: vtDialog.editing.id, ...vtForm });
    } else {
      createVehicleType.mutate(vtForm);
    }
  };

  const handleDelete = () => {
    if (!deleteDialog.id) return;
    if (deleteDialog.type === "shift") deleteShiftMut.mutate(deleteDialog.id);
    else if (deleteDialog.type === "activity") deleteActivityTypeMut.mutate(deleteDialog.id);
    else if (deleteDialog.type === "subequip") deleteSubEquipmentMut.mutate(deleteDialog.id);
    else if (deleteDialog.type === "mtconfig") deleteMtConfigMut.mutate(deleteDialog.id);
    else if (deleteDialog.type === "vehicletype") deleteVehicleTypeMut.mutate(deleteDialog.id);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader
        title={t.adminConfig.workOrderConfig}
        description={t.adminConfig.workOrderConfigSubtitle}
        icon={<Cog className="w-5 h-5 text-primary" />}
      />

      <Tabs defaultValue="shifts" className="space-y-6">
        <TabsList data-testid="tabs-config">
          <TabsTrigger value="maintenanceTypes" data-testid="tab-maintenance-types">{t.adminConfig.maintenanceTypes}</TabsTrigger>
          <TabsTrigger value="shifts" data-testid="tab-shifts">{t.adminConfig.shifts}</TabsTrigger>
          <TabsTrigger value="activityTypes" data-testid="tab-activity-types">{t.adminConfig.activityTypes}</TabsTrigger>
          <TabsTrigger value="subEquipment" data-testid="tab-sub-equipment">{t.adminConfig.subEquipment}</TabsTrigger>
          <TabsTrigger value="vehicleTypes" data-testid="tab-vehicle-types">{t.adminConfig.vehicleTypes}</TabsTrigger>
        </TabsList>

        <TabsContent value="maintenanceTypes" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-xl font-semibold" data-testid="text-mt-config-title">{t.adminConfig.maintenanceTypes}</h2>
              <p className="text-sm text-muted-foreground">{t.adminConfig.maintenanceTypesSubtitle}</p>
            </div>
            <Button onClick={openAddMtConfig} data-testid="button-add-mt-config">
              <Plus className="w-4 h-4 mr-2" /> {t.adminConfig.addMaintenanceType}
            </Button>
          </div>
          <Card className="border-none shadow-md overflow-visible">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>{t.adminConfig.maintenanceTypeName}</TableHead>
                  <TableHead>Label (EN)</TableHead>
                  <TableHead>Label (PT)</TableHead>
                  <TableHead>{language === "pt" ? "Desativar Atividade" : "Disable Activity"}</TableHead>
                  <TableHead className="text-right">{t.buttons.edit}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mtConfigLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center" data-testid="text-mt-config-loading">{t.labels.loading}</TableCell>
                  </TableRow>
                ) : maintenanceTypeConfigs?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground" data-testid="text-mt-config-empty">{t.labels.noRecords}</TableCell>
                  </TableRow>
                ) : maintenanceTypeConfigs?.map((mt) => (
                  <TableRow key={mt.id} data-testid={`row-mt-config-${mt.id}`}>
                    <TableCell className="font-medium">{mt.name}</TableCell>
                    <TableCell>{mt.labelEn}</TableCell>
                    <TableCell>{mt.labelPt}</TableCell>
                    <TableCell>
                      {mt.disableActivityType ? (
                        <Badge variant="secondary" className="text-xs">{language === "pt" ? "Sim" : "Yes"}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEditMtConfig(mt)} data-testid={`button-edit-mt-config-${mt.id}`}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteDialog({ open: true, type: "mtconfig", id: mt.id })} data-testid={`button-delete-mt-config-${mt.id}`}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="shifts" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-xl font-semibold" data-testid="text-shifts-title">{t.adminConfig.shifts}</h2>
              <p className="text-sm text-muted-foreground">{t.adminConfig.shiftsSubtitle}</p>
            </div>
            <Button onClick={openAddShift} data-testid="button-add-shift">
              <Plus className="w-4 h-4 mr-2" /> {t.adminConfig.addShift}
            </Button>
          </div>
          <Card className="border-none shadow-md overflow-visible">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>{t.adminConfig.shiftName}</TableHead>
                  <TableHead>{t.adminConfig.startTime}</TableHead>
                  <TableHead>{t.adminConfig.endTime}</TableHead>
                  <TableHead className="text-right">{t.buttons.edit}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shiftsLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center" data-testid="text-shifts-loading">{t.labels.loading}</TableCell>
                  </TableRow>
                ) : shifts?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground" data-testid="text-shifts-empty">{t.labels.noRecords}</TableCell>
                  </TableRow>
                ) : shifts?.map((shift) => (
                  <TableRow key={shift.id} data-testid={`row-shift-${shift.id}`}>
                    <TableCell className="font-medium">{shift.name}</TableCell>
                    <TableCell>{shift.startTime}</TableCell>
                    <TableCell>{shift.endTime}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEditShift(shift)} data-testid={`button-edit-shift-${shift.id}`}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteDialog({ open: true, type: "shift", id: shift.id })} data-testid={`button-delete-shift-${shift.id}`}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="activityTypes" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-xl font-semibold" data-testid="text-activity-types-title">{t.adminConfig.activityTypes}</h2>
              <p className="text-sm text-muted-foreground">{t.adminConfig.activityTypesSubtitle}</p>
            </div>
            <Button onClick={openAddActivity} data-testid="button-add-activity-type">
              <Plus className="w-4 h-4 mr-2" /> {t.adminConfig.addActivityType}
            </Button>
          </div>
          <Card className="border-none shadow-md overflow-visible">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>{t.adminConfig.activityTypeName}</TableHead>
                  <TableHead className="text-right">{t.buttons.edit}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activityTypesLoading ? (
                  <TableRow>
                    <TableCell colSpan={2} className="h-24 text-center" data-testid="text-activity-types-loading">{t.labels.loading}</TableCell>
                  </TableRow>
                ) : activityTypes?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="h-24 text-center text-muted-foreground" data-testid="text-activity-types-empty">{t.labels.noRecords}</TableCell>
                  </TableRow>
                ) : activityTypes?.map((at) => (
                  <TableRow key={at.id} data-testid={`row-activity-type-${at.id}`}>
                    <TableCell className="font-medium">{at.name}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEditActivity(at)} data-testid={`button-edit-activity-type-${at.id}`}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteDialog({ open: true, type: "activity", id: at.id })} data-testid={`button-delete-activity-type-${at.id}`}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="subEquipment" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-xl font-semibold" data-testid="text-sub-equipment-title">{t.adminConfig.subEquipment}</h2>
              <p className="text-sm text-muted-foreground">{t.adminConfig.subEquipmentSubtitle}</p>
            </div>
            <Button onClick={openAddSubEquip} data-testid="button-add-sub-equipment">
              <Plus className="w-4 h-4 mr-2" /> {t.adminConfig.addSubEquipment}
            </Button>
          </div>
          <Card className="border-none shadow-md overflow-visible">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>{t.adminConfig.subEquipmentName}</TableHead>
                  <TableHead>{t.adminConfig.maintenanceTypes}</TableHead>
                  <TableHead className="text-right">{t.buttons.edit}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subEquipmentLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center" data-testid="text-sub-equipment-loading">{t.labels.loading}</TableCell>
                  </TableRow>
                ) : subEquipmentList?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground" data-testid="text-sub-equipment-empty">{t.labels.noRecords}</TableCell>
                  </TableRow>
                ) : subEquipmentList?.map((se) => (
                  <TableRow key={se.id} data-testid={`row-sub-equipment-${se.id}`}>
                    <TableCell className="font-medium">{se.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {((se as any).maintenanceTypes || []).map((mtName: string) => {
                          const mtConfig = maintenanceTypeConfigs?.find(m => m.name === mtName);
                          return (
                            <Badge key={mtName} variant="outline" data-testid={`badge-sub-equip-mt-${se.id}-${mtName}`}>
                              {mtConfig ? (language === "pt" ? mtConfig.labelPt : mtConfig.labelEn) : mtName}
                            </Badge>
                          );
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEditSubEquip(se)} data-testid={`button-edit-sub-equipment-${se.id}`}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteDialog({ open: true, type: "subequip", id: se.id })} data-testid={`button-delete-sub-equipment-${se.id}`}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="vehicleTypes" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-xl font-semibold" data-testid="text-vehicle-types-title">{t.adminConfig.vehicleTypes}</h2>
              <p className="text-sm text-muted-foreground">{t.adminConfig.vehicleTypesSubtitle}</p>
            </div>
            <Button onClick={openAddVehicleType} data-testid="button-add-vehicle-type">
              <Plus className="w-4 h-4 mr-2" /> {t.adminConfig.addVehicleType}
            </Button>
          </div>
          <Card className="border-none shadow-md overflow-visible">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>{t.adminConfig.vehicleTypeName}</TableHead>
                  <TableHead>Label (EN)</TableHead>
                  <TableHead>Label (PT)</TableHead>
                  <TableHead>{t.adminConfig.vehicleTypeCategories}</TableHead>
                  <TableHead>{t.adminConfig.availableForBooking}</TableHead>
                  <TableHead className="text-right">{t.buttons.edit}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicleTypesLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center" data-testid="text-vehicle-types-loading">{t.labels.loading}</TableCell>
                  </TableRow>
                ) : vehicleTypesList?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground" data-testid="text-vehicle-types-empty">{t.labels.noRecords}</TableCell>
                  </TableRow>
                ) : vehicleTypesList?.map((vt) => (
                  <TableRow key={vt.id} data-testid={`row-vehicle-type-${vt.id}`}>
                    <TableCell className="font-medium">{vt.name}</TableCell>
                    <TableCell>{vt.labelEn}</TableCell>
                    <TableCell>{vt.labelPt}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(vt.categories || []).map((cat: string) => (
                          <Badge key={cat} variant="outline" data-testid={`badge-vehicle-type-cat-${vt.id}-${cat}`}>
                            {vehicleCategoryLabels[cat] ? (language === "pt" ? vehicleCategoryLabels[cat].pt : vehicleCategoryLabels[cat].en) : cat}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={vt.availableForBooking ? "default" : "secondary"} data-testid={`badge-bookable-${vt.id}`}>
                        {vt.availableForBooking ? (language === "pt" ? "Sim" : "Yes") : (language === "pt" ? "Não" : "No")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEditVehicleType(vt)} data-testid={`button-edit-vehicle-type-${vt.id}`}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteDialog({ open: true, type: "vehicletype", id: vt.id })} data-testid={`button-delete-vehicle-type-${vt.id}`}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={shiftDialog.open} onOpenChange={(open) => setShiftDialog({ ...shiftDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="text-shift-dialog-title">
              {shiftDialog.editing ? t.adminConfig.editShift : t.adminConfig.addShift}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t.adminConfig.shiftName}</label>
              <Input
                value={shiftForm.name}
                onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
                data-testid="input-shift-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Name (EN)</label>
                <Input
                  value={shiftForm.nameEn}
                  onChange={(e) => setShiftForm({ ...shiftForm, nameEn: e.target.value })}
                  data-testid="input-shift-name-en"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Name (PT)</label>
                <Input
                  value={shiftForm.namePt}
                  onChange={(e) => setShiftForm({ ...shiftForm, namePt: e.target.value })}
                  data-testid="input-shift-name-pt"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">{t.adminConfig.startTime}</label>
                <Input
                  type="time"
                  value={shiftForm.startTime}
                  onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                  data-testid="input-shift-start-time"
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t.adminConfig.endTime}</label>
                <Input
                  type="time"
                  value={shiftForm.endTime}
                  onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                  data-testid="input-shift-end-time"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShiftDialog({ open: false, editing: null })} data-testid="button-shift-cancel">
              {t.buttons.cancel}
            </Button>
            <Button
              onClick={handleShiftSubmit}
              disabled={createShift.isPending || updateShift.isPending}
              data-testid="button-shift-save"
            >
              {(createShift.isPending || updateShift.isPending) ? t.labels.loading : t.buttons.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activityDialog.open} onOpenChange={(open) => setActivityDialog({ ...activityDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="text-activity-dialog-title">
              {activityDialog.editing ? t.adminConfig.editActivityType : t.adminConfig.addActivityType}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t.adminConfig.activityTypeName}</label>
              <Input
                value={activityForm.name}
                onChange={(e) => setActivityForm({ ...activityForm, name: e.target.value })}
                data-testid="input-activity-type-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Label (EN)</label>
                <Input
                  value={activityForm.labelEn}
                  onChange={(e) => setActivityForm({ ...activityForm, labelEn: e.target.value })}
                  data-testid="input-activity-type-label-en"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Label (PT)</label>
                <Input
                  value={activityForm.labelPt}
                  onChange={(e) => setActivityForm({ ...activityForm, labelPt: e.target.value })}
                  data-testid="input-activity-type-label-pt"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setActivityDialog({ open: false, editing: null })} data-testid="button-activity-cancel">
              {t.buttons.cancel}
            </Button>
            <Button
              onClick={handleActivitySubmit}
              disabled={createActivityType.isPending || updateActivityType.isPending}
              data-testid="button-activity-save"
            >
              {(createActivityType.isPending || updateActivityType.isPending) ? t.labels.loading : t.buttons.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={subEquipDialog.open} onOpenChange={(open) => setSubEquipDialog({ ...subEquipDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="text-sub-equip-dialog-title">
              {subEquipDialog.editing ? t.adminConfig.editSubEquipment : t.adminConfig.addSubEquipment}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t.adminConfig.subEquipmentName}</label>
              <Input
                value={subEquipForm.name}
                onChange={(e) => setSubEquipForm({ ...subEquipForm, name: e.target.value })}
                data-testid="input-sub-equipment-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Label (EN)</label>
                <Input
                  value={subEquipForm.labelEn}
                  onChange={(e) => setSubEquipForm({ ...subEquipForm, labelEn: e.target.value })}
                  data-testid="input-sub-equipment-label-en"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Label (PT)</label>
                <Input
                  value={subEquipForm.labelPt}
                  onChange={(e) => setSubEquipForm({ ...subEquipForm, labelPt: e.target.value })}
                  data-testid="input-sub-equipment-label-pt"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">{t.adminConfig.maintenanceTypes}</label>
              <div className="flex flex-wrap gap-4 mt-2">
                {maintenanceTypeConfigs?.map(mt => (
                  <div key={mt.name} className="flex items-center gap-2">
                    <Checkbox
                      id={`mt-${mt.name}`}
                      checked={subEquipForm.maintenanceTypes.includes(mt.name)}
                      onCheckedChange={() => toggleMaintenanceType(mt.name)}
                      data-testid={`checkbox-maintenance-type-${mt.name}`}
                    />
                    <Label htmlFor={`mt-${mt.name}`} className="text-sm cursor-pointer">
                      {language === "pt" ? mt.labelPt : mt.labelEn}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSubEquipDialog({ open: false, editing: null })} data-testid="button-sub-equip-cancel">
              {t.buttons.cancel}
            </Button>
            <Button
              onClick={handleSubEquipSubmit}
              disabled={createSubEquipment.isPending || updateSubEquipment.isPending}
              data-testid="button-sub-equip-save"
            >
              {(createSubEquipment.isPending || updateSubEquipment.isPending) ? t.labels.loading : t.buttons.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mtDialog.open} onOpenChange={(open) => setMtDialog({ ...mtDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="text-mt-dialog-title">
              {mtDialog.editing ? t.adminConfig.editMaintenanceType : t.adminConfig.addMaintenanceType}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t.adminConfig.maintenanceTypeName}</label>
              <Input
                value={mtForm.name}
                onChange={(e) => setMtForm({ ...mtForm, name: e.target.value })}
                data-testid="input-mt-config-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Label (EN)</label>
                <Input
                  value={mtForm.labelEn}
                  onChange={(e) => setMtForm({ ...mtForm, labelEn: e.target.value })}
                  data-testid="input-mt-config-label-en"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Label (PT)</label>
                <Input
                  value={mtForm.labelPt}
                  onChange={(e) => setMtForm({ ...mtForm, labelPt: e.target.value })}
                  data-testid="input-mt-config-label-pt"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="mt-disable-activity"
                checked={mtForm.disableActivityType}
                onCheckedChange={(checked) => setMtForm({ ...mtForm, disableActivityType: !!checked })}
                data-testid="checkbox-mt-disable-activity"
              />
              <label htmlFor="mt-disable-activity" className="text-sm font-medium cursor-pointer">
                {language === "pt" ? "Desativar Tipo de Atividade" : "Disable Activity Type"}
              </label>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setMtDialog({ open: false, editing: null })} data-testid="button-mt-cancel">
              {t.buttons.cancel}
            </Button>
            <Button
              onClick={handleMtSubmit}
              disabled={createMtConfig.isPending || updateMtConfig.isPending}
              data-testid="button-mt-save"
            >
              {(createMtConfig.isPending || updateMtConfig.isPending) ? t.labels.loading : t.buttons.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={vtDialog.open} onOpenChange={(open) => setVtDialog({ ...vtDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="text-vt-dialog-title">
              {vtDialog.editing ? t.adminConfig.editVehicleType : t.adminConfig.addVehicleType}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t.adminConfig.vehicleTypeName}</label>
              <Input
                value={vtForm.name}
                onChange={(e) => setVtForm({ ...vtForm, name: e.target.value })}
                data-testid="input-vehicle-type-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Label (EN)</label>
                <Input
                  value={vtForm.labelEn}
                  onChange={(e) => setVtForm({ ...vtForm, labelEn: e.target.value })}
                  data-testid="input-vehicle-type-label-en"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Label (PT)</label>
                <Input
                  value={vtForm.labelPt}
                  onChange={(e) => setVtForm({ ...vtForm, labelPt: e.target.value })}
                  data-testid="input-vehicle-type-label-pt"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">{t.adminConfig.vehicleTypeCategories}</label>
              <div className="flex flex-wrap gap-4 mt-2">
                {vehicleCategoryOptions.map(cat => (
                  <div key={cat} className="flex items-center gap-2">
                    <Checkbox
                      id={`vt-cat-${cat}`}
                      checked={vtForm.categories.includes(cat)}
                      onCheckedChange={() => toggleVehicleCategory(cat)}
                      data-testid={`checkbox-vehicle-category-${cat}`}
                    />
                    <Label htmlFor={`vt-cat-${cat}`} className="text-sm cursor-pointer">
                      {language === "pt" ? vehicleCategoryLabels[cat].pt : vehicleCategoryLabels[cat].en}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="vt-available-for-booking"
                checked={vtForm.availableForBooking}
                onCheckedChange={(checked) => setVtForm({ ...vtForm, availableForBooking: !!checked })}
                data-testid="checkbox-available-for-booking"
              />
              <Label htmlFor="vt-available-for-booking" className="text-sm cursor-pointer">
                {t.adminConfig.availableForBooking}
              </Label>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setVtDialog({ open: false, editing: null })} data-testid="button-vt-cancel">
              {t.buttons.cancel}
            </Button>
            <Button
              onClick={handleVtSubmit}
              disabled={createVehicleType.isPending || updateVehicleType.isPending}
              data-testid="button-vt-save"
            >
              {(createVehicleType.isPending || updateVehicleType.isPending) ? t.labels.loading : t.buttons.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="text-delete-dialog-title">{t.buttons.delete}</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground" data-testid="text-delete-confirm">{t.adminConfig.deleteConfirm}</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, type: "", id: null })} data-testid="button-delete-cancel">
              {t.buttons.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteShiftMut.isPending || deleteActivityTypeMut.isPending || deleteSubEquipmentMut.isPending || deleteVehicleTypeMut.isPending}
              data-testid="button-delete-confirm"
            >
              {(deleteShiftMut.isPending || deleteActivityTypeMut.isPending || deleteSubEquipmentMut.isPending) ? t.labels.loading : t.buttons.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
