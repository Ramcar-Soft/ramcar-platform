"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  Separator,
} from "@ramcar/ui";
import { useTranslations } from "next-intl";
import { useRole } from "@ramcar/features/adapters";
import { VehicleForm, VehicleManageList } from "@ramcar/features/shared/vehicle-form";
import type { ExtendedUserProfile, AccessEvent, Vehicle } from "../types";
import type { Direction, AccessMode } from "@ramcar/shared";
import { RecentEventsList } from "./last-event-badge";
import { AccessEventForm } from "./access-event-form";

type SidebarView = "default" | "create" | "manage" | "edit";

interface AccessEventSidebarProps {
  open: boolean;
  resident: ExtendedUserProfile | null;
  recentEvents: AccessEvent[] | undefined;
  isLoadingRecentEvents: boolean;
  vehicles: Vehicle[] | undefined;
  isLoadingVehicles: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSave: (data: {
    direction: Direction;
    accessMode: AccessMode;
    vehicleId?: string;
    notes: string;
  }) => Promise<void>;
}

export function AccessEventSidebar({
  open,
  resident,
  recentEvents,
  isLoadingRecentEvents,
  vehicles,
  isLoadingVehicles,
  isSaving,
  onClose,
  onSave,
}: AccessEventSidebarProps) {
  const t = useTranslations("accessEvents");
  const { role } = useRole();
  const canManageVehicles = role === "Admin" || role === "SuperAdmin";

  const [view, setView] = useState<SidebarView>("default");
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [justCreatedVehicleId, setJustCreatedVehicleId] = useState<string | null>(null);

  useEffect(() => {
    setJustCreatedVehicleId(null);
    setEditingVehicle(null);
    setView("default");
  }, [resident?.id]);

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="right" className="w-[400px] sm:w-[800px] sm:max-w-[800px] overflow-y-auto px-4">
        <SheetHeader>
          <SheetTitle>{t("title")}</SheetTitle>
          {resident && (
            <SheetDescription>
              {resident.fullName}
              {resident.address && ` — ${resident.address}`}
            </SheetDescription>
          )}
        </SheetHeader>

        {resident && (
          <div className="mt-6 space-y-6">
            <RecentEventsList events={recentEvents} isLoading={isLoadingRecentEvents} />
            <Separator />

            {view === "create" && (
              <VehicleForm
                userId={resident.id}
                onSaved={(vehicle) => {
                  setJustCreatedVehicleId(vehicle.id);
                  setView("default");
                }}
                onCancel={() => setView("default")}
              />
            )}

            {view === "manage" && (
              <VehicleManageList
                owner={{ kind: "resident", userId: resident.id }}
                vehicles={vehicles}
                isLoading={Boolean(isLoadingVehicles)}
                onEdit={(v) => {
                  setEditingVehicle(v);
                  setView("edit");
                }}
                onClose={() => setView("default")}
              />
            )}

            {view === "edit" && editingVehicle && (
              <VehicleForm
                mode="edit"
                vehicle={editingVehicle}
                userId={resident.id}
                onSaved={() => {
                  setEditingVehicle(null);
                  setView("manage");
                }}
                onCancel={() => {
                  setEditingVehicle(null);
                  setView("manage");
                }}
              />
            )}

            {view === "default" && (
              <AccessEventForm
                vehicles={vehicles}
                isLoadingVehicles={isLoadingVehicles}
                onSave={onSave}
                onCancel={onClose}
                onAddVehicle={
                  canManageVehicles ? () => setView("create") : undefined
                }
                onManageVehicles={
                  canManageVehicles ? () => setView("manage") : undefined
                }
                canManageVehicles={canManageVehicles}
                isSaving={isSaving}
                initialVehicleId={justCreatedVehicleId}
              />
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
