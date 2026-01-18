import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, MapPin, Calendar, Clock, Car, Plus, UserPlus, Check, Trash2, CheckCircle, Play, Printer } from "lucide-react";
import { format } from "date-fns";
import { api } from "@shared/routes";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import { z } from "zod";

const joinTripSchema = z.object({
  passengerCount: z.coerce.number().min(1, "At least 1 passenger required"),
  purpose: z.string().min(1, "Purpose is required"),
  passengerName: z.string().min(1, "Name is required"),
  passengerPhone: z.string().min(1, "Phone number is required"),
});

const createTripSchema = z.object({
  vehicleId: z.coerce.number().positive("Vehicle is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  destination: z.string().min(1, "Destination is required"),
  notes: z.string().optional(),
});

export default function SharedRides() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);

  const { data: sharedTrips, isLoading } = useQuery({
    queryKey: [api.sharedTrips.list.path],
    queryFn: async () => {
      const res = await fetch(api.sharedTrips.list.path);
      if (!res.ok) throw new Error("Failed to fetch shared trips");
      return res.json();
    },
  });

  const { data: allBookings } = useQuery({
    queryKey: ['/api/bookings'],
    queryFn: async () => {
      const res = await fetch('/api/bookings');
      if (!res.ok) throw new Error("Failed to fetch bookings");
      return res.json();
    },
  });

  const { data: vehicles } = useQuery({
    queryKey: [api.vehicles.list.path],
    queryFn: async () => {
      const res = await fetch(api.vehicles.list.path);
      if (!res.ok) throw new Error("Failed to fetch vehicles");
      return res.json();
    },
  });

  const largeVehicles = vehicles?.filter((v: any) => v.capacity > 5 && v.status === 'available') || [];

  const joinForm = useForm({
    resolver: zodResolver(joinTripSchema),
    defaultValues: {
      passengerCount: 1,
      purpose: "",
      passengerName: "",
      passengerPhone: "",
    },
  });

  const createForm = useForm({
    resolver: zodResolver(createTripSchema),
    defaultValues: {
      vehicleId: undefined,
      startTime: "",
      endTime: "",
      destination: "",
      notes: "",
    },
  });

  const joinTrip = useMutation({
    mutationFn: async (data: { tripId: number; passengerCount: number; purpose: string; passengerName: string; passengerPhone: string }) => {
      return apiRequest("POST", `/api/shared-trips/${data.tripId}/join`, {
        passengerCount: data.passengerCount,
        purpose: data.purpose,
        passengerName: data.passengerName,
        passengerPhone: data.passengerPhone,
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "You have joined the shared trip!" });
      queryClient.invalidateQueries({ queryKey: [api.sharedTrips.list.path] });
      setJoinDialogOpen(false);
      joinForm.reset();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createTrip = useMutation({
    mutationFn: async (data: any) => {
      // Only send fields the user controls - server derives capacity/approver/etc
      return apiRequest("POST", api.sharedTrips.create.path, {
        vehicleId: data.vehicleId,
        startTime: new Date(data.startTime).toISOString(),
        endTime: new Date(data.endTime).toISOString(),
        destination: data.destination,
        notes: data.notes || null,
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Shared trip created!" });
      queryClient.invalidateQueries({ queryKey: [api.sharedTrips.list.path] });
      setCreateDialogOpen(false);
      createForm.reset();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteTrip = useMutation({
    mutationFn: async (tripId: number) => {
      return apiRequest("DELETE", `/api/shared-trips/${tripId}`);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Shared trip deleted" });
      queryClient.invalidateQueries({ queryKey: [api.sharedTrips.list.path] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const startTrip = useMutation({
    mutationFn: async (tripId: number) => {
      return apiRequest("PUT", `/api/shared-trips/${tripId}/status`, { status: 'in_progress' });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Trip started" });
      queryClient.invalidateQueries({ queryKey: [api.sharedTrips.list.path] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const endTrip = useMutation({
    mutationFn: async (tripId: number) => {
      return apiRequest("PUT", `/api/shared-trips/${tripId}/status`, { status: 'completed' });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Trip marked as completed" });
      queryClient.invalidateQueries({ queryKey: [api.sharedTrips.list.path] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleJoinClick = (trip: any) => {
    setSelectedTrip(trip);
    joinForm.reset({ passengerCount: 1, purpose: "" });
    setJoinDialogOpen(true);
  };

  const onJoinSubmit = (data: any) => {
    if (selectedTrip) {
      joinTrip.mutate({ tripId: selectedTrip.id, ...data });
    }
  };

  const onCreateSubmit = (data: any) => {
    console.log("Form data being submitted:", data, "vehicleId type:", typeof data.vehicleId);
    createTrip.mutate(data);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open': return <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">{t.status.open}</Badge>;
      case 'full': return <Badge className="bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800">{t.status.full}</Badge>;
      case 'in_progress': return <Badge className="bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800">{t.status.in_progress}</Badge>;
      case 'completed': return <Badge className="bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800">{t.status.completed}</Badge>;
      case 'cancelled': return <Badge className="bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">{t.status.cancelled}</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const SeatVisualization = ({ total, passengers }: { total: number; passengers: any[] }) => {
    const seats = [];
    
    // Build a flat array mapping each seat to its passenger
    const seatAssignments: { passengerName: string }[] = [];
    for (const p of passengers) {
      const count = p.booking.passengerCount || 1;
      for (let j = 0; j < count; j++) {
        seatAssignments.push({ passengerName: p.user.fullName });
      }
    }
    
    for (let i = 0; i < total; i++) {
      const assignment = seatAssignments[i];
      const isOccupied = !!assignment;
      
      seats.push(
        <div
          key={i}
          className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-medium transition-colors ${
            isOccupied 
              ? 'bg-primary/20 text-primary border border-primary/30' 
              : 'bg-muted text-muted-foreground border border-border hover:bg-accent'
          }`}
          title={isOccupied ? assignment.passengerName : 'Available seat'}
          data-testid={`seat-${i}-${isOccupied ? 'occupied' : 'available'}`}
        >
          {isOccupied ? <Check className="w-4 h-4" /> : i + 1}
        </div>
      );
    }
    
    return (
      <div className="flex flex-wrap gap-1.5" data-testid="seat-visualization">
        {seats}
      </div>
    );
  };

  const canCreateTrip = user?.isApprover || user?.role === 'admin';

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight">{t.sharedRides.title}</h1>
          <p className="text-muted-foreground mt-1">{t.sharedRides.subtitle}</p>
        </div>
        
        {canCreateTrip && (
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-lg shadow-primary/25" data-testid="button-create-shared-trip">
                <Plus className="w-4 h-4 mr-2" />
                {t.sharedRides.createSharedTrip}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t.sharedRides.createSharedTrip}</DialogTitle>
                <DialogDescription>
                  {t.sharedRides.createDescription}
                </DialogDescription>
              </DialogHeader>
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                  <FormField control={createForm.control} name="vehicleId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.sharedRides.vehicleLarge}</FormLabel>
                      <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value ? String(field.value) : undefined}>
                        <FormControl>
                          <SelectTrigger data-testid="select-vehicle">
                            <SelectValue placeholder={t.sharedRides.chooseLargeVehicle} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {largeVehicles.map((v: any) => (
                            <SelectItem key={v.id} value={String(v.id)}>
                              {v.make} {v.model} ({v.licensePlate}) - {v.capacity} {t.vehicles.seats}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={createForm.control} name="startTime" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.sharedRides.departureTime}</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} data-testid="input-start-time" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={createForm.control} name="endTime" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.sharedRides.returnTime}</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} data-testid="input-end-time" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <FormField control={createForm.control} name="destination" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.sharedRides.destination}</FormLabel>
                      <FormControl>
                        <Input placeholder={t.sharedRides.destinationPlaceholder} {...field} data-testid="input-destination" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={createForm.control} name="notes" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.sharedRides.notesOptional}</FormLabel>
                      <FormControl>
                        <Input placeholder={t.sharedRides.notesPlaceholder} {...field} data-testid="input-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <Button type="submit" className="w-full" disabled={createTrip.isPending} data-testid="button-submit-create">
                    {createTrip.isPending ? t.sharedRides.creating : t.sharedRides.createSharedTrip}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              {t.sharedRides.joinSharedTrip}
            </DialogTitle>
            <DialogDescription>
              {selectedTrip && (
                <span>
                  {t.sharedRides.joinTripTo} {selectedTrip.destination} {t.sharedRides.on} {format(new Date(selectedTrip.startTime), 'MMM dd, yyyy')}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <Form {...joinForm}>
            <form onSubmit={joinForm.handleSubmit(onJoinSubmit)} className="space-y-4">
              {selectedTrip && (
                <div className="bg-muted p-3 rounded-md space-y-2">
                  <p className="text-sm">
                    <span className="font-medium">{t.sharedRides.availableSeats}:</span>{" "}
                    {selectedTrip.totalCapacity - selectedTrip.reservedSeats} {t.sharedRides.of} {selectedTrip.totalCapacity}
                  </p>
                </div>
              )}
              
              <FormField control={joinForm.control} name="passengerCount" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.sharedRides.seatsNeeded}</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="1" 
                      max={selectedTrip ? selectedTrip.totalCapacity - selectedTrip.reservedSeats : 1}
                      {...field}
                      data-testid="input-passenger-count"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={joinForm.control} name="purpose" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.sharedRides.purposeOfTravel}</FormLabel>
                  <FormControl>
                    <Input placeholder={t.sharedRides.purposePlaceholder} {...field} data-testid="input-purpose" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={joinForm.control} name="passengerName" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.sharedRides.yourName}</FormLabel>
                  <FormControl>
                    <Input placeholder={t.sharedRides.fullName} {...field} data-testid="input-passenger-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={joinForm.control} name="passengerPhone" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.sharedRides.phoneNumber}</FormLabel>
                  <FormControl>
                    <Input placeholder="+244 XXX XXX XXX" {...field} data-testid="input-passenger-phone" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setJoinDialogOpen(false)} data-testid="button-cancel-join">
                  {t.buttons.cancel}
                </Button>
                <Button type="submit" disabled={joinTrip.isPending} data-testid="button-confirm-join">
                  {joinTrip.isPending ? t.sharedRides.joining : t.buttons.joinTrip}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="h-64 bg-muted animate-pulse rounded-xl" />
          ))
        ) : sharedTrips?.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">{t.sharedRides.noSharedTrips}</h3>
            <p className="text-muted-foreground">
              {canCreateTrip ? t.sharedRides.createToStart : t.sharedRides.checkBackLater}
            </p>
          </div>
        ) : sharedTrips?.map((trip: any) => {
          const availableSeats = trip.totalCapacity - trip.reservedSeats;
          const isOpen = trip.status === 'open' && availableSeats > 0;
          const alreadyJoined = trip.passengers?.some((p: any) => p.user.id === user?.id);

          return (
            <Card key={trip.id} className="border-none shadow-sm hover:shadow-md transition-shadow" data-testid={`card-shared-trip-${trip.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Car className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{trip.vehicle.make} {trip.vehicle.model}</CardTitle>
                      <p className="text-xs text-muted-foreground">{trip.vehicle.licensePlate}</p>
                    </div>
                  </div>
                  {getStatusBadge(trip.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{trip.destination || t.sharedRides.noDestination}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>{format(new Date(trip.startTime), 'MMM dd, yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>{format(new Date(trip.startTime), 'HH:mm')} - {format(new Date(trip.endTime), 'HH:mm')}</span>
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      {t.sharedRides.seats}
                    </span>
                    <span className="text-sm">
                      <span className="font-semibold text-primary">{availableSeats}</span>
                      <span className="text-muted-foreground"> {t.sharedRides.of} {trip.totalCapacity} {t.sharedRides.available}</span>
                    </span>
                  </div>
                  <SeatVisualization 
                    total={trip.totalCapacity} 
                    passengers={trip.passengers || []}
                  />
                </div>

                {trip.passengers?.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-1.5">{t.sharedRides.passengers}:</p>
                    <div className="flex flex-wrap gap-1">
                      {trip.passengers.map((p: any, idx: number) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {p.user.fullName} ({p.booking.passengerCount})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {trip.notes && (
                  <p className="text-xs text-muted-foreground italic">{trip.notes}</p>
                )}

                <div className="pt-2 space-y-2">
                  {alreadyJoined ? (
                    <Badge className="w-full justify-center py-2 bg-green-100 text-green-700 border-green-200">
                      <Check className="w-4 h-4 mr-1" /> {t.bookings.youreOnThisTrip}
                    </Badge>
                  ) : isOpen ? (
                    <Button 
                      className="w-full" 
                      onClick={() => handleJoinClick(trip)}
                      data-testid={`button-join-trip-${trip.id}`}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      {t.buttons.joinTrip} ({availableSeats} {t.sharedRides.seatsLeft})
                    </Button>
                  ) : (
                    <Button className="w-full" disabled variant="secondary">
                      {trip.status === 'full' ? t.status.full : trip.status === 'completed' ? t.status.completed : t.status.unavailable}
                    </Button>
                  )}
                  
                  {trip.status !== 'completed' && trip.status !== 'cancelled' && (() => {
                    const tripBookings = allBookings?.filter((b: any) => b.sharedTripId === trip.id) || [];
                    const isDriver = tripBookings.some((b: any) => b.driverId === user?.id);
                    const canManageTrip = user?.role === 'admin' || user?.isApprover || isDriver;
                    // Drivers cannot delete - only admins and approvers who are NOT drivers
                    const canDelete = (user?.role === 'admin' || user?.isApprover) && !user?.isDriver;
                    
                    if (!canManageTrip && !canDelete) return null;
                    
                    return (
                      <div className="flex gap-2">
                        {canManageTrip && (trip.status === 'open' || trip.status === 'full') && (
                          <Button 
                            variant="default" 
                            size="sm"
                            className="flex-1"
                            onClick={() => startTrip.mutate(trip.id)}
                            disabled={startTrip.isPending}
                            data-testid={`button-start-trip-${trip.id}`}
                          >
                            <Play className="w-4 h-4 mr-1" />
                            {t.buttons.startTrip}
                          </Button>
                        )}
                        {canManageTrip && trip.status === 'in_progress' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="flex-1"
                            onClick={() => endTrip.mutate(trip.id)}
                            disabled={endTrip.isPending}
                            data-testid={`button-end-trip-${trip.id}`}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            {t.buttons.endTrip}
                          </Button>
                        )}
                        {canDelete && (
                          <Button 
                            variant="destructive" 
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this trip? This will also remove all bookings.')) {
                                deleteTrip.mutate(trip.id);
                              }
                            }}
                            disabled={deleteTrip.isPending}
                            data-testid={`button-delete-trip-${trip.id}`}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            {t.buttons.delete}
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="flex-1"
                          onClick={() => window.open(`/shared-rides/${trip.id}/print`, '_blank')}
                          data-testid={`button-print-trip-${trip.id}`}
                        >
                          <Printer className="w-4 h-4 mr-1" />
                          {t.buttons.export}
                        </Button>
                      </div>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
