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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pencil, Trash2, Plus, QrCode, Factory, CalendarDays, Wrench, AlertTriangle, Clock, Bell, X } from "lucide-react";
import { insertFactoryMachineSchema, insertMachineRecordSchema } from "@shared/schema";
import { QRCodeCanvas } from "qrcode.react";

type MachineType = { id: number; name: string; description: string | null; isActive: boolean };
type Machine = { id: number; name: string; machineTypeId: number | null; manufacturer: string | null; model: string | null; serialNumber: string | null; location: string | null; department: string | null; description: string | null; isActive: boolean; qrSlug: string; breakdownAlertRecipients: string[]; machineType?: MachineType };
type MachineRecord = { id: number; machineId: number; recordType: string; date: string; description: string; performedBy: string | null; nextMaintenanceDate: string | null; createdById: number | null; createdAt: string };

const machineFormSchema = insertFactoryMachineSchema.omit({ qrSlug: true }).extend({
  name: z.string().min(1, "Machine name is required"),
});

const recordFormSchema = insertMachineRecordSchema.extend({
  machineId: z.number({ required_error: "Machine is required" }),
  recordType: z.string().min(1, "Record type is required"),
  date: z.string().min(1, "Date is required"),
  description: z.string().min(1, "Description is required"),
});

const RECORD_TYPE_COLORS: Record<string, string> = {
  maintenance: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  breakdown: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

const RECORD_TYPE_ICONS: Record<string, any> = {
  maintenance: Wrench,
  breakdown: AlertTriangle,
  scheduled: Clock,
};

export default function FactoryMachines() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const fm = t.factoryMachines;

  const [machineDialogOpen, setMachineDialogOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrMachine, setQrMachine] = useState<Machine | null>(null);
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MachineRecord | null>(null);
  const [recordFilter, setRecordFilter] = useState<string>("all");
  const [alertRecipientsDialogOpen, setAlertRecipientsDialogOpen] = useState(false);
  const [alertRecipientsMachine, setAlertRecipientsMachine] = useState<Machine | null>(null);
  const [recipientInput, setRecipientInput] = useState("");
  const [recipientList, setRecipientList] = useState<string[]>([]);

  const publicBaseUrl = window.location.origin;

  const { data: machineTypes = [] } = useQuery<MachineType[]>({
    queryKey: ["/api/factory-machine-types"],
  });

  const { data: machines = [], isLoading: machinesLoading } = useQuery<Machine[]>({
    queryKey: ["/api/factory-machines"],
  });

  const { data: allRecords = [], isLoading: recordsLoading } = useQuery<MachineRecord[]>({
    queryKey: ["/api/machine-records"],
  });

  const machineForm = useForm<z.infer<typeof machineFormSchema>>({
    resolver: zodResolver(machineFormSchema),
    defaultValues: { name: "", machineTypeId: null, manufacturer: "", model: "", serialNumber: "", location: "", department: "", description: "", isActive: true },
  });

  const recordForm = useForm<z.infer<typeof recordFormSchema>>({
    resolver: zodResolver(recordFormSchema),
    defaultValues: { machineId: undefined as any, recordType: "maintenance", date: new Date().toISOString().split("T")[0], description: "", performedBy: "", nextMaintenanceDate: null },
  });

  const createMachineMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/factory-machines", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/factory-machines"] }); toast({ title: "Machine added" }); setMachineDialogOpen(false); machineForm.reset(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMachineMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PUT", `/api/factory-machines/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/factory-machines"] }); toast({ title: "Machine updated" }); setMachineDialogOpen(false); setEditingMachine(null); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMachineMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/factory-machines/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/factory-machines"] }); queryClient.invalidateQueries({ queryKey: ["/api/machine-records"] }); toast({ title: "Machine deleted" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const createRecordMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/machine-records", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/machine-records"] }); toast({ title: "Record logged" }); setRecordDialogOpen(false); recordForm.reset({ machineId: undefined as any, recordType: "maintenance", date: new Date().toISOString().split("T")[0], description: "", performedBy: "", nextMaintenanceDate: null }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateRecordMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PUT", `/api/machine-records/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/machine-records"] }); toast({ title: "Record updated" }); setRecordDialogOpen(false); setEditingRecord(null); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteRecordMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/machine-records/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/machine-records"] }); toast({ title: "Record deleted" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateAlertRecipientsMutation = useMutation({
    mutationFn: ({ id, recipients }: { id: number; recipients: string[] }) =>
      apiRequest("PATCH", `/api/factory-machines/${id}/alert-recipients`, { breakdownAlertRecipients: recipients }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/factory-machines"] });
      toast({ title: "Alert recipients saved" });
      setAlertRecipientsDialogOpen(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  function openAddMachine() {
    setEditingMachine(null);
    machineForm.reset({ name: "", machineTypeId: null, manufacturer: "", model: "", serialNumber: "", location: "", department: "", description: "", isActive: true });
    setMachineDialogOpen(true);
  }

  function openEditMachine(m: Machine) {
    setEditingMachine(m);
    machineForm.reset({ name: m.name, machineTypeId: m.machineTypeId, manufacturer: m.manufacturer ?? "", model: m.model ?? "", serialNumber: m.serialNumber ?? "", location: m.location ?? "", department: m.department ?? "", description: m.description ?? "", isActive: m.isActive });
    setMachineDialogOpen(true);
  }

  function openQr(m: Machine) {
    setQrMachine(m);
    setQrDialogOpen(true);
  }

  function openAlertRecipients(m: Machine) {
    setAlertRecipientsMachine(m);
    setRecipientList(m.breakdownAlertRecipients ?? []);
    setRecipientInput("");
    setAlertRecipientsDialogOpen(true);
  }

  function addRecipient() {
    const email = recipientInput.trim().toLowerCase();
    if (!email) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({ title: "Invalid email address", variant: "destructive" });
      return;
    }
    if (recipientList.includes(email)) {
      toast({ title: "Email already added", variant: "destructive" });
      return;
    }
    setRecipientList(prev => [...prev, email]);
    setRecipientInput("");
  }

  function removeRecipient(email: string) {
    setRecipientList(prev => prev.filter(r => r !== email));
  }

  function openAddRecord(machineId?: number) {
    setEditingRecord(null);
    recordForm.reset({ machineId: machineId as any, recordType: "maintenance", date: new Date().toISOString().split("T")[0], description: "", performedBy: "", nextMaintenanceDate: null });
    setRecordDialogOpen(true);
  }

  function openEditRecord(r: MachineRecord) {
    setEditingRecord(r);
    recordForm.reset({ machineId: r.machineId, recordType: r.recordType, date: r.date, description: r.description, performedBy: r.performedBy ?? "", nextMaintenanceDate: r.nextMaintenanceDate ?? null });
    setRecordDialogOpen(true);
  }

  function onMachineSubmit(values: z.infer<typeof machineFormSchema>) {
    const payload = { ...values, machineTypeId: values.machineTypeId || null };
    if (editingMachine) updateMachineMutation.mutate({ id: editingMachine.id, data: payload });
    else createMachineMutation.mutate(payload);
  }

  function onRecordSubmit(values: z.infer<typeof recordFormSchema>) {
    if (editingRecord) updateRecordMutation.mutate({ id: editingRecord.id, data: values });
    else createRecordMutation.mutate(values);
  }

  const filteredRecords = recordFilter === "all" ? allRecords : allRecords.filter(r => r.machineId === Number(recordFilter));
  const sortedRecords = [...filteredRecords].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const recordTypeLabel = (type: string) => {
    if (type === "maintenance") return fm.typeMaintenance;
    if (type === "breakdown") return fm.typeBreakdown;
    return fm.typeScheduled;
  };

  const machineMap = Object.fromEntries(machines.map(m => [m.id, m]));

  return (
    <>
      <PageHeader
        title={fm.title}
        description={fm.subtitle}
        actions={
          <Button onClick={openAddMachine} data-testid="button-add-machine">
            <Plus className="w-4 h-4 mr-2" />
            {fm.addMachine}
          </Button>
        }
      />

      <Tabs defaultValue="machines" className="mt-6">
        <TabsList data-testid="tabs-factory-machines">
          <TabsTrigger value="machines" data-testid="tab-machines">{fm.machines}</TabsTrigger>
          <TabsTrigger value="records" data-testid="tab-records">{fm.records}</TabsTrigger>
        </TabsList>

        {/* ── Machines Tab ── */}
        <TabsContent value="machines">
          {machinesLoading ? (
            <div className="text-muted-foreground text-sm mt-4">Loading...</div>
          ) : machines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <Factory className="w-12 h-12 mb-3 opacity-30" />
              <p className="font-medium">{fm.noMachines}</p>
              <p className="text-sm mt-1">{fm.noMachinesMessage}</p>
            </div>
          ) : (
            <Table className="mt-2">
              <TableHeader>
                <TableRow>
                  <TableHead>{fm.machineName}</TableHead>
                  <TableHead>{fm.machineType}</TableHead>
                  <TableHead>{fm.manufacturer}</TableHead>
                  <TableHead>{fm.model}</TableHead>
                  <TableHead>{fm.serialNumber}</TableHead>
                  <TableHead>{fm.location}</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-32"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {machines.map(m => (
                  <TableRow key={m.id} data-testid={`row-machine-${m.id}`}>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell>{m.machineType?.name ?? "—"}</TableCell>
                    <TableCell>{m.manufacturer ?? "—"}</TableCell>
                    <TableCell>{m.model ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{m.serialNumber ?? "—"}</TableCell>
                    <TableCell>{m.location ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={m.isActive ? "default" : "secondary"}>
                        {m.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" title={fm.viewQr} onClick={() => openQr(m)} data-testid={`button-qr-${m.id}`}>
                          <QrCode className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" title="Breakdown alert recipients" onClick={() => openAlertRecipients(m)} data-testid={`button-alert-recipients-${m.id}`}>
                          <Bell className={`w-4 h-4 ${(m.breakdownAlertRecipients ?? []).length > 0 ? "text-amber-500" : ""}`} />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => openEditMachine(m)} data-testid={`button-edit-machine-${m.id}`}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => { if (confirm(fm.deleteConfirm)) deleteMachineMutation.mutate(m.id); }} disabled={deleteMachineMutation.isPending} data-testid={`button-delete-machine-${m.id}`}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        {/* ── Records Tab ── */}
        <TabsContent value="records">
          <div className="mt-2 mb-4 flex items-center justify-between gap-4">
            <Select value={recordFilter} onValueChange={setRecordFilter} data-testid="select-record-filter">
              <SelectTrigger className="w-64" data-testid="trigger-record-filter">
                <SelectValue placeholder={fm.filterByMachine} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{fm.allMachines}</SelectItem>
                {machines.map(m => (
                  <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => openAddRecord()} data-testid="button-log-record">
              <Plus className="w-4 h-4 mr-2" />
              {fm.logRecord}
            </Button>
          </div>

          {recordsLoading ? (
            <div className="text-muted-foreground text-sm">Loading...</div>
          ) : sortedRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <CalendarDays className="w-12 h-12 mb-3 opacity-30" />
              <p className="font-medium">{fm.noRecords}</p>
              <p className="text-sm mt-1">{fm.noRecordsMessage}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{fm.recordDate}</TableHead>
                  <TableHead>{fm.machineName}</TableHead>
                  <TableHead>{fm.recordType}</TableHead>
                  <TableHead>{fm.recordDescription}</TableHead>
                  <TableHead>{fm.performedBy}</TableHead>
                  <TableHead>{fm.nextMaintenanceDate}</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRecords.map(r => {
                  const Icon = RECORD_TYPE_ICONS[r.recordType] ?? Wrench;
                  return (
                    <TableRow key={r.id} data-testid={`row-record-${r.id}`}>
                      <TableCell className="text-sm">{r.date}</TableCell>
                      <TableCell className="font-medium">{machineMap[r.machineId]?.name ?? `#${r.machineId}`}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${RECORD_TYPE_COLORS[r.recordType] ?? ""}`}>
                          <Icon className="w-3 h-3" />
                          {recordTypeLabel(r.recordType)}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{r.description}</TableCell>
                      <TableCell>{r.performedBy ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.nextMaintenanceDate ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEditRecord(r)} data-testid={`button-edit-record-${r.id}`}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => { if (confirm(fm.deleteConfirm)) deleteRecordMutation.mutate(r.id); }} disabled={deleteRecordMutation.isPending} data-testid={`button-delete-record-${r.id}`}>
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
        </TabsContent>
      </Tabs>

      {/* ── Add/Edit Machine Dialog ── */}
      <Dialog open={machineDialogOpen} onOpenChange={setMachineDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingMachine ? fm.editMachine : fm.addMachine}</DialogTitle>
          </DialogHeader>
          <Form {...machineForm}>
            <form onSubmit={machineForm.handleSubmit(onMachineSubmit)} className="space-y-4">
              <FormField control={machineForm.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>{fm.machineName} *</FormLabel>
                  <FormControl><Input {...field} data-testid="input-machine-name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={machineForm.control} name="machineTypeId" render={({ field }) => (
                <FormItem>
                  <FormLabel>{fm.machineType}</FormLabel>
                  <Select onValueChange={v => field.onChange(v === "none" ? null : Number(v))} value={field.value ? String(field.value) : "none"}>
                    <FormControl>
                      <SelectTrigger data-testid="select-machine-type">
                        <SelectValue placeholder="Select type..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">— None —</SelectItem>
                      {machineTypes.filter(mt => mt.isActive).map(mt => (
                        <SelectItem key={mt.id} value={String(mt.id)}>{mt.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={machineForm.control} name="manufacturer" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{fm.manufacturer}</FormLabel>
                    <FormControl><Input {...field} value={field.value ?? ""} data-testid="input-manufacturer" /></FormControl>
                  </FormItem>
                )} />
                <FormField control={machineForm.control} name="model" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{fm.model}</FormLabel>
                    <FormControl><Input {...field} value={field.value ?? ""} data-testid="input-model" /></FormControl>
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={machineForm.control} name="serialNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{fm.serialNumber}</FormLabel>
                    <FormControl><Input {...field} value={field.value ?? ""} data-testid="input-serial-number" /></FormControl>
                  </FormItem>
                )} />
                <FormField control={machineForm.control} name="location" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{fm.location}</FormLabel>
                    <FormControl><Input {...field} value={field.value ?? ""} data-testid="input-location" /></FormControl>
                  </FormItem>
                )} />
              </div>
              <FormField control={machineForm.control} name="department" render={({ field }) => (
                <FormItem>
                  <FormLabel>{fm.department}</FormLabel>
                  <FormControl><Input {...field} value={field.value ?? ""} data-testid="input-department" /></FormControl>
                </FormItem>
              )} />
              <FormField control={machineForm.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>{fm.description}</FormLabel>
                  <FormControl><Textarea {...field} value={field.value ?? ""} rows={2} data-testid="input-machine-description" /></FormControl>
                </FormItem>
              )} />
              <FormField control={machineForm.control} name="isActive" render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-machine-active" /></FormControl>
                  <FormLabel className="!mt-0">{fm.isActive}</FormLabel>
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setMachineDialogOpen(false)}>{t.buttons.cancel}</Button>
                <Button type="submit" disabled={createMachineMutation.isPending || updateMachineMutation.isPending} data-testid="button-save-machine">
                  {(createMachineMutation.isPending || updateMachineMutation.isPending) ? "Saving..." : t.buttons.save}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ── QR Code Dialog ── */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{fm.qrCode}</DialogTitle>
          </DialogHeader>
          {qrMachine && (
            <div className="flex flex-col items-center gap-4 py-2">
              <p className="text-sm text-muted-foreground text-center">{fm.qrCodeDescription}</p>
              <div id="qr-print-canvas" className="p-4 bg-white rounded-lg border" data-testid="qr-code-container">
                <QRCodeCanvas
                  value={`${publicBaseUrl}/machine/${qrMachine.qrSlug}`}
                  size={200}
                  level="M"
                />
              </div>
              <div className="w-full">
                <p className="text-xs text-muted-foreground mb-1">{fm.publicUrl}</p>
                <code className="block text-xs bg-muted px-3 py-2 rounded break-all" data-testid="text-qr-url">
                  {publicBaseUrl}/machine/{qrMachine.qrSlug}
                </code>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  const canvas = document.querySelector("#qr-print-canvas canvas") as HTMLCanvasElement;
                  const link = document.createElement("a");
                  link.download = `machine-${qrMachine.qrSlug}.png`;
                  link.href = canvas?.toDataURL?.() ?? "";
                  link.click();
                }}
                data-testid="button-download-qr"
              >
                {fm.printQr}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Breakdown Alert Recipients Dialog ── */}
      <Dialog open={alertRecipientsDialogOpen} onOpenChange={setAlertRecipientsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Breakdown Alert Recipients</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              These email addresses will receive an alert whenever a breakdown is logged for <strong>{alertRecipientsMachine?.name}</strong>.
            </p>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="email@example.com"
                value={recipientInput}
                onChange={e => setRecipientInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addRecipient(); } }}
                data-testid="input-alert-recipient"
              />
              <Button type="button" onClick={addRecipient} data-testid="button-add-recipient">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {recipientList.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4 border rounded-md">No recipients configured. Add an email address above.</p>
            ) : (
              <ul className="space-y-2 max-h-48 overflow-y-auto" data-testid="list-alert-recipients">
                {recipientList.map(email => (
                  <li key={email} className="flex items-center justify-between px-3 py-2 rounded-md border bg-muted/30 text-sm">
                    <span data-testid={`text-recipient-${email}`}>{email}</span>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeRecipient(email)} data-testid={`button-remove-recipient-${email}`}>
                      <X className="w-3 h-3" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAlertRecipientsDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => { if (alertRecipientsMachine) updateAlertRecipientsMutation.mutate({ id: alertRecipientsMachine.id, recipients: recipientList }); }}
              disabled={updateAlertRecipientsMutation.isPending}
              data-testid="button-save-alert-recipients"
            >
              {updateAlertRecipientsMutation.isPending ? "Saving..." : "Save Recipients"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add/Edit Record Dialog ── */}
      <Dialog open={recordDialogOpen} onOpenChange={setRecordDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRecord ? fm.editRecord : fm.logRecord}</DialogTitle>
          </DialogHeader>
          <Form {...recordForm}>
            <form onSubmit={recordForm.handleSubmit(onRecordSubmit)} className="space-y-4">
              <FormField control={recordForm.control} name="machineId" render={({ field }) => (
                <FormItem>
                  <FormLabel>{fm.machineName} *</FormLabel>
                  <Select onValueChange={v => field.onChange(Number(v))} value={field.value ? String(field.value) : undefined}>
                    <FormControl>
                      <SelectTrigger data-testid="select-record-machine">
                        <SelectValue placeholder="Select machine..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {machines.map(m => (
                        <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={recordForm.control} name="recordType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{fm.recordType} *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-record-type">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="maintenance">{fm.typeMaintenance}</SelectItem>
                        <SelectItem value="breakdown">{fm.typeBreakdown}</SelectItem>
                        <SelectItem value="scheduled">{fm.typeScheduled}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={recordForm.control} name="date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{fm.recordDate} *</FormLabel>
                    <FormControl><Input type="date" {...field} data-testid="input-record-date" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={recordForm.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>{fm.recordDescription} *</FormLabel>
                  <FormControl><Textarea {...field} rows={3} data-testid="input-record-description" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={recordForm.control} name="performedBy" render={({ field }) => (
                <FormItem>
                  <FormLabel>{fm.performedBy}</FormLabel>
                  <FormControl><Input {...field} value={field.value ?? ""} placeholder="Name or team..." data-testid="input-performed-by" /></FormControl>
                </FormItem>
              )} />
              <FormField control={recordForm.control} name="nextMaintenanceDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>{fm.nextMaintenanceDate}</FormLabel>
                  <FormControl><Input type="date" {...field} value={field.value ?? ""} data-testid="input-next-maintenance-date" /></FormControl>
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setRecordDialogOpen(false)}>{t.buttons.cancel}</Button>
                <Button type="submit" disabled={createRecordMutation.isPending || updateRecordMutation.isPending} data-testid="button-save-record">
                  {(createRecordMutation.isPending || updateRecordMutation.isPending) ? "Saving..." : t.buttons.save}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
