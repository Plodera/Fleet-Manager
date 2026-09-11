// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LicenseExpiry from "./LicenseExpiry";

const mocks = vi.hoisted(() => ({
  role: "admin",
  permissions: [] as string[],
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { role: mocks.role, permissions: mocks.permissions } }),
}));
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(),
  queryClient: { invalidateQueries: vi.fn() },
}));
vi.mock("@/components/PageHeader", () => ({
  PageHeader: ({ title, actions }: { title: string; actions?: React.ReactNode }) => <header><h1>{title}</h1>{actions}</header>,
}));

const labels = {
  title: "License Expiry",
  subtitle: "Monitor compliance",
  licenses: "Licenses",
  companyDocuments: "Company Documents",
  rules: "Rules",
  myAlerts: "My Alerts",
  vehicleCompliance: "Vehicle compliance",
  vehicleComplianceDescription: "Ownership, insurance, and IVM status for each vehicle.",
  vehicle: "Vehicle",
  status: "Status",
  priorityExpiry: "Priority expiry",
  searchCompliance: "Search compliance",
  filterCompliance: "Filter compliance",
  allStatuses: "All statuses",
  complianceStates: { expired: "Expired", expiring: "Expiring", valid: "Valid", missing: "Missing" },
  expired: "Expired",
  expiringSoon: "Expiring soon",
  valid: "Valid",
  missing: "Missing",
  daysOverdue: "days overdue",
  expiresToday: "Expires today",
  daysRemaining: "days remaining",
  vehicleLicenseExpiry: "Vehicle license expiry",
  ownership: "Ownership",
  dateLimit: "Ownership expiry",
  insuranceNumber: "Insurance number",
  policyNumber: "Policy number",
  insuranceExpiry: "Insurance expiry",
  imported: "Imported",
  ivmNumber: "IVM number",
  ivmPaymentTerms: "IVM payment terms",
  ivmExpiry: "IVM expiry",
  details: "Details",
  documents: "Documents",
  downloadTemplate: "Download template",
  importSpreadsheet: "Import spreadsheet",
  noComplianceRecords: "No compliance records",
  driverLicenses: "Driver licenses",
  noDriverLicenses: "No driver licenses",
  runCheck: "Run check",
  runningCheck: "Running check",
  entityTypes: {},
  alertStatus: {},
  daysBefore: "{days} days before",
  color: "Color",
  vehicleType: "Vehicle type",
  ownershipDocument: "Ownership document",
  insuranceDocument: "Insurance document",
  ivmDocument: "IVM document",
};

vi.mock("@/lib/i18n", () => ({
  useLanguage: () => ({ t: { licenseExpiry: labels, buttons: { edit: "Edit", cancel: "Cancel", save: "Save", delete: "Delete" } } }),
}));

const vehicles = [
  {
    id: 1,
    make: "Toyota",
    model: "Hilux",
    color: "White",
    licensePlate: "ABC-123",
    vehicleTypeLabel: "Pickup",
    licenseExpiryDate: "2026-12-20",
    ownershipDocumentType: "Title",
    ownershipExpiryDate: "2026-09-01",
    insuranceNumber: "INS-100",
    insurancePolicyNumber: "POL-200",
    insuranceExpiryDate: "2026-10-01",
    insuranceImportedStatus: "Confirmed",
    ivmNumber: "IVM-300",
    ivmPaymentTerms: "Annual",
    ivmExpiryDate: "2027-01-15",
    ivmImportedStatus: "Current",
  },
  {
    id: 2,
    make: "Ford",
    model: "Ranger",
    color: "Blue",
    licensePlate: "XYZ-789",
    vehicleTypeLabel: "Utility",
    licenseExpiryDate: "2027-08-01",
    ownershipExpiryDate: "2027-09-01",
    insuranceExpiryDate: "2027-10-01",
    ivmExpiryDate: "2027-11-01",
  },
  {
    id: 3,
    make: "Nissan",
    model: "Navara",
    licensePlate: "MISS-000",
  },
];

