import { useState } from "react";
import { useUsers } from "@/hooks/use-users";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, AVAILABLE_PERMISSIONS, type Department } from "@shared/schema";
import { Users as UsersIcon, Shield, UserPlus, Edit2, Lock, CheckCircle, Key, Mail, Building2, Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Users() {
  const { users, isLoading, createUser, isCreatingUser, updateRole, isUpdatingRole, updatePermissions, isUpdatingPermissions, updateApprover, isUpdatingApprover, updatePassword, isUpdatingPassword, updateEmail, isUpdatingEmail } = useUsers();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editingPermissionsUserId, setEditingPermissionsUserId] = useState<number | null>(null);
  const [changePasswordUserId, setChangePasswordUserId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [editEmailUserId, setEditEmailUserId] = useState<number | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [isDeptDialogOpen, setIsDeptDialogOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptDesc, setNewDeptDesc] = useState("");

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const createDeptMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const res = await apiRequest("POST", "/api/departments", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      setIsDeptDialogOpen(false);
      setNewDeptName("");
      setNewDeptDesc("");
      toast({ title: "Department created successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create department", description: err.message, variant: "destructive" });
    }
  });

  const deleteDeptMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/departments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      toast({ title: "Department deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to delete department", description: err.message, variant: "destructive" });
    }
  });

  const form = useForm({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      password: "",
      fullName: "",
      email: "",
      role: "customer" as const,
      licenseNumber: "",
      department: "",
      permissions: ["view_dashboard", "view_vehicles", "view_bookings"],
    }
  });

  const onSubmit = (data: any) => {
    createUser(data, {
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
          <h1 className="text-3xl font-bold font-display tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-1">Manage system access and roles.</p>
        </div>
        {currentUser?.role === 'admin' && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-lg shadow-primary/25">
                <UserPlus className="w-4 h-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="fullName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="username" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="jdoe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="user@example.com" {...field} data-testid="input-user-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="role" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="customer">Customer</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="department" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-department">
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.name} data-testid={`select-department-${dept.id}`}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="licenseNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel>License Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Optional" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="permissions" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Access Rights</FormLabel>
                      <div className="space-y-3 border rounded-md p-4 bg-muted/30">
                        {AVAILABLE_PERMISSIONS.map((perm) => (
                          <div key={perm.id} className="flex items-center space-x-2">
                            <Checkbox
                              checked={field.value?.includes(perm.id) || false}
                              onCheckedChange={(checked) => {
                                const newPerms = checked
                                  ? [...(field.value || []), perm.id]
                                  : (field.value || []).filter((p) => p !== perm.id);
                                field.onChange(newPerms);
                              }}
                              data-testid={`checkbox-permission-${perm.id}`}
                            />
                            <label className="text-sm font-medium cursor-pointer">{perm.label}</label>
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <Button type="submit" className="w-full" disabled={isCreatingUser}>
                    {isCreatingUser ? "Creating..." : "Create User"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="border-none shadow-md overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-primary" />
            Registered Users
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Full Name</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Approver</TableHead>
                <TableHead>Permissions</TableHead>
                {currentUser?.role === 'admin' && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={currentUser?.role === 'admin' ? 8 : 7} className="h-24 text-center">Loading...</TableCell>
                </TableRow>
              ) : users?.map((user) => {
                const userPermissions = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions || [];
                return (
                <TableRow key={user.id} className="hover:bg-muted/20">
                  <TableCell className="font-medium">{user.fullName}</TableCell>
                  <TableCell>{user.username}</TableCell>
                  <TableCell className="text-sm">{user.email || "-"}</TableCell>
                  <TableCell>
                    {currentUser?.role === 'admin' && editingUserId !== user.id ? (
                      <div className="flex items-center gap-2">
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="capitalize">
                          {user.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                          {user.role}
                        </Badge>
                      </div>
                    ) : (
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="capitalize">
                        {user.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                        {user.role}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{user.department || "-"}</TableCell>
                  <TableCell className="font-mono text-xs">{user.licenseNumber || "-"}</TableCell>
                  <TableCell>
                    {currentUser?.role === 'admin' ? (
                      <Button
                        size="sm"
                        variant={user.isApprover ? "default" : "outline"}
                        onClick={() => updateApprover({ userId: user.id, isApprover: !user.isApprover })}
                        disabled={isUpdatingApprover}
                        data-testid={`button-toggle-approver-${user.id}`}
                        className={user.isApprover ? "" : "border-muted-foreground/30"}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        {user.isApprover ? "Approver" : "Not Set"}
                      </Button>
                    ) : (
                      user.isApprover ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Approver
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )
                    )}
                  </TableCell>
                  <TableCell>
                    {editingPermissionsUserId === user.id ? (
                      <Dialog open={editingPermissionsUserId === user.id} onOpenChange={(open) => {
                        if (!open) setEditingPermissionsUserId(null);
                      }}>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Access Rights</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-3">
                            {AVAILABLE_PERMISSIONS.map((perm) => (
                              <div key={perm.id} className="flex items-center space-x-2">
                                <Checkbox
                                  checked={userPermissions.includes(perm.id)}
                                  onCheckedChange={(checked) => {
                                    const newPerms = checked
                                      ? [...userPermissions, perm.id]
                                      : userPermissions.filter((p: string) => p !== perm.id);
                                    updatePermissions({ userId: user.id, permissions: newPerms }, {
                                      onSuccess: () => setEditingPermissionsUserId(null),
                                    });
                                  }}
                                  data-testid={`checkbox-edit-permission-${perm.id}-${user.id}`}
                                />
                                <label className="text-sm font-medium cursor-pointer">{perm.label}</label>
                              </div>
                            ))}
                          </div>
                        </DialogContent>
                      </Dialog>
                    ) : (
                      <div className="flex items-center gap-1 flex-wrap">
                        {userPermissions.length > 0 ? (
                          <>
                            {userPermissions.slice(0, 2).map((perm: string) => (
                              <Badge key={perm} variant="outline" className="text-xs capitalize">{perm.replace('view_', '').replace('manage_', '')}</Badge>
                            ))}
                            {userPermissions.length > 2 && (
                              <Badge variant="outline" className="text-xs">+{userPermissions.length - 2}</Badge>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">None</span>
                        )}
                      </div>
                    )}
                  </TableCell>
                  {currentUser?.role === 'admin' && (
                    <TableCell>
                      <div className="flex gap-2">
                        {editingUserId === user.id ? (
                          <Select onValueChange={(role) => {
                            updateRole({ userId: user.id, role }, {
                              onSuccess: () => setEditingUserId(null),
                            });
                          }}>
                            <SelectTrigger className="w-32">
                              <SelectValue defaultValue={user.role} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="customer">Customer</SelectItem>
                              <SelectItem value="staff">Staff</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingUserId(user.id)}
                              disabled={isUpdatingRole}
                              data-testid={`button-edit-role-${user.id}`}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingPermissionsUserId(user.id)}
                              disabled={isUpdatingPermissions}
                              data-testid={`button-edit-permissions-${user.id}`}
                            >
                              <Lock className="w-4 h-4" />
                            </Button>
                            <Dialog open={editEmailUserId === user.id} onOpenChange={(open) => {
                              if (!open) {
                                setEditEmailUserId(null);
                                setNewEmail("");
                              }
                            }}>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditEmailUserId(user.id);
                                    setNewEmail(user.email || "");
                                  }}
                                  disabled={isUpdatingEmail}
                                  data-testid={`button-edit-email-${user.id}`}
                                >
                                  <Mail className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Edit Email for {user.fullName}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <label className="text-sm font-medium">Email Address</label>
                                    <Input
                                      type="email"
                                      placeholder="user@example.com"
                                      value={newEmail}
                                      onChange={(e) => setNewEmail(e.target.value)}
                                      data-testid={`input-edit-email-${user.id}`}
                                    />
                                  </div>
                                  <Button
                                    onClick={() => {
                                      if (newEmail) {
                                        updateEmail({ userId: user.id, email: newEmail }, {
                                          onSuccess: () => {
                                            setEditEmailUserId(null);
                                            setNewEmail("");
                                          }
                                        });
                                      }
                                    }}
                                    disabled={!newEmail || isUpdatingEmail}
                                    data-testid={`button-confirm-email-${user.id}`}
                                  >
                                    {isUpdatingEmail ? "Updating..." : "Update Email"}
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                            <Dialog open={changePasswordUserId === user.id} onOpenChange={(open) => {
                              if (!open) {
                                setChangePasswordUserId(null);
                                setNewPassword("");
                              }
                            }}>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setChangePasswordUserId(user.id)}
                                  disabled={isUpdatingPassword}
                                  data-testid={`button-change-password-${user.id}`}
                                >
                                  <Key className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Change Password for {user.fullName}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <label className="text-sm font-medium">New Password</label>
                                    <Input
                                      type="password"
                                      placeholder="Enter new password (min 6 characters)"
                                      value={newPassword}
                                      onChange={(e) => setNewPassword(e.target.value)}
                                      data-testid={`input-new-password-${user.id}`}
                                    />
                                  </div>
                                  <Button
                                    onClick={() => {
                                      if (newPassword.length >= 6) {
                                        updatePassword({ userId: user.id, password: newPassword }, {
                                          onSuccess: () => {
                                            setChangePasswordUserId(null);
                                            setNewPassword("");
                                          }
                                        });
                                      }
                                    }}
                                    disabled={newPassword.length < 6 || isUpdatingPassword}
                                    data-testid={`button-confirm-password-${user.id}`}
                                  >
                                    {isUpdatingPassword ? "Updating..." : "Update Password"}
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {currentUser?.role === 'admin' && (
        <Card className="border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Departments
            </CardTitle>
            <Dialog open={isDeptDialogOpen} onOpenChange={setIsDeptDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-add-department">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Department
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Department</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Name</label>
                    <Input
                      placeholder="Department name"
                      value={newDeptName}
                      onChange={(e) => setNewDeptName(e.target.value)}
                      data-testid="input-department-name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description (optional)</label>
                    <Input
                      placeholder="Description"
                      value={newDeptDesc}
                      onChange={(e) => setNewDeptDesc(e.target.value)}
                      data-testid="input-department-description"
                    />
                  </div>
                  <Button
                    onClick={() => {
                      if (newDeptName.trim()) {
                        createDeptMutation.mutate({ name: newDeptName.trim(), description: newDeptDesc.trim() || undefined });
                      }
                    }}
                    disabled={!newDeptName.trim() || createDeptMutation.isPending}
                    data-testid="button-confirm-department"
                  >
                    {createDeptMutation.isPending ? "Creating..." : "Create Department"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {departments.length === 0 ? (
              <p className="text-muted-foreground text-sm">No departments configured. Add a department to get started.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {departments.map((dept) => (
                  <Badge key={dept.id} variant="secondary" className="flex items-center gap-2 py-1.5 px-3">
                    <span>{dept.name}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-4 w-4 p-0"
                      onClick={() => deleteDeptMutation.mutate(dept.id)}
                      disabled={deleteDeptMutation.isPending}
                      data-testid={`button-delete-department-${dept.id}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
