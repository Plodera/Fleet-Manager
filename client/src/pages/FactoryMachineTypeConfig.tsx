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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2, Plus, Factory } from "lucide-react";
import { insertFactoryMachineTypeSchema } from "@shared/schema";

type MachineType = { id: number; name: string; description: string | null; isActive: boolean };

const formSchema = insertFactoryMachineTypeSchema.extend({
  name: z.string().min(1, "Type name is required"),
});

export default function FactoryMachineTypeConfig() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const fm = t.factoryMachines;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<MachineType | null>(null);

  const { data: types = [], isLoading } = useQuery<MachineType[]>({
    queryKey: ["/api/factory-machine-types"],
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
                <TableHead>{fm.isActive}</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {types.map((type) => (
                <TableRow key={type.id} data-testid={`row-machine-type-${type.id}`}>
                  <TableCell className="font-medium">{type.name}</TableCell>
                  <TableCell className="text-muted-foreground">{type.description || "—"}</TableCell>
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
              ))}
            </TableBody>
          </Table>
        )}
      </div>

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
                  <FormMessage />
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
    </>
  );
}
