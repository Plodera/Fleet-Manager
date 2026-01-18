import { useState, useEffect } from "react";
import { useVehicles } from "@/hooks/use-vehicles";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertVehicleSchema, type Vehicle } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Car, Gauge, Calendar, Pencil, Image, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/lib/i18n";

export default function Vehicles() {
  const { vehicles, isLoading, createVehicle, updateVehicle, deleteVehicle } = useVehicles();
  const { user } = useAuth();
  const { t } = useLanguage();
  const isAdmin = user?.role === 'admin';
  const canManageAvailability = isAdmin || user?.isApprover;
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const filteredVehicles = vehicles?.filter(v => 
    v.make.toLowerCase().includes(search.toLowerCase()) || 
    v.model.toLowerCase().includes(search.toLowerCase()) ||
    v.licensePlate.toLowerCase().includes(search.toLowerCase())
  );

  const form = useForm({
    resolver: zodResolver(insertVehicleSchema),
    defaultValues: {
      make: "",
      model: "",
      year: new Date().getFullYear(),
      licensePlate: "",
      vin: "",
      currentMileage: 0,
      status: "available" as const,
      imageUrl: "",
      category: "car" as const,
      capacity: 5
    }
  });

  const onSubmit = (data: any) => {
    createVehicle.mutate(data, {
      onSuccess: () => {
        setIsDialogOpen(false);
        form.reset();
      }
    });
  };

  const editForm = useForm({
    resolver: zodResolver(insertVehicleSchema),
    defaultValues: {
      make: "",
      model: "",
      year: new Date().getFullYear(),
      licensePlate: "",
      vin: "",
      currentMileage: 0,
      status: "available" as const,
      imageUrl: "",
      category: "car" as const,
      capacity: 5
    }
  });

  useEffect(() => {
    if (editingVehicle) {
      editForm.reset({
        make: editingVehicle.make,
        model: editingVehicle.model,
        year: editingVehicle.year,
        licensePlate: editingVehicle.licensePlate,
        vin: editingVehicle.vin,
        currentMileage: editingVehicle.currentMileage,
        status: editingVehicle.status as any,
        imageUrl: editingVehicle.imageUrl || "",
        category: (editingVehicle as any).category || "car",
        capacity: (editingVehicle as any).capacity || 5
      });
    }
  }, [editingVehicle, editForm]);

  const onEditSubmit = (data: any) => {
    if (!editingVehicle) return;
    updateVehicle.mutate({ id: editingVehicle.id, ...data }, {
      onSuccess: () => {
        setIsEditDialogOpen(false);
        setEditingVehicle(null);
        editForm.reset();
      }
    });
  };

  const openEditDialog = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setIsEditDialogOpen(true);
  };

  const statusColors: Record<string, string> = {
    available: "bg-green-100 text-green-700 hover:bg-green-100/80 border-green-200",
    in_use: "bg-blue-100 text-blue-700 hover:bg-blue-100/80 border-blue-200",
    maintenance: "bg-amber-100 text-amber-700 hover:bg-amber-100/80 border-amber-200",
    unavailable: "bg-gray-100 text-gray-700 hover:bg-gray-100/80 border-gray-200"
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight">Vehicle Management</h1>
          <p className="text-muted-foreground mt-1">Manage vehicles, track status, and view history.</p>
        </div>
        
        {isAdmin && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all">
              <Plus className="w-4 h-4 mr-2" /> Add Vehicle
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Vehicle</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="make" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Make</FormLabel>
                      <FormControl><Input placeholder="Toyota" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="model" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model</FormLabel>
                      <FormControl><Input placeholder="Camry" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="year" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Year</FormLabel>
                      <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="currentMileage" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mileage</FormLabel>
                      <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="licensePlate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>License Plate</FormLabel>
                    <FormControl><Input placeholder="ABC-1234" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="vin" render={({ field }) => (
                  <FormItem>
                    <FormLabel>VIN</FormLabel>
                    <FormControl><Input placeholder="Unique VIN..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="car">Car (1-5 seats)</SelectItem>
                          <SelectItem value="van">Van (6-14 seats)</SelectItem>
                          <SelectItem value="bus">Bus (15+ seats)</SelectItem>
                          <SelectItem value="truck">Truck</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="capacity" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Passenger Capacity</FormLabel>
                      <FormControl><Input type="number" min="1" {...field} onChange={e => field.onChange(parseInt(e.target.value))} data-testid="input-capacity" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="in_use">In Use</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="unavailable">Unavailable</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="imageUrl" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL (optional)</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Image className="w-4 h-4 mt-3 text-muted-foreground" />
                        <Input placeholder="https://example.com/car-image.jpg" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={createVehicle.isPending}>
                    {createVehicle.isPending ? "Adding..." : "Add Vehicle"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        )}
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) setEditingVehicle(null);
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Vehicle</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={editForm.control} name="make" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Make</FormLabel>
                    <FormControl><Input placeholder="Toyota" {...field} data-testid="input-edit-make" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={editForm.control} name="model" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model</FormLabel>
                    <FormControl><Input placeholder="Camry" {...field} data-testid="input-edit-model" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField control={editForm.control} name="year" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year</FormLabel>
                    <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} data-testid="input-edit-year" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={editForm.control} name="currentMileage" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mileage</FormLabel>
                    <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} data-testid="input-edit-mileage" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={editForm.control} name="licensePlate" render={({ field }) => (
                <FormItem>
                  <FormLabel>License Plate</FormLabel>
                  <FormControl><Input placeholder="ABC-1234" {...field} data-testid="input-edit-plate" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={editForm.control} name="vin" render={({ field }) => (
                <FormItem>
                  <FormLabel>VIN</FormLabel>
                  <FormControl><Input placeholder="Unique VIN..." {...field} data-testid="input-edit-vin" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={editForm.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="car">Car (1-5 seats)</SelectItem>
                        <SelectItem value="van">Van (6-14 seats)</SelectItem>
                        <SelectItem value="bus">Bus (15+ seats)</SelectItem>
                        <SelectItem value="truck">Truck</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={editForm.control} name="capacity" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Passenger Capacity</FormLabel>
                    <FormControl><Input type="number" min="1" {...field} onChange={e => field.onChange(parseInt(e.target.value))} data-testid="input-edit-capacity" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={editForm.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-edit-status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="in_use">In Use</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="unavailable">Unavailable</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={editForm.control} name="imageUrl" render={({ field }) => (
                <FormItem>
                  <FormLabel>Image URL (optional)</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Image className="w-4 h-4 mt-3 text-muted-foreground" />
                      <Input placeholder="https://example.com/car-image.jpg" {...field} data-testid="input-edit-imageUrl" />
                    </div>
                  </FormControl>
                  {field.value && (
                    <div className="mt-2 rounded-md overflow-hidden border h-24">
                      <img src={field.value} alt="Preview" className="w-full h-full object-cover" onError={(e) => e.currentTarget.style.display = 'none'} />
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )} />

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateVehicle.isPending} data-testid="button-save-vehicle">
                  {updateVehicle.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          className="pl-10 max-w-sm bg-white" 
          placeholder="Search by make, model, or plate..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <Skeleton key={i} className="h-[280px] rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVehicles?.map((vehicle) => (
            <Card key={vehicle.id} className="group overflow-hidden border-none shadow-md hover:shadow-xl transition-all duration-300" data-testid={`card-vehicle-${vehicle.id}`}>
              <div className="h-40 bg-gradient-to-br from-slate-100 to-slate-200 relative overflow-hidden flex items-center justify-center">
                <img 
                  src={vehicle.imageUrl || `https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80`} 
                  alt={`${vehicle.make} ${vehicle.model}`}
                  className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500"
                />
                <Badge className={`absolute top-4 right-4 shadow-sm ${statusColors[vehicle.status] || statusColors.available}`}>
                  {t.status[vehicle.status as keyof typeof t.status] || vehicle.status}
                </Badge>
              </div>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-foreground">{vehicle.make} {vehicle.model}</h3>
                    <p className="text-sm text-muted-foreground font-mono mt-1">{vehicle.licensePlate}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-primary">{vehicle.year}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Gauge className="w-4 h-4" />
                    <span>{vehicle.currentMileage.toLocaleString()} mi</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    <span>{(vehicle as any).capacity || 5} seats</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Car className="w-4 h-4" />
                    <span className="capitalize">{(vehicle as any).category || 'car'}</span>
                  </div>
                </div>
              </CardContent>
              {(isAdmin || canManageAvailability) && (
              <CardFooter className="p-6 pt-0 flex gap-2">
                {canManageAvailability && vehicle.status !== 'in_use' && vehicle.status !== 'maintenance' && (
                  <Button 
                    variant={vehicle.status === 'available' ? 'destructive' : 'default'}
                    className="flex-1"
                    onClick={() => {
                      const newStatus = vehicle.status === 'available' ? 'unavailable' : 'available';
                      updateVehicle.mutate({ id: vehicle.id, status: newStatus });
                    }}
                    data-testid={`button-toggle-availability-${vehicle.id}`}
                  >
                    {vehicle.status === 'available' ? 'Mark Unavailable' : 'Mark Available'}
                  </Button>
                )}
                {isAdmin && (
                  <>
                    <Button variant="outline" onClick={() => {
                      if(confirm("Delete this vehicle?")) deleteVehicle.mutate(vehicle.id);
                    }} data-testid={`button-delete-vehicle-${vehicle.id}`}>
                      Delete
                    </Button>
                    <Button variant="outline" onClick={() => openEditDialog(vehicle)} data-testid={`button-edit-vehicle-${vehicle.id}`}>
                      <Pencil className="w-4 h-4 mr-2" /> Edit
                    </Button>
                  </>
                )}
              </CardFooter>
              )}
            </Card>
          ))}
          
          {filteredVehicles?.length === 0 && (
            <div className="col-span-full text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Car className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground">No vehicles found</h3>
              <p className="text-muted-foreground">Try adjusting your search terms.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
