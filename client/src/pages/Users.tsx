import { useState } from "react";
import { useUsers } from "@/hooks/use-users";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { Users as UsersIcon, Shield, UserPlus, Edit2 } from "lucide-react";

export default function Users() {
  const { users, isLoading, createUser, isCreatingUser, updateRole, isUpdatingRole } = useUsers();
  const { user: currentUser } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);

  const form = useForm({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      password: "",
      fullName: "",
      role: "customer" as const,
      licenseNumber: "",
      department: "",
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
                      <FormControl>
                        <Input placeholder="Management, Operations..." {...field} />
                      </FormControl>
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
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>License #</TableHead>
                {currentUser?.role === 'admin' && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={currentUser?.role === 'admin' ? 6 : 5} className="h-24 text-center">Loading...</TableCell>
                </TableRow>
              ) : users?.map((user) => (
                <TableRow key={user.id} className="hover:bg-muted/20">
                  <TableCell className="font-medium">{user.fullName}</TableCell>
                  <TableCell>{user.username}</TableCell>
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
                  {currentUser?.role === 'admin' && (
                    <TableCell>
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
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingUserId(user.id)}
                          disabled={isUpdatingRole}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
