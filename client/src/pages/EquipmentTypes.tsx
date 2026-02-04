import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Settings2, Plus, Trash2, Edit2, ChevronDown, ListChecks, GripVertical } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import type { EquipmentType, EquipmentChecklistItem } from "@shared/schema";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const labels = {
  en: {
    title: "Equipment Types",
    subtitle: "Manage equipment types and their inspection checklists",
    addType: "Add Equipment Type",
    editType: "Edit Equipment Type",
    name: "System Name",
    nameHint: "Unique identifier (e.g., factory_vehicle)",
    labelEn: "English Label",
    labelPt: "Portuguese Label",
    active: "Active",
    sortOrder: "Sort Order",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    confirmDelete: "Are you sure you want to delete this equipment type? All associated checklist items will also be deleted.",
    checklistItems: "Checklist Items",
    addItem: "Add Checklist Item",
    editItem: "Edit Checklist Item",
    itemKey: "Item Key",
    itemKeyHint: "Unique identifier (e.g., check_engine_oil)",
    section: "Section (Optional)",
    sectionHint: "Group items into sections (e.g., generator, others)",
    sectionLabelEn: "Section Label (EN)",
    sectionLabelPt: "Section Label (PT)",
    noTypes: "No equipment types configured yet",
    noItems: "No checklist items configured yet",
  },
  pt: {
    title: "Tipos de Equipamento",
    subtitle: "Gerir tipos de equipamento e suas listas de inspeção",
    addType: "Adicionar Tipo",
    editType: "Editar Tipo",
    name: "Nome do Sistema",
    nameHint: "Identificador único (ex: veiculo_fabrica)",
    labelEn: "Rótulo em Inglês",
    labelPt: "Rótulo em Português",
    active: "Ativo",
    sortOrder: "Ordem",
    save: "Guardar",
    cancel: "Cancelar",
    delete: "Eliminar",
    confirmDelete: "Tem a certeza que pretende eliminar este tipo de equipamento? Todos os itens da lista de verificação associados também serão eliminados.",
    checklistItems: "Itens da Lista",
    addItem: "Adicionar Item",
    editItem: "Editar Item",
    itemKey: "Chave do Item",
    itemKeyHint: "Identificador único (ex: verificar_oleo_motor)",
    section: "Secção (Opcional)",
    sectionHint: "Agrupar itens em secções (ex: gerador, outros)",
    sectionLabelEn: "Rótulo da Secção (EN)",
    sectionLabelPt: "Rótulo da Secção (PT)",
    noTypes: "Nenhum tipo de equipamento configurado ainda",
    noItems: "Nenhum item da lista de verificação configurado ainda",
  }
};

