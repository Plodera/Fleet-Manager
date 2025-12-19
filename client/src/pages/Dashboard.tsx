import { useVehicles } from "@/hooks/use-vehicles";
import { useBookings } from "@/hooks/use-bookings";
import { useMaintenance as useMaintenanceHook, useFuel as useFuelHook } from "@/hooks/use-records";
import { StatsCard } from "@/components/StatsCard";
import { Car, CalendarCheck, Wrench, Fuel, AlertCircle, TrendingUp, Clock, Activity } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
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
      <div className="p-6 space-y-6">
        <div className="space-y-1">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-80 rounded-xl lg:col-span-2" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  const totalVehicles = vehicles?.length || 0;
  const activeRentals = vehicles?.filter(v => v.status === "rented").length || 0;
  const availableVehicles = vehicles?.filter(v => v.status === "available").length || 0;
  const pendingBookings = bookings?.filter(b => b.status === "pending").length || 0;
  const vehiclesInMaintenance = vehicles?.filter(v => v.status === "maintenance").length || 0;
  const completedBookings = bookings?.filter(b => b.status === "completed").length || 0;
  const approvedBookings = bookings?.filter(b => b.status === "approved").length || 0;
  const bookingCompletionRate = bookings && bookings.length > 0 
    ? Math.round((completedBookings / bookings.length) * 100)
    : 0;
  const totalFuelCost = fuel?.reduce((sum, curr) => sum + Number(curr.totalCost), 0) || 0;
  
  const fuelCostByVehicle = fuel?.reduce((acc, curr) => {
    const vName = curr.vehicle.make + ' ' + curr.vehicle.model;
    acc[vName] = (acc[vName] || 0) + Number(curr.totalCost);
    return acc;
  }, {} as Record<string, number>);

  const fuelChartData = Object.entries(fuelCostByVehicle || {})
    .map(([name, cost]) => ({ name: name.length > 12 ? name.slice(0, 12) + '...' : name, cost }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 5);

  const vehicleStatusData = [
    { name: 'Available', value: availableVehicles, color: '#10b981' },
    { name: 'In Use', value: activeRentals, color: '#3b82f6' },
    { name: 'Maintenance', value: vehiclesInMaintenance, color: '#f59e0b' }
  ].filter(item => item.value > 0);

  const bookingStatusData = [
    { status: 'Pending', count: pendingBookings, dotColor: 'bg-amber-500' },
    { status: 'Approved', count: approvedBookings, dotColor: 'bg-emerald-500' },
    { status: 'Completed', count: completedBookings, dotColor: 'bg-blue-500' }
  ];

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-dashboard-title">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Overview of your fleet management system</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          title="Total Vehicles" 
          value={totalVehicles}
          description={`${availableVehicles} available`}
          icon={Car}
          variant="primary"
          data-testid="card-total-vehicles"
        />
        <StatsCard 
          title="Active Rentals" 
          value={activeRentals}
          description="Currently in use"
          icon={CalendarCheck}
          variant="success"
          data-testid="card-active-rentals"
        />
        <StatsCard 
          title="In Maintenance" 
          value={vehiclesInMaintenance}
          description={vehiclesInMaintenance > 0 ? "Requires attention" : "All clear"}
          icon={Wrench}
          variant={vehiclesInMaintenance > 0 ? "warning" : "default"}
          data-testid="card-maintenance"
        />
        <StatsCard 
          title="Pending Approval" 
          value={pendingBookings}
          description={pendingBookings > 0 ? "Action needed" : "No pending"}
          icon={AlertCircle}
          variant={pendingBookings > 0 ? "danger" : "default"}
          data-testid="card-pending"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Fuel className="w-4 h-4 text-primary" />
                  Fuel Cost by Vehicle
                </CardTitle>
                <CardDescription className="mt-1">Top 5 vehicles by fuel expense</CardDescription>
              </div>
              <Badge variant="secondary" className="font-mono">
                ${totalFuelCost.toFixed(0)} total
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {fuelChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={fuelChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="name" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '8px', 
                        border: '1px solid hsl(var(--border))',
                        backgroundColor: 'hsl(var(--card))',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                      }}
                      formatter={(value: number) => [`$${value.toFixed(2)}`, 'Cost']}
                    />
                    <Bar 
                      dataKey="cost" 
                      fill="hsl(var(--primary))" 
                      radius={[6, 6, 0, 0]}
                      maxBarSize={50}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Fuel className="w-10 h-10 mb-2 opacity-20" />
                  <p className="text-sm">No fuel records yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Fleet Status
            </CardTitle>
            <CardDescription>Current vehicle distribution</CardDescription>
          </CardHeader>
          <CardContent>
            {vehicleStatusData.length > 0 ? (
              <div className="flex flex-col">
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={vehicleStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {vehicleStatusData.map((item, idx) => (
                          <Cell key={idx} fill={item.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 mt-4">
                  {vehicleStatusData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-sm text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="text-sm font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-52 text-muted-foreground">
                <Car className="w-10 h-10 mb-2 opacity-20" />
                <p className="text-sm">No vehicles registered</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Booking Overview
            </CardTitle>
            <CardDescription>Current booking status breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {bookingStatusData.map((item) => (
                <div key={item.status} className="text-center p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className={cn("w-2 h-2 rounded-full", item.dotColor)} />
                    <span className="text-xs text-muted-foreground font-medium">{item.status}</span>
                  </div>
                  <p className="text-2xl font-bold">{item.count}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Completion Rate</span>
                <span className="text-lg font-bold text-primary">{bookingCompletionRate}%</span>
              </div>
              <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${bookingCompletionRate}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Recent Bookings
            </CardTitle>
            <CardDescription>Latest booking activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {bookings?.slice(0, 4).map((booking) => (
                <div 
                  key={booking.id} 
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  data-testid={`booking-item-${booking.id}`}
                >
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary flex-shrink-0">
                    {booking.user.username.slice(0,1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {booking.vehicle.make} {booking.vehicle.model}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(booking.startTime).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <Badge 
                    variant={
                      booking.status === 'approved' ? 'default' : 
                      booking.status === 'pending' ? 'secondary' : 
                      booking.status === 'completed' ? 'outline' : 'destructive'
                    }
                    className="flex-shrink-0"
                  >
                    {booking.status}
                  </Badge>
                </div>
              ))}
              {(!bookings || bookings.length === 0) && (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <CalendarCheck className="w-10 h-10 mb-2 opacity-20" />
                  <p className="text-sm">No bookings yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
