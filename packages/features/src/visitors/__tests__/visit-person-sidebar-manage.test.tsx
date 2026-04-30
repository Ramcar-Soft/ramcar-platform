import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, cleanup, fireEvent } from "@testing-library/react";
import { renderWithHarness } from "../../test/harness";
import { VisitPersonSidebar } from "../components/visit-person-sidebar";
import type { VisitPerson, Vehicle } from "../types";

afterEach(() => cleanup());

let capturedManageListProps: Record<string, unknown> | null = null;
let capturedVehicleFormProps: Record<string, unknown> | null = null;

vi.mock("../../shared/vehicle-form", () => ({
  VehicleForm: (props: Record<string, unknown>) => {
    capturedVehicleFormProps = props;
    return (
      <div data-testid="vehicle-form" data-mode={props.mode as string}>
        <button onClick={() => (props.onSaved as () => void)?.()}>vehicle-form-save</button>
        <button onClick={() => (props.onCancel as () => void)?.()}>vehicle-form-cancel</button>
      </div>
    );
  },
  VehicleManageList: (props: Record<string, unknown>) => {
    capturedManageListProps = props;
    const v = { id: "v1", plate: "ABC-123" } as unknown as Vehicle;
    return (
      <div data-testid="vehicle-manage-list">
        <button onClick={() => (props.onEdit as (v: Vehicle) => void)?.(v)}>manage-pencil</button>
        <button onClick={() => (props.onClose as () => void)?.()}>manage-back</button>
        {(props.canDelete as boolean) && <button aria-label="trash">trash</button>}
      </div>
    );
  },
}));

vi.mock("../components/recent-events-list", () => ({ RecentEventsList: () => null }));
vi.mock("../components/visit-person-status-badge", () => ({ VisitPersonStatusBadge: () => null }));
vi.mock("../components/image-section", () => ({ ImageSection: () => null }));
vi.mock("../components/visit-person-form", () => ({ VisitPersonForm: () => null }));
vi.mock("../components/visit-person-edit-form", () => ({ VisitPersonEditForm: () => null }));

const makePerson = (): VisitPerson => ({
  id: "vp-1",
  code: "V001",
  fullName: "Bob Visitor",
  phone: null,
  company: null,
  status: "allowed",
  notes: null,
  residentId: "r-1",
  residentName: "Alice",
  registeredBy: "guard-1",
  type: "visitor",
  tenantId: "t-1",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
});

const makeVehicle = (): Vehicle => ({
  id: "v1",
  tenantId: "t-1",
  userId: null,
  visitPersonId: "vp-1",
  vehicleType: "car",
  brand: "Toyota",
  model: null,
  plate: "ABC-123",
  color: null,
  notes: null,
  year: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
});

const noop = async () => {};