export default function EquipmentTypes() {
  const { language } = useLanguage();
  const l = labels[language];
  const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<EquipmentType | null>(null);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EquipmentChecklistItem | null>(null);
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);

  const { data: equipmentTypes = [], isLoading } = useQuery<EquipmentType[]>({
    queryKey: ["/api/equipment-types"],
  });

  const typeForm = useForm({
    defaultValues: {
      name: "",
      labelEn: "",
      labelPt: "",
      isActive: true,
      sortOrder: 0,
    }
  });

  const itemForm = useForm({
    defaultValues: {
      equipmentTypeId: 0,
      key: "",
      labelEn: "",
      labelPt: "",
      section: "",
      sectionLabelEn: "",
      sectionLabelPt: "",
      sortOrder: 0,
      isActive: true,
    }
  });

  const createType = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/equipment-types", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment-types"] });
      setIsTypeDialogOpen(false);
      typeForm.reset();
    }
  });

  const updateType = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiRequest("PATCH", `/api/equipment-types/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment-types"] });
      setIsTypeDialogOpen(false);
      setEditingType(null);
      typeForm.reset();
    }
  });

  const deleteType = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/equipment-types/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment-types"] });
    }
  });

  const createItem = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/equipment-checklist-items", data),
    onSuccess: () => {
      if (selectedTypeId) {
        queryClient.invalidateQueries({ queryKey: ["/api/equipment-types", selectedTypeId, "items"] });
      }
      setIsItemDialogOpen(false);
      itemForm.reset();
    }
  });

  const updateItem = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiRequest("PATCH", `/api/equipment-checklist-items/${id}`, data),
    onSuccess: () => {
      if (selectedTypeId) {
        queryClient.invalidateQueries({ queryKey: ["/api/equipment-types", selectedTypeId, "items"] });
      }
      setIsItemDialogOpen(false);
      setEditingItem(null);
      itemForm.reset();
    }
  });

  const deleteItem = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/equipment-checklist-items/${id}`),
    onSuccess: () => {
      if (selectedTypeId) {
        queryClient.invalidateQueries({ queryKey: ["/api/equipment-types", selectedTypeId, "items"] });
      }
    }
  });

  const openEditType = (type: EquipmentType) => {
    setEditingType(type);
    typeForm.reset({
      name: type.name,
      labelEn: type.labelEn,
      labelPt: type.labelPt,
      isActive: type.isActive,
      sortOrder: type.sortOrder,
    });
    setIsTypeDialogOpen(true);
  };

  const openAddType = () => {
    setEditingType(null);
    typeForm.reset({
      name: "",
      labelEn: "",
      labelPt: "",
      isActive: true,
      sortOrder: equipmentTypes.length,
    });
    setIsTypeDialogOpen(true);
  };

  const openAddItem = (typeId: number) => {
    setSelectedTypeId(typeId);
    setEditingItem(null);
    itemForm.reset({
      equipmentTypeId: typeId,
      key: "",
      labelEn: "",
      labelPt: "",
      section: "",
      sectionLabelEn: "",
      sectionLabelPt: "",
      sortOrder: 0,
      isActive: true,
    });
    setIsItemDialogOpen(true);
  };

  const openEditItem = (typeId: number, item: EquipmentChecklistItem) => {
    setSelectedTypeId(typeId);
    setEditingItem(item);
    itemForm.reset({
      equipmentTypeId: item.equipmentTypeId,
      key: item.key,
      labelEn: item.labelEn,
      labelPt: item.labelPt,
      section: item.section || "",
      sectionLabelEn: item.sectionLabelEn || "",
      sectionLabelPt: item.sectionLabelPt || "",
      sortOrder: item.sortOrder,
      isActive: item.isActive,
    });
    setIsItemDialogOpen(true);
  };

  const onTypeSubmit = (data: any) => {
    if (editingType) {
      updateType.mutate({ id: editingType.id, data });
    } else {
      createType.mutate(data);
    }
  };

  const onItemSubmit = (data: any) => {
    const payload = {
      ...data,
      equipmentTypeId: Number(data.equipmentTypeId),
      sortOrder: Number(data.sortOrder),
      section: data.section || null,
      sectionLabelEn: data.sectionLabelEn || null,
      sectionLabelPt: data.sectionLabelPt || null,
    };
    if (editingItem) {
      updateItem.mutate({ id: editingItem.id, data: payload });
    } else {
      createItem.mutate(payload);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight">{l.title}</h1>
          <p className="text-muted-foreground mt-1">{l.subtitle}</p>
        </div>
        
        <Button onClick={openAddType} className="shadow-lg shadow-primary/25" data-testid="button-add-equipment-type">
          <Plus className="w-4 h-4 mr-2" /> {l.addType}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">Loading...</div>
      ) : equipmentTypes.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Settings2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{l.noTypes}</p>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" className="space-y-4">
          {equipmentTypes.map((type) => (
            <EquipmentTypeCard
              key={type.id}
              type={type}
              language={language}
              labels={l}
              onEdit={() => openEditType(type)}
              onDelete={() => deleteType.mutate(type.id)}
              onAddItem={() => openAddItem(type.id)}
              onEditItem={(item) => openEditItem(type.id, item)}
              onDeleteItem={(id) => {
                setSelectedTypeId(type.id);
                deleteItem.mutate(id);
              }}
            />
          ))}
        </Accordion>
      )}

      <Dialog open={isTypeDialogOpen} onOpenChange={setIsTypeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingType ? l.editType : l.addType}</DialogTitle>
          </DialogHeader>
          <Form {...typeForm}>
            <form onSubmit={typeForm.handleSubmit(onTypeSubmit)} className="space-y-4">
              <FormField control={typeForm.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>{l.name}</FormLabel>
                  <FormControl><Input {...field} placeholder="factory_vehicle" data-testid="input-type-name" /></FormControl>
                  <p className="text-xs text-muted-foreground">{l.nameHint}</p>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={typeForm.control} name="labelEn" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{l.labelEn}</FormLabel>
                    <FormControl><Input {...field} placeholder="Factory Vehicle" data-testid="input-type-label-en" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={typeForm.control} name="labelPt" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{l.labelPt}</FormLabel>
                    <FormControl><Input {...field} placeholder="Veículo de Fábrica" data-testid="input-type-label-pt" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={typeForm.control} name="sortOrder" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{l.sortOrder}</FormLabel>
                    <FormControl><Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} data-testid="input-type-sort-order" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={typeForm.control} name="isActive" render={({ field }) => (
                  <FormItem className="flex items-center gap-2 pt-6">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-type-active" />
                    </FormControl>
                    <FormLabel className="!mt-0">{l.active}</FormLabel>
                  </FormItem>
                )} />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsTypeDialogOpen(false)}>{l.cancel}</Button>
                <Button type="submit" disabled={createType.isPending || updateType.isPending} data-testid="button-save-type">{l.save}</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? l.editItem : l.addItem}</DialogTitle>
          </DialogHeader>
          <Form {...itemForm}>
            <form onSubmit={itemForm.handleSubmit(onItemSubmit)} className="space-y-4">
              <FormField control={itemForm.control} name="key" render={({ field }) => (
                <FormItem>
                  <FormLabel>{l.itemKey}</FormLabel>
                  <FormControl><Input {...field} placeholder="check_engine_oil" data-testid="input-item-key" /></FormControl>
                  <p className="text-xs text-muted-foreground">{l.itemKeyHint}</p>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={itemForm.control} name="labelEn" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{l.labelEn}</FormLabel>
                    <FormControl><Input {...field} placeholder="Check engine oil" data-testid="input-item-label-en" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={itemForm.control} name="labelPt" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{l.labelPt}</FormLabel>
                    <FormControl><Input {...field} placeholder="Verificar óleo do motor" data-testid="input-item-label-pt" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={itemForm.control} name="section" render={({ field }) => (
                <FormItem>
                  <FormLabel>{l.section}</FormLabel>
                  <FormControl><Input {...field} placeholder="generator" data-testid="input-item-section" /></FormControl>
                  <p className="text-xs text-muted-foreground">{l.sectionHint}</p>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={itemForm.control} name="sectionLabelEn" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{l.sectionLabelEn}</FormLabel>
                    <FormControl><Input {...field} placeholder="GENERATOR" data-testid="input-item-section-label-en" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={itemForm.control} name="sectionLabelPt" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{l.sectionLabelPt}</FormLabel>
                    <FormControl><Input {...field} placeholder="GERADOR" data-testid="input-item-section-label-pt" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={itemForm.control} name="sortOrder" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{l.sortOrder}</FormLabel>
                    <FormControl><Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} data-testid="input-item-sort-order" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={itemForm.control} name="isActive" render={({ field }) => (
                  <FormItem className="flex items-center gap-2 pt-6">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-item-active" />
                    </FormControl>
                    <FormLabel className="!mt-0">{l.active}</FormLabel>
                  </FormItem>
                )} />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsItemDialogOpen(false)}>{l.cancel}</Button>
                <Button type="submit" disabled={createItem.isPending || updateItem.isPending} data-testid="button-save-item">{l.save}</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EquipmentTypeCard({
  type,
  language,
  labels: l,
  onEdit,
  onDelete,
  onAddItem,
  onEditItem,
  onDeleteItem,
}: {
  type: EquipmentType;
  language: "en" | "pt";
  labels: typeof labels.en;
  onEdit: () => void;
  onDelete: () => void;
  onAddItem: () => void;
  onEditItem: (item: EquipmentChecklistItem) => void;
  onDeleteItem: (id: number) => void;
}) {
  const { data: items = [] } = useQuery<EquipmentChecklistItem[]>({
    queryKey: ["/api/equipment-types", type.id, "items"],
    queryFn: async () => {
      const res = await fetch(`/api/equipment-types/${type.id}/items`);
      if (!res.ok) throw new Error("Failed to fetch items");
      return res.json();
    },
  });

  const groupedItems = items.reduce((acc, item) => {
    const section = item.section || "_none";
    if (!acc[section]) acc[section] = [];
    acc[section].push(item);
    return acc;
  }, {} as Record<string, EquipmentChecklistItem[]>);

  return (
    <AccordionItem value={String(type.id)} className="border rounded-lg">
      <AccordionTrigger className="px-4 hover:no-underline">
        <div className="flex items-center gap-4 flex-1">
          <Settings2 className="w-5 h-5 text-muted-foreground" />
          <div className="text-left">
            <div className="font-semibold flex items-center gap-2">
              {language === "en" ? type.labelEn : type.labelPt}
              {!type.isActive && <Badge variant="outline" className="text-xs">Inactive</Badge>}
            </div>
            <div className="text-sm text-muted-foreground">{type.name} • {items.length} items</div>
          </div>
        </div>
        <div className="flex items-center gap-2 mr-4" onClick={(e) => e.stopPropagation()}>
          <Button size="icon" variant="ghost" onClick={onEdit} data-testid={`button-edit-type-${type.id}`}>
            <Edit2 className="w-4 h-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="icon" variant="ghost" className="text-destructive" data-testid={`button-delete-type-${type.id}`}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{l.delete}</AlertDialogTitle>
                <AlertDialogDescription>{l.confirmDelete}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{l.cancel}</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground">{l.delete}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium flex items-center gap-2">
            <ListChecks className="w-4 h-4" /> {l.checklistItems}
          </h4>
          <Button size="sm" variant="outline" onClick={onAddItem} data-testid={`button-add-item-${type.id}`}>
            <Plus className="w-4 h-4 mr-1" /> {l.addItem}
          </Button>
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">{l.noItems}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30%]">Key</TableHead>
                <TableHead>Label (EN)</TableHead>
                <TableHead>Label (PT)</TableHead>
                <TableHead className="w-[100px]">Section</TableHead>
                <TableHead className="w-[60px]">Order</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">{item.key}</TableCell>
                  <TableCell className="text-sm">{item.labelEn}</TableCell>
                  <TableCell className="text-sm">{item.labelPt}</TableCell>
                  <TableCell>
                    {item.section && <Badge variant="outline" className="text-xs">{item.section}</Badge>}
                  </TableCell>
                  <TableCell className="text-center">{item.sortOrder}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEditItem(item)} data-testid={`button-edit-item-${item.id}`}>
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => onDeleteItem(item.id)} data-testid={`button-delete-item-${item.id}`}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}
