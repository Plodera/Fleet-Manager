import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertBooking } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

export function useBookings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: bookings, isLoading } = useQuery({
    queryKey: [api.bookings.list.path],
    queryFn: async () => {
      const res = await fetch(api.bookings.list.path);
      if (!res.ok) throw new Error("Failed to fetch bookings");
      // JSON dates come as strings, let Zod coerce them if schema uses coerce.date()
      // Or manually map if needed. Assuming schema handles it or we map here.
      // The schema in shared/schema uses timestamp, so API returns ISO strings.
      // We rely on the frontend to parse these strings into Dates for display.
      return api.bookings.list.responses[200].parse(await res.json());
    },
  });

  const createBooking = useMutation({
    mutationFn: async (data: InsertBooking) => {
      // Ensure numeric fields are numbers
      const payload = {
        ...data,
        vehicleId: Number(data.vehicleId),
        userId: Number(data.userId),
      };

      const res = await fetch(api.bookings.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create booking");
      }
      return api.bookings.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.bookings.list.path] });
      toast({ title: "Booking request sent", description: "Your reservation is pending approval." });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateBookingStatus = useMutation({
    mutationFn: async ({ id, status, cancellationReason, driverId }: { id: number, status: 'approved' | 'rejected' | 'pending' | 'in_progress' | 'cancelled' | 'completed', cancellationReason?: string, driverId?: number | null }) => {
      const url = buildUrl(api.bookings.updateStatus.path, { id });
      const body: { status: string; cancellationReason?: string; driverId?: number | null } = { status };
      if (cancellationReason) body.cancellationReason = cancellationReason;
      if (driverId !== undefined) body.driverId = driverId;
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update booking status");
      }
      return api.bookings.updateStatus.responses[200].parse(await res.json());
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: [api.bookings.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.vehicles.list.path] });
      const messages: Record<string, string> = {
        approved: 'Booking approved successfully',
        rejected: 'Booking rejected',
        pending: 'Booking set to pending',
        in_progress: 'Trip started',
        cancelled: 'Booking cancelled',
        completed: 'Booking marked as completed'
      };
      toast({ title: "Status updated", description: messages[status] });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const startTrip = useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.bookings.updateStatus.path, { id });
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: 'in_progress' }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to start trip");
      }
      return api.bookings.updateStatus.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.bookings.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.vehicles.list.path] });
      toast({ title: "Trip started", description: "The trip is now in progress" });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const endTrip = useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.bookings.endTrip.path, { id });
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to end trip");
      }
      return api.bookings.endTrip.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.bookings.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.vehicles.list.path] });
      toast({ title: "Trip ended", description: "Vehicle is now available for booking" });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const { data: approvers } = useQuery({
    queryKey: [api.approvers.list.path],
    queryFn: async () => {
      const res = await fetch(api.approvers.list.path);
      if (!res.ok) throw new Error("Failed to fetch approvers");
      return api.approvers.list.responses[200].parse(await res.json());
    },
  });

  return {
    bookings,
    isLoading,
    createBooking,
    updateBookingStatus,
    startTrip,
    endTrip,
    approvers,
  };
}
