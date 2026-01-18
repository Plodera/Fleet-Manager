import nodemailer from "nodemailer";
import type { User, Booking, Vehicle } from "@shared/schema";
import { storage } from "./storage";

interface EmailContent {
  to: string;
  subject: string;
  body: string;
}

async function sendEmail(emailContent: EmailContent): Promise<boolean> {
  const settings = await storage.getEmailSettings();
  
  if (!settings || !settings.enabled) {
    console.log("=== EMAIL NOTIFICATION (Email disabled - logging only) ===");
    console.log(`To: ${emailContent.to}`);
    console.log(`Subject: ${emailContent.subject}`);
    console.log(`Body:\n${emailContent.body}`);
    console.log("=== END EMAIL ===");
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort,
      secure: settings.smtpSecure,
      auth: {
        user: settings.smtpUser,
        pass: settings.smtpPass,
      },
    });

    await transporter.sendMail({
      from: `"${settings.fromName}" <${settings.fromEmail}>`,
      to: emailContent.to,
      subject: emailContent.subject,
      text: emailContent.body,
    });

    console.log(`Email sent successfully to ${emailContent.to}`);
    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
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

  await sendEmail(emailContent);
}

export async function sendBookingStatusUpdate(
  requester: User,
  booking: Booking,
  vehicle: Vehicle,
  status: "approved" | "rejected" | "pending" | "in_progress" | "completed" | "cancelled",
  approver: User
): Promise<void> {
  const statusMessages: Record<string, string> = {
    approved: "has been APPROVED",
    rejected: "has been REJECTED",
    pending: "is still PENDING",
    in_progress: "is now IN PROGRESS",
    completed: "has been marked as COMPLETED",
    cancelled: "has been CANCELLED"
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

  await sendEmail(emailContent);
}

export async function sendTripStatusToApprover(
  approver: User,
  booking: Booking,
  vehicle: Vehicle,
  requester: User,
  driver: User | null,
  status: "started" | "completed",
  odometer: number
): Promise<void> {
  const statusMessages: Record<string, string> = {
    started: "has STARTED",
    completed: "has been COMPLETED"
  };

  const emailContent: EmailContent = {
    to: approver.email || "no-email@example.com",
    subject: `Trip ${status.charAt(0).toUpperCase() + status.slice(1)}: ${vehicle.make} ${vehicle.model}`,
    body: `
Dear ${approver.fullName},

A trip you approved ${statusMessages[status]}.

Vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})
Requester: ${requester.fullName}
Driver: ${driver?.fullName || "Self-drive"}
Purpose: ${booking.purpose}
Destination: ${booking.destination || "Not specified"}
${status === "started" ? `Start Odometer: ${odometer} km` : `End Odometer: ${odometer} km`}
Scheduled: ${new Date(booking.startTime).toLocaleString()} - ${new Date(booking.endTime).toLocaleString()}

${status === "completed" && booking.startOdometer ? `Trip Distance: ${odometer - booking.startOdometer} km` : ""}

Thank you,
Vehicle Management System
    `.trim()
  };

  await sendEmail(emailContent);
}

export async function sendTestEmail(to: string): Promise<{ success: boolean; error?: string }> {
  const settings = await storage.getEmailSettings();
  
  if (!settings) {
    return { success: false, error: "Email settings not configured" };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort,
      secure: settings.smtpSecure,
      auth: {
        user: settings.smtpUser,
        pass: settings.smtpPass,
      },
    });

    await transporter.sendMail({
      from: `"${settings.fromName}" <${settings.fromEmail}>`,
      to: to,
      subject: "Test Email - FleetCmd Transport Management",
      text: "This is a test email from the FleetCmd Transport Management System. If you received this email, your SMTP settings are configured correctly.",
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to send test email" };
  }
}
