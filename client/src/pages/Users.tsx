import { useState } from "react";
import { useUsers } from "@/hooks/use-users";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/lib/i18n";
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
import { Users as UsersIcon, Shield, UserPlus, Edit2, Lock, CheckCircle, Key, Mail, Building2, Trash2, Plus, User, Info, Car, FileCheck, Eye, PackageSearch } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { Label } from "@/components/ui/label";

export default function Users() {
  const { users, isLoading, createUser, isCreatingUser, updateRole, isUpdatingRole, updatePermissions, isUpdatingPermissions, updateApprover, isUpdatingApprover, updateDriver, isUpdatingDriver, updatePassword, isUpdatingPassword, updateEmail, isUpdatingEmail, deleteUser, isDeletingUser, updateProfile, isUpdatingProfile } = useUsers();
  const { user: currentUser } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();

  const getPermLabel = (perm: typeof AVAILABLE_PERMISSIONS[number]) => {
    return language === "pt" ? perm.labelPt : perm.label;
  };
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editingPermissionsUserId, setEditingPermissionsUserId] = useState<number | null>(null);
  const [pendingPermissions, setPendingPermissions] = useState<string[]>([]);
  const [changePasswordUserId, setChangePasswordUserId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [editEmailUserId, setEditEmailUserId] = useState<number | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [isDeptDialogOpen, setIsDeptDialogOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptDesc, setNewDeptDesc] = useState("");
  const [editProfileUserId, setEditProfileUserId] = useState<number | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editFullName, setEditFullName] = useState("");
  const [indentApproverUserId, setIndentApproverUserId] = useState<number | null>(null);
  const [pendingApproverDepts, setPendingApproverDepts] = useState<number[]>([]);

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const { data: approverAssignments = [] } = useQuery<any[]>({
    queryKey: ["/api/indent-approvers"],
    enabled: currentUser?.role === "admin",
  });

  const saveApproverDeptsMutation = useMutation({
    mutationFn: async (data: { userId: number; departmentIds: number[] }) => {
      const res = await apiRequest("POST", "/api/indent-approvers", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/indent-approvers"] });
      setIndentApproverUserId(null);
      setPendingApproverDepts([]);
      toast({ title: language === "pt" ? "Departamentos de aprovação guardados" : "Approver departments saved" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
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

  const t = useLanguage().t;
  const um = t.userManagement;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader
        title={um.title}
        description={um.subtitle}
        icon={<UsersIcon className="w-5 h-5 text-primary" />}
        actions={currentUser?.role === 'admin' ? (
          <Button className="shadow-lg shadow-primary/25" onClick={() => setIsDialogOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            {um.addUser}
          </Button>
        ) : undefined}
      />

        {currentUser?.role === 'admin' && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{um.createUser}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="fullName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{um.fullName}</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="username" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{um.username}</FormLabel>
                      <FormControl>
                        <Input placeholder="jdoe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{um.changePassword}</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{um.email}</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="user@example.com" {...field} data-testid="input-user-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="role" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{um.role}</FormLabel>
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
                      <FormLabel>{um.department}</FormLabel>
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
                      <FormLabel>{um.licenseNumber}</FormLabel>
                      <FormControl>
                        <Input placeholder="Optional" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="permissions" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{um.accessRights}</FormLabel>
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
                            <label className="text-sm font-medium cursor-pointer">{getPermLabel(perm)}</label>
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <Button type="submit" className="w-full" disabled={isCreatingUser}>
                    {isCreatingUser ? um.creating : um.createUser}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}

      {currentUser?.role === 'admin' && (
        <Card className="border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-blue-900 dark:text-blue-200">{um.rolesGuide}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                  <div className="flex items-start gap-2">
                    <Shield className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <span className="font-medium">{um.role}</span>
                      <p className="text-xs text-muted-foreground">{um.roleExplanation}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <FileCheck className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-medium">{um.approver}</span>
                      <p className="text-xs text-muted-foreground">{um.approverExplanation}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Car className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-medium">{um.driver}</span>
                      <p className="text-xs text-muted-foreground">{um.driverExplanation}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Eye className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-medium">{um.permissions}</span>
                      <p className="text-xs text-muted-foreground">{um.permissionsExplanation}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-none shadow-md overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-primary" />
            {um.registeredUsers}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>{um.fullName}</TableHead>
                <TableHead>{um.role}</TableHead>
                <TableHead>{um.department}</TableHead>
                <TableHead>
                  <div className="flex items-center gap-1">
                    <FileCheck className="w-3.5 h-3.5 text-green-600" />
                    {um.approver}
                  </div>
                  <span className="text-xs font-normal text-muted-foreground">{um.approverDesc}</span>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-1">
                    <Car className="w-3.5 h-3.5 text-blue-600" />
                    {um.driver}
                  </div>
                  <span className="text-xs font-normal text-muted-foreground">{um.driverDesc}</span>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-orange-600" />
                    {um.permissions}
                  </div>
                  <span className="text-xs font-normal text-muted-foreground">{um.permissionsDesc}</span>
                </TableHead>
                {currentUser?.role === 'admin' && <TableHead>{um.actions}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={currentUser?.role === 'admin' ? 7 : 6} className="h-24 text-center">{t.labels.loading}</TableCell>
                </TableRow>
              ) : users?.map((user) => {
                const userPermissions = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions || [];
                return (
                <TableRow key={user.id} className="hover:bg-muted/20">
                  <TableCell>
                    <div>
                      <div className="font-medium">{user.fullName}</div>
                      <div className="text-xs text-muted-foreground">{user.username}{user.email ? ` · ${user.email}` : ''}</div>
                    </div>
                  </TableCell>
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
                  <TableCell>
                    {currentUser?.role === 'admin' ? (
                      <Button
                        size="sm"
                        variant={user.isApprover ? "default" : "outline"}
                        onClick={() => updateApprover({ userId: user.id, isApprover: !user.isApprover })}
                        disabled={isUpdatingApprover}
                        data-testid={`button-toggle-approver-${user.id}`}
                        className={user.isApprover ? "bg-green-600 hover:bg-green-700" : "border-muted-foreground/30"}
                      >
                        <FileCheck className="w-4 h-4 mr-1" />
                        {user.isApprover ? um.approver : um.notApprover}
                      </Button>
                    ) : (
                      user.isApprover ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                          <FileCheck className="w-3 h-3 mr-1" />
                          {um.approver}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )
                    )}
                  </TableCell>
                  <TableCell>
                    {currentUser?.role === 'admin' ? (
                      <Button
                        size="sm"
                        variant={(user as any).isDriver ? "default" : "outline"}
                        onClick={() => updateDriver({ userId: user.id, isDriver: !(user as any).isDriver })}
                        disabled={isUpdatingDriver}
                        data-testid={`button-toggle-driver-${user.id}`}
                        className={(user as any).isDriver ? "bg-blue-600 hover:bg-blue-700" : "border-muted-foreground/30"}
                      >
                        <Car className="w-4 h-4 mr-1" />
                        {(user as any).isDriver ? um.driver : um.notDriver}
                      </Button>
                    ) : (
                      (user as any).isDriver ? (
                        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200">
                          <Car className="w-3 h-3 mr-1" />
                          {um.driver}
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
                            <DialogTitle>{um.editAccessRights}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-3">
                            {AVAILABLE_PERMISSIONS.map((perm) => (
                              <div key={perm.id} className="flex items-center space-x-2">
                                <Checkbox
                                  checked={pendingPermissions.includes(perm.id)}
                                  onCheckedChange={(checked) => {
                                    setPendingPermissions((prev) =>
                                      checked
                                        ? [...prev, perm.id]
                                        : prev.filter((p) => p !== perm.id)
                                    );
                                  }}
                                  data-testid={`checkbox-edit-permission-${perm.id}-${user.id}`}
                                />
                                <label className="text-sm font-medium cursor-pointer">{getPermLabel(perm)}</label>
                              </div>
                            ))}
                          </div>
                          <Button
                            onClick={() => {
                              updatePermissions({ userId: user.id, permissions: pendingPermissions }, {
                                onSuccess: () => setEditingPermissionsUserId(null),
                              });
                            }}
                            disabled={isUpdatingPermissions}
                            data-testid={`button-save-permissions-${user.id}`}
                          >
                            {isUpdatingPermissions ? um.saving : t.buttons.save}
                          </Button>
                        </DialogContent>
                      </Dialog>
                    ) : (
                      <div className="flex items-center gap-1 flex-wrap">
                        {userPermissions.length > 0 ? (
                          <>
                            {userPermissions.slice(0, 2).map((perm: string) => {
                              const permDef = AVAILABLE_PERMISSIONS.find(p => p.id === perm);
                              const displayLabel = permDef ? (language === "pt" ? permDef.labelPt : permDef.label) : perm.replace('view_', '').replace('manage_', '');
                              return <Badge key={perm} variant="outline" className="text-xs capitalize">{displayLabel}</Badge>;
                            })}
                            {userPermissions.length > 2 && (
                              <Badge variant="outline" className="text-xs">+{userPermissions.length - 2}</Badge>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">{um.none}</span>
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
                            <Dialog open={editProfileUserId === user.id} onOpenChange={(open) => {
                              if (!open) {
                                setEditProfileUserId(null);
                                setEditUsername("");
                                setEditFullName("");
                              }
                            }}>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditProfileUserId(user.id);
                                    setEditUsername(user.username);
                                    setEditFullName(user.fullName);
                                  }}
                                  disabled={isUpdatingProfile}
                                  data-testid={`button-edit-profile-${user.id}`}
                                >
                                  <User className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>{um.editProfile} - {user.fullName}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <label className="text-sm font-medium">{um.fullName}</label>
                                    <Input
                                      placeholder="John Doe"
                                      value={editFullName}
                                      onChange={(e) => setEditFullName(e.target.value)}
                                      data-testid={`input-edit-fullname-${user.id}`}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">{um.username}</label>
                                    <Input
                                      placeholder="johndoe"
                                      value={editUsername}
                                      onChange={(e) => setEditUsername(e.target.value)}
                                      data-testid={`input-edit-username-${user.id}`}
                                    />
                                  </div>
                                  <Button
                                    onClick={() => {
                                      const hasChanges = editUsername !== user.username || editFullName !== user.fullName;
                                      if (!hasChanges) return;
                                      updateProfile({ 
                                        userId: user.id, 
                                        username: editUsername !== user.username ? editUsername : undefined,
                                        fullName: editFullName !== user.fullName ? editFullName : undefined
                                      }, {
                                        onSuccess: () => {
                                          setEditProfileUserId(null);
                                          setEditUsername("");
                                          setEditFullName("");
                                        }
                                      });
                                    }}
                                    disabled={(editUsername === user.username && editFullName === user.fullName) || isUpdatingProfile}
                                    data-testid={`button-confirm-profile-${user.id}`}
                                  >
                                    {isUpdatingProfile ? um.updating : um.updateProfile}
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
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
                              onClick={() => {
                                setEditingPermissionsUserId(user.id);
                                setPendingPermissions(userPermissions);
                              }}
                              disabled={isUpdatingPermissions}
                              data-testid={`button-edit-permissions-${user.id}`}
                            >
                              <Lock className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setIndentApproverUserId(user.id);
                                const userDepts = approverAssignments
                                  .filter((a: any) => a.userId === user.id)
                                  .map((a: any) => a.departmentId);
                                setPendingApproverDepts(userDepts);
                              }}
                              data-testid={`button-indent-approver-${user.id}`}
                              title={language === "pt" ? "Departamentos de Aprovação de Requisições" : "Indent Approval Departments"}
                            >
                              <PackageSearch className="w-4 h-4" />
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
                                  <DialogTitle>{um.editEmail} - {user.fullName}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <label className="text-sm font-medium">{um.email}</label>
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
                                    {isUpdatingEmail ? um.updating : um.updateEmail}
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
                                  <DialogTitle>{um.changePassword} - {user.fullName}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <label className="text-sm font-medium">{um.newPassword}</label>
                                    <Input
                                      type="password"
                                      placeholder={um.passwordPlaceholder}
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
                                    {isUpdatingPassword ? um.updating : um.updatePassword}
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                            {user.id !== currentUser?.id && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => {
                                  if (confirm(`${um.deleteConfirm} ${user.fullName}? ${um.cannotUndo}`)) {
                                    deleteUser(user.id);
                                  }
                                }}
                                disabled={isDeletingUser}
                                data-testid={`button-delete-user-${user.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
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
              {um.departments}
            </CardTitle>
            <Dialog open={isDeptDialogOpen} onOpenChange={setIsDeptDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-add-department">
                  <Plus className="w-4 h-4 mr-2" />
                  {um.addDepartment}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{um.createDepartment}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">{um.deptName}</label>
                    <Input
                      placeholder="Department name"
                      value={newDeptName}
                      onChange={(e) => setNewDeptName(e.target.value)}
                      data-testid="input-department-name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">{um.deptDesc}</label>
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
                    {createDeptMutation.isPending ? um.creating : um.createDepartment}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {departments.length === 0 ? (
              <p className="text-muted-foreground text-sm">{um.noDepartments}</p>
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

      {/* Indent Approver Departments Dialog */}
      <Dialog open={indentApproverUserId !== null} onOpenChange={(open) => {
        if (!open) {
          setIndentApproverUserId(null);
          setPendingApproverDepts([]);
        }
      }}>
        <DialogContent data-testid="dialog-indent-approver-depts">
          <DialogHeader>
            <DialogTitle>
              {language === "pt" ? "Departamentos de Aprovação de Requisições" : "Indent Approval Departments"}
              {indentApproverUserId && (() => {
                const u = users?.find((u) => u.id === indentApproverUserId);
                return u ? ` — ${u.fullName}` : "";
              })()}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {language === "pt"
              ? "Selecione os departamentos para os quais este utilizador pode aprovar requisições."
              : "Select which departments this user can approve indents for."}
          </p>
          <div className="space-y-2 border rounded-md p-4 bg-muted/30">
            {departments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {language === "pt" ? "Nenhum departamento configurado" : "No departments configured"}
              </p>
            ) : (
              departments.map((dept) => (
                <div key={dept.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`approver-dept-${dept.id}`}
                    checked={pendingApproverDepts.includes(dept.id)}
                    onCheckedChange={(checked) => {
                      setPendingApproverDepts(prev =>
                        checked ? [...prev, dept.id] : prev.filter(d => d !== dept.id)
                      );
                    }}
                    data-testid={`checkbox-approver-dept-${dept.id}`}
                  />
                  <label htmlFor={`approver-dept-${dept.id}`} className="text-sm font-medium cursor-pointer">{dept.name}</label>
                </div>
              ))
            )}
          </div>
          <Button
            onClick={() => {
              if (indentApproverUserId) {
                saveApproverDeptsMutation.mutate({
                  userId: indentApproverUserId,
                  departmentIds: pendingApproverDepts,
                });
              }
            }}
            disabled={saveApproverDeptsMutation.isPending}
            data-testid="button-save-approver-depts"
          >
            {saveApproverDeptsMutation.isPending
              ? (language === "pt" ? "Guardando..." : "Saving...")
              : t.buttons.save}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
