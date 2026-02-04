import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ClipboardCheck, Plus, Trash2, Eye, Car, Calendar, Clock, Gauge, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/lib/i18n";
import type { Vehicle, VehicleInspection, User } from "@shared/schema";

const inspectionFormSchema = z.object({
  vehicleId: z.coerce.number().min(1, "Vehicle is required"),
  operatorId: z.coerce.number().min(1, "Operator is required"),
  inspectionDate: z.string().min(1, "Date is required"),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  kmCounter: z.coerce.number().min(0, "KM Counter is required"),
  inspectDamage: z.boolean().default(false),
  inspectDamageComment: z.string().optional(),
  checkCabinSeat: z.boolean().default(false),
  checkCabinSeatComment: z.string().optional(),
  cleanRadiator: z.boolean().default(false),
  cleanRadiatorComment: z.string().optional(),
  checkEngineOil: z.boolean().default(false),
  checkEngineOilComment: z.string().optional(),
  checkCoolantLevel: z.boolean().default(false),
  checkCoolantLevelComment: z.string().optional(),
  checkDriveBelt: z.boolean().default(false),
  checkDriveBeltComment: z.string().optional(),
  airFilterCleaning: z.boolean().default(false),
  airFilterCleaningComment: z.string().optional(),
  checkIntakeExhaust: z.boolean().default(false),
  checkIntakeExhaustComment: z.string().optional(),
  checkTyresWheelNuts: z.boolean().default(false),
  checkTyresWheelNutsComment: z.string().optional(),
  checkHydraulicOil: z.boolean().default(false),
  checkHydraulicOilComment: z.string().optional(),
  checkControls: z.boolean().default(false),
  checkControlsComment: z.string().optional(),
  checkLeaksDamages: z.boolean().default(false),
  checkLeaksDamagesComment: z.string().optional(),
  checkHeadlights: z.boolean().default(false),
  checkHeadlightsComment: z.string().optional(),
  checkHorn: z.boolean().default(false),
  checkHornComment: z.string().optional(),
  checkMirrors: z.boolean().default(false),
  checkMirrorsComment: z.string().optional(),
  checkIndicators: z.boolean().default(false),
  checkIndicatorsComment: z.string().optional(),
  greaseHydraulicPins: z.boolean().default(false),
  greaseHydraulicPinsComment: z.string().optional(),
  checkMeters: z.boolean().default(false),
  checkMetersComment: z.string().optional(),
  remarks: z.string().optional(),
});

type InspectionFormData = z.infer<typeof inspectionFormSchema>;

const CHECKLIST_ITEMS = [
  { key: "inspectDamage", label: { en: "Inspect any Damage", pt: "Inspecionar Danos" } },
  { key: "checkCabinSeat", label: { en: "Check Operator's Cabin and driver seat should be in good condition", pt: "Verificar Cabine do Operador e banco do motorista em boas condições" } },
  { key: "cleanRadiator", label: { en: "Clean radiator (with compressed air)", pt: "Limpar radiador (com ar comprimido)" } },
  { key: "checkEngineOil", label: { en: "Check Engine Oil", pt: "Verificar Óleo do Motor" } },
  { key: "checkCoolantLevel", label: { en: "Check coolant level", pt: "Verificar nível do líquido de arrefecimento" } },
  { key: "checkDriveBelt", label: { en: "Check drive belt and tension", pt: "Verificar correia de transmissão e tensão" } },
  { key: "airFilterCleaning", label: { en: "Air filter Cleaning", pt: "Limpeza do filtro de ar" } },
  { key: "checkIntakeExhaust", label: { en: "Check intake & exhaust ducting and connections for leaks", pt: "Verificar dutos de admissão e escape quanto a vazamentos" } },
  { key: "checkTyresWheelNuts", label: { en: "Check tyres and wheel nut condition (visually)", pt: "Verificar pneus e condição das porcas das rodas (visualmente)" } },
  { key: "checkHydraulicOil", label: { en: "Check hydraulic oil level", pt: "Verificar nível do óleo hidráulico" } },
  { key: "checkControls", label: { en: "Check that all controls are functioning correctly", pt: "Verificar se todos os controles estão funcionando corretamente" } },
  { key: "checkLeaksDamages", label: { en: "Check for leaks & damages", pt: "Verificar vazamentos e danos" } },
  { key: "checkHeadlights", label: { en: "Check Headlight Condition", pt: "Verificar Condição dos Faróis" } },
  { key: "checkHorn", label: { en: "Ensure the horn working", pt: "Garantir que a buzina funciona" } },
  { key: "checkMirrors", label: { en: "Check the mirror for any broken", pt: "Verificar espelhos quebrados" } },
  { key: "checkIndicators", label: { en: "Check Indicator's lights", pt: "Verificar Luzes Indicadoras" } },
  { key: "greaseHydraulicPins", label: { en: "Grease the hydraulic cylinder pins if required", pt: "Lubrificar os pinos do cilindro hidráulico se necessário" } },
  { key: "checkMeters", label: { en: "Ensure all the meters working normal", pt: "Garantir que todos os medidores funcionam normalmente" } },
];

