/// <reference types="@testing-library/jest-dom/vitest" />
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RoleProvider } from "@ramcar/features/adapters";
import type { RolePort } from "@ramcar/features/adapters";
import type { ExtendedUserProfile } from "../types";
import type { Vehicle } from "@ramcar/shared";

afterEach(() => cleanup());

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/shared/hooks/use-form-persistence", () => ({
  useFormPersistence: () => ({ wasRestored: false, discardDraft: vi.fn(), clearDraft: vi.fn() }),
}));

let capturedManageListProps: Record<string, unknown> | null = null;
let capturedVehicleFormProps: Record<string, unknown> | null = null;

vi.mock("@ramcar/features/shared/vehicle-form", () => ({
  useInlineVehicleSubmissions: () => ({
    entries: [], isSubmittingAny: false, allSaved: false,
    addEntry: vi.fn(), removeEntry: vi.fn(), updateEntry: vi.fn(),
    reset: vi.fn(), submitAll: vi.fn().mockResolvedValue({ saved: [], failed: [] }),
  }),
  InlineVehicleSection: () => null,
  VehicleManageList: (props: Record<string, unknown>) => {
    capturedManageListProps = props;
    const v = { id: "v1", plate: "ABC-123" } as unknown as Vehicle;
    return (
      <div data-testid="vehicle-manage-list">
        <button onClick={() => (props.onEdit as (v: Vehicle) => void)?.(v)}>manage-pencil</button>
        {(props.canDelete as boolean) && <button aria-label="trash">trash</button>}
      </div>
    );
  },
  VehicleForm: (props: Record<string, unknown>) => {
    capturedVehicleFormProps = props;
    return (
      <div data-testid="vehicle-form">
        <button onClick={() => (props.onSaved as () => void)?.()}>vehicle-form-save</button>
        <button onClick={() => (props.onCancel as () => void)?.()}>vehicle-form-cancel</button>
      </div>
    );
  },
}));

vi.mock("@ramcar/store", () => ({
  useAppStore: (selector: (s: unknown) => unknown) =>
    selector({ user: { userId: "u1", role: "Admin", tenantId: "t1" } }),
}));

vi.mock("../components/user-form", () => ({
  UserForm: (props: { mode: string; initialData?: ExtendedUserProfile; onSubmit: unknown; onCancel: unknown }) => (
    <div data-testid="user-form" data-mode={props.mode} />
  ),
}));

