import type { InsertVehicle, Vehicle } from "@shared/schema";

export type VehicleComplianceImportRow = {
  rowNumber: number;
  licensePlate: string;
  make?: string;
  model?: string;
  color?: string;
  vehicleTypeLabel?: string;
  ownershipDocumentType?: string;
  ownershipExpiryDate?: string;
  insuranceNumber?: string;
  insurancePolicyNumber?: string;
  insuranceExpiryDate?: string;
  insuranceImportedStatus?: string;
  ivmNumber?: string;
  ivmPaymentTerms?: string;
  ivmExpiryDate?: string;
  ivmImportedStatus?: string;
  errors?: string[];
};

export type VehicleCompliancePreviewRow = VehicleComplianceImportRow & {
  action: "create" | "update" | "error";
  vehicleId?: number;
  messages: string[];
};

export function normalizeVehiclePlate(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function nonBlank(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export function categoryFromVehicleType(value?: string): InsertVehicle["category"] {
  const type = value?.trim().toLowerCase() || "";
  if (type.includes("heavy") || type.includes("truck")) return "truck";
  if (type.includes("cargo") || type.includes("van")) return "van";
  if (type.includes("bus")) return "bus";
  return "car";
}

export function previewVehicleComplianceImport(
  rows: VehicleComplianceImportRow[],
  vehicles: Vehicle[],
  createUnmatched: boolean,
): VehicleCompliancePreviewRow[] {
  const existingByPlate = new Map(vehicles.map(vehicle => [normalizeVehiclePlate(vehicle.licensePlate), vehicle]));
  const plateCounts = new Map<string, number>();
  for (const row of rows) {
    const plate = normalizeVehiclePlate(row.licensePlate);
    if (plate) plateCounts.set(plate, (plateCounts.get(plate) || 0) + 1);
  }

  return rows.map(row => {
    const messages = [...(row.errors || [])];
    const plate = normalizeVehiclePlate(row.licensePlate);
    if (!plate) messages.push("Vehicle Plate is required");
    if (plate && (plateCounts.get(plate) || 0) > 1) messages.push("Duplicate vehicle plate in this file");
    const existing = plate ? existingByPlate.get(plate) : undefined;
    if (messages.length > 0) return { ...row, action: "error", messages };
    if (existing) return { ...row, action: "update", vehicleId: existing.id, messages: [] };
    if (!createUnmatched) return { ...row, action: "error", messages: ["Vehicle plate was not found and create-unmatched is disabled"] };
    if (!nonBlank(row.make) || !nonBlank(row.model)) {
      return { ...row, action: "error", messages: ["Brand and Model are required to create a new vehicle"] };
    }
    return {
      ...row,
      action: "create",
      messages: ["Year will default to the current year because the source template has no Year column"],
    };
  });
}

export function vehicleComplianceUpdates(
  row: VehicleComplianceImportRow,
  replaceBlanks: boolean,
): Partial<InsertVehicle> {
  const source: Record<string, string | undefined> = {
    make: row.make,
    model: row.model,
    color: row.color,
    vehicleTypeLabel: row.vehicleTypeLabel,
    ownershipDocumentType: row.ownershipDocumentType,
    ownershipExpiryDate: row.ownershipExpiryDate,
    insuranceNumber: row.insuranceNumber,
    insurancePolicyNumber: row.insurancePolicyNumber,
    insuranceExpiryDate: row.insuranceExpiryDate,
    insuranceImportedStatus: row.insuranceImportedStatus,
    ivmNumber: row.ivmNumber,
    ivmPaymentTerms: row.ivmPaymentTerms,
    ivmExpiryDate: row.ivmExpiryDate,
    ivmImportedStatus: row.ivmImportedStatus,
  };
  const updates: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(source)) {
    const normalized = nonBlank(value);
    if (normalized !== undefined) updates[key] = normalized;
    else if (replaceBlanks && key !== "make" && key !== "model") updates[key] = null;
  }
  return updates as Partial<InsertVehicle>;
}
