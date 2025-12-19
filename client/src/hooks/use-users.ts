import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type InsertUser } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useUsers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: users, isLoading } = useQuery({
    queryKey: [api.users.list.path],
    queryFn: async () => {
      const res = await fetch(api.users.list.path);
      if (!res.ok) throw new Error("Failed to fetch users");
      return api.users.list.responses[200].parse(await res.json());
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: InsertUser) => {
      const res = await fetch(api.users.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create user");
      }
      return api.users.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.users.list.path] });
      toast({ title: "User created", description: "New user has been added successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to create user", description: error.message, variant: "destructive" });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      const res = await fetch(api.users.updateRole.path.replace(":id", String(userId)), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error("Failed to update user role");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.users.list.path] });
      toast({ title: "Role updated", description: "User role has been changed" });
    },
    onError: (error) => {
      toast({ title: "Failed to update role", description: error.message, variant: "destructive" });
    },
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ userId, permissions }: { userId: number; permissions: string[] }) => {
      const res = await fetch(api.users.updatePermissions.path.replace(":id", String(userId)), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions }),
      });
      if (!res.ok) throw new Error("Failed to update user permissions");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.users.list.path] });
      toast({ title: "Permissions updated", description: "User permissions have been changed" });
    },
    onError: (error) => {
      toast({ title: "Failed to update permissions", description: error.message, variant: "destructive" });
    },
  });

  const updateApproverMutation = useMutation({
    mutationFn: async ({ userId, isApprover }: { userId: number; isApprover: boolean }) => {
      const res = await fetch(api.users.updateApprover.path.replace(":id", String(userId)), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isApprover }),
      });
      if (!res.ok) throw new Error("Failed to update user approver status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.users.list.path] });
      toast({ title: "Approver status updated", description: "User approver status has been changed" });
    },
    onError: (error) => {
      toast({ title: "Failed to update approver status", description: error.message, variant: "destructive" });
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: number; password: string }) => {
      const res = await fetch(api.users.updatePassword.path.replace(":id", String(userId)), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update password");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Password updated", description: "User password has been changed successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to update password", description: error.message, variant: "destructive" });
    },
  });

  const updateEmailMutation = useMutation({
    mutationFn: async ({ userId, email }: { userId: number; email: string }) => {
      const res = await fetch(api.users.updateEmail.path.replace(":id", String(userId)), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update email");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.users.list.path] });
      toast({ title: "Email updated", description: "User email has been changed successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to update email", description: error.message, variant: "destructive" });
    },
  });

  return {
    users,
    isLoading,
    createUser: createUserMutation.mutate,
    isCreatingUser: createUserMutation.isPending,
    updateRole: updateRoleMutation.mutate,
    isUpdatingRole: updateRoleMutation.isPending,
    updatePermissions: updatePermissionsMutation.mutate,
    isUpdatingPermissions: updatePermissionsMutation.isPending,
    updateApprover: updateApproverMutation.mutate,
    isUpdatingApprover: updateApproverMutation.isPending,
    updatePassword: updatePasswordMutation.mutate,
    isUpdatingPassword: updatePasswordMutation.isPending,
    updateEmail: updateEmailMutation.mutate,
    isUpdatingEmail: updateEmailMutation.isPending,
  };
}
