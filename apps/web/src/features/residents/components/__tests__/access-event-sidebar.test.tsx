/// <reference types="@testing-library/jest-dom/vitest" />
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  TransportProvider,
  I18nProvider,
  RoleProvider,
} from "@ramcar/features/adapters";
import type { TransportPort, I18nPort, RolePort, Role } from "@ramcar/features/adapters";
import type { ExtendedUserProfile, Vehicle } from "../../types";

afterEach(() => cleanup());

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/shared/hooks/use-form-persistence", () => ({
  useFormPersistence: () => ({
    wasRestored: false,
    discardDraft: vi.fn(),
    clearDraft: vi.fn(),
  }),
}));

vi.mock("@ramcar/store", () => ({
  useAppStore: () => null,
  StoreProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { AccessEventSidebar } from "../access-event-sidebar";

const transport: TransportPort = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  upload: vi.fn(),
};

const i18n: I18nPort = { t: (k: string) => k, locale: "en" };

const resident: ExtendedUserProfile = {
  id: "u1",
  fullName: "Resident One",
  address: null,
} as ExtendedUserProfile;

const v1: Vehicle = {
  id: "v1",
  tenantId: "t1",
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

function renderSidebar(role: Role) {
  const rolePort: RolePort = { role, tenantId: "t1", userId: "u-self" };
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <TransportProvider value={transport}>
        <I18nProvider value={i18n}>
          <RoleProvider value={rolePort}>
            <AccessEventSidebar
              open
              resident={resident}
              recentEvents={[]}
              isLoadingRecentEvents={false}
              vehicles={[v1]}
              isLoadingVehicles={false}
              isSaving={false}
              onClose={vi.fn()}
              onSave={vi.fn().mockResolvedValue(undefined)}
            />
          </RoleProvider>
        </I18nProvider>
      </TransportProvider>
    </QueryClientProvider>,
  );
}

describe("AccessEventSidebar — role gating", () => {
  it("Guard sees no Add Vehicle or Manage Vehicles links", () => {
    renderSidebar("Guard");
    expect(screen.queryByText(/vehicleSelect\.addVehicle/)).toBeNull();
    expect(screen.queryByText(/vehicleSelect\.manageVehicles/)).toBeNull();
  });

  it("Admin sees both Add Vehicle and Manage Vehicles entry points", () => {
    renderSidebar("Admin");
    expect(screen.getByText(/vehicleSelect\.addVehicle/)).toBeInTheDocument();
    expect(screen.getByText(/vehicleSelect\.manageVehicles/)).toBeInTheDocument();
  });

  it("Admin clicking Manage Vehicles swaps to the manage view", () => {
    renderSidebar("Admin");
    fireEvent.click(screen.getByText(/vehicleSelect\.manageVehicles/));
    expect(screen.getByText("vehicles.manageTitle")).toBeInTheDocument();
  });
});