describe("VisitPersonSidebar — manage flow (spec 026 US1)", () => {
  beforeEach(() => {
    capturedManageListProps = null;
    capturedVehicleFormProps = null;
  });

  it("shows the manage vehicles button in default view when vehicles exist", () => {
    renderWithHarness(
      <VisitPersonSidebar
        open={true}
        mode="view"
        person={makePerson()}
        recentEvents={undefined}
        isLoadingRecentEvents={false}
        vehicles={[makeVehicle()]}
        isLoadingVehicles={false}
        isSaving={false}
        isCreating={false}
        onClose={vi.fn()}
        onSave={noop}
        onCreatePerson={noop as never}
      />,
    );
    expect(screen.getByText("accessEvents.vehicleSelect.manageVehicles")).toBeInTheDocument();
  });

  it("clicking manage vehicles transitions to manage list view", () => {
    renderWithHarness(
      <VisitPersonSidebar
        open={true}
        mode="view"
        person={makePerson()}
        recentEvents={undefined}
        isLoadingRecentEvents={false}
        vehicles={[makeVehicle()]}
        isLoadingVehicles={false}
        isSaving={false}
        isCreating={false}
        onClose={vi.fn()}
        onSave={noop}
        onCreatePerson={noop as never}
      />,
    );
    fireEvent.click(screen.getByText("accessEvents.vehicleSelect.manageVehicles"));
    expect(screen.getByTestId("vehicle-manage-list")).toBeInTheDocument();
  });

  it("guard role: VehicleManageList receives canDelete={false}", () => {
    renderWithHarness(
      <VisitPersonSidebar
        open={true}
        mode="view"
        person={makePerson()}
        recentEvents={undefined}
        isLoadingRecentEvents={false}
        vehicles={[makeVehicle()]}
        isLoadingVehicles={false}
        isSaving={false}
        isCreating={false}
        onClose={vi.fn()}
        onSave={noop}
        onCreatePerson={noop as never}
      />,
      { role: { role: "Guard", tenantId: "t-1", userId: "u-1" } },
    );
    fireEvent.click(screen.getByText("accessEvents.vehicleSelect.manageVehicles"));
    expect(capturedManageListProps?.canDelete).toBe(false);
    expect(screen.queryByRole("button", { name: "trash" })).toBeNull();
  });

  it("admin role: VehicleManageList receives canDelete={true}", () => {
    renderWithHarness(
      <VisitPersonSidebar
        open={true}
        mode="view"
        person={makePerson()}
        recentEvents={undefined}
        isLoadingRecentEvents={false}
        vehicles={[makeVehicle()]}
        isLoadingVehicles={false}
        isSaving={false}
        isCreating={false}
        onClose={vi.fn()}
        onSave={noop}
        onCreatePerson={noop as never}
      />,
      { role: { role: "Admin", tenantId: "t-1", userId: "u-1" } },
    );
    fireEvent.click(screen.getByText("accessEvents.vehicleSelect.manageVehicles"));
    expect(capturedManageListProps?.canDelete).toBe(true);
  });

  it("pencil click in manage list mounts VehicleForm in edit mode", () => {
    renderWithHarness(
      <VisitPersonSidebar
        open={true}
        mode="view"
        person={makePerson()}
        recentEvents={undefined}
        isLoadingRecentEvents={false}
        vehicles={[makeVehicle()]}
        isLoadingVehicles={false}
        isSaving={false}
        isCreating={false}
        onClose={vi.fn()}
        onSave={noop}
        onCreatePerson={noop as never}
      />,
    );
    fireEvent.click(screen.getByText("accessEvents.vehicleSelect.manageVehicles"));
    fireEvent.click(screen.getByText("manage-pencil"));
    expect(screen.getByTestId("vehicle-form")).toBeInTheDocument();
    expect(capturedVehicleFormProps?.mode).toBe("edit");
  });

  it("saving vehicle form returns to manage list", () => {
    renderWithHarness(
      <VisitPersonSidebar
        open={true}
        mode="view"
        person={makePerson()}
        recentEvents={undefined}
        isLoadingRecentEvents={false}
        vehicles={[makeVehicle()]}
        isLoadingVehicles={false}
        isSaving={false}
        isCreating={false}
        onClose={vi.fn()}
        onSave={noop}
        onCreatePerson={noop as never}
      />,
    );
    fireEvent.click(screen.getByText("accessEvents.vehicleSelect.manageVehicles"));
    fireEvent.click(screen.getByText("manage-pencil"));
    fireEvent.click(screen.getByText("vehicle-form-save"));
    expect(screen.getByTestId("vehicle-manage-list")).toBeInTheDocument();
    expect(screen.queryByTestId("vehicle-form")).toBeNull();
  });

  it("back arrow in manage list returns to default access-event view", () => {
    renderWithHarness(
      <VisitPersonSidebar
        open={true}
        mode="view"
        person={makePerson()}
        recentEvents={undefined}
        isLoadingRecentEvents={false}
        vehicles={[makeVehicle()]}
        isLoadingVehicles={false}
        isSaving={false}
        isCreating={false}
        onClose={vi.fn()}
        onSave={noop}
        onCreatePerson={noop as never}
      />,
    );
    fireEvent.click(screen.getByText("accessEvents.vehicleSelect.manageVehicles"));
    expect(screen.getByTestId("vehicle-manage-list")).toBeInTheDocument();
    fireEvent.click(screen.getByText("manage-back"));
    expect(screen.queryByTestId("vehicle-manage-list")).toBeNull();
    expect(screen.getByText("accessEvents.vehicleSelect.manageVehicles")).toBeInTheDocument();
  });

  it("VehicleManageList receives owner={{ kind: 'visitPerson', visitPersonId }}", () => {
    renderWithHarness(
      <VisitPersonSidebar
        open={true}
        mode="view"
        person={makePerson()}
        recentEvents={undefined}
        isLoadingRecentEvents={false}
        vehicles={[makeVehicle()]}
        isLoadingVehicles={false}
        isSaving={false}
        isCreating={false}
        onClose={vi.fn()}
        onSave={noop}
        onCreatePerson={noop as never}
      />,
    );
    fireEvent.click(screen.getByText("accessEvents.vehicleSelect.manageVehicles"));
    expect(capturedManageListProps?.owner).toEqual({ kind: "visitPerson", visitPersonId: "vp-1" });
  });
});
