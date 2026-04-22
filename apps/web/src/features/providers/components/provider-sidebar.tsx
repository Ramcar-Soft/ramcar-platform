"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  Separator,
  Badge,
} from "@ramcar/ui";
import { useTranslations } from "next-intl";
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
  onSave: (data: {
    direction: Direction;
    accessMode: AccessMode;
    vehicleId?: string;
    notes: string;
  }) => Promise<void>;
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
}: ProviderSidebarProps) {
  const t = useTranslations("providers");
  const tStatus = useTranslations("visitPersons.status");
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [justCreatedVehicleId, setJustCreatedVehicleId] = useState<string | null>(null);

  useEffect(() => { setJustCreatedVehicleId(null); }, [person?.id]);

  const handleCloseVehicleForm = () => setShowVehicleForm(false);

  const titleKey =
    mode === "create"
      ? "sidebar.registerTitle"
      : mode === "edit"
        ? "sidebar.editTitle"
        : "sidebar.title";

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
          <div className="space-y-6 mt-2">
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
        ) : person ? (
          <div className="space-y-6">
            {showVehicleForm ? (
              <VehicleForm
                visitPersonId={person.id}
                onSaved={(vehicle) => {
                  setJustCreatedVehicleId(vehicle.id);
                  setShowVehicleForm(false);
                }}
                onCancel={handleCloseVehicleForm}
              />
            ) : (
              <>
                <RecentEventsList
                  events={recentEvents}
                  isLoading={isLoadingRecentEvents}
                />
                <Separator />
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={statusVariantMap[person.status]}>
                    {tStatus(person.status)}
                  </Badge>
                  {person.phone && (
                    <span className="text-sm text-muted-foreground">{person.phone}</span>
                  )}
                  {person.residentName && (
                    <span className="text-sm text-muted-foreground">
                      {t("sidebar.visitsResident")}: {person.residentName}
                    </span>
                  )}
                </div>
                <VisitPersonAccessEventForm
                  vehicles={vehicles}
                  isLoadingVehicles={isLoadingVehicles}
                  onSave={onSave}
                  onCancel={onClose}
                  onAddVehicle={() => setShowVehicleForm(true)}
                  isSaving={isSaving}
                  initialVehicleId={justCreatedVehicleId}
                />
                {onUploadImage && (
                  <>
                    <ImageSection
                      visitPersonId={person.id}
                      images={images}
                      isLoading={isLoadingImages ?? false}
                      onUpload={onUploadImage}
                      isUploading={isUploadingImage ?? false}
                    />
                    <Separator />
                  </>
                )}
              </>
            )}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
