import { describe, expect, it } from "vitest";
import { normalizeVehiclePlate, previewVehicleComplianceImport, vehicleComplianceUpdates, complianceRollbackDecision, safeCsvCell } from "./vehicleComplianceImport";

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

  it("reports a blank vehicle plate without failing the complete preview", () => {
    const [result] = previewVehicleComplianceImport([
      { rowNumber: 2, licensePlate: null as any, make: "A", model: "B" },
    ], [], true);
    expect(result).toMatchObject({ action: "error" });
    expect(result.messages).toContain("Vehicle Plate is required");
  });

  it("preserves existing values for blank cells unless replacement is requested", () => {
    const row = { rowNumber: 2, licensePlate: "ABC", color: "", insuranceNumber: " 123 " };
    expect(vehicleComplianceUpdates(row, false)).toEqual({ insuranceNumber: "123" });
    expect(vehicleComplianceUpdates(row, true)).toMatchObject({ color: null, insuranceNumber: "123" });
  });

  it("restores only fields that were not changed after import", () => {
    const decision = complianceRollbackDecision({
      action: "update", vehicleId: 1,
      beforeValues: { color: "red", insuranceNumber: "old" },
      afterValues: { color: "blue", insuranceNumber: "new" },
      changedFields: ["color", "insuranceNumber"],
    }, { color: "green", insuranceNumber: "new" });
    expect(decision.updates).toEqual({ insuranceNumber: "old" });
    expect(decision.warning).toContain("color");
  });

  it("deletes a created vehicle only when every imported value is unchanged", () => {
    const row = { action: "create", beforeValues: {}, afterValues: { make: "A", model: "B" }, changedFields: ["make", "model"] };
    expect(complianceRollbackDecision(row, { make: "A", model: "B" }).canDelete).toBe(true);
    expect(complianceRollbackDecision(row, { make: "A", model: "Changed" }).canDelete).toBe(false);
  });

  it("neutralizes spreadsheet formulas and escapes CSV quotes", () => {
    expect(safeCsvCell("=HYPERLINK(\"https://example.com\")")).toBe(
      "\"'=HYPERLINK(\"\"https://example.com\"\")\"",
    );
    expect(safeCsvCell(["color", "insuranceNumber"])).toBe(
      "\"[\"\"color\"\",\"\"insuranceNumber\"\"]\"",
    );
  });
});