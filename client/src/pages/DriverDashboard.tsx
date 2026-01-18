import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Truck, MapPin, Clock, User, Play, Flag, Car, Calendar } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { Booking, Vehicle, User as UserType } from "@shared/schema";

export default function DriverDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  
  const [startTripDialog, setStartTripDialog] = useState<Booking | null>(null);
  const [endTripDialog, setEndTripDialog] = useState<Booking | null>(null);
  const [startOdometer, setStartOdometer] = useState("");
  const [endOdometer, setEndOdometer] = useState("");

  const { data: bookings, isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });

  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const { data: users } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  const startTrip = useMutation({
    mutationFn: async ({ bookingId, odometer }: { bookingId: number; odometer: number }) => {
      return apiRequest("PATCH", `/api/bookings/${bookingId}/start`, { startOdometer: odometer });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      setStartTripDialog(null);
      setStartOdometer("");
      toast({ title: t.driverDashboard.tripInProgress });
    },
    onError: () => {
      toast({ title: t.driverDashboard.errorStartingTrip, variant: "destructive" });
    }
  });

  const endTrip = useMutation({
    mutationFn: async ({ bookingId, odometer }: { bookingId: number; odometer: number }) => {
      return apiRequest("PATCH", `/api/bookings/${bookingId}/end`, { endOdometer: odometer });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      setEndTripDialog(null);
      setEndOdometer("");
      toast({ title: t.driverDashboard.tripCompleted });
    },
    onError: () => {
      toast({ title: t.driverDashboard.errorEndingTrip, variant: "destructive" });
    }
  });

  const myTrips = bookings?.filter(b => 
    (b as any).driverId === user?.id && 
    (b.status === 'approved' || b.status === 'in_progress')
  ) || [];

  const getVehicle = (vehicleId: number) => vehicles?.find(v => v.id === vehicleId);
  const getUser = (userId: number) => users?.find(u => u.id === userId);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      approved: { variant: "secondary", label: t.status.approved },
      in_progress: { variant: "default", label: t.status.in_progress },
    };
    const config = statusConfig[status] || { variant: "outline", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleStartTrip = () => {
    if (!startTripDialog || !startOdometer) return;
    startTrip.mutate({ bookingId: startTripDialog.id, odometer: parseInt(startOdometer) });
  };

  const handleEndTrip = () => {
    if (!endTripDialog || !endOdometer) return;
    endTrip.mutate({ bookingId: endTripDialog.id, odometer: parseInt(endOdometer) });
  };

  if (bookingsLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Truck className="w-8 h-8 text-primary" />
          {t.driverDashboard.title}
        </h1>
        <p className="text-muted-foreground mt-1">{t.driverDashboard.subtitle}</p>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">{t.driverDashboard.assignedTrips}</h2>
        
        {myTrips.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Truck className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground">{t.driverDashboard.noTripsAssigned}</h3>
              <p className="text-muted-foreground">{t.driverDashboard.noTripsMessage}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {myTrips.map(booking => {
              const vehicle = getVehicle(booking.vehicleId);
              const requester = getUser(booking.userId);
              
              return (
                <Card key={booking.id} data-testid={`trip-card-${booking.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Car className="w-5 h-5 text-primary" />
                        {vehicle ? `${vehicle.make} ${vehicle.model}` : t.driverDashboard.vehicle}
                        {vehicle && (
                          <Badge variant="outline" className="ml-2">{vehicle.licensePlate}</Badge>
                        )}
                      </CardTitle>
                      {getStatusBadge(booking.status)}
                    </div>
                    <CardDescription className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {t.driverDashboard.requester}: {requester?.fullName || "-"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 mt-1 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{t.driverDashboard.destination}</p>
                          <p className="text-muted-foreground">{(booking as any).destination || "-"}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Calendar className="w-4 h-4 mt-1 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{t.driverDashboard.scheduledTime}</p>
                          <p className="text-muted-foreground">
                            {format(new Date(booking.startTime), "PPP p")}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      {booking.status === 'approved' && (
                        <Button 
                          onClick={() => setStartTripDialog(booking)}
                          className="flex-1"
                          data-testid={`button-start-trip-${booking.id}`}
                        >
                          <Play className="w-4 h-4 mr-2" />
                          {t.buttons.startTrip}
                        </Button>
                      )}
                      {booking.status === 'in_progress' && (
                        <Button 
                          onClick={() => setEndTripDialog(booking)}
                          variant="secondary"
                          className="flex-1"
                          data-testid={`button-end-trip-${booking.id}`}
                        >
                          <Flag className="w-4 h-4 mr-2" />
                          {t.buttons.endTrip}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!startTripDialog} onOpenChange={() => setStartTripDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.buttons.startTrip}</DialogTitle>
            <DialogDescription>
              {t.driverDashboard.enterStartOdometer}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="startOdometer">{t.driverDashboard.startOdometer}</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  id="startOdometer"
                  type="number"
                  value={startOdometer}
                  onChange={(e) => setStartOdometer(e.target.value)}
                  placeholder="0"
                  data-testid="input-start-odometer"
                />
                <span className="text-muted-foreground">{t.driverDashboard.km}</span>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setStartTripDialog(null)}>
                {t.buttons.cancel}
              </Button>
              <Button 
                onClick={handleStartTrip} 
                disabled={!startOdometer || startTrip.isPending}
                data-testid="button-confirm-start-trip"
              >
                {t.buttons.startTrip}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!endTripDialog} onOpenChange={() => setEndTripDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.buttons.endTrip}</DialogTitle>
            <DialogDescription>
              {t.driverDashboard.enterEndOdometer}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="endOdometer">{t.driverDashboard.endOdometer}</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  id="endOdometer"
                  type="number"
                  value={endOdometer}
                  onChange={(e) => setEndOdometer(e.target.value)}
                  placeholder="0"
                  data-testid="input-end-odometer"
                />
                <span className="text-muted-foreground">{t.driverDashboard.km}</span>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEndTripDialog(null)}>
                {t.buttons.cancel}
              </Button>
              <Button 
                onClick={handleEndTrip} 
                disabled={!endOdometer || endTrip.isPending}
                data-testid="button-confirm-end-trip"
              >
                {t.buttons.endTrip}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
