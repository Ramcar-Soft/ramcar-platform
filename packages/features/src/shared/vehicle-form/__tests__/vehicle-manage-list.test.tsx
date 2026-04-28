import { describe, it, expect, vi, afterEach } from "vitest";
import { screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import type { Vehicle } from "@ramcar/shared";
import { renderWithHarness } from "../../../test/harness";
import { VehicleManageList } from "../vehicle-manage-list";

afterEach(() => cleanup());

const v1: Vehicle = {
  id: "v1",
  tenantId: "test-tenant-id",
  userId: "u1",
  visitPersonId: null,
  vehicleType: "car",
  brand: "Toyota",
  model: "Corolla",
  plate: "ABC-1234",
  color: null,
  notes: null,
  year: 2020,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};
const v2: Vehicle = { ...v1, id: "v2", plate: "XYZ-9999", model: "Hilux" };

describe("VehicleManageList", () => {
  it("renders empty state when no vehicles", () => {
    renderWithHarness(
      <VehicleManageList
        residentId="u1"
        vehicles={[]}
        isLoading={false}
        onEdit={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText("vehicles.manage.empty")).toBeInTheDocument();
  });

  it("renders one row per vehicle", () => {
    renderWithHarness(
      <VehicleManageList
        residentId="u1"
        vehicles={[v1, v2]}
        isLoading={false}
        onEdit={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getAllByLabelText("vehicles.manage.editAction")).toHaveLength(2);
    expect(screen.getAllByLabelText("vehicles.manage.deleteAction")).toHaveLength(2);
  });

  it("clicking Edit fires onEdit with the matching vehicle", () => {
    const onEdit = vi.fn();
    renderWithHarness(
      <VehicleManageList
        residentId="u1"
        vehicles={[v1, v2]}
        isLoading={false}
        onEdit={onEdit}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getAllByLabelText("vehicles.manage.editAction")[1]);
    expect(onEdit).toHaveBeenCalledWith(v2);
  });

  it("clicking Delete opens the confirm dialog and confirm calls transport.delete", async () => {
    const del = vi.fn().mockResolvedValue(undefined);
    renderWithHarness(
      <VehicleManageList
        residentId="u1"
        vehicles={[v1]}
        isLoading={false}
        onEdit={vi.fn()}
        onClose={vi.fn()}
      />,
      { transport: { delete: del } },
    );

    fireEvent.click(screen.getByLabelText("vehicles.manage.deleteAction"));
    expect(await screen.findByText("vehicles.deleteConfirm.title")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "vehicles.deleteConfirm.confirm" }));

    await waitFor(() => expect(del).toHaveBeenCalledWith("/vehicles/v1"));
  });

  it("clicking the back button fires onClose", () => {
    const onClose = vi.fn();
    renderWithHarness(
      <VehicleManageList
        residentId="u1"
        vehicles={[v1]}
        isLoading={false}
        onEdit={vi.fn()}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByLabelText("vehicles.form.cancel"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
