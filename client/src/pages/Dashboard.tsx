import { useVehicles } from "@/hooks/use-vehicles";
import { useBookings } from "@/hooks/use-bookings";
import { useMaintenance } from "@/hooks/use-maintenance"; // We'll assume these hook exports exist as defined in previous files
import { useFuel } from "@/hooks/use-fuel"; // Need to check export names, adjusting imports to match file `use-records.ts`

// Fix import
import { useMaintenance as useMaintenanceHook, useFuel as useFuelHook } from "@/hooks/use-records";

import { StatsCard } from "@/components/StatsCard";
import { Car, CalendarCheck, Wrench, Fuel, AlertCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { vehicles, isLoading: loadingVehicles } = useVehicles();
  const { bookings, isLoading: loadingBookings } = useBookings();
  const { records: maintenance, isLoading: loadingMaintenance } = useMaintenanceHook();
  const { records: fuel, isLoading: loadingFuel } = useFuelHook();

  if (loadingVehicles || loadingBookings || loadingMaintenance || loadingFuel) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  // Calculate Stats
  const totalVehicles = vehicles?.length || 0;
  const activeRentals = vehicles?.filter(v => v.status === "rented").length || 0;
  const pendingBookings = bookings?.filter(b => b.status === "pending").length || 0;
  const vehiclesInMaintenance = vehicles?.filter(v => v.status === "maintenance").length || 0;
  
  // Chart Data Preparation
  // 1. Fuel Cost per Vehicle (Top 5)
  const fuelCostByVehicle = fuel?.reduce((acc, curr) => {
    const vName = curr.vehicle.make + ' ' + curr.vehicle.model;
    acc[vName] = (acc[vName] || 0) + Number(curr.totalCost);
    return acc;
  }, {} as Record<string, number>);

  const fuelChartData = Object.entries(fuelCostByVehicle || {})
    .map(([name, cost]) => ({ name, cost }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 5);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground font-display">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Overview of fleet performance and activities.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          title="Total Vehicles" 
          value={totalVehicles} 
          icon={Car} 
          className="bg-white"
        />
        <StatsCard 
          title="Active Rentals" 
          value={activeRentals} 
          icon={CalendarCheck} 
          className="bg-white"
        />
        <StatsCard 
          title="In Maintenance" 
          value={vehiclesInMaintenance} 
          icon={Wrench} 
          className={vehiclesInMaintenance > 0 ? "border-l-4 border-l-amber-500" : ""}
        />
        <StatsCard 
          title="Pending Requests" 
          value={pendingBookings} 
          icon={AlertCircle} 
          className={pendingBookings > 0 ? "border-l-4 border-l-primary" : ""}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="shadow-md border-none">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Fuel className="w-5 h-5 text-primary" />
              Top Fuel Consumers (Cost)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {fuelChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={fuelChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} prefix="$" />
                    <Tooltip 
                      cursor={{ fill: '#F1F5F9' }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="cost" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No fuel data available yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md border-none">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-primary" />
              Recent Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {bookings?.slice(0, 5).map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-xs font-bold text-primary">
                      {booking.user.username.slice(0,2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{booking.vehicle.make} {booking.vehicle.model}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(booking.startTime).toLocaleDateString()} - {booking.purpose}
                      </p>
                    </div>
                  </div>
                  <div className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-medium",
                    booking.status === 'approved' ? "bg-green-100 text-green-700" :
                    booking.status === 'pending' ? "bg-yellow-100 text-yellow-700" :
                    booking.status === 'completed' ? "bg-blue-100 text-blue-700" :
                    "bg-gray-100 text-gray-700"
                  )}>
                    {booking.status}
                  </div>
                </div>
              ))}
              {(!bookings || bookings.length === 0) && (
                <div className="text-center text-muted-foreground py-8">No bookings found.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
