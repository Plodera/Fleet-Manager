import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { Shift, ActivityType, SubEquipment } from "@shared/schema";

export default function WorkOrderConfig() {
  const { t } = useLanguage();
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

  const [shiftDialog, setShiftDialog] = useState<{ open: boolean; editing: Shift | null }>({ open: false, editing: null });
  const [shiftForm, setShiftForm] = useState({ name: "", nameEn: "", namePt: "", startTime: "", endTime: "" });

  const [activityDialog, setActivityDialog] = useState<{ open: boolean; editing: ActivityType | null }>({ open: false, editing: null });
  const [activityForm, setActivityForm] = useState({ name: "", labelEn: "", labelPt: "" });

  const [subEquipDialog, setSubEquipDialog] = useState<{ open: boolean; editing: SubEquipment | null }>({ open: false, editing: null });
  const [subEquipForm, setSubEquipForm] = useState({ name: "", labelEn: "", labelPt: "" });

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
    onError: () => toast({ title: t.labels.error, variant: "destructive" }),
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
    onError: () => toast({ title: t.labels.error, variant: "destructive" }),
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
    onError: () => toast({ title: t.labels.error, variant: "destructive" }),
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
    onError: () => toast({ title: t.labels.error, variant: "destructive" }),
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
    onError: () => toast({ title: t.labels.error, variant: "destructive" }),
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
    onError: () => toast({ title: t.labels.error, variant: "destructive" }),
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
    onError: () => toast({ title: t.labels.error, variant: "destructive" }),
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
    onError: () => toast({ title: t.labels.error, variant: "destructive" }),
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
    onError: () => toast({ title: t.labels.error, variant: "destructive" }),
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
    setSubEquipForm({ name: "", labelEn: "", labelPt: "" });
    setSubEquipDialog({ open: true, editing: null });
  };

  const openEditSubEquip = (se: SubEquipment) => {
    setSubEquipForm({ name: se.name, labelEn: se.labelEn, labelPt: se.labelPt });
    setSubEquipDialog({ open: true, editing: se });
  };

  const handleSubEquipSubmit = () => {
    if (subEquipDialog.editing) {
      updateSubEquipment.mutate({ id: subEquipDialog.editing.id, ...subEquipForm });
    } else {
      createSubEquipment.mutate(subEquipForm);
    }
  };

  const handleDelete = () => {
    if (!deleteDialog.id) return;
    if (deleteDialog.type === "shift") deleteShiftMut.mutate(deleteDialog.id);
    else if (deleteDialog.type === "activity") deleteActivityTypeMut.mutate(deleteDialog.id);
    else if (deleteDialog.type === "subequip") deleteSubEquipmentMut.mutate(deleteDialog.id);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold font-display tracking-tight" data-testid="text-page-title">{t.adminConfig.workOrderConfig}</h1>
        <p className="text-muted-foreground mt-1" data-testid="text-page-subtitle">{t.adminConfig.workOrderConfigSubtitle}</p>
      </div>

      <Tabs defaultValue="shifts" className="space-y-6">
        <TabsList data-testid="tabs-config">
          <TabsTrigger value="shifts" data-testid="tab-shifts">{t.adminConfig.shifts}</TabsTrigger>
          <TabsTrigger value="activityTypes" data-testid="tab-activity-types">{t.adminConfig.activityTypes}</TabsTrigger>
          <TabsTrigger value="subEquipment" data-testid="tab-sub-equipment">{t.adminConfig.subEquipment}</TabsTrigger>
        </TabsList>

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
                  <TableHead className="text-right">{t.buttons.edit}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subEquipmentLoading ? (
                  <TableRow>
                    <TableCell colSpan={2} className="h-24 text-center" data-testid="text-sub-equipment-loading">{t.labels.loading}</TableCell>
                  </TableRow>
                ) : subEquipmentList?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="h-24 text-center text-muted-foreground" data-testid="text-sub-equipment-empty">{t.labels.noRecords}</TableCell>
                  </TableRow>
                ) : subEquipmentList?.map((se) => (
                  <TableRow key={se.id} data-testid={`row-sub-equipment-${se.id}`}>
                    <TableCell className="font-medium">{se.name}</TableCell>
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
              disabled={deleteShiftMut.isPending || deleteActivityTypeMut.isPending || deleteSubEquipmentMut.isPending}
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
