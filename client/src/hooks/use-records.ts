import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type InsertMaintenance, type InsertFuel } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useMaintenance() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: records, isLoading } = useQuery({
    queryKey: [api.maintenance.list.path],
    queryFn: async () => {
      const res = await fetch(api.maintenance.list.path);
      if (!res.ok) throw new Error("Failed to fetch maintenance records");
      return api.maintenance.list.responses[200].parse(await res.json());
    },
  });

  const createRecord = useMutation({
    mutationFn: async (data: InsertMaintenance) => {
      const res = await fetch(api.maintenance.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to log maintenance");
      return api.maintenance.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.maintenance.list.path] });
      toast({ title: "Maintenance Logged", description: "Record saved successfully." });
    },
  });

  return { records, isLoading, createRecord };
}

export function useFuel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: records, isLoading } = useQuery({
    queryKey: [api.fuel.list.path],
    queryFn: async () => {
      const res = await fetch(api.fuel.list.path);
      if (!res.ok) throw new Error("Failed to fetch fuel records");
      return api.fuel.list.responses[200].parse(await res.json());
    },
  });

  const createRecord = useMutation({
    mutationFn: async (data: InsertFuel) => {
      const res = await fetch(api.fuel.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to log fuel");
      return api.fuel.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.fuel.list.path] });
      toast({ title: "Fuel Logged", description: "Fuel record saved successfully." });
    },
  });

  return { records, isLoading, createRecord };
}
