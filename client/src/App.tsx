import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/Sidebar";

// Pages
import Dashboard from "@/pages/Dashboard";
import Vehicles from "@/pages/Vehicles";
import Bookings from "@/pages/Bookings";
import Maintenance from "@/pages/Maintenance";
import Fuel from "@/pages/Fuel";
import Users from "@/pages/Users";
import Auth from "@/pages/Auth";
import NotFound from "@/pages/not-found";

function PrivateRoute({ component: Component, adminOnly = false }: { component: React.ComponentType, adminOnly?: boolean }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div className="flex h-screen items-center justify-center text-primary">Loading...</div>;
  if (!user) return <Redirect to="/auth" />;
  if (adminOnly && user.role !== 'admin') return <Redirect to="/" />;

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

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={Auth} />
      
      <Route path="/">
        <PrivateRoute component={Dashboard} />
      </Route>
      <Route path="/vehicles">
        <PrivateRoute component={Vehicles} />
      </Route>
      <Route path="/bookings">
        <PrivateRoute component={Bookings} />
      </Route>
      <Route path="/maintenance">
        <PrivateRoute component={Maintenance} />
      </Route>
      <Route path="/fuel">
        <PrivateRoute component={Fuel} />
      </Route>
      <Route path="/users">
        <PrivateRoute component={Users} adminOnly />
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
