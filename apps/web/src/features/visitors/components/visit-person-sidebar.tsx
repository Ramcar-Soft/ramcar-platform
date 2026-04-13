"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  Separator,
} from "@ramcar/ui";
import { useTranslations } from "next-intl";
import type { VisitPerson, AccessEvent, Vehicle, VisitPersonStatus, Direction, AccessMode } from "../types";
import type { VisitPersonImage, ImageType } from "@ramcar/shared";
import { VisitPersonStatusBadge } from "./visit-person-status-badge";
import { RecentEventsList } from "./recent-events-list";
import { VisitPersonAccessEventForm } from "./visit-person-access-event-form";
import { VisitPersonForm } from "./visit-person-form";
import { ImageSection } from "./image-section";
import { VehicleForm } from "@/shared/components/vehicle-form/vehicle-form";

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
  images?: VisitPersonImage[];
  isLoadingImages?: boolean;
  onUploadImage?: (params: { visitPersonId: string; file: File; imageType: ImageType }) => void;
  isUploadingImage?: boolean;
  onClose: () => void;
  onSave: (data: {
    direction: Direction;
    accessMode: AccessMode;
    vehicleId?: string;
    notes: string;
  }) => Promise<void>;
  onUpdateEvent?: (
    eventId: string,
    data: {
      direction: Direction;
      accessMode: AccessMode;
      vehicleId?: string;
      notes: string;
    },
  ) => Promise<void>;
  onCreatePerson: (data: {
    fullName: string;
    status: VisitPersonStatus;
    residentId: string;
    notes: string;
  }) => Promise<void>;
}

export function VisitPersonSidebar({
  open,
  mode,
  person,
  recentEvents,
  isLoadingRecentEvents,
  vehicles,
  isLoadingVehicles,
  isSaving,
  isCreating,
  images,
  isLoadingImages,
  onUploadImage,
  isUploadingImage,
  onClose,
  onSave,
  onUpdateEvent,
  onCreatePerson,
}: VisitPersonSidebarProps) {
  const t = useTranslations("visitPersons");
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AccessEvent | null>(null);

  const handleCloseVehicleForm = () => setShowVehicleForm(false);

  const handleSaveOrUpdate = async (data: {
    direction: Direction;
    accessMode: AccessMode;
    vehicleId?: string;
    notes: string;
  }) => {
    if (editingEvent && onUpdateEvent) {
      await onUpdateEvent(editingEvent.id, data);
      setEditingEvent(null);
    } else {
      await onSave(data);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="right" className="w-[400px] sm:w-[800px] sm:max-w-[800px] overflow-y-auto px-4 pb-6">
        <SheetHeader>
          <SheetTitle>
            {mode === "create" ? t("sidebar.registerTitle") : t("sidebar.title")}
          </SheetTitle>
          {mode === "view" && person && (
            <SheetDescription>
              <span className="font-mono text-xs mr-2">{person.code}</span>
              {person.fullName}
              {person.residentName && ` — ${t("sidebar.visitsResident")}: ${person.residentName}`}
            </SheetDescription>
          )}
        </SheetHeader>

        {mode === "create" ? (
          <div className="mt-2">
            <VisitPersonForm
              onSave={onCreatePerson}
              onCancel={onClose}
              isSaving={isCreating}
            />
          </div>
        ) : person && (
          <div className="space-y-6">
            {showVehicleForm ? (
              <VehicleForm
                visitPersonId={person.id}
                onSaved={handleCloseVehicleForm}
                onCancel={handleCloseVehicleForm}
              />
            ) : (
              <>
                <RecentEventsList
                  events={recentEvents}
                  isLoading={isLoadingRecentEvents}
                  onEdit={onUpdateEvent ? setEditingEvent : undefined}
                />
                <Separator />
                <div className="flex items-center gap-2">
                  <VisitPersonStatusBadge status={person.status} />
                  {person.phone && (
                    <span className="text-sm text-muted-foreground">{person.phone}</span>
                  )}
                </div>
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
              </>
            )}
            {!showVehicleForm && onUploadImage && (
              <>
                <Separator />
                <ImageSection
                  visitPersonId={person.id}
                  images={images}
                  isLoading={isLoadingImages ?? false}
                  onUpload={onUploadImage}
                  isUploading={isUploadingImage ?? false}
                />
              </>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
