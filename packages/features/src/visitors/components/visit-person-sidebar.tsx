import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  Separator,
} from "@ramcar/ui";
import { useI18n } from "../../adapters/i18n";
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
import { VehicleForm } from "../../shared/vehicle-form";
import { VisitPersonStatusBadge } from "./visit-person-status-badge";
import { RecentEventsList } from "./recent-events-list";
import { VisitPersonAccessEventForm } from "./visit-person-access-event-form";
import { VisitPersonForm } from "./visit-person-form";
import { VisitPersonEditForm } from "./visit-person-edit-form";
import { ImageSection } from "./image-section";

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
  onSave: (data: {
    direction: Direction;
    accessMode: AccessMode;
    vehicleId?: string;
    notes: string;
  }) => Promise<void>;
  onCreatePerson: (data: {
    fullName: string;
    status: VisitPersonStatus;
    residentId: string;
    notes: string;
    stagedImages: Map<ImageType, File>;
  }) => Promise<void>;
  onSaveEdit?: (patch: UpdateVisitPersonInput) => void;
  initialDraft?: {
    fullName: string;
    status: VisitPersonStatus;
    residentId: string;
    notes: string;
  };
  onDraftChange?: (draft: {
    fullName: string;
    status: VisitPersonStatus;
    residentId: string;
    notes: string;
  }) => void;
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
  isSavingEdit,
  images,
  isLoadingImages,
  onUploadImage,
  isUploadingImage,
  onClose,
  onSave,
  onCreatePerson,
  onSaveEdit,
  initialDraft,
  onDraftChange,
}: VisitPersonSidebarProps) {
  const { t } = useI18n();
  const [showVehicleForm, setShowVehicleForm] = useState(false);

  const handleCloseVehicleForm = () => setShowVehicleForm(false);

  const titleKey =
    mode === "create"
      ? "visitPersons.sidebar.registerTitle"
      : mode === "edit"
        ? "visitPersons.sidebar.editTitle"
        : "visitPersons.sidebar.title";

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent
        side="right"
        className="w-[400px] sm:w-[800px] sm:max-w-[800px] overflow-y-auto px-4 pb-6"
      >
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
          <div className="mt-2">
            <VisitPersonForm
              onSave={onCreatePerson}
              onCancel={onClose}
              isSaving={isCreating}
              isUploadingStagedImages={isUploadingImage}
              initialDraft={initialDraft}
              onDraftChange={onDraftChange}
            />
          </div>
        ) : mode === "edit" && person && onSaveEdit ? (
          <div className="space-y-6 mt-2">
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
        ) : person ? (
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
                  onSave={onSave}
                  onCancel={onClose}
                  onAddVehicle={() => setShowVehicleForm(true)}
                  isSaving={isSaving}
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
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
