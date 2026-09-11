import nodemailer from "nodemailer";
import type { User, Booking, Vehicle } from "@shared/schema";
import { storage } from "./storage";

interface EmailContent {
  to: string;
  subject: string;
  body: string;
}

type EmailSettings = NonNullable<Awaited<ReturnType<typeof storage.getEmailSettings>>>;

const MICROSOFT_GRAPH_TIMEOUT_MS = 10_000;
const SMTP_CONNECTION_TIMEOUT_MS = 10_000;
const SMTP_GREETING_TIMEOUT_MS = 10_000;
const SMTP_SOCKET_TIMEOUT_MS = 15_000;

async function fetchMicrosoftGraph(
  url: string,
  init: RequestInit,
  operation: "authentication" | "sendMail",
): Promise<Response> {
  try {
    return await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(MICROSOFT_GRAPH_TIMEOUT_MS),
    });
  } catch (error) {
    if (
      error instanceof Error
      && (error.name === "TimeoutError" || error.name === "AbortError")
    ) {
      throw new Error(
        `Microsoft Graph ${operation} request timed out after ${MICROSOFT_GRAPH_TIMEOUT_MS / 1000} seconds. Check Microsoft service availability and network connectivity, then try again.`,
      );
    }
    throw error;
  }
}

function getGraphConfiguration() {
  return {
    tenantId: process.env.MICROSOFT_GRAPH_TENANT_ID?.trim(),
    clientId: process.env.MICROSOFT_GRAPH_CLIENT_ID?.trim(),
    clientSecret: process.env.MICROSOFT_GRAPH_CLIENT_SECRET?.trim(),
  };
}

export function getMicrosoftGraphStatus() {
  const config = getGraphConfiguration();
  return {
    configured: Boolean(config.tenantId && config.clientId && config.clientSecret),
    tenantIdConfigured: Boolean(config.tenantId),
    clientIdConfigured: Boolean(config.clientId),
    clientSecretConfigured: Boolean(config.clientSecret),
  };
}

async function sendWithMicrosoftGraph(settings: EmailSettings, emailContent: EmailContent): Promise<void> {
  const config = getGraphConfiguration();
  if (!config.tenantId || !config.clientId || !config.clientSecret) {
    throw new Error("Microsoft Graph is not fully configured. Set the tenant ID, client ID, and client secret.");
  }

  const tokenResponse = await fetchMicrosoftGraph(
    `https://login.microsoftonline.com/${encodeURIComponent(config.tenantId)}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
    },
    "authentication",
  );

  const tokenPayload = await tokenResponse.json() as { access_token?: string; error_description?: string };
  if (!tokenResponse.ok || !tokenPayload.access_token) {
    throw new Error(tokenPayload.error_description || `Microsoft Graph authentication failed (${tokenResponse.status})`);
  }

  const sendResponse = await fetchMicrosoftGraph(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(settings.fromEmail)}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenPayload.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject: emailContent.subject,
          body: { contentType: "Text", content: emailContent.body },
          toRecipients: [{ emailAddress: { address: emailContent.to } }],
          from: { emailAddress: { name: settings.fromName, address: settings.fromEmail } },
        },
        saveToSentItems: true,
      }),
    },
    "sendMail",
  );

  if (!sendResponse.ok) {
    const graphError = await sendResponse.json().catch(() => null) as { error?: { message?: string } } | null;
    throw new Error(graphError?.error?.message || `Microsoft Graph sendMail failed (${sendResponse.status})`);
  }
}

async function sendWithSmtp(settings: EmailSettings, emailContent: EmailContent): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpSecure,
    connectionTimeout: SMTP_CONNECTION_TIMEOUT_MS,
    greetingTimeout: SMTP_GREETING_TIMEOUT_MS,
    socketTimeout: SMTP_SOCKET_TIMEOUT_MS,
    auth: {
      user: settings.smtpUser,
      pass: settings.smtpPass,
    },
  });

  try {
    await transporter.sendMail({
      from: `"${settings.fromName}" <${settings.fromEmail}>`,
      to: emailContent.to,
      subject: emailContent.subject,
      text: emailContent.body,
    });
  } catch (error) {
    const smtpError = error as NodeJS.ErrnoException;
    if (
      smtpError.code === "ETIMEDOUT"
      || smtpError.code === "ESOCKET"
      || /\b(?:time[ -]?out|timed out)\b/i.test(smtpError.message ?? "")
    ) {
      throw new Error(
        `SMTP connection to ${settings.smtpHost}:${settings.smtpPort} timed out. Check the SMTP host, port, firewall, and network connectivity, then try again.`,
      );
    }
    throw error;
  }
}

async function deliverEmail(settings: EmailSettings, emailContent: EmailContent): Promise<void> {
  if (settings.provider === "microsoft_graph") {
    await sendWithMicrosoftGraph(settings, emailContent);
    return;
  }
  await sendWithSmtp(settings, emailContent);
}

export async function sendEmail(emailContent: EmailContent): Promise<boolean> {
  let settings;
  try {
    settings = await storage.getEmailSettings();
  } catch (err) {
    console.error("Failed to fetch email settings:", err);
    return false;
  }

  if (!settings || !settings.enabled) {
    console.log("=== EMAIL NOTIFICATION (Email disabled - logging only) ===");
    console.log(`To: ${emailContent.to}`);
    console.log(`Subject: ${emailContent.subject}`);
    console.log(`Body:\n${emailContent.body}`);
    console.log("=== END EMAIL ===");
    return false;
  }

  try {
    await deliverEmail(settings, emailContent);

    console.log(`Email sent successfully to ${emailContent.to} using ${settings.provider}`);
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

export async function sendBreakdownAlertEmail(
  machine: { name: string; location: string | null; department: string | null; qrSlug: string },
  record: { description: string; performedBy: string | null; date: string },
  recipients: string[],
  baseUrl: string
): Promise<void> {
  const machineUrl = `${baseUrl}/machine/${machine.qrSlug}`;
  const subject = `Machine Breakdown Alert: ${machine.name}`;
  const body = `
A breakdown has been reported for the following machine:

Machine: ${machine.name}
Location: ${machine.location ?? "Not specified"}
Department: ${machine.department ?? "Not specified"}
Date: ${record.date}
Reported By: ${record.performedBy ?? "Anonymous"}

Description:
${record.description}

View the machine status page for more details:
${machineUrl}

This is an automated alert from the AAMS Machine Management System.
  `.trim();

  for (const recipient of recipients) {
    if (recipient.trim()) {
      await sendEmail({ to: recipient.trim(), subject, body });
    }
  }
}

export async function sendTestEmail(to: string): Promise<{ success: boolean; error?: string }> {
  const settings = await storage.getEmailSettings();
  
  if (!settings) {
    return { success: false, error: "Email settings not configured" };
  }

  try {
    await deliverEmail(settings, {
      to,
      subject: "Test Email - FleetCmd Transport Management",
      body: `This is a test email from the FleetCmd Transport Management System. If you received this email, your ${settings.provider === "microsoft_graph" ? "Microsoft Graph" : "SMTP"} settings are configured correctly.`,
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to send test email" };
  }
}
