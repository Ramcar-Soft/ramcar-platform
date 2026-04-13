import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, Separator } from "@ramcar/ui";
import { useTranslation } from "react-i18next";
import type {
  VisitPerson,
  AccessEvent,
  Vehicle,
  VisitPersonStatus,
  Direction,
  AccessMode,
  UpdateVisitPersonInput,
} from "../types";
import type { VisitPersonImage, ImageType } from "@ramcar/shared";
import { VisitPersonStatusBadge } from "./visit-person-status-badge";
import { RecentEventsList } from "./recent-events-list";
import { VisitPersonAccessEventForm } from "./visit-person-access-event-form";
import { VisitPersonForm } from "./visit-person-form";
import { VisitPersonEditForm } from "./visit-person-edit-form";
import { ImageSection } from "./image-section";
import { VehicleForm } from "../../../shared/components/vehicle-form/vehicle-form";

interface VisitPersonSidebarProps {
  open: boolean;
  mode: "view" | "create" | "edit";
  person: VisitPerson | null;
  recentEvents: AccessEvent[] | undefined;
  isLoadingRecentEvents: boolean;
  vehicles: Vehicle[] | undefined;
  isLoadingVehicles: boolean;
  isSaving: boolean;
  isCreating: boolean;
  isSavingEdit?: boolean;
  images?: VisitPersonImage[];
  isLoadingImages?: boolean;
  onUploadImage?: (params: { visitPersonId: string; file: File; imageType: ImageType }) => void;
  isUploadingImage?: boolean;
  onClose: () => void;
  onSave: (data: { direction: Direction; accessMode: AccessMode; vehicleId?: string; notes: string }) => Promise<void>;
  onCreatePerson: (data: { fullName: string; status: VisitPersonStatus; residentId: string; notes: string }) => Promise<void>;
  onSaveEdit?: (patch: UpdateVisitPersonInput) => void;
}

export function VisitPersonSidebar({
  open, mode, person, recentEvents, isLoadingRecentEvents, vehicles, isLoadingVehicles,
  isSaving, isCreating, isSavingEdit, images, isLoadingImages, onUploadImage, isUploadingImage,
  onClose, onSave, onCreatePerson, onSaveEdit,
}: VisitPersonSidebarProps) {
  const { t } = useTranslation();
  const [showVehicleForm, setShowVehicleForm] = useState(false);

  const titleKey =
    mode === "create"
      ? "visitPersons.sidebar.registerTitle"
      : mode === "edit"
        ? "visitPersons.sidebar.editTitle"
        : "visitPersons.sidebar.title";

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="right" className="w-[400px] sm:w-[800px] sm:max-w-[800px] overflow-y-auto px-4">
        <SheetHeader>
          <SheetTitle>{t(titleKey)}</SheetTitle>
          {(mode === "view" || mode === "edit") && person && (
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
        ) : mode === "edit" && person && onSaveEdit ? (
          <div className="mt-6 space-y-6">
            <VisitPersonEditForm
              person={person}
              onSave={onSaveEdit}
              onCancel={onClose}
              isSaving={isSavingEdit ?? false}
            />
            {onUploadImage && (
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
        ) : person && (
          <div className="mt-6 space-y-6">
            <div className="flex items-center gap-2">
              <VisitPersonStatusBadge status={person.status} />
              {person.phone && <span className="text-sm text-muted-foreground">{person.phone}</span>}
            </div>

            <RecentEventsList events={recentEvents} isLoading={isLoadingRecentEvents} />
            <Separator />

            {showVehicleForm ? (
              <VehicleForm visitPersonId={person.id} onSaved={() => setShowVehicleForm(false)} onCancel={() => setShowVehicleForm(false)} />
            ) : (
              <VisitPersonAccessEventForm
                vehicles={vehicles}
                isLoadingVehicles={isLoadingVehicles}
                onSave={onSave}
                onCancel={onClose}
                onAddVehicle={() => setShowVehicleForm(true)}
                isSaving={isSaving}
              />
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
