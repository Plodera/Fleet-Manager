export const VEHICLE_COMPLIANCE_HEADERS = [
  "Vehicle Plate",
  "Brand",
  "Model",
  "Color",
  "Vehicle Type",
  "Ownership Doc Type",
  "Date Limit",
  "Insurance NO.",
  "Insurance Policy No.",
  "Insurance Expiration Date",
  "Insurance Status",
  "IVM No.",
  "IVM Payment Terms",
  "IVM Expiration Date",
  "IVM Status",
] as const;

export type ParsedComplianceRow = {
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

function normalizedHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function cell(record: Record<string, unknown>, aliases: string[]): unknown {
  const wanted = new Set(aliases.map(normalizedHeader));
  const entry = Object.entries(record).find(([key]) => wanted.has(normalizedHeader(key)));
  return entry?.[1];
}

function text(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const result = String(value).trim();
  return result || undefined;
}

function isoDate(year: number, month: number, day: number): string | undefined {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return undefined;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseComplianceDate(value: unknown): { value?: string; error?: string } {
  if (value === undefined || value === null || value === "") return {};
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return { value: isoDate(value.getFullYear(), value.getMonth() + 1, value.getDate()) };
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const utc = new Date(Date.UTC(1899, 11, 30) + Math.floor(value) * 86400000);
    return { value: utc.toISOString().slice(0, 10) };
  }
  const raw = String(value).trim();
  if (!raw || /^definitive$/i.test(raw)) return {};

  // Some insurance registers store a coverage period rather than a single
  // expiry date. The final date is the expiry used for compliance reminders.
  const dateRange = raw.split(/\s+(?:to|até)\s+/i);
  if (dateRange.length === 2 && dateRange[1]) return parseComplianceDate(dateRange[1]);

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(raw);
  if (iso) {
    const parsed = isoDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
    return parsed ? { value: parsed } : { error: `Invalid date: ${raw}` };
  }
  const slash = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/.exec(raw);
  if (slash) {
    const first = Number(slash[1]);
    const second = Number(slash[2]);
    const year = slash[3].length === 2 ? 2000 + Number(slash[3]) : Number(slash[3]);
    if (first <= 12 && second <= 12 && first !== second) return { error: `Ambiguous date: ${raw}` };
    const month = first > 12 ? second : first;
    const day = first > 12 ? first : second;
    const parsed = isoDate(year, month, day);
    return parsed ? { value: parsed } : { error: `Invalid date: ${raw}` };
  }
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return { value: isoDate(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate()) };
  }
  return { error: `Invalid date: ${raw}` };
}

export function parseVehicleComplianceRows(records: Record<string, unknown>[]): ParsedComplianceRow[] {
  return records
    .map((record, index) => {
      const licensePlate = text(cell(record, ["Vehicle Plate", "License Plate", "Plate"])) || "";
      const ownershipDate = parseComplianceDate(cell(record, ["Date Limit", "Ownership Expiration Date", "Ownership Expiry Date"]));
      const insuranceDate = parseComplianceDate(cell(record, ["Insurance Expiration Date", "Insurance Expiry Date"]));
      const ivmDate = parseComplianceDate(cell(record, ["IVM Expiration Date", "IVM Expiry Date"]));
      const errors = [
        ownershipDate.error && `Date Limit — ${ownershipDate.error}`,
        insuranceDate.error && `Insurance Expiration Date — ${insuranceDate.error}`,
        ivmDate.error && `IVM Expiration Date — ${ivmDate.error}`,
      ].filter(Boolean) as string[];
      const row: ParsedComplianceRow = {
        rowNumber: index + 2,
        licensePlate,
        make: text(cell(record, ["Brand", "Make"])),
        model: text(cell(record, ["Model"])),
        color: text(cell(record, ["Color", "Colour"])),
        vehicleTypeLabel: text(cell(record, ["Vehicle Type", "Type"])),
        ownershipDocumentType: text(cell(record, ["Ownership Doc Type", "Ownership Document Type"])),
        ownershipExpiryDate: ownershipDate.value,
        insuranceNumber: text(cell(record, ["Insurance NO.", "Insurance No", "Insurance Number"])),
        insurancePolicyNumber: text(cell(record, ["Insurance Policy No.", "Insurance Policy Number"])),
        insuranceExpiryDate: insuranceDate.value,
        insuranceImportedStatus: text(cell(record, ["Insurance Status"])),
        ivmNumber: text(cell(record, ["IVM No.", "IVM Number"])),
        ivmPaymentTerms: text(cell(record, ["IVM Payment Terms"])),
        ivmExpiryDate: ivmDate.value,
        ivmImportedStatus: text(cell(record, ["IVM Status"])),
        errors: errors.length ? errors : undefined,
      };
      return row;
    })
    .filter(row => row.licensePlate || row.make || row.model);
}
