import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertVehicle } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useVehicles() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: vehicles, isLoading } = useQuery({
    queryKey: [api.vehicles.list.path],
    queryFn: async () => {
      const res = await fetch(api.vehicles.list.path);
      if (!res.ok) throw new Error("Failed to fetch vehicles");
      return api.vehicles.list.responses[200].parse(await res.json());
    },
  });

  const createVehicle = useMutation({
    mutationFn: async (data: InsertVehicle) => {
      const res = await fetch(api.vehicles.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.message || "Failed to create vehicle");
      }
      return api.vehicles.create.responses[201].parse(body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.vehicles.list.path] });
      toast({ title: "Vehicle added", description: "The vehicle has been successfully registered." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateVehicle = useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<InsertVehicle>) => {
      const url = buildUrl(api.vehicles.update.path, { id });
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.message || "Failed to update vehicle");
      }
      return api.vehicles.update.responses[200].parse(body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.vehicles.list.path] });
      toast({ title: "Vehicle updated", description: "Changes saved successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteVehicle = useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.vehicles.delete.path, { id });
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete vehicle");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.vehicles.list.path] });
      toast({ title: "Vehicle deleted", description: "The vehicle has been removed." });
    },
  });

  return {
    vehicles,
    isLoading,
    createVehicle,
    updateVehicle,
    deleteVehicle,
  };
}
