import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2, Plus, Factory, Settings2, Bell, Calendar, Palette } from "lucide-react";
import { insertFactoryMachineTypeSchema } from "@shared/schema";

type MachineType = { id: number; name: string; description: string | null; isActive: boolean };
type MaintenanceTypeConfig = { id: number; name: string; labelEn: string; labelPt: string; isActive: boolean };
type RecordTypeConfig = {
  id: number;
  machineTypeId: number;
  maintenanceTypeConfigId: number;
  color: string;
  triggersNextDate: boolean;
  sendAlert: boolean;
  sortOrder: number;
  maintenanceTypeConfig: MaintenanceTypeConfig;
};

const COLORS = ["green", "red", "blue", "yellow", "orange", "purple", "gray"] as const;
type Color = typeof COLORS[number];

const COLOR_BADGE: Record<Color, string> = {
  green:  "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  red:    "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  blue:   "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  yellow: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  orange: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  purple: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  gray:   "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400",
};

const formSchema = insertFactoryMachineTypeSchema.extend({
  name: z.string().min(1, "Type name is required"),
});

export default function FactoryMachineTypeConfig() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const fm = t.factoryMachines;

  // ── Machine type CRUD ──────────────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<MachineType | null>(null);

  const { data: types = [], isLoading } = useQuery<MachineType[]>({
    queryKey: ["/api/factory-machine-types"],
  });

  const { data: allMaintenanceTypes = [] } = useQuery<MaintenanceTypeConfig[]>({
    queryKey: ["/api/maintenance-type-configs"],
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", description: "", isActive: true },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/factory-machine-types", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/factory-machine-types"] });
      toast({ title: "Machine type created" });
      setDialogOpen(false);
      form.reset({ name: "", description: "", isActive: true });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PUT", `/api/factory-machine-types/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/factory-machine-types"] });
      toast({ title: "Machine type updated" });
      setDialogOpen(false);
      setEditingType(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/factory-machine-types/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/factory-machine-types"] });
      toast({ title: "Machine type deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  function openAdd() {
    setEditingType(null);
    form.reset({ name: "", description: "", isActive: true });
    setDialogOpen(true);
  }

  function openEdit(type: MachineType) {
    setEditingType(type);
    form.reset({ name: type.name, description: type.description ?? "", isActive: type.isActive });
    setDialogOpen(true);
  }

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (editingType) {
      updateMutation.mutate({ id: editingType.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  // ── Record type config per machine type ────────────────────────────────────
  const [rtDialogOpen, setRtDialogOpen] = useState(false);
  const [rtMachineType, setRtMachineType] = useState<MachineType | null>(null);

  const { data: allRecordTypeConfigs = [] } = useQuery<RecordTypeConfig[]>({
    queryKey: ["/api/machine-type-record-type-configs"],
  });

  // Add/edit state for a single record type config
  const [rtFormOpen, setRtFormOpen] = useState(false);
  const [rtEditing, setRtEditing] = useState<RecordTypeConfig | null>(null);
  const [rtForm, setRtForm] = useState({
    maintenanceTypeConfigId: "",
    color: "gray" as Color,
    triggersNextDate: false,
    sendAlert: false,
    sortOrder: "0",
  });

  const recordTypeConfigs = allRecordTypeConfigs.filter(c => c.machineTypeId === rtMachineType?.id);

  const createRtMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/machine-type-record-type-configs", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/machine-type-record-type-configs"] });
      toast({ title: "Record type added" });
      setRtFormOpen(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateRtMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PUT", `/api/machine-type-record-type-configs/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/machine-type-record-type-configs"] });
      toast({ title: "Record type updated" });
      setRtFormOpen(false);
      setRtEditing(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteRtMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/machine-type-record-type-configs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/machine-type-record-type-configs"] });
      toast({ title: "Record type removed" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  function openRtDialog(type: MachineType) {
    setRtMachineType(type);
    setRtDialogOpen(true);
  }

  function openAddRt() {
    setRtEditing(null);
    setRtForm({ maintenanceTypeConfigId: "", color: "gray", triggersNextDate: false, sendAlert: false, sortOrder: String(recordTypeConfigs.length) });
    setRtFormOpen(true);
  }

  function openEditRt(rt: RecordTypeConfig) {
    setRtEditing(rt);
    setRtForm({
      maintenanceTypeConfigId: String(rt.maintenanceTypeConfigId),
      color: (rt.color as Color) || "gray",
      triggersNextDate: rt.triggersNextDate,
      sendAlert: rt.sendAlert,
      sortOrder: String(rt.sortOrder),
    });
    setRtFormOpen(true);
  }

  function submitRtForm() {
    if (!rtMachineType || !rtForm.maintenanceTypeConfigId) return;
    const payload = {
      machineTypeId: rtMachineType.id,
      maintenanceTypeConfigId: parseInt(rtForm.maintenanceTypeConfigId),
      color: rtForm.color,
      triggersNextDate: rtForm.triggersNextDate,
      sendAlert: rtForm.sendAlert,
      sortOrder: parseInt(rtForm.sortOrder) || 0,
    };
    if (rtEditing) {
      updateRtMutation.mutate({ id: rtEditing.id, data: payload });
    } else {
      createRtMutation.mutate(payload);
    }
  }

  // Maintenance types not yet assigned to this machine type
  const usedIds = new Set(recordTypeConfigs.map(c => c.maintenanceTypeConfigId));
  const availableMaintenanceTypes = allMaintenanceTypes.filter(
    m => m.isActive && (!usedIds.has(m.id) || rtEditing?.maintenanceTypeConfigId === m.id)
  );

  return (
    <>
      <PageHeader
        title={fm.machineTypeConfig}
        description={fm.machineTypeConfigSubtitle}
        actions={
          <Button onClick={openAdd} data-testid="button-add-machine-type">
            <Plus className="w-4 h-4 mr-2" />
            {fm.addMachineType}
          </Button>
        }
      />

      <div className="mt-6">
        {isLoading ? (
          <div className="text-muted-foreground text-sm">Loading...</div>
        ) : types.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <Factory className="w-12 h-12 mb-3 opacity-30" />
            <p className="font-medium">{fm.noMachines}</p>
            <p className="text-sm mt-1">{fm.noMachinesMessage}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{fm.typeName}</TableHead>
                <TableHead>{fm.description}</TableHead>
                <TableHead>Record Types</TableHead>
                <TableHead>{fm.isActive}</TableHead>
                <TableHead className="w-28"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {types.map((type) => {
                const count = allRecordTypeConfigs.filter(c => c.machineTypeId === type.id).length;
                return (
                  <TableRow key={type.id} data-testid={`row-machine-type-${type.id}`}>
                    <TableCell className="font-medium">{type.name}</TableCell>
                    <TableCell className="text-muted-foreground">{type.description || "—"}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openRtDialog(type)}>
                        <Settings2 className="w-3.5 h-3.5" />
                        {count > 0 ? `${count} configured` : "Configure"}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Badge variant={type.isActive ? "default" : "secondary"}>
                        {type.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(type)} data-testid={`button-edit-type-${type.id}`}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(type.id)} disabled={deleteMutation.isPending} data-testid={`button-delete-type-${type.id}`}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* ── Machine type add/edit dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingType ? fm.editMachineType : fm.addMachineType}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>{fm.typeName} *</FormLabel>
                  <FormControl><Input {...field} data-testid="input-type-name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>{fm.description}</FormLabel>
                  <FormControl><Input {...field} value={field.value ?? ""} data-testid="input-type-description" /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="isActive" render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-type-active" /></FormControl>
                  <FormLabel className="!mt-0">{fm.isActive}</FormLabel>
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{t.buttons.cancel}</Button>
                <Button type="submit" disabled={isPending} data-testid="button-save-machine-type">
                  {isPending ? "Saving..." : t.buttons.save}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ── Record types config dialog ── */}
      <Dialog open={rtDialogOpen} onOpenChange={setRtDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Record Types — <span className="text-muted-foreground font-normal">{rtMachineType?.name}</span>
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">
            Configure which record types are available for this machine type and their behaviour.
          </p>

          {recordTypeConfigs.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              No record types configured yet — the Log Record form will show the default types.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead className="text-center"><Calendar className="w-4 h-4 inline" /> Next Date</TableHead>
                  <TableHead className="text-center"><Bell className="w-4 h-4 inline" /> Alert</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recordTypeConfigs.map(rt => (
                  <TableRow key={rt.id}>
                    <TableCell className="font-medium">{rt.maintenanceTypeConfig?.labelEn || rt.maintenanceTypeConfig?.name}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${COLOR_BADGE[rt.color as Color] ?? COLOR_BADGE.gray}`}>
                        {rt.color}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={rt.triggersNextDate ? "default" : "secondary"} className="text-xs">
                        {rt.triggersNextDate ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={rt.sendAlert ? "destructive" : "secondary"} className="text-xs">
                        {rt.sendAlert ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEditRt(rt)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => deleteRtMutation.mutate(rt.id)} disabled={deleteRtMutation.isPending}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <DialogFooter className="justify-between sm:justify-between">
            <Button variant="outline" onClick={openAddRt} disabled={availableMaintenanceTypes.length === 0}>
              <Plus className="w-4 h-4 mr-2" />
              Add Record Type
            </Button>
            <Button onClick={() => setRtDialogOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add/edit single record type config ── */}
      <Dialog open={rtFormOpen} onOpenChange={setRtFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{rtEditing ? "Edit Record Type" : "Add Record Type"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Type *</Label>
              <Select value={rtForm.maintenanceTypeConfigId} onValueChange={v => setRtForm(p => ({ ...p, maintenanceTypeConfigId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a type..." />
                </SelectTrigger>
                <SelectContent>
                  {availableMaintenanceTypes.map(m => (
                    <SelectItem key={m.id} value={String(m.id)}>{m.labelEn || m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Palette className="w-3.5 h-3.5" /> Badge Color</Label>
              <Select value={rtForm.color} onValueChange={v => setRtForm(p => ({ ...p, color: v as Color }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLORS.map(c => (
                    <SelectItem key={c} value={c}>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${COLOR_BADGE[c]}`}>{c}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={rtForm.triggersNextDate} onCheckedChange={v => setRtForm(p => ({ ...p, triggersNextDate: v }))} />
              <div>
                <Label className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Shows "Next Maintenance Date" field</Label>
                <p className="text-xs text-muted-foreground">When selected, the date picker will appear in the log form</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={rtForm.sendAlert} onCheckedChange={v => setRtForm(p => ({ ...p, sendAlert: v }))} />
              <div>
                <Label className="flex items-center gap-1.5"><Bell className="w-3.5 h-3.5" /> Send alert email when logged</Label>
                <p className="text-xs text-muted-foreground">Sends to the machine's breakdown alert recipients</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Sort Order</Label>
              <Input type="number" value={rtForm.sortOrder} onChange={e => setRtForm(p => ({ ...p, sortOrder: e.target.value }))} className="w-24" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRtFormOpen(false)}>{t.buttons.cancel}</Button>
            <Button
              onClick={submitRtForm}
              disabled={!rtForm.maintenanceTypeConfigId || createRtMutation.isPending || updateRtMutation.isPending}
            >
              {(createRtMutation.isPending || updateRtMutation.isPending) ? "Saving..." : t.buttons.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
