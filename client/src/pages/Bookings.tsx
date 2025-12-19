import { useState } from "react";
import { useBookings } from "@/hooks/use-bookings";
import { useVehicles } from "@/hooks/use-vehicles";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertBookingSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Check, X, Clock, MapPin } from "lucide-react";
import { format } from "date-fns";

export default function Bookings() {
  const { bookings, isLoading, createBooking, updateBookingStatus } = useBookings();
  const { vehicles } = useVehicles();
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Filter available vehicles
  const availableVehicles = vehicles?.filter(v => v.status === "available");

  const form = useForm({
    resolver: zodResolver(insertBookingSchema),
    defaultValues: {
      userId: user?.id,
      vehicleId: undefined,
      startTime: "",
      endTime: "",
      purpose: "",
      destination: "",
      status: "pending"
    }
  });

  const onSubmit = (data: any) => {
    // Need to ensure dates are properly ISO formatted strings for the API schema
    const payload = {
      ...data,
      userId: user?.id, // Ensure current user ID is used
      startTime: new Date(data.startTime).toISOString(),
      endTime: new Date(data.endTime).toISOString(),
    };
    
    createBooking.mutate(payload, {
      onSuccess: () => {
        setIsDialogOpen(false);
        form.reset();
      }
    });
  };

  const selectedVehicleId = form.watch('vehicleId');
  const selectedVehicle = selectedVehicleId ? vehicles?.find(v => v.id === Number(selectedVehicleId)) : null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">Approved</Badge>;
      case 'pending': return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-yellow-200">Pending</Badge>;
      case 'rejected': return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200">Rejected</Badge>;
      case 'completed': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200">Completed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight">Bookings</h1>
          <p className="text-muted-foreground mt-1">Manage reservations and requests.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-lg shadow-primary/25">New Booking</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Vehicle</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="vehicleId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Vehicle</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value ? String(field.value) : undefined}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose an available vehicle" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableVehicles?.map(v => (
                          <SelectItem key={v.id} value={String(v.id)}>
                            {v.make} {v.model} ({v.licensePlate})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                {selectedVehicle && (
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-sm font-medium text-muted-foreground">Current Mileage</p>
                    <p className="text-lg font-semibold">{selectedVehicle.currentMileage?.toLocaleString() || 0} miles</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="startTime" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="endTime" render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="destination" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destination</FormLabel>
                    <FormControl><Input placeholder="City, Location..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="purpose" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purpose</FormLabel>
                    <FormControl><Input placeholder="Client meeting, Delivery..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <Button type="submit" className="w-full" disabled={createBooking.isPending}>
                  {createBooking.isPending ? "Submitting..." : "Submit Request"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}
          </div>
        ) : bookings?.map((booking) => (
          <Card key={booking.id} className="border-none shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <CalendarDays className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-lg">{booking.vehicle.make} {booking.vehicle.model}</h3>
                    {getStatusBadge(booking.status)}
                  </div>
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      <span>
                        {format(new Date(booking.startTime), "MMM d, h:mm a")} - {format(new Date(booking.endTime), "MMM d, h:mm a")}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" />
                      <span>{booking.destination || "Local"}</span>
                    </div>
                    <div className="hidden sm:inline text-muted-foreground/50">|</div>
                    <div>Requested by: <span className="text-foreground font-medium">{booking.user.fullName}</span></div>
                  </div>
                </div>
              </div>

              {/* Admin Actions */}
              {user?.role === 'admin' && booking.status === 'pending' && (
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="border-green-200 hover:bg-green-50 text-green-700"
                    onClick={() => updateBookingStatus.mutate({ id: booking.id, status: 'approved' })}
                  >
                    <Check className="w-4 h-4 mr-1" /> Approve
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="border-red-200 hover:bg-red-50 text-red-700"
                    onClick={() => updateBookingStatus.mutate({ id: booking.id, status: 'rejected' })}
                  >
                    <X className="w-4 h-4 mr-1" /> Reject
                  </Button>
                </div>
              )}
              
              {/* Actions for active bookings */}
              {user?.role === 'admin' && booking.status === 'approved' && (
                <Button 
                  size="sm"
                  onClick={() => updateBookingStatus.mutate({ id: booking.id, status: 'completed' })}
                >
                  Mark Completed
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
        
        {bookings?.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No booking records found.
          </div>
        )}
      </div>
    </div>
  );
}
