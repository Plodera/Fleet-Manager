import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { format } from "date-fns";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BookingPrintView() {
  const [, params] = useRoute("/bookings/:id/print");
  const bookingId = params?.id ? Number(params.id) : null;

  const { data: bookings } = useQuery({
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

  const booking = bookings?.find((b: any) => b.id === bookingId);
  const vehicle = vehicles?.find((v: any) => v.id === booking?.vehicleId);
  const requester = users?.find((u: any) => u.id === booking?.userId);
  const approver = users?.find((u: any) => u.id === booking?.approverId);
  const driver = users?.find((u: any) => u.id === booking?.driverId);

  if (!booking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading booking details...</p>
      </div>
    );
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "Pending Approval",
      approved: "Approved",
      rejected: "Rejected",
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
          <h1 className="text-3xl font-bold text-primary">Trip Report</h1>
          <p className="text-muted-foreground">Booking Reference: #{booking.id}</p>
          <p className="text-sm text-muted-foreground">
            Generated on {format(new Date(), "MMMM d, yyyy 'at' h:mm a")}
          </p>
        </div>

        <div className="mb-6">
          <div className="inline-block px-3 py-1 rounded text-sm font-medium" style={{
            backgroundColor: booking.status === 'completed' ? '#22c55e' :
              booking.status === 'in_progress' ? '#3b82f6' :
              booking.status === 'approved' ? '#10b981' :
              booking.status === 'pending' ? '#f59e0b' :
              booking.status === 'rejected' ? '#ef4444' : '#6b7280',
            color: 'white'
          }}>
            {getStatusLabel(booking.status)}
          </div>
        </div>

        <section className="mb-8">
          <h2 className="text-xl font-semibold border-b pb-2 mb-4">Trip Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Purpose</p>
              <p className="font-medium">{booking.purpose}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Destination</p>
              <p className="font-medium">{booking.destination || "Not specified"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Start Time</p>
              <p className="font-medium">{format(new Date(booking.startTime), "MMMM d, yyyy 'at' h:mm a")}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">End Time</p>
              <p className="font-medium">{format(new Date(booking.endTime), "MMMM d, yyyy 'at' h:mm a")}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Estimated Mileage</p>
              <p className="font-medium">{booking.mileage} km</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Passengers</p>
              <p className="font-medium">{booking.passengerCount}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Drive Type</p>
              <p className="font-medium">{booking.driveType === 'self' ? 'Self Drive' : 'With Driver'}</p>
            </div>
            {booking.shareAllowed && (
              <div>
                <p className="text-sm text-muted-foreground">Ride Sharing</p>
                <p className="font-medium">Allowed</p>
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
                <p className="text-sm text-muted-foreground">Capacity</p>
                <p className="font-medium">{vehicle.capacity} seats</p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Vehicle information not available</p>
          )}
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold border-b pb-2 mb-4">Personnel</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Requester</p>
              <p className="font-medium">{requester?.fullName || "Unknown"}</p>
              {requester?.department && (
                <p className="text-sm text-muted-foreground">{requester.department}</p>
              )}
            </div>
            {approver && (
              <div>
                <p className="text-sm text-muted-foreground">Approver</p>
                <p className="font-medium">{approver.fullName}</p>
              </div>
            )}
            {driver && (
              <div>
                <p className="text-sm text-muted-foreground">Assigned Driver</p>
                <p className="font-medium">{driver.fullName}</p>
                {driver.licenseNumber && (
                  <p className="text-sm text-muted-foreground">License: {driver.licenseNumber}</p>
                )}
              </div>
            )}
          </div>
        </section>

        {booking.passengerName && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold border-b pb-2 mb-4">Passenger Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Passenger Name</p>
                <p className="font-medium">{booking.passengerName}</p>
              </div>
              {booking.passengerPhone && (
                <div>
                  <p className="text-sm text-muted-foreground">Phone Number</p>
                  <p className="font-medium">{booking.passengerPhone}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {booking.cancellationReason && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold border-b pb-2 mb-4">Cancellation Details</h2>
            <p className="text-muted-foreground">{booking.cancellationReason}</p>
          </section>
        )}

        <footer className="mt-12 pt-4 border-t text-center text-sm text-muted-foreground print:mt-8">
          <p>AAMS - Aisco Automobile Management System</p>
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
