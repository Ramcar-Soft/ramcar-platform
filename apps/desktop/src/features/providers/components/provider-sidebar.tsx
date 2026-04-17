import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, Separator, Badge } from "@ramcar/ui";
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
import { RecentEventsList, VisitPersonAccessEventForm, ImageSection } from "@ramcar/features/visitors";
import { ProviderForm } from "./provider-form";
import { ProviderEditForm } from "./provider-edit-form";
import { VehicleForm } from "@ramcar/features/shared/vehicle-form";

const statusVariantMap = {
  allowed: "default" as const,
  flagged: "secondary" as const,
  denied: "destructive" as const,
};

interface ProviderSidebarProps {
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
  onCreatePerson: (data: {
    fullName: string;
    phone: string;
    company: string;
    status: VisitPersonStatus;
    residentId: string;
    notes: string;
    stagedImages: Map<ImageType, File>;
  }) => Promise<void>;
  onSaveEdit?: (patch: UpdateVisitPersonInput) => void;
}

export function ProviderSidebar({
  open, mode, person, recentEvents, isLoadingRecentEvents, vehicles, isLoadingVehicles,
  isSaving, isCreating, isSavingEdit, images, isLoadingImages, onUploadImage, isUploadingImage,
  onClose, onSave, onCreatePerson, onSaveEdit,
}: ProviderSidebarProps) {
  const { t } = useTranslation();
  const [showVehicleForm, setShowVehicleForm] = useState(false);

  const titleKey =
    mode === "create"
      ? "providers.sidebar.registerTitle"
      : mode === "edit"
        ? "providers.sidebar.editTitle"
        : "providers.sidebar.title";

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="right" className="w-[400px] sm:w-[800px] sm:max-w-[800px] overflow-y-auto px-4">
        <SheetHeader>
          <SheetTitle>{t(titleKey)}</SheetTitle>
          {(mode === "view" || mode === "edit") && person && (
            <SheetDescription>
              <span className="font-mono text-xs mr-2">{person.code}</span>
              {person.fullName}
              {person.company && ` — ${person.company}`}
            </SheetDescription>
          )}
        </SheetHeader>

        {mode === "create" ? (
          <div className="mt-6">
            <ProviderForm
              onSave={onCreatePerson}
              onCancel={onClose}
              isSaving={isCreating}
              isUploadingStagedImages={isUploadingImage}
            />
          </div>
        ) : mode === "edit" && person && onSaveEdit ? (
          <div className="mt-6 space-y-6">
            <ProviderEditForm
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
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={statusVariantMap[person.status]}>{t(`visitPersons.status.${person.status}`)}</Badge>
              {person.phone && <span className="text-sm text-muted-foreground">{person.phone}</span>}
              {person.residentName && (
                <span className="text-sm text-muted-foreground">
                  {t("providers.sidebar.visitsResident")}: {person.residentName}
                </span>
              )}
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
