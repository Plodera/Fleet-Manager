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
  Settings2,
  FileText,
  UsersRound,
  Globe,
  Truck,
  ClipboardCheck,
  ClipboardList,
  Cog,
  BarChart3,
  KeyRound
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { api } from "@shared/routes";

interface NavLink {
  href: string;
  label: string;
  icon: any;
  permission: string;
  hideFromDriver: boolean;
}

interface NavSection {
  label: string;
  links: NavLink[];
}

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const { toast } = useToast();

  const usersT = t?.users || {} as any;

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: usersT.changePassword, description: usersT.passwordMismatch, variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: usersT.changePassword, description: usersT.passwordPlaceholder, variant: "destructive" });
      return;
    }
    setIsChangingPassword(true);
    try {
      await apiRequest(api.users.changeOwnPassword.method, api.users.changeOwnPassword.path, {
        currentPassword,
        newPassword,
      });
      toast({ title: usersT.changePassword, description: usersT.passwordChanged });
      setPasswordDialogOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("Current password is incorrect") || msg.includes("400")) {
        toast({ title: usersT.changePassword, description: usersT.currentPasswordIncorrect, variant: "destructive" });
      } else {
        toast({ title: usersT.changePassword, description: msg || "Failed to change password", variant: "destructive" });
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const userPermissions: string[] = (() => {
    if (!user?.permissions) return [];
    if (Array.isArray(user.permissions)) return user.permissions;
    try {
      return JSON.parse(user.permissions as string);
    } catch {
      return [];
    }
  })();

  const hasPermission = (permission: string) => {
    if (user?.role === "admin") return true;
    return userPermissions.includes(permission);
  };

  const isDriver = user?.isDriver === true;

  const isLinkVisible = (link: NavLink) => {
    if (link.permission === "driver_only") return isDriver;
    if (link.permission === "admin_only") return user?.role === "admin";
    if (isDriver && link.hideFromDriver) return false;
    return hasPermission(link.permission);
  };

  const sections: NavSection[] = [
    {
      label: t.nav.sectionOverview,
      links: [
        { href: "/", label: t.nav.dashboard, icon: LayoutDashboard, permission: "view_dashboard", hideFromDriver: false },
        { href: "/driver-dashboard", label: t.nav.driverDashboard, icon: Truck, permission: "driver_only", hideFromDriver: false },
      ],
    },
    {
      label: t.nav.sectionFleet,
      links: [
        { href: "/vehicles", label: t.nav.vehicles, icon: Car, permission: "view_vehicles", hideFromDriver: true },
        { href: "/bookings", label: t.nav.bookings, icon: CalendarDays, permission: "view_bookings", hideFromDriver: true },
        { href: "/shared-rides", label: t.nav.sharedRides, icon: UsersRound, permission: "view_shared_rides", hideFromDriver: true },
      ],
    },
    {
      label: t.nav.sectionOperations,
      links: [
        { href: "/maintenance", label: t.nav.maintenance, icon: Wrench, permission: "view_maintenance", hideFromDriver: true },
        { href: "/vehicle-inspections", label: t.nav.inspections, icon: ClipboardCheck, permission: "view_inspections", hideFromDriver: true },
        { href: "/work-orders", label: t.nav.workOrders, icon: ClipboardList, permission: "view_work_orders", hideFromDriver: true },
        { href: "/work-order-reports", label: t.nav.workOrderReports, icon: BarChart3, permission: "view_work_order_reports", hideFromDriver: true },
        { href: "/fuel", label: t.nav.fuel, icon: Fuel, permission: "view_fuel", hideFromDriver: true },
        { href: "/reports", label: t.nav.reports, icon: FileText, permission: "view_reports", hideFromDriver: true },
      ],
    },
    {
      label: t.nav.sectionAdmin,
      links: [
        { href: "/users", label: t.nav.users, icon: Users, permission: "admin_only", hideFromDriver: true },
        { href: "/settings", label: t.nav.settings, icon: Settings, permission: "admin_only", hideFromDriver: true },
        { href: "/equipment-types", label: t.nav.equipmentTypes, icon: Settings2, permission: "admin_only", hideFromDriver: true },
        { href: "/work-order-config", label: t.nav.workOrderConfig, icon: Cog, permission: "admin_only", hideFromDriver: true },
      ],
    },
  ];

  const visibleSections = sections
    .map(section => ({
      ...section,
      links: section.links.filter(isLinkVisible),
    }))
    .filter(section => section.links.length > 0);

  const navContent = (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Car className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg tracking-tight text-foreground">AAMS</h1>
            <p className="text-xs text-muted-foreground">Fleet Management</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 overflow-y-auto" data-testid="sidebar-nav">
        {visibleSections.map((section, sectionIndex) => (
          <div key={section.label} className={cn(sectionIndex > 0 && "mt-4")}>
            <div className="px-3 mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {section.label}
              </span>
            </div>
            <div className="space-y-0.5">
              {section.links.map((link) => {
                const Icon = link.icon;
                const isActive = location === link.href;
                return (
                  <Link key={link.href} href={link.href} className={cn(
                    "sidebar-link group",
                    isActive ? "sidebar-link-active" : "sidebar-link-inactive",
                  )} onClick={() => setOpen(false)} data-testid={`nav-link-${link.href.replace(/\//g, '-').replace(/^-/, '')}`}>
                    <Icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                    <span className="text-sm">{link.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-border/50">
        <div className="bg-muted/50 rounded-xl p-4 mb-4">
          <p className="text-sm font-semibold text-foreground">{user?.fullName}</p>
          <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
        </div>
        <div className="flex gap-2 mb-3">
          <Button 
            variant={language === "en" ? "default" : "outline"} 
            size="sm"
            className="flex-1 gap-1"
            onClick={() => setLanguage("en")}
            data-testid="button-lang-en"
          >
            <Globe className="w-3 h-3" />
            EN
          </Button>
          <Button 
            variant={language === "pt" ? "default" : "outline"} 
            size="sm"
            className="flex-1 gap-1"
            onClick={() => setLanguage("pt")}
            data-testid="button-lang-pt"
          >
            <Globe className="w-3 h-3" />
            PT
          </Button>
        </div>
        <Dialog open={passwordDialogOpen} onOpenChange={(open) => {
          setPasswordDialogOpen(open);
          if (!open) { setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }
        }}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2 mb-2"
              data-testid="button-change-password"
            >
              <KeyRound className="w-4 h-4" />
              {usersT.changePassword || "Change Password"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{usersT.changePassword || "Change Password"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>{usersT.currentPassword || "Current Password"}</Label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  data-testid="input-current-password"
                />
              </div>
              <div className="space-y-2">
                <Label>{usersT.newPassword || "New Password"}</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={usersT.passwordPlaceholder || "Enter new password (min 6 characters)"}
                  data-testid="input-new-password"
                />
              </div>
              <div className="space-y-2">
                <Label>{usersT.confirmNewPassword || "Confirm New Password"}</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  data-testid="input-confirm-password"
                />
              </div>
              <Button
                className="w-full"
                onClick={handleChangePassword}
                disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                data-testid="button-submit-change-password"
              >
                {isChangingPassword ? "..." : (usersT.updatePassword || "Update Password")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <Button 
          variant="outline" 
          className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
          onClick={() => logout()}
        >
          <LogOut className="w-4 h-4" />
          {t.nav.logout}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="shadow-lg bg-background">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72">
            {navContent}
          </SheetContent>
        </Sheet>
      </div>

      <aside className="hidden lg:flex flex-col w-64 border-r border-border h-screen bg-card sticky top-0">
        {navContent}
      </aside>
    </>
  );
}
