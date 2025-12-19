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
    <div className="space-y-3 animate-in fade-in duration-500 h-screen overflow-hidden flex flex-col">
      <div className="flex-shrink-0">
        <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Fleet performance overview</p>
      </div>

      <div className="grid grid-cols-5 gap-2 flex-shrink-0">
        <StatsCard 
          title="Vehicles" 
          value={totalVehicles} 
          icon={Car}
        />
        <StatsCard 
          title="Active" 
          value={activeRentals} 
          icon={CalendarCheck}
        />
        <StatsCard 
          title="Maintenance" 
          value={vehiclesInMaintenance} 
          icon={Wrench}
          className={vehiclesInMaintenance > 0 ? "border-l-4 border-l-amber-500" : ""}
        />
        <StatsCard 
          title="Pending" 
          value={pendingBookings} 
          icon={AlertCircle}
          className={pendingBookings > 0 ? "border-l-4 border-l-red-500" : ""}
        />
        <StatsCard 
          title="Completion" 
          value={`${bookingCompletionRate}%`}
          icon={TrendingUp}
          className="border-l-4 border-l-green-500"
        />
      </div>

      <div className="grid grid-cols-3 gap-2 flex-1 overflow-hidden min-h-0">
        <Card className="shadow-md border-none flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Fuel className="w-4 h-4 text-primary" />
              Fuel Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden flex flex-col">
            <div className="text-xs mb-1">
              <p className="text-muted-foreground">Total Cost</p>
              <p className="text-lg font-bold">${totalFuelCost.toFixed(2)}</p>
            </div>
            <div className="flex-1 min-h-0">
              {fuelChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={fuelChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="cost" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                  No fuel data
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md border-none flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Car className="w-4 h-4 text-primary" />
              Fleet Status
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden flex flex-col">
            {vehicleStatusData.length > 0 ? (
              <div className="flex-1 min-h-0 flex flex-col">
                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={vehicleStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={65}
                        dataKey="value"
                      >
                        {vehicleStatusData.map((item, idx) => (
                          <Cell key={idx} fill={item.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1 text-xs mt-2">
                  {vehicleStatusData.map((item) => (
                    <div key={item.name} className="flex justify-between items-center">
                      <span className="text-muted-foreground">{item.name}</span>
                      <Badge variant="outline" className="text-xs">{item.value}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-muted-foreground">No vehicles</div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-2">
          <Card className="shadow-md border-none flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Booking Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {bookingStatusData.map((item) => (
                  <div key={item.status} className="text-center">
                    <p className="text-lg font-bold">{item.count}</p>
                    <p className="text-xs text-muted-foreground">{item.status}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md border-none flex-1 flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-primary" />
                Recent
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              <div className="space-y-2">
                {bookings?.slice(0, 3).map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                        {booking.user.username.slice(0,1).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs truncate">{booking.vehicle.make}</p>
                        <p className="text-xs text-muted-foreground">{new Date(booking.startTime).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <Badge variant={booking.status === 'approved' ? 'default' : booking.status === 'pending' ? 'secondary' : 'outline'} className="text-xs flex-shrink-0">
                      {booking.status === 'completed' ? 'Done' : booking.status === 'pending' ? 'Pending' : 'OK'}
                    </Badge>
                  </div>
                ))}
                {(!bookings || bookings.length === 0) && (
                  <div className="text-center text-muted-foreground text-xs py-2">No bookings</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
