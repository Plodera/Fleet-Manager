import type { User, Booking, Vehicle } from "@shared/schema";

interface EmailContent {
  to: string;
  subject: string;
  body: string;
}

export async function sendBookingNotification(
  approver: User,
  booking: Booking,
  vehicle: Vehicle,
  requester: User
): Promise<void> {
  const emailContent: EmailContent = {
    to: approver.email || "no-email@example.com",
    subject: `New Booking Request: ${vehicle.make} ${vehicle.model}`,
    body: `
Dear ${approver.fullName},

A new booking request requires your approval:

Requester: ${requester.fullName}
Vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})
Purpose: ${booking.purpose}
Destination: ${booking.destination || "Not specified"}
Start: ${new Date(booking.startTime).toLocaleString()}
End: ${new Date(booking.endTime).toLocaleString()}
Estimated Mileage: ${booking.mileage} miles

Please log in to the Transport Management System to approve, reject, or keep this request pending.

Thank you,
Transport Management System
    `.trim()
  };

  console.log("=== EMAIL NOTIFICATION ===");
  console.log(`To: ${emailContent.to}`);
  console.log(`Subject: ${emailContent.subject}`);
  console.log(`Body:\n${emailContent.body}`);
  console.log("=== END EMAIL ===");
}

export async function sendBookingStatusUpdate(
  requester: User,
  booking: Booking,
  vehicle: Vehicle,
  status: "approved" | "rejected" | "pending",
  approver: User
): Promise<void> {
  const statusMessages = {
    approved: "has been APPROVED",
    rejected: "has been REJECTED",
    pending: "is still PENDING"
  };

  const emailContent: EmailContent = {
    to: requester.email || "no-email@example.com",
    subject: `Booking ${status.charAt(0).toUpperCase() + status.slice(1)}: ${vehicle.make} ${vehicle.model}`,
    body: `
Dear ${requester.fullName},

Your booking request ${statusMessages[status]}.

Vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})
Purpose: ${booking.purpose}
Start: ${new Date(booking.startTime).toLocaleString()}
End: ${new Date(booking.endTime).toLocaleString()}

Reviewed by: ${approver.fullName}

${status === "approved" ? "Your vehicle is now reserved for the specified time." : ""}
${status === "rejected" ? "Please contact your approver for more information or submit a new request." : ""}

Thank you,
Transport Management System
    `.trim()
  };

  console.log("=== EMAIL NOTIFICATION ===");
  console.log(`To: ${emailContent.to}`);
  console.log(`Subject: ${emailContent.subject}`);
  console.log(`Body:\n${emailContent.body}`);
  console.log("=== END EMAIL ===");
}
