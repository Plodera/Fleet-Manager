import nodemailer from "nodemailer";
import type { User, Booking, Vehicle } from "@shared/schema";
import { storage } from "./storage";
import { decryptCredential } from "./credentialEncryption";

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
export const EMAIL_DELIVERY_FAILURE_THRESHOLD = 3;

export interface EmailDeliveryHealth {
  status: "healthy" | "warning";
  consecutiveFailures: number;
  failureThreshold: number;
  warningSince: string | null;
  lastFailureAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
}

export type EmailDeliveryResult = { success: true } | { success: false; error: string };

export function sanitizeEmailProviderError(error: unknown): string {
  const message = errorMessage(error)
    .replace(/(?:Authorization\s*[=:]\s*)?Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, "Authorization: Bearer [redacted]")
    .replace(/(["']?(?:client[\s_-]?secret|password|passwd|smtp[\s_-]?pass|access[\s_-]?token|refresh[\s_-]?token|token|api[\s_-]?key|x-api-key|authorization)["']?\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,;}]+)/gi, "$1[redacted]")
    .replace(/\b(client\s+secret|api\s+key|access\s+token|refresh\s+token|password)\s+(?:is|was|provided)\s+(?:"[^"]*"|'[^']*'|[^\s,;}]+)/gi, "$1 [redacted]")
    .replace(/\b(client\s+secret|api\s+key|access\s+token|refresh\s+token|password)\s+(?!provided\b|is\b|was\b|missing\b|configured\b)(?:"[^"]*"|'[^']*'|[^\s,;}]+)/gi, "$1 [redacted]")
    .replace(/https?:\/\/[^@\s/]+:[^@\s/]+@/gi, "https://[redacted]@");
  return message.slice(0, 500);
}

const HEALTHY_EMAIL_DELIVERY: EmailDeliveryHealth = {
  status: "healthy",
  consecutiveFailures: 0,
  failureThreshold: EMAIL_DELIVERY_FAILURE_THRESHOLD,
  warningSince: null,
  lastFailureAt: null,
  lastSuccessAt: null,
  lastError: null,
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown email provider error";
}

function toEmailDeliveryHealth(
  record: Awaited<ReturnType<typeof storage.getEmailDeliveryHealth>>,
): EmailDeliveryHealth {
  if (!record) return { ...HEALTHY_EMAIL_DELIVERY };
  return {
    status: record.consecutiveFailures >= EMAIL_DELIVERY_FAILURE_THRESHOLD ? "warning" : "healthy",
    consecutiveFailures: record.consecutiveFailures,
    failureThreshold: EMAIL_DELIVERY_FAILURE_THRESHOLD,
    warningSince: record.warningSince?.toISOString() ?? null,
    lastFailureAt: record.lastFailureAt?.toISOString() ?? null,
    lastSuccessAt: record.lastSuccessAt?.toISOString() ?? null,
    lastError: record.lastError,
  };
}

async function recordDeliveryFailure(error: unknown): Promise<void> {
  await storage.recordEmailDeliveryFailure(
    sanitizeEmailProviderError(error),
    EMAIL_DELIVERY_FAILURE_THRESHOLD,
  );
}

async function recordDeliverySuccess(): Promise<void> {
  await storage.recordEmailDeliverySuccess();
}

export async function getEmailDeliveryHealth(): Promise<EmailDeliveryHealth> {
  return toEmailDeliveryHealth(await storage.getEmailDeliveryHealth());
}

export async function resetEmailDeliveryHealth(): Promise<void> {
  await storage.resetEmailDeliveryHealth();
}

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

function getGraphConfiguration(settings?: EmailSettings) {
  let storedClientSecret: string | undefined;
  if (settings?.graphClientSecret) {
    storedClientSecret = decryptCredential(settings.graphClientSecret);
  }
  return {
    tenantId: settings?.graphTenantId?.trim() || process.env.MICROSOFT_GRAPH_TENANT_ID?.trim(),
    clientId: settings?.graphClientId?.trim() || process.env.MICROSOFT_GRAPH_CLIENT_ID?.trim(),
    clientSecret: storedClientSecret?.trim() || process.env.MICROSOFT_GRAPH_CLIENT_SECRET?.trim(),
  };
}

export function getMicrosoftGraphStatus(settings?: EmailSettings) {
  let config: ReturnType<typeof getGraphConfiguration>;
  try {
    config = getGraphConfiguration(settings);
  } catch {
    return {
      configured: false,
      tenantIdConfigured: Boolean(settings?.graphTenantId?.trim() || process.env.MICROSOFT_GRAPH_TENANT_ID?.trim()),
      clientIdConfigured: Boolean(settings?.graphClientId?.trim() || process.env.MICROSOFT_GRAPH_CLIENT_ID?.trim()),
      clientSecretConfigured: false,
    };
  }
  return {
    configured: Boolean(config.tenantId && config.clientId && config.clientSecret),
    tenantIdConfigured: Boolean(config.tenantId),
    clientIdConfigured: Boolean(config.clientId),
    clientSecretConfigured: Boolean(config.clientSecret),
  };
}

async function sendWithMicrosoftGraph(settings: EmailSettings, emailContent: EmailContent): Promise<void> {
  const config = getGraphConfiguration(settings);
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
  try {
    if (settings.provider === "microsoft_graph") {
      await sendWithMicrosoftGraph(settings, emailContent);
    } else {
      await sendWithSmtp(settings, emailContent);
    }
  } catch (error) {
    await recordDeliveryFailure(error);
    throw error;
  }
  await recordDeliverySuccess();
}

export async function sendEmail(emailContent: EmailContent): Promise<boolean> {
  return (await sendEmailWithResult(emailContent)).success;
}

export async function sendEmailWithResult(emailContent: EmailContent): Promise<EmailDeliveryResult> {
  let settings;
  try {
    settings = await storage.getEmailSettings();
  } catch (err) {
    console.error("Failed to fetch email settings:", err);
    return { success: false, error: sanitizeEmailProviderError(err) };
  }

  if (!settings || !settings.enabled) {
    console.log("=== EMAIL NOTIFICATION (Email disabled - logging only) ===");
    console.log(`To: ${emailContent.to}`);
    console.log(`Subject: ${emailContent.subject}`);
    console.log(`Body:\n${emailContent.body}`);
    console.log("=== END EMAIL ===");
    return { success: false, error: "Email delivery is disabled" };
  }

  try {
    await deliverEmail(settings, emailContent);

    console.log(`Email sent successfully to ${emailContent.to} using ${settings.provider}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to send email:", sanitizeEmailProviderError(error));
    return { success: false, error: sanitizeEmailProviderError(error) };
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
    return { success: false, error: sanitizeEmailProviderError(error) };
  }
}
