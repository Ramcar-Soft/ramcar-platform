import { describe, it, expect, vi, afterEach } from "vitest";
import { screen, cleanup } from "@testing-library/react";
import { renderWithHarness } from "../../test/harness";
import { VisitPersonEditForm } from "../components/visit-person-edit-form";
import type { VisitPerson } from "../types";

afterEach(() => cleanup());

const fixture: VisitPerson = {
  id: "vp-1",
  tenantId: "t-1",
  code: "VP-001",
  type: "visitor",
  status: "allowed",
  fullName: "Existing Visitor",
  phone: null,
  company: null,
  residentId: null,
  notes: null,
  registeredBy: "u-1",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const defaultProps = {
  person: fixture,
  onSave: vi.fn(),
  onCancel: vi.fn(),
  isSaving: false,
};

describe("VisitPersonEditForm", () => {
  it("renders the status select disabled when role is Guard, but still shows the current value", () => {
    renderWithHarness(<VisitPersonEditForm {...defaultProps} />, {
      role: { role: "Guard" },
    });
    const trigger = screen.getByTestId("visit-person-status-select");
    expect(trigger).toBeDisabled();
    // Existing record's status label is still visible (Radix renders text in
    // both the visible trigger span and the hidden native <option>, so we use
    // getAllByText to avoid the "multiple elements" error).
    expect(screen.getAllByText("visitPersons.status.allowed").length).toBeGreaterThan(0);
  });

  it("renders the status select enabled when role is Admin", () => {
    renderWithHarness(<VisitPersonEditForm {...defaultProps} />, {
      role: { role: "Admin" },
    });
    const trigger = screen.getByTestId("visit-person-status-select");
    expect(trigger).not.toBeDisabled();
  });
});
