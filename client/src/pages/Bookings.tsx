import { useState, useEffect } from "react";
import { useBookings } from "@/hooks/use-bookings";
import { useVehicles } from "@/hooks/use-vehicles";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertBookingSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Check, X, Clock, MapPin, CheckCircle, Ban, AlertTriangle, Users, Car, Flag, User as UserIcon, Play, Printer } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useLanguage } from "@/lib/i18n";

export default function Bookings() {
  const { bookings, isLoading, createBooking, updateBookingStatus, startTrip, endTrip, extendBooking, approvers } = useBookings();
  const { vehicles } = useVehicles();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelBookingId, setCancelBookingId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [approvalBookingId, setApprovalBookingId] = useState<number | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [extendBookingId, setExtendBookingId] = useState<number | null>(null);
  const [newEndTime, setNewEndTime] = useState("");

  const { data: users } = useQuery({
    queryKey: [api.users.list.path],
    queryFn: async () => {
      const res = await fetch(api.users.list.path);
      if (!res.ok) throw new Error("Failed to fetch users");
      return api.users.list.responses[200].parse(await res.json());
    },
  });

  const { data: drivers } = useQuery({
    queryKey: [api.drivers.list.path],
    queryFn: async () => {
      const res = await fetch(api.drivers.list.path);
      if (!res.ok) throw new Error("Failed to fetch drivers");
      return api.drivers.list.responses[200].parse(await res.json());
    },
  });

  const availableVehicles = vehicles?.filter(v => v.status === "available");

  const form = useForm({
    resolver: zodResolver(insertBookingSchema),
    defaultValues: {
      userId: user?.id,
      vehicleId: undefined,
      approverId: undefined,
      driveType: "self" as "self" | "driver",
      startTime: "",
      endTime: "",
      purpose: "",
      destination: "",
      mileage: 0,
      status: "pending",
      passengerCount: 1,
      shareAllowed: false
    }
  });

  const onSubmit = (data: any) => {
    const payload = {
      ...data,
      userId: user?.id,
      vehicleId: Number(data.vehicleId),
      approverId: data.approverId ? Number(data.approverId) : undefined,
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

  const handleCancelClick = (bookingId: number) => {
    setCancelBookingId(bookingId);
    setCancelReason("");
    setCancelDialogOpen(true);
  };

  const handleConfirmCancel = () => {
    if (cancelBookingId && cancelReason.trim()) {
      updateBookingStatus.mutate(
        { id: cancelBookingId, status: 'cancelled', cancellationReason: cancelReason.trim() },
        {
          onSuccess: () => {
            setCancelDialogOpen(false);
            setCancelBookingId(null);
            setCancelReason("");
          }
        }
      );
    }
  };

  const handleApproveClick = (bookingId: number) => {
    setApprovalBookingId(bookingId);
    setSelectedDriverId(null);
    setApprovalDialogOpen(true);
  };

  const handleConfirmApproval = () => {
    if (approvalBookingId) {
      updateBookingStatus.mutate(
        { id: approvalBookingId, status: 'approved', driverId: selectedDriverId },
        {
          onSuccess: () => {
            setApprovalDialogOpen(false);
            setApprovalBookingId(null);
            setSelectedDriverId(null);
          }
        }
      );
    }
  };

  const handleStartTrip = (bookingId: number) => {
    startTrip.mutate(bookingId);
  };

  const handleEndTrip = (bookingId: number) => {
    endTrip.mutate(bookingId);
  };

  const handleExtendClick = (bookingId: number) => {
    setExtendBookingId(bookingId);
    setNewEndTime("");
    setExtendDialogOpen(true);
  };

  const handleConfirmExtend = () => {
    if (extendBookingId && newEndTime) {
      extendBooking.mutate(
        { id: extendBookingId, newEndTime: new Date(newEndTime).toISOString() },
        {
          onSuccess: () => {
            setExtendDialogOpen(false);
            setExtendBookingId(null);
            setNewEndTime("");
          }
        }
      );
    }
  };

  const isBookingOverdue = (booking: any) => {
    return (booking.status === 'approved' || booking.status === 'in_progress') && 
           new Date(booking.endTime) < new Date();
  };

  const canExtendBooking = (booking: any) => {
    if (!user) return false;
    const isDriver = booking.driverId === user.id;
    const isApprover = booking.approverId === user.id;
    const isAdmin = user.role === 'admin';
    const isOwner = booking.userId === user.id;
    return isDriver || isApprover || isAdmin || isOwner;
  };

  const approvingBooking = bookings?.find(b => b.id === approvalBookingId);

  const selectedVehicleId = form.watch('vehicleId');
  const selectedVehicle = selectedVehicleId ? vehicles?.find(v => v.id === Number(selectedVehicleId)) : null;
  const selectedVehicleCapacity = selectedVehicle ? (selectedVehicle as any).capacity || 5 : 5;

  // Reset shareAllowed and validate passengerCount when vehicle changes
  useEffect(() => {
    const currentPassengerCount = form.getValues('passengerCount');
    const currentShareAllowed = form.getValues('shareAllowed');
    
    // Reset sharing when switching to a smaller vehicle
    if (selectedVehicleCapacity <= 5 && currentShareAllowed) {
      form.setValue('shareAllowed', false);
    }
    
    // Clamp passenger count to vehicle capacity
    if (currentPassengerCount > selectedVehicleCapacity) {
      form.setValue('passengerCount', selectedVehicleCapacity);
    }
  }, [selectedVehicleId, selectedVehicleCapacity, form]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">{t.status.approved}</Badge>;
      case 'pending': return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800">{t.status.pending}</Badge>;
      case 'rejected': return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">{t.status.rejected}</Badge>;
      case 'in_progress': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800">{t.status.in_progress}</Badge>;
      case 'completed': return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-800">{t.status.completed}</Badge>;
      case 'cancelled': return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800">{t.status.cancelled}</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const cancellingBooking = bookings?.find(b => b.id === cancelBookingId);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight">{t.bookings.title}</h1>
          <p className="text-muted-foreground mt-1">{t.bookings.subtitle}</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-lg shadow-primary/25" data-testid="button-new-booking">{t.bookings.newBooking}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t.bookings.requestVehicle}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="vehicleId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.bookings.selectVehicle}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value ? String(field.value) : undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="select-vehicle">
                          <SelectValue placeholder={t.bookings.chooseVehicle} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableVehicles?.map(v => (
                          <SelectItem key={v.id} value={String(v.id)}>
                            {v.make} {v.model} ({v.licensePlate}) - {(v as any).capacity || 5} {t.vehicles.seats}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />


                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="startTime" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.bookings.startTime}</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} data-testid="input-start-time" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="endTime" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.bookings.endTime}</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} data-testid="input-end-time" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="destination" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.bookings.destination}</FormLabel>
                    <FormControl><Input placeholder={t.bookings.destinationPlaceholder} {...field} data-testid="input-destination" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="purpose" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.bookings.purpose}</FormLabel>
                    <FormControl><Input placeholder={t.bookings.purposePlaceholder} {...field} data-testid="input-purpose" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="passengerCount" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.bookings.numberOfPassengers}</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1"
                          max={selectedVehicleCapacity}
                          placeholder="1" 
                          {...field}
                          onChange={(e) => field.onChange(Math.min(parseInt(e.target.value) || 1, selectedVehicleCapacity))}
                          data-testid="input-passenger-count"
                        />
                      </FormControl>
                      {selectedVehicle && (
                        <p className="text-xs text-muted-foreground">
                          {t.bookings.vehicleCapacity}: {(selectedVehicle as any).capacity || 5} {t.bookings.passengers}
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )} />
                  
                  {selectedVehicle && selectedVehicleCapacity > 5 && (
                    <FormField control={form.control} name="shareAllowed" render={({ field }) => (
                      <FormItem className="flex flex-col justify-end pb-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="shareAllowed" 
                            checked={field.value} 
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-share-allowed"
                          />
                          <label htmlFor="shareAllowed" className="text-sm font-medium cursor-pointer">
                            {t.bookings.allowCarSharing}
                          </label>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t.bookings.sharingDescription}
                        </p>
                      </FormItem>
                    )} />
                  )}
                </div>

                <FormField control={form.control} name="driveType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.bookings.driveType}</FormLabel>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="driveType"
                          value="self"
                          checked={field.value === "self"}
                          onChange={() => field.onChange("self")}
                          className="w-4 h-4"
                          data-testid="radio-self-driven"
                        />
                        <span className="text-sm">{t.bookings.selfDriven}</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="driveType"
                          value="driver"
                          checked={field.value === "driver"}
                          onChange={() => field.onChange("driver")}
                          className="w-4 h-4"
                          data-testid="radio-with-driver"
                        />
                        <span className="text-sm">{t.bookings.withDriver}</span>
                      </label>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {field.value === "self" 
                        ? t.bookings.selfDrivenDesc
                        : t.bookings.driverAssignedDesc}
                    </p>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="approverId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.bookings.approver}</FormLabel>
                    <Select onValueChange={(val) => field.onChange(val ? Number(val) : undefined)} defaultValue={field.value ? String(field.value) : undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="select-approver">
                          <SelectValue placeholder={t.bookings.selectApprover} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {approvers?.map(approver => (
                          <SelectItem key={approver.id} value={String(approver.id)}>
                            {approver.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <Button type="submit" className="w-full" disabled={createBooking.isPending} data-testid="button-submit-booking">
                  {createBooking.isPending ? t.bookings.submitting : t.bookings.submitRequest}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              {t.bookings.cancelBooking}
            </DialogTitle>
            <DialogDescription>
              {cancellingBooking && (
                <span>
                  {t.bookings.cancellingFor} {cancellingBooking.vehicle.make} {cancellingBooking.vehicle.model}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">{t.bookings.cancelReason} <span className="text-destructive">*</span></label>
              <Textarea
                placeholder={t.bookings.cancelPlaceholder}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="min-h-24"
                data-testid="input-cancel-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)} data-testid="button-cancel-dialog-close">
              {t.bookings.goBack}
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmCancel}
              disabled={!cancelReason.trim() || updateBookingStatus.isPending}
              data-testid="button-confirm-cancel"
            >
              {updateBookingStatus.isPending ? t.bookings.cancelling : t.bookings.confirmCancellation}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-500" />
              {t.bookings.approveBooking}
            </DialogTitle>
            <DialogDescription>
              {approvingBooking && (
                <span>
                  {t.bookings.approvingFor} {approvingBooking.vehicle.make} {approvingBooking.vehicle.model}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {approvingBooking && (
              <div className="bg-muted p-3 rounded-md">
                <p className="text-sm">
                  <span className="font-medium">{t.bookings.driveType}:</span>{" "}
                  {(approvingBooking as any).driveType === "driver" ? t.bookings.withDriver : t.bookings.selfDriven}
                </p>
              </div>
            )}
            {approvingBooking && (approvingBooking as any).driveType === "driver" && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {t.bookings.assignDriver} <span className="text-destructive">*</span>
                </label>
                <Select 
                  value={selectedDriverId ? String(selectedDriverId) : "none"} 
                  onValueChange={(val) => setSelectedDriverId(val === "none" ? null : Number(val))}
                >
                  <SelectTrigger data-testid="select-driver">
                    <SelectValue placeholder={t.bookings.selectDriver} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t.bookings.selectDriver}...</SelectItem>
                    {drivers?.map(d => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {d.fullName} ({d.username})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {t.bookings.driverNotification}
                </p>
                {(!drivers || drivers.length === 0) && (
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                    {t.bookings.noDrivers}
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalDialogOpen(false)} data-testid="button-approval-dialog-close">
              {t.buttons.cancel}
            </Button>
            <Button 
              onClick={handleConfirmApproval}
              disabled={updateBookingStatus.isPending || (approvingBooking && (approvingBooking as any).driveType === "driver" && !selectedDriverId)}
              className="bg-green-600 hover:bg-green-700"
              data-testid="button-confirm-approval"
            >
              {updateBookingStatus.isPending ? t.bookings.approving : t.bookings.approveBooking}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={extendDialogOpen} onOpenChange={setExtendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              {t.bookings.extendBookingTitle}
            </DialogTitle>
            <DialogDescription>
              {extendBookingId && bookings?.find(b => b.id === extendBookingId) && (
                <span>
                  {t.bookings.extendingFor} {bookings.find(b => b.id === extendBookingId)!.vehicle.make} {bookings.find(b => b.id === extendBookingId)!.vehicle.model}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {extendBookingId && bookings?.find(b => b.id === extendBookingId) && (
              <div className="bg-muted p-3 rounded-md">
                <p className="text-sm">
                  <span className="font-medium">{t.bookings.currentEndTime}:</span>{" "}
                  {format(new Date(bookings.find(b => b.id === extendBookingId)!.endTime), "MMM d, yyyy h:mm a")}
                </p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-2 block">{t.bookings.newEndTime}</label>
              <Input
                type="datetime-local"
                value={newEndTime}
                onChange={(e) => setNewEndTime(e.target.value)}
                data-testid="input-extend-end-time"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendDialogOpen(false)} data-testid="button-extend-dialog-close">
              {t.buttons.cancel}
            </Button>
            <Button
              onClick={handleConfirmExtend}
              disabled={!newEndTime || extendBooking.isPending}
              className="bg-orange-600 hover:bg-orange-700"
              data-testid="button-confirm-extend"
            >
              {extendBooking.isPending ? t.buttons.extending : t.buttons.extendBooking}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}
          </div>
        ) : bookings?.map((booking) => (
          <Card key={booking.id} className={`border-none shadow-sm hover:shadow-md transition-shadow ${isBookingOverdue(booking) ? 'ring-2 ring-red-300 dark:ring-red-700' : ''}`} data-testid={`card-booking-${booking.id}`}>
            <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4 flex-1">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <CalendarDays className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <h3 className="font-semibold text-lg">{booking.vehicle.make} {booking.vehicle.model}</h3>
                    {getStatusBadge(booking.status)}
                    {isBookingOverdue(booking) && (
                      <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800 flex items-center gap-1" data-testid={`badge-overdue-booking-${booking.id}`}>
                        <AlertTriangle className="w-3 h-3" />
                        {t.status.overdue}
                      </Badge>
                    )}
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
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      <span>{(booking as any).passengerCount || 1} passenger{((booking as any).passengerCount || 1) > 1 ? 's' : ''}</span>
                      {(booking as any).shareAllowed && (
                        <Badge variant="outline" className="text-xs ml-1">Shareable</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <UserIcon className="w-4 h-4" />
                      <span>{(booking as any).driveType === "driver" ? "With driver" : "Self-driven"}</span>
                    </div>
                    <div className="hidden sm:inline text-muted-foreground/50">|</div>
                    <div>Requested by: <span className="text-foreground font-medium">{booking.user.fullName}</span></div>
                    {booking.approver && (
                      <>
                        <div className="hidden sm:inline text-muted-foreground/50">|</div>
                        <div>Approver: <span className="text-foreground font-medium">{booking.approver.fullName}</span></div>
                      </>
                    )}
                    {(booking as any).driverId && users && (
                      <>
                        <div className="hidden sm:inline text-muted-foreground/50">|</div>
                        <div className="flex items-center gap-1.5">
                          <Car className="w-4 h-4" />
                          Driver: <span className="text-foreground font-medium">
                            {users.find(u => u.id === (booking as any).driverId)?.fullName || 'Unknown'}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                  {booking.status === 'cancelled' && booking.cancellationReason && (
                    <div className="mt-2 p-2 rounded-md bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                      <p className="text-sm text-orange-700 dark:text-orange-300">
                        <span className="font-medium">Cancellation reason:</span> {booking.cancellationReason}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {booking.status === 'pending' && (booking.approverId === user?.id || user?.role === 'admin') && (
                <div className="flex gap-2 flex-wrap">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="border-green-200 text-green-700"
                    onClick={() => handleApproveClick(booking.id)}
                    disabled={updateBookingStatus.isPending}
                    data-testid={`button-approve-booking-${booking.id}`}
                  >
                    <Check className="w-4 h-4 mr-1" /> {t.buttons.approve}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="border-red-200 text-red-700"
                    onClick={() => updateBookingStatus.mutate({ id: booking.id, status: 'rejected' })}
                    disabled={updateBookingStatus.isPending}
                    data-testid={`button-reject-booking-${booking.id}`}
                  >
                    <X className="w-4 h-4 mr-1" /> {t.buttons.reject}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="border-orange-200 text-orange-700"
                    onClick={() => handleCancelClick(booking.id)}
                    disabled={updateBookingStatus.isPending}
                    data-testid={`button-cancel-booking-${booking.id}`}
                  >
                    <Ban className="w-4 h-4 mr-1" /> {t.buttons.cancel}
                  </Button>
                </div>
              )}

              {booking.status === 'pending' && booking.approverId !== user?.id && user?.role !== 'admin' && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                  <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                  <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Awaiting Approval</span>
                </div>
              )}

              {booking.status === 'approved' && (
                <div className="flex gap-2 flex-wrap items-center">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">{t.status.approved}</span>
                  </div>
                  {((booking as any).driverId === user?.id || booking.approverId === user?.id || user?.role === 'admin' || user?.isApprover) && (
                    <Button 
                      size="sm"
                      variant="default"
                      onClick={() => handleStartTrip(booking.id)}
                      disabled={startTrip.isPending}
                      data-testid={`button-start-trip-${booking.id}`}
                    >
                      <Play className="w-4 h-4 mr-1" /> {t.buttons.startTrip}
                    </Button>
                  )}
                  {isBookingOverdue(booking) && canExtendBooking(booking) && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-orange-200 text-orange-700"
                      onClick={() => handleExtendClick(booking.id)}
                      data-testid={`button-extend-booking-${booking.id}`}
                    >
                      <Clock className="w-4 h-4 mr-1" /> {t.buttons.extendBooking}
                    </Button>
                  )}
                  {(booking.approverId === user?.id || user?.role === 'admin') && (
                    <>
                      <Button 
                        size="sm"
                        variant="outline"
                        onClick={() => updateBookingStatus.mutate({ id: booking.id, status: 'pending' })}
                        disabled={updateBookingStatus.isPending}
                        data-testid={`button-revert-pending-booking-${booking.id}`}
                      >
                        Set Pending
                      </Button>
                      <Button 
                        size="sm"
                        variant="outline"
                        className="border-orange-200 text-orange-700"
                        onClick={() => handleCancelClick(booking.id)}
                        disabled={updateBookingStatus.isPending}
                        data-testid={`button-cancel-approved-booking-${booking.id}`}
                      >
                        <Ban className="w-4 h-4 mr-1" /> {t.buttons.cancel}
                      </Button>
                    </>
                  )}
                </div>
              )}

              {booking.status === 'in_progress' && (
                <div className="flex gap-2 flex-wrap items-center">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                    <Car className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{t.status.in_progress}</span>
                  </div>
                  {((booking as any).driverId === user?.id || booking.approverId === user?.id || user?.role === 'admin' || user?.isApprover) && (
                    <Button 
                      size="sm"
                      variant="outline"
                      className="border-blue-200 text-blue-700"
                      onClick={() => handleEndTrip(booking.id)}
                      disabled={endTrip.isPending}
                      data-testid={`button-end-trip-${booking.id}`}
                    >
                      <Flag className="w-4 h-4 mr-1" /> {t.buttons.endTrip}
                    </Button>
                  )}
                  {isBookingOverdue(booking) && canExtendBooking(booking) && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-orange-200 text-orange-700"
                      onClick={() => handleExtendClick(booking.id)}
                      data-testid={`button-extend-booking-${booking.id}`}
                    >
                      <Clock className="w-4 h-4 mr-1" /> {t.buttons.extendBooking}
                    </Button>
                  )}
                </div>
              )}

              {booking.status === 'cancelled' && !booking.cancellationReason && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                  <Ban className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  <span className="text-sm font-medium text-orange-700 dark:text-orange-300">{t.status.cancelled}</span>
                </div>
              )}

              {booking.status === 'cancelled' && (booking.approverId === user?.id || user?.role === 'admin') && (
                <div className="flex gap-2 flex-wrap">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="border-green-200 text-green-700"
                    onClick={() => updateBookingStatus.mutate({ id: booking.id, status: 'approved' })}
                    disabled={updateBookingStatus.isPending}
                    data-testid={`button-reapprove-booking-${booking.id}`}
                  >
                    <Check className="w-4 h-4 mr-1" /> {t.buttons.approve}
                  </Button>
                  <Button 
                    size="sm"
                    variant="outline"
                    onClick={() => updateBookingStatus.mutate({ id: booking.id, status: 'pending' })}
                    disabled={updateBookingStatus.isPending}
                    data-testid={`button-set-pending-cancelled-${booking.id}`}
                  >
                    {t.buttons.setPending}
                  </Button>
                </div>
              )}

              <Button 
                size="sm"
                variant="ghost"
                onClick={() => window.open(`/bookings/${booking.id}/print`, '_blank')}
                data-testid={`button-print-booking-${booking.id}`}
              >
                <Printer className="w-4 h-4 mr-1" /> {t.buttons.export}
              </Button>
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
