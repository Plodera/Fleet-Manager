import { describe, expect, it } from "vitest";
import { parseComplianceDate, parseVehicleComplianceRows } from "./vehicleComplianceImport";

describe("vehicle compliance spreadsheet parser", () => {
  it("parses ISO, Excel serial, and unambiguous slash dates", () => {
    expect(parseComplianceDate("2027-03-31").value).toBe("2027-03-31");
    expect(parseComplianceDate(45292).value).toBe("2024-01-01");
    expect(parseComplianceDate("31/03/2027").value).toBe("2027-03-31");
    expect(parseComplianceDate("5/21/2027").value).toBe("2027-05-21");
  });

  it("reports ambiguous dates instead of guessing", () => {
    expect(parseComplianceDate("3/4/2027").error).toContain("Ambiguous");
  });

  it("maps the supplied spreadsheet headings", () => {
    const [row] = parseVehicleComplianceRows([{
      "Vehicle Plate": "LDA-59-70-AI",
      Brand: "Suzuki",
      Model: "Swift",
      "Ownership Doc Type": "Guia Provisoria",
      "Date Limit": "31/03/2027",
      "Insurance NO.": "302615864/26",
      "Insurance Policy No.": "AF-1462592",
      "Insurance Expiration Date": "5/21/2027",
      "IVM No.": "21899784260",
      "IVM Payment Terms": "Paid",
      "IVM Status": "Compliant",
    }]);
    expect(row).toMatchObject({
      licensePlate: "LDA-59-70-AI",
      ownershipExpiryDate: "2027-03-31",
      insuranceExpiryDate: "2027-05-21",
      ivmImportedStatus: "Compliant",
    });
  });
});