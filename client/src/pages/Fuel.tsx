import { useState } from "react";
import { useFuel as useFuelHook } from "@/hooks/use-records";
import { useVehicles } from "@/hooks/use-vehicles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertFuelSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Fuel as FuelIcon, Plus } from "lucide-react";
import { format } from "date-fns";

export default function Fuel() {
  const { records, createRecord, isLoading } = useFuelHook();
  const { vehicles } = useVehicles();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm({
    resolver: zodResolver(insertFuelSchema),
    defaultValues: {
      vehicleId: undefined,
      date: new Date().toISOString().split('T')[0],
      gallons: 0,
      pricePerGallon: 0,
      totalCost: 0,
      mileage: 0
    }
  });

  const onSubmit = (data: any) => {
    // Calculate total cost automatically if user didn't enter it, or trust user input?
    // Let's ensure types are correct.
    const payload = {
      ...data,
      vehicleId: Number(data.vehicleId),
      gallons: Number(data.gallons),
      pricePerGallon: Number(data.pricePerGallon),
      totalCost: Number(data.totalCost) || (Number(data.gallons) * Number(data.pricePerGallon)),
      mileage: Number(data.mileage),
    };
    
    createRecord.mutate(payload, {
      onSuccess: () => {
        setIsDialogOpen(false);
        form.reset();
      }
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight">Fuel Log</h1>
          <p className="text-muted-foreground mt-1">Monitor fuel consumption and expenses.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-lg shadow-primary/25">
              <Plus className="w-4 h-4 mr-2" /> Log Fuel
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Fuel Entry</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="vehicleId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehicle</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value ? String(field.value) : undefined}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select vehicle" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vehicles?.map(v => (
                          <SelectItem key={v.id} value={String(v.id)}>
                            {v.make} {v.model} ({v.licensePlate})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="gallons" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Litres</FormLabel>
                      <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="pricePerGallon" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price/L (Kz)</FormLabel>
                      <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="totalCost" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Cost (Kz)</FormLabel>
                      <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="mileage" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Odometer</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <Button type="submit" className="w-full" disabled={createRecord.isPending}>
                  {createRecord.isPending ? "Saving..." : "Save Entry"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-md overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Litres</TableHead>
              <TableHead>Price/L</TableHead>
              <TableHead>Odometer</TableHead>
              <TableHead className="text-right">Total Cost</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
               <TableRow>
                 <TableCell colSpan={6} className="h-24 text-center">Loading...</TableCell>
               </TableRow>
            ) : records?.map((record) => (
              <TableRow key={record.id} className="hover:bg-muted/20">
                <TableCell className="font-medium">{format(new Date(record.date), 'MMM d, yyyy')}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{record.vehicle.make} {record.vehicle.model}</span>
                    <span className="text-xs text-muted-foreground">{record.vehicle.licensePlate}</span>
                  </div>
                </TableCell>
                <TableCell>{Number(record.gallons).toFixed(1)} L</TableCell>
                <TableCell>Kz {Number(record.pricePerGallon).toFixed(2)}</TableCell>
                <TableCell>{record.mileage.toLocaleString()}</TableCell>
                <TableCell className="text-right font-medium text-foreground">Kz {Number(record.totalCost).toFixed(2)}</TableCell>
              </TableRow>
            ))}
            {records?.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No fuel records found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
