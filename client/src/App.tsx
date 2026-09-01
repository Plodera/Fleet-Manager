import { useEffect } from "react";
import { Switch, Route, Redirect } from "wouter";
import { queryClient, SESSION_INVALIDATED_EVENT } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/Sidebar";
import { LanguageProvider, useLanguage } from "@/lib/i18n";

// Pages
import Dashboard from "@/pages/Dashboard";
import Vehicles from "@/pages/Vehicles";
import Bookings from "@/pages/Bookings";
import SharedRides from "@/pages/SharedRides";
import Maintenance from "@/pages/Maintenance";
import VehicleInspections from "@/pages/VehicleInspections";
import Fuel from "@/pages/Fuel";
import Users from "@/pages/Users";
import Settings from "@/pages/Settings";
import Reports from "@/pages/Reports";
import Auth from "@/pages/Auth";
import NotFound from "@/pages/not-found";
import BookingPrintView from "@/pages/BookingPrintView";
import SharedRidePrintView from "@/pages/SharedRidePrintView";
import DriverDashboard from "@/pages/DriverDashboard";
import EquipmentTypes from "@/pages/EquipmentTypes";
import WorkOrders from "@/pages/WorkOrders";
import WorkOrderConfig from "@/pages/WorkOrderConfig";
import WorkOrderReports from "@/pages/WorkOrderReports";
import Indents from "@/pages/Indents";
import TVDashboardConfig from "@/pages/TVDashboardConfig";
import TVDashboard from "@/pages/TVDashboard";
import TVDashboardIndex from "@/pages/TVDashboardIndex";
import StatusTracker from "@/pages/StatusTracker";
import ITMonitorConfig from "@/pages/ITMonitorConfig";
import ITDashboard from "@/pages/ITDashboard";
import ITNetworkOperations from "@/pages/ITNetworkOperations";
import FactoryMachines from "@/pages/FactoryMachines";
import FactoryMachineTypeConfig from "@/pages/FactoryMachineTypeConfig";
import MachineStatus from "@/pages/MachineStatus";
import LicenseExpiry from "@/pages/LicenseExpiry";

function PrivateRoute({ component: Component, adminOnly = false, requiredPermission, anyPermission, driverOnly = false, noShell = false }: { component: React.ComponentType, adminOnly?: boolean, requiredPermission?: string, anyPermission?: string[], driverOnly?: boolean, noShell?: boolean }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div className="flex h-screen items-center justify-center text-primary">Loading...</div>;
  if (!user) return <Redirect to="/auth" />;
  if (adminOnly && user.role !== 'admin') return <Redirect to="/" />;

  // Driver-only route check
  if (driverOnly && !user.isDriver) {
    return <Redirect to="/" />;
  }

  const userPermissions: string[] = (() => {
    if (!user.permissions) return [];
    if (Array.isArray(user.permissions)) return user.permissions;
    try { return JSON.parse(user.permissions as string); } catch { return []; }
  })();

  // Check single required permission (admins bypass)
  if (requiredPermission && user.role !== 'admin') {
    if (!userPermissions.includes(requiredPermission)) return <Redirect to="/" />;
  }

  // Check any-of permission list (admins bypass)
  if (anyPermission && user.role !== 'admin') {
    if (!anyPermission.some(p => userPermissions.includes(p))) return <Redirect to="/" />;
  }

  if (noShell) return <Component />;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto h-screen w-full">
        <div className="max-w-7xl mx-auto pb-12">
          <Component />
        </div>
      </main>
    </div>
  );
}

