/// <reference types="@testing-library/jest-dom/vitest" />
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TransportProvider, I18nProvider, RoleProvider } from "@ramcar/features/adapters";
import type { TransportPort, I18nPort, RolePort } from "@ramcar/features/adapters";
import type { VisitPerson, Vehicle } from "../types";

afterEach(() => cleanup());

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/shared/hooks/use-form-persistence", () => ({
  useFormPersistence: () => ({ wasRestored: false, discardDraft: vi.fn(), clearDraft: vi.fn() }),
}));

vi.mock("@ramcar/store", () => ({
  useAppStore: () => null,
  StoreProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

let capturedManageListProps: Record<string, unknown> | null = null;
let capturedVehicleFormProps: Record<string, unknown> | null = null;

vi.mock("@ramcar/features/shared/vehicle-form", () => ({
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
  InlineVehicleSection: () => null,
}));

vi.mock("@ramcar/features/visitors", () => ({
  RecentEventsList: () => null,
  VisitPersonAccessEventForm: (props: { onManageVehicles?: () => void; onAddVehicle?: () => void }) => (
    <div data-testid="access-event-form">
      {props.onManageVehicles && (
        <button onClick={props.onManageVehicles}>accessEvents.vehicleSelect.manageVehicles</button>
      )}
      {props.onAddVehicle && (
        <button onClick={props.onAddVehicle}>accessEvents.vehicleSelect.addVehicle</button>
      )}
    </div>
  ),
  ImageSection: () => null,
}));

vi.mock("./provider-form", () => ({ ProviderForm: () => null }));
vi.mock("./provider-edit-form", () => ({ ProviderEditForm: () => null }));

import { ProviderSidebar } from "../components/provider-sidebar";

const transport: TransportPort = {
  get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn(), upload: vi.fn(),
};
const i18n: I18nPort = { t: (k: string) => k, locale: "en" };

function renderWithProviders(ui: React.ReactElement, roleOverride: Partial<RolePort> = {}) {
  const role: RolePort = { role: "Guard", tenantId: "t1", userId: "u1", ...roleOverride };
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <RoleProvider value={role}>
      <TransportProvider value={transport}>
        <I18nProvider value={i18n}>
          <QueryClientProvider client={qc}>{ui}</QueryClientProvider>
        </I18nProvider>
      </TransportProvider>
    </RoleProvider>,
  );
}

const makePerson = (): VisitPerson => ({
  id: "vp-1", code: "P001", fullName: "Acme Provider", phone: null, company: "Acme",
  status: "allowed", notes: null, residentId: "r-1", residentName: "Alice",
  registeredBy: "guard-1", type: "service_provider", tenantId: "t-1",
  createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
});

const makeVehicle = (): Vehicle => ({
  id: "v1", tenantId: "t-1", userId: null, visitPersonId: "vp-1",
  vehicleType: "car", brand: "Ford", model: null, plate: "FRD-001",
  color: null, notes: null, year: null,
  createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
});

const noop = async () => {};

describe("ProviderSidebar (web) — manage flow (spec 026 US1)", () => {
  beforeEach(() => {
    capturedManageListProps = null;
    capturedVehicleFormProps = null;
  });

  it("manage vehicles button visible in default view when vehicles exist", () => {
    renderWithProviders(
      <ProviderSidebar
        open={true} mode="view" person={makePerson()}
        recentEvents={undefined} isLoadingRecentEvents={false}
        vehicles={[makeVehicle()]} isLoadingVehicles={false}
        isSaving={false} isCreating={false}
        onClose={vi.fn()} onSave={noop} onCreatePerson={noop as never}
      />,
    );
    expect(screen.getByText("accessEvents.vehicleSelect.manageVehicles")).toBeInTheDocument();
  });

  it("guard role: VehicleManageList receives canDelete={false}", () => {
    renderWithProviders(
      <ProviderSidebar
        open={true} mode="view" person={makePerson()}
        recentEvents={undefined} isLoadingRecentEvents={false}
        vehicles={[makeVehicle()]} isLoadingVehicles={false}
        isSaving={false} isCreating={false}
        onClose={vi.fn()} onSave={noop} onCreatePerson={noop as never}
      />,
      { role: "Guard" },
    );
    fireEvent.click(screen.getByText("accessEvents.vehicleSelect.manageVehicles"));
    expect(capturedManageListProps?.canDelete).toBe(false);
  });

  it("admin role: VehicleManageList receives canDelete={true}", () => {
    renderWithProviders(
      <ProviderSidebar
        open={true} mode="view" person={makePerson()}
        recentEvents={undefined} isLoadingRecentEvents={false}
        vehicles={[makeVehicle()]} isLoadingVehicles={false}
        isSaving={false} isCreating={false}
        onClose={vi.fn()} onSave={noop} onCreatePerson={noop as never}
      />,
      { role: "Admin" },
    );
    fireEvent.click(screen.getByText("accessEvents.vehicleSelect.manageVehicles"));
    expect(capturedManageListProps?.canDelete).toBe(true);
  });

  it("pencil click → VehicleForm in edit mode", () => {
    renderWithProviders(
      <ProviderSidebar
        open={true} mode="view" person={makePerson()}
        recentEvents={undefined} isLoadingRecentEvents={false}
        vehicles={[makeVehicle()]} isLoadingVehicles={false}
        isSaving={false} isCreating={false}
        onClose={vi.fn()} onSave={noop} onCreatePerson={noop as never}
      />,
    );
    fireEvent.click(screen.getByText("accessEvents.vehicleSelect.manageVehicles"));
    fireEvent.click(screen.getByText("manage-pencil"));
    expect(screen.getByTestId("vehicle-form")).toBeInTheDocument();
    expect(capturedVehicleFormProps?.mode).toBe("edit");
  });

  it("saving vehicle form returns to manage list", () => {
    renderWithProviders(
      <ProviderSidebar
        open={true} mode="view" person={makePerson()}
        recentEvents={undefined} isLoadingRecentEvents={false}
        vehicles={[makeVehicle()]} isLoadingVehicles={false}
        isSaving={false} isCreating={false}
        onClose={vi.fn()} onSave={noop} onCreatePerson={noop as never}
      />,
    );
    fireEvent.click(screen.getByText("accessEvents.vehicleSelect.manageVehicles"));
    fireEvent.click(screen.getByText("manage-pencil"));
    fireEvent.click(screen.getByText("vehicle-form-save"));
    expect(screen.getByTestId("vehicle-manage-list")).toBeInTheDocument();
  });

  it("VehicleManageList receives owner with visitPerson kind", () => {
    renderWithProviders(
      <ProviderSidebar
        open={true} mode="view" person={makePerson()}
        recentEvents={undefined} isLoadingRecentEvents={false}
        vehicles={[makeVehicle()]} isLoadingVehicles={false}
        isSaving={false} isCreating={false}
        onClose={vi.fn()} onSave={noop} onCreatePerson={noop as never}
      />,
    );
    fireEvent.click(screen.getByText("accessEvents.vehicleSelect.manageVehicles"));
    expect(capturedManageListProps?.owner).toEqual({ kind: "visitPerson", visitPersonId: "vp-1" });
  });
});