vi.mock("../hooks/use-create-user", () => ({
  useCreateUser: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("../hooks/use-update-user", () => ({
  useUpdateUser: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/features/tenants/hooks/use-tenants", () => ({
  useTenants: () => ({
    data: { data: [{ id: "t1", name: "Tenant A" }], meta: {} },
    isLoading: false,
  }),
}));

vi.mock("../hooks/use-user-groups", () => ({
  useUserGroups: () => ({ data: [], isLoading: false }),
}));

let mockUserData: ExtendedUserProfile | undefined = undefined;

vi.mock("../hooks/use-get-user", () => ({
  useGetUser: () => ({
    data: mockUserData,
    isLoading: false,
    isError: false,
    isFetching: false,
  }),
}));

let mockVehicles: Vehicle[] = [];

vi.mock("../hooks/use-user-vehicles", () => ({
  useUserVehicles: () => ({ data: mockVehicles, isLoading: false }),
}));

import { UserSidebar } from "../components/user-sidebar";

function makeUser(overrides: Partial<ExtendedUserProfile> = {}): ExtendedUserProfile {
  return {
    id: "p1", userId: "u1", tenantId: "t1", tenantName: "Tenant A",
    tenantIds: ["t1"], fullName: "Alice", email: "alice@x.com", role: "resident",
    address: "123 St", username: "alice", phone: "555-1", phoneType: null,
    status: "active", userGroupIds: [], userGroups: [], observations: null,
    createdAt: "2026-01-01", updatedAt: "2026-01-01", canEdit: true, canDeactivate: true,
    ...overrides,
  };
}

const makeVehicle = (): Vehicle => ({
  id: "v1", tenantId: "t1", userId: "u1", visitPersonId: null,
  vehicleType: "car", brand: "Toyota", model: null, plate: "ABC-123",
  color: null, notes: null, year: null,
  createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
});

function renderWithClient(ui: React.ReactElement, roleOverride: Partial<RolePort> = {}) {
  const role: RolePort = { role: "Admin", tenantId: "t1", userId: "u1", ...roleOverride };
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <RoleProvider value={role}>
      <QueryClientProvider client={qc}>{ui}</QueryClientProvider>
    </RoleProvider>,
  );
}

describe("UserSidebar — vehicle manage section (spec 026 US3)", () => {
  beforeEach(() => {
    capturedManageListProps = null;
    capturedVehicleFormProps = null;
    mockUserData = undefined;
    mockVehicles = [];
  });

  it("admin opens a resident: vehicle manage section is visible", () => {
    mockUserData = makeUser({ role: "resident" });
    mockVehicles = [makeVehicle()];
    renderWithClient(
      <UserSidebar open={true} mode="edit" userId="u1" onClose={vi.fn()} />,
    );
    expect(screen.getByTestId("vehicle-manage-list")).toBeInTheDocument();
  });

  it("admin opens a non-resident user: no vehicle section (FR-003)", () => {
    mockUserData = makeUser({ role: "admin" });
    renderWithClient(
      <UserSidebar open={true} mode="edit" userId="u1" onClose={vi.fn()} />,
    );
    expect(screen.queryByTestId("vehicle-manage-list")).toBeNull();
  });

  it("guard reaches edit sidebar: no vehicle section (FR-008)", () => {
    mockUserData = makeUser({ role: "resident" });
    mockVehicles = [makeVehicle()];
    renderWithClient(
      <UserSidebar open={true} mode="edit" userId="u1" onClose={vi.fn()} />,
      { role: "Guard" },
    );
    expect(screen.queryByTestId("vehicle-manage-list")).toBeNull();
  });

  it("admin with resident: VehicleManageList receives canDelete={true} and correct owner", () => {
    mockUserData = makeUser({ role: "resident" });
    mockVehicles = [makeVehicle()];
    renderWithClient(
      <UserSidebar open={true} mode="edit" userId="u1" onClose={vi.fn()} />,
    );
    expect(capturedManageListProps?.canDelete).toBe(true);
    expect(capturedManageListProps?.owner).toEqual({ kind: "resident", userId: "p1" });
  });

  it("clicking pencil → VehicleForm in edit mode; UserForm unmounted", () => {
    mockUserData = makeUser({ role: "resident" });
    mockVehicles = [makeVehicle()];
    renderWithClient(
      <UserSidebar open={true} mode="edit" userId="u1" onClose={vi.fn()} />,
    );
    fireEvent.click(screen.getByText("manage-pencil"));
    expect(screen.getByTestId("vehicle-form")).toBeInTheDocument();
    expect(capturedVehicleFormProps?.mode).toBe("edit");
    expect(screen.queryByTestId("user-form")).toBeNull();
    expect(screen.queryByTestId("vehicle-manage-list")).toBeNull();
  });

  it("saving VehicleForm returns to default sub-view with UserForm visible", () => {
    mockUserData = makeUser({ role: "resident" });
    mockVehicles = [makeVehicle()];
    renderWithClient(
      <UserSidebar open={true} mode="edit" userId="u1" onClose={vi.fn()} />,
    );
    fireEvent.click(screen.getByText("manage-pencil"));
    fireEvent.click(screen.getByText("vehicle-form-save"));
    expect(screen.getByTestId("user-form")).toBeInTheDocument();
    expect(screen.getByTestId("vehicle-manage-list")).toBeInTheDocument();
    expect(screen.queryByTestId("vehicle-form")).toBeNull();
  });
});
