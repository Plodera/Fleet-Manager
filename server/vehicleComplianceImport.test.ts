import { describe, expect, it } from "vitest";
import { normalizeVehiclePlate, previewVehicleComplianceImport, vehicleComplianceUpdates } from "./vehicleComplianceImport";

const vehicle = {
  id: 1,
  licensePlate: "LDA-59-70-AI",
  make: "Existing",
  model: "Vehicle",
} as any;

describe("vehicle compliance import", () => {
  it("matches existing vehicles using a normalized plate", () => {
    const [result] = previewVehicleComplianceImport([
      { rowNumber: 2, licensePlate: "lda 59 70 ai", make: "Changed" },
    ], [vehicle], true);
    expect(normalizeVehiclePlate("LDA-59-70-AI")).toBe("LDA5970AI");
    expect(result.action).toBe("update");
    expect(result.vehicleId).toBe(1);
  });

  it("rejects duplicate plates in the same file", () => {
    const results = previewVehicleComplianceImport([
      { rowNumber: 2, licensePlate: "ABC-123", make: "A", model: "B" },
      { rowNumber: 3, licensePlate: "ABC 123", make: "A", model: "B" },
    ], [], true);
    expect(results.every(result => result.action === "error")).toBe(true);
  });

  it("preserves existing values for blank cells unless replacement is requested", () => {
    const row = { rowNumber: 2, licensePlate: "ABC", color: "", insuranceNumber: " 123 " };
    expect(vehicleComplianceUpdates(row, false)).toEqual({ insuranceNumber: "123" });
    expect(vehicleComplianceUpdates(row, true)).toMatchObject({ color: null, insuranceNumber: "123" });
  });
});