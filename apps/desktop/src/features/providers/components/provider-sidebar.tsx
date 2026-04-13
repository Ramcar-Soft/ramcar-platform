import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, Separator, Badge } from "@ramcar/ui";
import { useTranslation } from "react-i18next";
import type { VisitPerson, AccessEvent, Vehicle, VisitPersonStatus, Direction, AccessMode } from "../types";
import { RecentEventsList } from "../../visitors/components/recent-events-list";
import { VisitPersonAccessEventForm } from "../../visitors/components/visit-person-access-event-form";
import { ProviderForm } from "./provider-form";
import { VehicleForm } from "../../../shared/components/vehicle-form/vehicle-form";

const statusVariantMap = {
  allowed: "default" as const,
  flagged: "secondary" as const,
  denied: "destructive" as const,
};

interface ProviderSidebarProps {
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
  onCreatePerson: (data: { fullName: string; phone: string; company: string; status: VisitPersonStatus; residentId: string; notes: string }) => Promise<void>;
}

export function ProviderSidebar({
  open, mode, person, recentEvents, isLoadingRecentEvents, vehicles, isLoadingVehicles,
  isSaving, isCreating, onClose, onSave, onUpdateEvent, onCreatePerson,
}: ProviderSidebarProps) {
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
            {mode === "create" ? t("providers.sidebar.registerTitle") : t("providers.sidebar.title")}
          </SheetTitle>
          {mode === "view" && person && (
            <SheetDescription>
              <span className="font-mono text-xs mr-2">{person.code}</span>
              {person.fullName}
              {person.company && ` — ${person.company}`}
            </SheetDescription>
          )}
        </SheetHeader>

        {mode === "create" ? (
          <div className="mt-6">
            <ProviderForm onSave={onCreatePerson} onCancel={onClose} isSaving={isCreating} />
          </div>
        ) : person && (
          <div className="mt-6 space-y-6">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={statusVariantMap[person.status]}>{t(`visitPersons.status.${person.status}`)}</Badge>
              {person.phone && <span className="text-sm text-muted-foreground">{person.phone}</span>}
              {person.residentName && (
                <span className="text-sm text-muted-foreground">
                  {t("providers.sidebar.visitsResident")}: {person.residentName}
                </span>
              )}
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