export default function VehicleInspections() {
  const { t, language } = useLanguage();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewInspection, setViewInspection] = useState<(VehicleInspection & { vehicle: Vehicle; operator: User }) | null>(null);

  const { data: inspections, isLoading: inspectionsLoading } = useQuery<(VehicleInspection & { vehicle: Vehicle; operator: User })[]>({
    queryKey: ["/api/vehicle-inspections"],
  });

  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  const form = useForm<InspectionFormData>({
    resolver: zodResolver(inspectionFormSchema),
    defaultValues: {
      vehicleId: 0,
      operatorId: 0,
      inspectionDate: new Date().toISOString().split("T")[0],
      startTime: "",
      endTime: "",
      kmCounter: 0,
      inspectDamage: false,
      inspectDamageComment: "",
      checkCabinSeat: false,
      checkCabinSeatComment: "",
      cleanRadiator: false,
      cleanRadiatorComment: "",
      checkEngineOil: false,
      checkEngineOilComment: "",
      checkCoolantLevel: false,
      checkCoolantLevelComment: "",
      checkDriveBelt: false,
      checkDriveBeltComment: "",
      airFilterCleaning: false,
      airFilterCleaningComment: "",
      checkIntakeExhaust: false,
      checkIntakeExhaustComment: "",
      checkTyresWheelNuts: false,
      checkTyresWheelNutsComment: "",
      checkHydraulicOil: false,
      checkHydraulicOilComment: "",
      checkControls: false,
      checkControlsComment: "",
      checkLeaksDamages: false,
      checkLeaksDamagesComment: "",
      checkHeadlights: false,
      checkHeadlightsComment: "",
      checkHorn: false,
      checkHornComment: "",
      checkMirrors: false,
      checkMirrorsComment: "",
      checkIndicators: false,
      checkIndicatorsComment: "",
      greaseHydraulicPins: false,
      greaseHydraulicPinsComment: "",
      checkMeters: false,
      checkMetersComment: "",
      remarks: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InspectionFormData) => {
      return apiRequest("POST", "/api/vehicle-inspections", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicle-inspections"] });
      setIsDialogOpen(false);
      form.reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/vehicle-inspections/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicle-inspections"] });
    },
  });

  const onSubmit = (data: InspectionFormData) => {
    createMutation.mutate(data);
  };

  const countCheckedItems = (inspection: VehicleInspection) => {
    let count = 0;
    CHECKLIST_ITEMS.forEach((item) => {
      if ((inspection as any)[item.key]) count++;
    });
    return count;
  };

  const labels = {
    en: {
      title: "Vehicle Inspections",
      subtitle: "Track factory vehicle maintenance checklists",
      newInspection: "New Inspection",
      vehicle: "Vehicle",
      date: "Date",
      operator: "Operator",
      kmCounter: "KM Counter",
      checkedItems: "Checked Items",
      actions: "Actions",
      view: "View",
      delete: "Delete",
      noInspections: "No inspections recorded yet",
      createInspection: "Create Vehicle Inspection",
      selectVehicle: "Select a vehicle",
      selectOperator: "Select an operator",
      inspectionDate: "Inspection Date",
      startTime: "Start Time",
      endTime: "End Time",
      checklist: "Inspection Checklist",
      task: "Task",
      check: "Check",
      comments: "Comments",
      remarks: "Remarks",
      save: "Save Inspection",
      cancel: "Cancel",
      viewDetails: "Inspection Details",
      close: "Close",
    },
    pt: {
      title: "Inspeções de Veículos",
      subtitle: "Acompanhar listas de verificação de manutenção de veículos da fábrica",
      newInspection: "Nova Inspeção",
      vehicle: "Veículo",
      date: "Data",
      operator: "Operador",
      kmCounter: "Contador KM",
      checkedItems: "Itens Verificados",
      actions: "Ações",
      view: "Ver",
      delete: "Excluir",
      noInspections: "Nenhuma inspeção registrada ainda",
      createInspection: "Criar Inspeção de Veículo",
      selectVehicle: "Selecionar um veículo",
      selectOperator: "Selecionar um operador",
      inspectionDate: "Data da Inspeção",
      startTime: "Hora de Início",
      endTime: "Hora de Término",
      checklist: "Lista de Verificação",
      task: "Tarefa",
      check: "Verificar",
      comments: "Comentários",
      remarks: "Observações",
      save: "Salvar Inspeção",
      cancel: "Cancelar",
      viewDetails: "Detalhes da Inspeção",
      close: "Fechar",
    },
  };

  const l = labels[language];

  if (inspectionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardCheck className="h-8 w-8" />
            {l.title}
          </h1>
          <p className="text-muted-foreground">{l.subtitle}</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-inspection">
              <Plus className="h-4 w-4 mr-2" />
              {l.newInspection}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>{l.createInspection}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[calc(90vh-100px)]">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pr-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="vehicleId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{l.vehicle}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value?.toString()}>
                            <FormControl>
                              <SelectTrigger data-testid="select-vehicle">
                                <SelectValue placeholder={l.selectVehicle} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {vehicles?.map((vehicle) => (
                                <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                                  {vehicle.make} {vehicle.model} - {vehicle.licensePlate}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="operatorId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{l.operator}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value?.toString()}>
                            <FormControl>
                              <SelectTrigger data-testid="select-operator">
                                <SelectValue placeholder={l.selectOperator} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {users?.filter(u => u.isDriver).map((user) => (
                                <SelectItem key={user.id} value={user.id.toString()}>
                                  {user.fullName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="kmCounter"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{l.kmCounter}</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} data-testid="input-km-counter" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="inspectionDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{l.inspectionDate}</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-inspection-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{l.startTime}</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} data-testid="input-start-time" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="endTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{l.endTime}</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} data-testid="input-end-time" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div>
                    <h3 className="font-semibold mb-4">{l.checklist}</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50%]">{l.task}</TableHead>
                          <TableHead className="w-[10%] text-center">{l.check}</TableHead>
                          <TableHead className="w-[40%]">{l.comments}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {CHECKLIST_ITEMS.map((item, index) => (
                          <TableRow key={item.key}>
                            <TableCell className="text-sm">{item.label[language]}</TableCell>
                            <TableCell className="text-center">
                              <FormField
                                control={form.control}
                                name={item.key as keyof InspectionFormData}
                                render={({ field }) => (
                                  <Checkbox
                                    checked={field.value as boolean}
                                    onCheckedChange={field.onChange}
                                    data-testid={`checkbox-${item.key}`}
                                  />
                                )}
                              />
                            </TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name={`${item.key}Comment` as keyof InspectionFormData}
                                render={({ field }) => (
                                  <Input
                                    {...field}
                                    value={field.value as string || ""}
                                    placeholder={l.comments}
                                    className="h-8 text-sm"
                                    data-testid={`input-${item.key}-comment`}
                                  />
                                )}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <FormField
                    control={form.control}
                    name="remarks"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{l.remarks}</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} data-testid="input-remarks" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      {l.cancel}
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending} data-testid="button-save-inspection">
                      {l.save}
                    </Button>
                  </div>
                </form>
              </Form>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{l.vehicle}</TableHead>
                <TableHead>{l.date}</TableHead>
                <TableHead>{l.operator}</TableHead>
                <TableHead>{l.kmCounter}</TableHead>
                <TableHead>{l.checkedItems}</TableHead>
                <TableHead>{l.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!inspections || inspections.length === 0) ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {l.noInspections}
                  </TableCell>
                </TableRow>
              ) : (
                inspections.map((inspection) => (
                  <TableRow key={inspection.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4 text-muted-foreground" />
                        {inspection.vehicle.make} {inspection.vehicle.model}
                        <span className="text-muted-foreground">({inspection.vehicle.licensePlate})</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(inspection.inspectionDate), "dd/MM/yyyy")}
                      </div>
                    </TableCell>
                    <TableCell>{inspection.operator.fullName}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Gauge className="h-4 w-4 text-muted-foreground" />
                        {inspection.kmCounter.toLocaleString()} km
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {countCheckedItems(inspection)} / {CHECKLIST_ITEMS.length}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setViewInspection(inspection)}
                          data-testid={`button-view-inspection-${inspection.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {currentUser?.role === "admin" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteMutation.mutate(inspection.id)}
                            disabled={deleteMutation.isPending}
                            data-testid={`button-delete-inspection-${inspection.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!viewInspection} onOpenChange={() => setViewInspection(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{l.viewDetails}</DialogTitle>
          </DialogHeader>
          {viewInspection && (
            <ScrollArea className="max-h-[calc(90vh-100px)]">
              <div className="space-y-4 pr-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Car className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">{l.vehicle}</p>
                      <p className="font-medium">{viewInspection.vehicle.make} {viewInspection.vehicle.model} ({viewInspection.vehicle.licensePlate})</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Gauge className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">{l.kmCounter}</p>
                      <p className="font-medium">{viewInspection.kmCounter.toLocaleString()} km</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">{l.date}</p>
                      <p className="font-medium">{format(new Date(viewInspection.inspectionDate), "dd/MM/yyyy")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">{l.startTime} - {l.endTime}</p>
                      <p className="font-medium">{viewInspection.startTime || "-"} - {viewInspection.endTime || "-"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">{l.operator}</p>
                      <p className="font-medium">{viewInspection.operator.fullName}</p>
                    </div>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{l.task}</TableHead>
                      <TableHead className="w-[10%] text-center">{l.check}</TableHead>
                      <TableHead>{l.comments}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {CHECKLIST_ITEMS.map((item) => (
                      <TableRow key={item.key}>
                        <TableCell className="text-sm">{item.label[language]}</TableCell>
                        <TableCell className="text-center">
                          {(viewInspection as any)[item.key] ? (
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">✓</Badge>
                          ) : (
                            <Badge variant="outline">-</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {(viewInspection as any)[`${item.key}Comment`] || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {viewInspection.remarks && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">{l.remarks}</p>
                    <p className="text-sm">{viewInspection.remarks}</p>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => setViewInspection(null)}>
                    {l.close}
                  </Button>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
