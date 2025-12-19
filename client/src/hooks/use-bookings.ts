import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type InsertBooking } from "@shared/routes";
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
    mutationFn: async ({ id, status }: { id: number, status: 'approved' | 'rejected' | 'completed' | 'cancelled' }) => {
      const url = buildUrl(api.bookings.update.path, { id });
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update booking status");
      return api.bookings.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.bookings.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.vehicles.list.path] }); // Status might change vehicle availability
      toast({ title: "Status updated", description: "Booking status has been changed." });
    },
  });

  return {
    bookings,
    isLoading,
    createBooking,
    updateBookingStatus,
  };
}
