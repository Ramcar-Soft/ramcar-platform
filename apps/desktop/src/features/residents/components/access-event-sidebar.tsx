import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  Separator,
} from "@ramcar/ui";
import { useTranslation } from "react-i18next";
import type { ExtendedUserProfile, AccessEvent, Vehicle, Direction, AccessMode } from "@ramcar/shared";
import { RecentEventsList } from "./last-event-badge";
import { AccessEventForm } from "./access-event-form";
import { VehicleForm } from "../../../shared/components/vehicle-form/vehicle-form";

interface AccessEventSidebarProps {
  open: boolean;
  resident: ExtendedUserProfile | null;
  recentEvents: AccessEvent[] | undefined;
  isLoadingRecentEvents: boolean;
  vehicles: Vehicle[] | undefined;
  isLoadingVehicles: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSave: (data: { direction: Direction; accessMode: AccessMode; vehicleId?: string; notes: string }) => void;
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
  const { t } = useTranslation();
  const [showVehicleForm, setShowVehicleForm] = useState(false);

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="right" className="w-[400px] sm:w-[800px] sm:max-w-[800px] overflow-y-auto px-4">
        <SheetHeader>
          <SheetTitle>{t("accessEvents.title")}</SheetTitle>
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

            {showVehicleForm ? (
              <VehicleForm
                userId={resident.id}
                onSaved={() => setShowVehicleForm(false)}
                onCancel={() => setShowVehicleForm(false)}
              />
            ) : (
              <AccessEventForm
                vehicles={vehicles}
                isLoadingVehicles={isLoadingVehicles}
                onSave={onSave}
                onCancel={onClose}
                onAddVehicle={() => setShowVehicleForm(true)}
                isSaving={isSaving}
              />
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
