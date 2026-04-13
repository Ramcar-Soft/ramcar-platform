"use client";

import { useState } from "react";
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
import { RecentEventsList } from "@/features/visitors/components/recent-events-list";
import { VisitPersonAccessEventForm } from "@/features/visitors/components/visit-person-access-event-form";
import { ImageSection } from "@/features/visitors/components/image-section";
import { ProviderForm } from "./provider-form";
import { ProviderEditForm } from "./provider-edit-form";
import { VehicleForm } from "@/shared/components/vehicle-form/vehicle-form";

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
            {!showVehicleForm && (
              <>
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

                <RecentEventsList
                  events={recentEvents}
                  isLoading={isLoadingRecentEvents}
                />
                <Separator />
              </>
            )}

            {showVehicleForm ? (
              <VehicleForm
                visitPersonId={person.id}
                onSaved={handleCloseVehicleForm}
                onCancel={handleCloseVehicleForm}
              />
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
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
