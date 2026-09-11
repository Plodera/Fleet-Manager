import { describe, expect, it } from "vitest";
import { canAccessVehicleComplianceDocuments, validateComplianceDocument } from "./vehicleComplianceDocuments";

describe("vehicle compliance document protection", () => {
  it("blocks ordinary vehicle viewers from document metadata and downloads", () => {
    expect(canAccessVehicleComplianceDocuments({ role: "staff", permissions: JSON.stringify(["view_vehicles"]) } as any)).toBe(false);
    expect(canAccessVehicleComplianceDocuments({ role: "staff", permissions: JSON.stringify(["manage_vehicles"]) } as any)).toBe(true);
    expect(canAccessVehicleComplianceDocuments({ role: "admin", permissions: "[]" } as any)).toBe(true);
  });

  it("rejects bytes spoofed as a PDF and recognizes allowed file signatures", () => {
    expect(validateComplianceDocument(Buffer.from("not a PDF at all")).valid).toBe(false);
    expect(validateComplianceDocument(Buffer.concat([Buffer.from("%PDF-1.7\n"), Buffer.alloc(32)]) )).toEqual({
      valid: true, mimeType: "application/pdf",
    });
    expect(validateComplianceDocument(Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]) )).toEqual({
      valid: true, mimeType: "image/png",
    });
  });
});