function PrintRoute({ component: Component, requiredPermission }: { component: React.ComponentType, requiredPermission?: string }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div className="flex h-screen items-center justify-center text-primary">Loading...</div>;
  if (!user) return <Redirect to="/auth" />;
  
  if (requiredPermission && user.role !== 'admin') {
    const userPermissions: string[] = (() => {
      if (!user.permissions) return [];
      if (Array.isArray(user.permissions)) return user.permissions;
      try {
        return JSON.parse(user.permissions as string);
      } catch {
        return [];
      }
    })();
    
    if (!userPermissions.includes(requiredPermission)) {
      return <Redirect to="/" />;
    }
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={Auth} />
      
      <Route path="/">
        <PrivateRoute component={Dashboard} requiredPermission="view_dashboard" />
      </Route>
      <Route path="/driver-dashboard">
        <PrivateRoute component={DriverDashboard} driverOnly />
      </Route>
      <Route path="/vehicles">
        <PrivateRoute component={Vehicles} requiredPermission="view_vehicles" />
      </Route>
      <Route path="/bookings">
        <PrivateRoute component={Bookings} requiredPermission="view_bookings" />
      </Route>
      <Route path="/shared-rides">
        <PrivateRoute component={SharedRides} requiredPermission="view_shared_rides" />
      </Route>
      <Route path="/maintenance">
        <PrivateRoute component={Maintenance} requiredPermission="view_maintenance" />
      </Route>
      <Route path="/vehicle-inspections">
        <PrivateRoute component={VehicleInspections} requiredPermission="view_inspections" />
      </Route>
      <Route path="/fuel">
        <PrivateRoute component={Fuel} requiredPermission="view_fuel" />
      </Route>
      <Route path="/users">
        <PrivateRoute component={Users} adminOnly />
      </Route>
      <Route path="/settings">
        <PrivateRoute component={Settings} adminOnly />
      </Route>
      <Route path="/equipment-types">
        <PrivateRoute component={EquipmentTypes} adminOnly />
      </Route>
      <Route path="/work-orders">
        <PrivateRoute component={WorkOrders} requiredPermission="view_work_orders" />
      </Route>
      <Route path="/work-order-config">
        <PrivateRoute component={WorkOrderConfig} adminOnly />
      </Route>
      <Route path="/work-order-reports">
        <PrivateRoute component={WorkOrderReports} requiredPermission="view_work_order_reports" />
      </Route>
      <Route path="/indents">
        <PrivateRoute component={Indents} requiredPermission="view_indents" />
      </Route>
      <Route path="/reports">
        <PrivateRoute component={Reports} requiredPermission="view_reports" />
      </Route>
      
      <Route path="/bookings/:id/print">
        <PrintRoute component={BookingPrintView} requiredPermission="view_bookings" />
      </Route>
      <Route path="/shared-rides/:id/print">
        <PrintRoute component={SharedRidePrintView} requiredPermission="view_shared_rides" />
      </Route>
      
      <Route path="/status-tracker">
        <PrivateRoute component={StatusTracker} requiredPermission="view_trackers" />
      </Route>
      <Route path="/license-expiry">
        <PrivateRoute component={LicenseExpiry} anyPermission={["view_license_expiry", "view_company_documents"]} />
      </Route>
      <Route path="/tv-dashboard-config">
        <PrivateRoute component={TVDashboardConfig} anyPermission={["manage_tv_dashboards","manage_tv_kpis","tv_data_entry","manage_tv_videos"]} />
      </Route>
      <Route path="/tv-dashboard/:id">
        <PrivateRoute component={TVDashboard} requiredPermission="view_tv_dashboard" noShell />
      </Route>
      <Route path="/tv-dashboard">
        <PrivateRoute component={TVDashboardIndex} requiredPermission="view_tv_dashboard" />
      </Route>
      <Route path="/it-monitor-config">
        <PrivateRoute component={ITMonitorConfig} requiredPermission="view_it_monitor" />
      </Route>
      <Route path="/it-dashboard">
        <PrivateRoute component={ITDashboard} requiredPermission="view_it_dashboard" noShell />
      </Route>
      <Route path="/it-network-operations">
        <PrivateRoute component={ITNetworkOperations} requiredPermission="view_it_monitor" />
      </Route>
      <Route path="/factory-machines">
        <PrivateRoute component={FactoryMachines} requiredPermission="view_factory_machines" />
      </Route>
      <Route path="/factory-machine-type-config">
        <PrivateRoute component={FactoryMachineTypeConfig} adminOnly />
      </Route>
      <Route path="/machine/:slug" component={MachineStatus} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function SessionInvalidationListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handleSessionInvalidated = (event: CustomEvent<{ message: string }>) => {
      toast({
        title: "Session Expired",
        description: event.detail.message,
        variant: "destructive",
        duration: 5000,
      });
    };

    window.addEventListener(SESSION_INVALIDATED_EVENT, handleSessionInvalidated as EventListener);
    return () => {
      window.removeEventListener(SESSION_INVALIDATED_EVENT, handleSessionInvalidated as EventListener);
    };
  }, [toast]);

  return null;
}

function ExpiryLoginAlerts({ alertTitle, expiryDateLabel }: { alertTitle: string; expiryDateLabel: string }) {
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;
    const key = `expiry-login-alerts-${user.id}-${new Date().toISOString().slice(0, 10)}`;
    if (sessionStorage.getItem(key)) return;
    fetch("/api/expiry-notifications/mine")
      .then(response => response.ok ? response.json() : [])
      .then((notifications: Array<{ id: number; entityName: string; expiryDate: string; status: string }>) => {
        const openNotifications = notifications.filter(notification => notification.status === "open").slice(0, 5);
        if (openNotifications.length > 0) {
          openNotifications.forEach(notification => toast({
            title: alertTitle,
            description: `${notification.entityName} — ${expiryDateLabel}: ${notification.expiryDate}`,
            variant: "destructive",
            duration: 8000,
          }));
          sessionStorage.setItem(key, "shown");
        }
      })
      .catch(() => undefined);
  }, [user, toast, alertTitle, expiryDateLabel]);

  return null;
}

function AppServices() {
  const { t } = useLanguage();

  return (
    <>
      <SessionInvalidationListener />
      <ExpiryLoginAlerts
        alertTitle={t.licenseExpiry.myAlerts}
        expiryDateLabel={t.licenseExpiry.expiryDate}
      />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <AppServices />
          <Toaster />
          <Router />
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
