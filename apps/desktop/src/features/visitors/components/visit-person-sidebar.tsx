import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, Separator } from "@ramcar/ui";
import { useTranslation } from "react-i18next";
import type { VisitPerson, AccessEvent, Vehicle, VisitPersonStatus, Direction, AccessMode } from "../types";
import { VisitPersonStatusBadge } from "./visit-person-status-badge";
import { RecentEventsList } from "./recent-events-list";
import { VisitPersonAccessEventForm } from "./visit-person-access-event-form";
import { VisitPersonForm } from "./visit-person-form";
import { VehicleForm } from "../../../shared/components/vehicle-form/vehicle-form";

interface VisitPersonSidebarProps {
  open: boolean;
  mode: "view" | "create";
  person: VisitPerson | null;
  recentEvents: AccessEvent[] | undefined;
  isLoadingRecentEvents: boolean;
  vehicles: Vehicle[] | undefined;
  isLoadingVehicles: boolean;
  isSaving: boolean;
  isCreating: boolean;
  onClose: () => void;
  onSave: (data: { direction: Direction; accessMode: AccessMode; vehicleId?: string; notes: string }) => Promise<void>;
  onUpdateEvent?: (eventId: string, data: { direction: Direction; accessMode: AccessMode; vehicleId?: string; notes: string }) => Promise<void>;
  onCreatePerson: (data: { fullName: string; status: VisitPersonStatus; residentId: string; notes: string }) => Promise<void>;
}

export function VisitPersonSidebar({
  open, mode, person, recentEvents, isLoadingRecentEvents, vehicles, isLoadingVehicles,
  isSaving, isCreating, onClose, onSave, onUpdateEvent, onCreatePerson,
}: VisitPersonSidebarProps) {
  const { t } = useTranslation();
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AccessEvent | null>(null);

  const handleSaveOrUpdate = async (data: { direction: Direction; accessMode: AccessMode; vehicleId?: string; notes: string }) => {
    if (editingEvent && onUpdateEvent) {
      await onUpdateEvent(editingEvent.id, data);
      setEditingEvent(null);
    } else {
      await onSave(data);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="right" className="w-[400px] sm:w-[440px] overflow-y-auto px-4">
        <SheetHeader>
          <SheetTitle>
            {mode === "create" ? t("visitPersons.sidebar.registerTitle") : t("visitPersons.sidebar.title")}
          </SheetTitle>
          {mode === "view" && person && (
            <SheetDescription>
              <span className="font-mono text-xs mr-2">{person.code}</span>
              {person.fullName}
              {person.residentName && ` — ${t("visitPersons.sidebar.visitsResident")}: ${person.residentName}`}
            </SheetDescription>
          )}
        </SheetHeader>

        {mode === "create" ? (
          <div className="mt-6">
            <VisitPersonForm onSave={onCreatePerson} onCancel={onClose} isSaving={isCreating} />
          </div>
        ) : person && (
          <div className="mt-6 space-y-6">
            <div className="flex items-center gap-2">
              <VisitPersonStatusBadge status={person.status} />
              {person.phone && <span className="text-sm text-muted-foreground">{person.phone}</span>}
            </div>

            <RecentEventsList events={recentEvents} isLoading={isLoadingRecentEvents} onEdit={onUpdateEvent ? setEditingEvent : undefined} />
            <Separator />

            {showVehicleForm ? (
              <VehicleForm visitPersonId={person.id} onSaved={() => setShowVehicleForm(false)} onCancel={() => setShowVehicleForm(false)} />
            ) : (
              <VisitPersonAccessEventForm
                vehicles={vehicles}
                isLoadingVehicles={isLoadingVehicles}
                onSave={handleSaveOrUpdate}
                onCancel={onClose}
                onAddVehicle={() => setShowVehicleForm(true)}
                isSaving={isSaving}
                editingEvent={editingEvent}
                onCancelEdit={() => setEditingEvent(null)}
              />
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
