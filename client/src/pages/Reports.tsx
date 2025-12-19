import { useVehicles } from "@/hooks/use-vehicles";
import { useBookings } from "@/hooks/use-bookings";
import { useMaintenance as useMaintenanceHook, useFuel as useFuelHook } from "@/hooks/use-records";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area 
} from 'recharts';
import { 
  FileText, Car, CalendarDays, Fuel, Wrench, TrendingUp, 
  DollarSign, Activity, MapPin, Users
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function Reports() {
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
        <Skeleton className="h-12 w-96" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-80 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const totalFuelCost = fuel?.reduce((sum, curr) => sum + Number(curr.totalCost), 0) || 0;
  const totalMaintenanceCost = maintenance?.reduce((sum, curr) => sum + Number(curr.cost), 0) || 0;
  const totalMileage = bookings?.reduce((sum, curr) => sum + (curr.mileage || 0), 0) || 0;
  const totalGallons = fuel?.reduce((sum, curr) => sum + Number(curr.gallons), 0) || 0;

  const fuelByVehicle = fuel?.reduce((acc, curr) => {
    const vName = curr.vehicle ? `${curr.vehicle.make} ${curr.vehicle.model}` : `Vehicle ${curr.vehicleId}`;
    if (!acc[vName]) acc[vName] = { cost: 0, gallons: 0 };
    acc[vName].cost += Number(curr.totalCost);
    acc[vName].gallons += Number(curr.gallons);
    return acc;
  }, {} as Record<string, { cost: number; gallons: number }>);

  const fuelChartData = Object.entries(fuelByVehicle || {})
    .map(([name, data]) => ({ 
      name: name.length > 15 ? name.slice(0, 15) + '...' : name, 
      cost: data.cost,
      gallons: data.gallons
    }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 6);

  const maintenanceByType = maintenance?.reduce((acc, curr) => {
    acc[curr.type] = (acc[curr.type] || 0) + Number(curr.cost);
    return acc;
  }, {} as Record<string, number>);

  const maintenanceChartData = Object.entries(maintenanceByType || {})
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const bookingsByStatus = bookings?.reduce((acc, curr) => {
    acc[curr.status] = (acc[curr.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const bookingStatusData = Object.entries(bookingsByStatus || {})
    .map(([name, value], idx) => ({ 
      name: name.charAt(0).toUpperCase() + name.slice(1), 
      value,
      color: CHART_COLORS[idx % CHART_COLORS.length]
    }));

  const vehicleUtilization = vehicles?.map(vehicle => {
    const vehicleBookings = bookings?.filter(b => b.vehicleId === vehicle.id) || [];
    const completedCount = vehicleBookings.filter(b => b.status === 'completed').length;
    const totalMileageForVehicle = vehicleBookings.reduce((sum, b) => sum + (b.mileage || 0), 0);
    const fuelCostForVehicle = fuel?.filter(f => f.vehicleId === vehicle.id)
      .reduce((sum, f) => sum + Number(f.totalCost), 0) || 0;
    
    return {
      name: `${vehicle.make} ${vehicle.model}`.slice(0, 18),
      bookings: vehicleBookings.length,
      completed: completedCount,
      mileage: totalMileageForVehicle,
      fuelCost: fuelCostForVehicle,
      status: vehicle.status
    };
  }) || [];

  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), 5 - i);
    return {
      month: format(date, 'MMM'),
      start: startOfMonth(date),
      end: endOfMonth(date)
    };
  });

  const monthlyTrends = last6Months.map(({ month, start, end }) => {
    const monthBookings = bookings?.filter(b => {
      try {
        const bookingDate = new Date(b.startTime);
        return isWithinInterval(bookingDate, { start, end });
      } catch { return false; }
    }).length || 0;
    
    const monthFuel = fuel?.filter(f => {
      try {
        const fuelDate = new Date(f.date);
        return isWithinInterval(fuelDate, { start, end });
      } catch { return false; }
    }).reduce((sum, f) => sum + Number(f.totalCost), 0) || 0;

    const monthMaintenance = maintenance?.filter(m => {
      try {
        const maintDate = new Date(m.serviceDate);
        return isWithinInterval(maintDate, { start, end });
      } catch { return false; }
    }).reduce((sum, m) => sum + Number(m.cost), 0) || 0;

    return { month, bookings: monthBookings, fuelCost: monthFuel, maintenanceCost: monthMaintenance };
  });

  const topDestinations = bookings?.reduce((acc, curr) => {
    if (curr.destination) {
      acc[curr.destination] = (acc[curr.destination] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const destinationData = Object.entries(topDestinations || {})
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2" data-testid="text-reports-title">
          <FileText className="w-6 h-6 text-primary" />
          Reports
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Comprehensive fleet analytics and insights</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Fuel Cost</p>
                <p className="text-lg font-bold" data-testid="text-total-fuel-cost">${totalFuelCost.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Wrench className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Maintenance Cost</p>
                <p className="text-lg font-bold" data-testid="text-total-maintenance-cost">${totalMaintenanceCost.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Activity className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Mileage</p>
                <p className="text-lg font-bold" data-testid="text-total-mileage">{totalMileage.toLocaleString()} mi</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Fuel className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fuel Used</p>
                <p className="text-lg font-bold" data-testid="text-total-gallons">{totalGallons.toFixed(1)} gal</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList data-testid="tabs-reports">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="vehicles" data-testid="tab-vehicles">Vehicles</TabsTrigger>
          <TabsTrigger value="bookings" data-testid="tab-bookings">Bookings</TabsTrigger>
          <TabsTrigger value="costs" data-testid="tab-costs">Costs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Monthly Trends
                </CardTitle>
                <CardDescription>Bookings and costs over the last 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyTrends} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="month" 
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
                      />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '8px', 
                          border: '1px solid hsl(var(--border))',
                          backgroundColor: 'hsl(var(--card))',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                        }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="bookings" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="Bookings" />
                      <Line type="monotone" dataKey="fuelCost" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} name="Fuel ($)" />
                      <Line type="monotone" dataKey="maintenanceCost" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} name="Maintenance ($)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-primary" />
                  Booking Status
                </CardTitle>
                <CardDescription>Distribution of booking statuses</CardDescription>
              </CardHeader>
              <CardContent>
                {bookingStatusData.length > 0 ? (
                  <div className="flex flex-col">
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={bookingStatusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={3}
                            dataKey="value"
                            strokeWidth={0}
                          >
                            {bookingStatusData.map((item, idx) => (
                              <Cell key={idx} fill={item.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {bookingStatusData.map((item) => (
                        <div key={item.name} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30">
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
                  <div className="flex flex-col items-center justify-center h-72 text-muted-foreground">
                    <CalendarDays className="w-10 h-10 mb-2 opacity-20" />
                    <p className="text-sm">No booking data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Top Destinations
              </CardTitle>
              <CardDescription>Most frequent booking destinations</CardDescription>
            </CardHeader>
            <CardContent>
              {destinationData.length > 0 ? (
                <div className="space-y-3">
                  {destinationData.map((item, idx) => (
                    <div key={item.name} className="flex items-center gap-3">
                      <Badge variant="outline" className="w-6 h-6 flex items-center justify-center p-0">
                        {idx + 1}
                      </Badge>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{item.name}</span>
                          <span className="text-sm text-muted-foreground">{item.count} trips</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${(item.count / destinationData[0].count) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <MapPin className="w-10 h-10 mb-2 opacity-20" />
                  <p className="text-sm">No destination data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vehicles" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Car className="w-4 h-4 text-primary" />
                Vehicle Utilization
              </CardTitle>
              <CardDescription>Booking and mileage data per vehicle</CardDescription>
            </CardHeader>
            <CardContent>
              {vehicleUtilization.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={vehicleUtilization} margin={{ top: 10, right: 30, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="name" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        angle={-30}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '8px', 
                          border: '1px solid hsl(var(--border))',
                          backgroundColor: 'hsl(var(--card))',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                        }}
                      />
                      <Legend />
                      <Bar dataKey="bookings" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Total Bookings" />
                      <Bar dataKey="completed" fill="#10b981" radius={[4, 4, 0, 0]} name="Completed" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-80 text-muted-foreground">
                  <Car className="w-10 h-10 mb-2 opacity-20" />
                  <p className="text-sm">No vehicle data available</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vehicleUtilization.map((vehicle) => (
              <Card key={vehicle.name}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm truncate">{vehicle.name}</h3>
                    <Badge variant={
                      vehicle.status === 'available' ? 'default' : 
                      vehicle.status === 'rented' ? 'secondary' : 'destructive'
                    }>
                      {vehicle.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-2 rounded bg-muted/30">
                      <p className="text-muted-foreground text-xs">Bookings</p>
                      <p className="font-semibold">{vehicle.bookings}</p>
                    </div>
                    <div className="p-2 rounded bg-muted/30">
                      <p className="text-muted-foreground text-xs">Completed</p>
                      <p className="font-semibold">{vehicle.completed}</p>
                    </div>
                    <div className="p-2 rounded bg-muted/30">
                      <p className="text-muted-foreground text-xs">Mileage</p>
                      <p className="font-semibold">{vehicle.mileage.toLocaleString()} mi</p>
                    </div>
                    <div className="p-2 rounded bg-muted/30">
                      <p className="text-muted-foreground text-xs">Fuel Cost</p>
                      <p className="font-semibold">${vehicle.fuelCost.toFixed(0)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="bookings" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-primary" />
                  Bookings by Month
                </CardTitle>
                <CardDescription>Monthly booking volume</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyTrends} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="month" 
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
                      />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '8px', 
                          border: '1px solid hsl(var(--border))',
                          backgroundColor: 'hsl(var(--card))',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="bookings" 
                        stroke="#3b82f6" 
                        fill="#3b82f6" 
                        fillOpacity={0.2}
                        strokeWidth={2}
                        name="Bookings"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Booking Summary
                </CardTitle>
                <CardDescription>Key booking statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="text-xs text-muted-foreground">Total Bookings</p>
                    <p className="text-2xl font-bold text-blue-500">{bookings?.length || 0}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-xs text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold text-emerald-500">
                      {bookings?.filter(b => b.status === 'completed').length || 0}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-xs text-muted-foreground">Pending</p>
                    <p className="text-2xl font-bold text-amber-500">
                      {bookings?.filter(b => b.status === 'pending').length || 0}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-xs text-muted-foreground">Cancelled</p>
                    <p className="text-2xl font-bold text-red-500">
                      {bookings?.filter(b => b.status === 'cancelled').length || 0}
                    </p>
                  </div>
                </div>
                <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Completion Rate</span>
                    <span className="text-lg font-bold text-primary">
                      {bookings && bookings.length > 0 
                        ? Math.round((bookings.filter(b => b.status === 'completed').length / bookings.length) * 100)
                        : 0}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="costs" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Fuel className="w-4 h-4 text-primary" />
                      Fuel Costs by Vehicle
                    </CardTitle>
                    <CardDescription>Top vehicles by fuel expense</CardDescription>
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
                          fontSize={10} 
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
                        <Bar dataKey="cost" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <Fuel className="w-10 h-10 mb-2 opacity-20" />
                      <p className="text-sm">No fuel data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-primary" />
                      Maintenance by Type
                    </CardTitle>
                    <CardDescription>Costs breakdown by service type</CardDescription>
                  </div>
                  <Badge variant="secondary" className="font-mono">
                    ${totalMaintenanceCost.toFixed(0)} total
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {maintenanceChartData.length > 0 ? (
                  <div className="flex flex-col">
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={maintenanceChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={70}
                            paddingAngle={3}
                            dataKey="value"
                            strokeWidth={0}
                          >
                            {maintenanceChartData.map((_, idx) => (
                              <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, 'Cost']} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2 mt-2">
                      {maintenanceChartData.slice(0, 5).map((item, idx) => (
                        <div key={item.name} className="flex items-center justify-between px-2 py-1">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} 
                            />
                            <span className="text-sm text-muted-foreground">{item.name}</span>
                          </div>
                          <span className="text-sm font-medium">${item.value.toFixed(0)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <Wrench className="w-10 h-10 mb-2 opacity-20" />
                    <p className="text-sm">No maintenance data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Monthly Cost Trends
              </CardTitle>
              <CardDescription>Fuel and maintenance costs over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyTrends} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="month" 
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
                      formatter={(value: number) => [`$${value.toFixed(2)}`]}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="fuelCost" 
                      stroke="#10b981" 
                      fill="#10b981" 
                      fillOpacity={0.2}
                      strokeWidth={2}
                      name="Fuel Cost"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="maintenanceCost" 
                      stroke="#f59e0b" 
                      fill="#f59e0b" 
                      fillOpacity={0.2}
                      strokeWidth={2}
                      name="Maintenance Cost"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
