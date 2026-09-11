import type { User } from "@shared/schema";

const PDF_SIGNATURE = Buffer.from("%PDF-");
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff]);

function hasPermission(user: Pick<User, "role" | "permissions">, permission: string): boolean {
  if (user.role === "admin") return true;
  try {
    const permissions = typeof user.permissions === "string" ? JSON.parse(user.permissions) : user.permissions;
    return Array.isArray(permissions) && permissions.includes(permission);
  } catch {
    return false;
  }
}

/** Compliance scans contain sensitive ownership and insurance information.
 * Only vehicle managers may access either their metadata or file contents. */
export function canAccessVehicleComplianceDocuments(user: Pick<User, "role" | "permissions">): boolean {
  return user.role === "admin" || hasPermission(user, "manage_vehicles");
}

export type ComplianceDocumentValidation =
  | { valid: true; mimeType: "application/pdf" | "image/png" | "image/jpeg" | "image/webp" }
  | { valid: false; message: string };

/** Check the binary signature rather than trusting a multipart MIME header. */
export function validateComplianceDocument(buffer: Buffer): ComplianceDocumentValidation {
  if (buffer.length < 12) return { valid: false, message: "The uploaded file is empty or incomplete" };
  if (buffer.subarray(0, PDF_SIGNATURE.length).equals(PDF_SIGNATURE)) return { valid: true, mimeType: "application/pdf" };
  if (buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) return { valid: true, mimeType: "image/png" };
  if (buffer.subarray(0, JPEG_SIGNATURE.length).equals(JPEG_SIGNATURE)) return { valid: true, mimeType: "image/jpeg" };
  if (buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") {
    return { valid: true, mimeType: "image/webp" };
  }
  return { valid: false, message: "Only valid PDF, PNG, JPEG, and WebP files are allowed" };
}