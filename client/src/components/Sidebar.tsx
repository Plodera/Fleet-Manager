import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Car, 
  CalendarDays, 
  Wrench, 
  Fuel, 
  Users, 
  LogOut,
  Menu,
  X,
  Settings,
  FileText
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  // Parse user permissions from JSON string
  const userPermissions: string[] = (() => {
    if (!user?.permissions) return [];
    if (Array.isArray(user.permissions)) return user.permissions;
    try {
      return JSON.parse(user.permissions as string);
    } catch {
      return [];
    }
  })();

  // Check if user has a specific permission (admins have all permissions)
  const hasPermission = (permission: string) => {
    if (user?.role === "admin") return true;
    return userPermissions.includes(permission);
  };

  const allLinks = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard, permission: "view_dashboard" },
    { href: "/vehicles", label: "Vehicles", icon: Car, permission: "view_vehicles" },
    { href: "/bookings", label: "Bookings", icon: CalendarDays, permission: "view_bookings" },
    { href: "/maintenance", label: "Maintenance", icon: Wrench, permission: "view_maintenance" },
    { href: "/fuel", label: "Fuel Log", icon: Fuel, permission: "view_fuel" },
    { href: "/reports", label: "Reports", icon: FileText, permission: "view_reports" },
    { href: "/users", label: "Users", icon: Users, permission: "admin_only" },
    { href: "/settings", label: "Settings", icon: Settings, permission: "admin_only" },
  ];

  // Filter links based on permissions
  const links = allLinks.filter(link => {
    if (link.permission === "admin_only") {
      return user?.role === "admin";
    }
    return hasPermission(link.permission);
  });

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Car className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg tracking-tight text-foreground">FleetCmD</h1>
            <p className="text-xs text-muted-foreground">Aisco Transport Mgmt</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location === link.href;
          return (
            <Link key={link.href} href={link.href} className={cn(
              "sidebar-link group",
              isActive ? "sidebar-link-active" : "sidebar-link-inactive"
            )} onClick={() => setOpen(false)}>
              <Icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border/50">
        <div className="bg-muted/50 rounded-xl p-4 mb-4">
          <p className="text-sm font-semibold text-foreground">{user?.fullName}</p>
          <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
        </div>
        <Button 
          variant="outline" 
          className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
          onClick={() => logout()}
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Trigger */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="shadow-lg bg-background">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72">
            <NavContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-border h-screen bg-card sticky top-0">
        <NavContent />
      </aside>
    </>
  );
}
