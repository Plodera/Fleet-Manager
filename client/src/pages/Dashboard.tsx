import { useVehicles } from "@/hooks/use-vehicles";
import { useBookings } from "@/hooks/use-bookings";
import { useMaintenance as useMaintenanceHook, useFuel as useFuelHook } from "@/hooks/use-records";
import { StatsCard } from "@/components/StatsCard";
import { Car, CalendarCheck, Wrench, Fuel, AlertCircle, TrendingUp, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
  const completedBookings = bookings?.filter(b => b.status === "completed").length || 0;
  const bookingCompletionRate = bookings && bookings.length > 0 
    ? Math.round((completedBookings / bookings.length) * 100)
    : 0;
  const totalFuelCost = fuel?.reduce((sum, curr) => sum + Number(curr.totalCost), 0) || 0;
  
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

  // 2. Vehicle Status Distribution
  const vehicleStatusData = [
    { name: 'Available', value: vehicles?.filter(v => v.status === 'available').length || 0, color: 'hsl(142, 71%, 45%)' },
    { name: 'In Use', value: activeRentals, color: 'hsl(221, 83%, 53%)' },
    { name: 'Maintenance', value: vehiclesInMaintenance, color: 'hsl(38, 92%, 50%)' }
  ].filter(item => item.value > 0);

  // 3. Booking Status Overview
  const bookingStatusData = [
    { status: 'Pending', count: pendingBookings, color: 'bg-yellow-100 text-yellow-700' },
    { status: 'Approved', count: bookings?.filter(b => b.status === 'approved').length || 0, color: 'bg-green-100 text-green-700' },
    { status: 'Completed', count: completedBookings, color: 'bg-blue-100 text-blue-700' }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground font-display">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Overview of fleet performance and activities.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard 
          title="Total Vehicles" 
          value={totalVehicles} 
          icon={Car}
        />
        <StatsCard 
          title="Active Rentals" 
          value={activeRentals} 
          icon={CalendarCheck}
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
          className={pendingBookings > 0 ? "border-l-4 border-l-red-500" : ""}
        />
        <StatsCard 
          title="Completion Rate" 
          value={`${bookingCompletionRate}%`}
          icon={TrendingUp}
          className="border-l-4 border-l-green-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="shadow-md border-none lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Fuel className="w-5 h-5 text-primary" />
              Fuel Consumption Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm">
                <p className="text-muted-foreground mb-2">Total Fleet Fuel Cost</p>
                <p className="text-2xl font-bold">${totalFuelCost.toFixed(2)}</p>
              </div>
              <div className="h-[250px]">
                {fuelChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={fuelChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip 
                        cursor={{ fill: '#F1F5F9' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="cost" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No fuel data available
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md border-none">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Car className="w-5 h-5 text-primary" />
              Fleet Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {vehicleStatusData.length > 0 ? (
              <div className="space-y-4">
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={vehicleStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        dataKey="value"
                      >
                        {vehicleStatusData.map((item, idx) => (
                          <Cell key={idx} fill={item.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 text-sm">
                  {vehicleStatusData.map((item) => (
                    <div key={item.name} className="flex justify-between items-center">
                      <span className="text-muted-foreground">{item.name}</span>
                      <Badge variant="outline" className="font-semibold">{item.value}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">No vehicles</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-md border-none">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Booking Status Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {bookingStatusData.map((item) => (
                <div key={item.status} className="text-center">
                  <p className={cn("text-2xl font-bold mb-1")}>{item.count}</p>
                  <p className="text-xs text-muted-foreground">{item.status}</p>
                </div>
              ))}
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
            <div className="space-y-3">
              {bookings?.slice(0, 4).map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {booking.user.username.slice(0,2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{booking.vehicle.make} {booking.vehicle.model}</p>
                      <p className="text-xs text-muted-foreground">{new Date(booking.startTime).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <Badge variant={
                    booking.status === 'approved' ? 'default' :
                    booking.status === 'pending' ? 'secondary' :
                    'outline'
                  } className="text-xs">
                    {booking.status}
                  </Badge>
                </div>
              ))}
              {(!bookings || bookings.length === 0) && (
                <div className="text-center text-muted-foreground py-8 text-sm">No bookings found</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
