import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { format } from "date-fns";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SharedRidePrintView() {
  const [, params] = useRoute("/shared-rides/:id/print");
  const tripId = params?.id ? Number(params.id) : null;

  const { data: sharedTrips } = useQuery({
    queryKey: ['/api/shared-trips'],
    queryFn: async () => {
      const res = await fetch('/api/shared-trips');
      if (!res.ok) throw new Error("Failed to fetch shared trips");
      return res.json();
    },
  });

  const { data: allBookings } = useQuery({
    queryKey: ['/api/bookings'],
    queryFn: async () => {
      const res = await fetch('/api/bookings');
      if (!res.ok) throw new Error("Failed to fetch bookings");
      return res.json();
    },
  });

  const { data: vehicles } = useQuery({
    queryKey: ['/api/vehicles'],
    queryFn: async () => {
      const res = await fetch('/api/vehicles');
      if (!res.ok) throw new Error("Failed to fetch vehicles");
      return res.json();
    },
  });

  const { data: users } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  const trip = sharedTrips?.find((t: any) => t.id === tripId);
  const vehicle = vehicles?.find((v: any) => v.id === trip?.vehicleId);
  const approver = users?.find((u: any) => u.id === trip?.approverId);
  const tripBookings = allBookings?.filter((b: any) => b.sharedTripId === tripId) || [];

  if (!trip) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading shared ride details...</p>
      </div>
    );
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      open: "Open for Bookings",
      full: "Fully Booked",
      in_progress: "In Progress",
      completed: "Completed",
      cancelled: "Cancelled",
    };
    return labels[status] || status;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="print:hidden fixed top-4 right-4 z-50">
        <Button onClick={handlePrint} data-testid="button-print">
          <Printer className="w-4 h-4 mr-2" />
          Print Report
        </Button>
      </div>

      <div className="max-w-3xl mx-auto p-8 print:p-4">
        <div className="border-b-2 border-primary pb-4 mb-6">
          <h1 className="text-3xl font-bold text-primary">Shared Ride Report</h1>
          <p className="text-muted-foreground">Trip Reference: #{trip.id}</p>
          <p className="text-sm text-muted-foreground">
            Generated on {format(new Date(), "MMMM d, yyyy 'at' h:mm a")}
          </p>
        </div>

        <div className="mb-6">
          <div className="inline-block px-3 py-1 rounded text-sm font-medium" style={{
            backgroundColor: trip.status === 'completed' ? '#22c55e' :
              trip.status === 'in_progress' ? '#3b82f6' :
              trip.status === 'full' ? '#f59e0b' :
              trip.status === 'open' ? '#10b981' : '#6b7280',
            color: 'white'
          }}>
            {getStatusLabel(trip.status)}
          </div>
        </div>

        <section className="mb-8">
          <h2 className="text-xl font-semibold border-b pb-2 mb-4">Trip Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Destination</p>
              <p className="font-medium">{trip.destination || "Not specified"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Start Time</p>
              <p className="font-medium">{format(new Date(trip.startTime), "MMMM d, yyyy 'at' h:mm a")}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">End Time</p>
              <p className="font-medium">{format(new Date(trip.endTime), "MMMM d, yyyy 'at' h:mm a")}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Capacity</p>
              <p className="font-medium">{trip.reservedSeats} / {trip.totalCapacity} seats reserved</p>
            </div>
            {trip.notes && (
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="font-medium">{trip.notes}</p>
              </div>
            )}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold border-b pb-2 mb-4">Vehicle Information</h2>
          {vehicle ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Vehicle</p>
                <p className="font-medium">{vehicle.year} {vehicle.make} {vehicle.model}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">License Plate</p>
                <p className="font-medium">{vehicle.licensePlate}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Category</p>
                <p className="font-medium capitalize">{vehicle.category}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Capacity</p>
                <p className="font-medium">{vehicle.capacity} seats</p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Vehicle information not available</p>
          )}
        </section>

        {approver && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold border-b pb-2 mb-4">Trip Coordinator</h2>
            <div>
              <p className="text-sm text-muted-foreground">Approver</p>
              <p className="font-medium">{approver.fullName}</p>
              {approver.email && (
                <p className="text-sm text-muted-foreground">{approver.email}</p>
              )}
            </div>
          </section>
        )}

        <section className="mb-8">
          <h2 className="text-xl font-semibold border-b pb-2 mb-4">
            Passenger Manifest ({tripBookings.length} booking{tripBookings.length !== 1 ? 's' : ''})
          </h2>
          {tripBookings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-semibold">#</th>
                    <th className="text-left py-2 px-2 font-semibold">Passenger Name</th>
                    <th className="text-left py-2 px-2 font-semibold">Phone</th>
                    <th className="text-left py-2 px-2 font-semibold">Seats</th>
                    <th className="text-left py-2 px-2 font-semibold">Purpose</th>
                    <th className="text-left py-2 px-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tripBookings.map((booking: any, index: number) => {
                    const booker = users?.find((u: any) => u.id === booking.userId);
                    return (
                      <tr key={booking.id} className="border-b">
                        <td className="py-2 px-2">{index + 1}</td>
                        <td className="py-2 px-2">
                          {booking.passengerName || booker?.fullName || "Unknown"}
                        </td>
                        <td className="py-2 px-2">
                          {booking.passengerPhone || "N/A"}
                        </td>
                        <td className="py-2 px-2">{booking.passengerCount}</td>
                        <td className="py-2 px-2">{booking.purpose}</td>
                        <td className="py-2 px-2 capitalize">{booking.status.replace('_', ' ')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted-foreground">No passengers have joined this trip yet.</p>
          )}
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold border-b pb-2 mb-4">Summary</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Bookings</p>
              <p className="font-medium">{tripBookings.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Passengers</p>
              <p className="font-medium">
                {tripBookings.reduce((sum: number, b: any) => sum + (b.passengerCount || 1), 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Available Seats</p>
              <p className="font-medium">{trip.totalCapacity - trip.reservedSeats}</p>
            </div>
          </div>
        </section>

        <footer className="mt-12 pt-4 border-t text-center text-sm text-muted-foreground print:mt-8">
          <p>VMS - Aisco Transport Management System</p>
          <p>This is an automatically generated report</p>
        </footer>
      </div>

      <style>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .print\\:p-4 { padding: 1rem !important; }
          .print\\:mt-8 { margin-top: 2rem !important; }
        }
      `}</style>
    </div>
  );
}