vi.mock("@tanstack/react-query", async importOriginal => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
      const key = queryKey[0];
      if (key === "/api/license-expiry/overview") return { data: { vehicles, drivers: [] } };
      if (key === "/api/vehicle-compliance/import-history" && queryKey.length > 1) return { data: null };
      return { data: [] };
    },
    useMutation: () => ({ mutate: vi.fn(), isPending: false }),
  };
});

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <LicenseExpiry />
    </QueryClientProvider>,
  );
}

function summaryButton(plate: string) {
  return screen.getByRole("button", { name: new RegExp(plate) });
}

describe("compact vehicle compliance register", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-09-11T12:00:00Z"));
    mocks.role = "admin";
    mocks.permissions = [];
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("shows vehicle identity, overall status, and nearest priority expiry in each compact summary", () => {
    renderPage();

    const expired = summaryButton("ABC-123");
    expect(expired).toHaveTextContent("Toyota · Hilux · White");
    expect(expired).toHaveTextContent("Pickup");
    expect(expired).toHaveTextContent("Expired · 10 days overdue");
    expect(expired).toHaveTextContent("Ownership expiry");
    expect(expired).toHaveTextContent("2026-09-01");

    expect(summaryButton("XYZ-789")).toHaveTextContent("Valid");
    expect(summaryButton("MISS-000")).toHaveTextContent("Missing");
  });

  it("expands a selected vehicle and reveals every compliance detail", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();
    const summary = summaryButton("ABC-123");

    expect(summary).toHaveAttribute("aria-expanded", "false");
    expect(summary).toHaveAttribute("aria-controls", "compliance-details-1");
    await user.click(summary);

    expect(summary).toHaveAttribute("aria-expanded", "true");
    const details = screen.getByRole("region", { name: "Details: ABC-123" });
    expect(details).toHaveAttribute("id", "compliance-details-1");
    for (const value of ["2026-12-20", "Title", "2026-09-01", "INS-100", "POL-200", "2026-10-01", "Confirmed", "IVM-300", "Annual", "2027-01-15", "Current"]) {
      expect(details).toHaveTextContent(value);
    }
  });

  it("shows administrative actions only to admins", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { unmount } = renderPage();
    expect(screen.getByRole("button", { name: "Download template" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Import spreadsheet" })).toBeInTheDocument();
    await user.click(summaryButton("ABC-123"));
    expect(screen.getByRole("button", { name: "Documents" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();

    unmount();
    mocks.role = "user";
    mocks.permissions = ["view_license_expiry"];
    renderPage();
    expect(screen.queryByRole("button", { name: "Download template" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Import spreadsheet" })).not.toBeInTheDocument();
    await user.click(summaryButton("ABC-123"));
    const details = screen.getByRole("region", { name: "Details: ABC-123" });
    expect(within(details).queryByRole("button", { name: "Documents" })).not.toBeInTheDocument();
    expect(within(details).queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
  });

  it("keeps search and status filtering functional", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();

    await user.type(screen.getByRole("textbox", { name: "Search compliance" }), "Ranger");
    expect(summaryButton("XYZ-789")).toBeInTheDocument();
    expect(screen.queryByText("ABC-123")).not.toBeInTheDocument();

    await user.clear(screen.getByRole("textbox", { name: "Search compliance" }));
    await user.click(screen.getByRole("combobox", { name: "Filter compliance" }));
    await user.click(screen.getByRole("option", { name: "Expired" }));
    expect(summaryButton("ABC-123")).toBeInTheDocument();
    expect(screen.queryByText("XYZ-789")).not.toBeInTheDocument();
    expect(screen.queryByText("MISS-000")).not.toBeInTheDocument();
  });

  it("retains responsive classes and accessible summary-detail relationships", () => {
    const { container } = renderPage();
    const header = screen.getAllByText("Priority expiry").find(element => element.parentElement?.classList.contains("hidden"))?.parentElement;
    expect(header).toHaveClass("hidden", "md:grid");
    expect(summaryButton("ABC-123")).toHaveClass("grid", "md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_32px]");
    expect(container.querySelectorAll('button[aria-controls^="compliance-details-"]')).toHaveLength(3);
  });
});