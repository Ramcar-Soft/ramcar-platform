import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithHarness } from "../../test/harness";
import { VisitorsTable } from "../components/visitors-table";
import type { PaginatedResponse, VisitPerson } from "../types";

const mockPerson: VisitPerson = {
  id: "person-1",
  tenantId: "t1",
  type: "visitor",
  code: "V001",
  fullName: "María García",
  status: "allowed",
  phone: null,
  company: null,
  residentId: "res-1",
  residentName: "Roberto Residente",
  residentAddress: "Calle Falsa 123",
  vehiclePlates: ["ABC-123", "DEF-456"],
  notes: null,
  registeredBy: "user-1",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockData: PaginatedResponse<VisitPerson> = {
  data: [mockPerson],
  meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
};

const defaultProps = {
  data: mockData,
  isLoading: false,
  isError: false,
  highlightedIndex: -1,
  search: "",
  onSearchChange: vi.fn(),
  onSelectPerson: vi.fn(),
};

describe("VisitorsTable", () => {
  it("renders person data", () => {
    renderWithHarness(<VisitorsTable {...defaultProps} />);
    expect(screen.getByText("María García")).toBeDefined();
    expect(screen.getByText("V001")).toBeDefined();
  });

  it("renders emptyState slot when data is empty", () => {
    const emptyData: PaginatedResponse<VisitPerson> = {
      data: [],
      meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    };
    renderWithHarness(
      <VisitorsTable
        {...defaultProps}
        data={emptyData}
        emptyState={<span data-testid="custom-empty">No hay visitantes</span>}
      />,
    );
    expect(screen.getByTestId("custom-empty")).toBeDefined();
  });

  it("renders default empty text when data is empty and no emptyState slot", () => {
    const emptyData: PaginatedResponse<VisitPerson> = {
      data: [],
      meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    };
    renderWithHarness(<VisitorsTable {...defaultProps} data={emptyData} />);
    expect(screen.getByText("visitPersons.empty")).toBeDefined();
  });

  it("shows loading skeletons when isLoading", () => {
    renderWithHarness(<VisitorsTable {...defaultProps} isLoading />);
    const skeletons = document.querySelectorAll(".animate-pulse, [class*='skeleton']");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders the resident address column", () => {
    renderWithHarness(<VisitorsTable {...defaultProps} />);
    const addresses = screen.queryAllByText("Calle Falsa 123");
    expect(addresses.length).toBeGreaterThan(0);
  });

  it("renders the plates column with the first plate and a +1 badge", () => {
    renderWithHarness(<VisitorsTable {...defaultProps} />);
    const plates = screen.queryAllByText("ABC-123");
    expect(plates.length).toBeGreaterThan(0);
    const badges = screen.queryAllByText("+1");
    expect(badges.length).toBeGreaterThan(0);
  });
});
