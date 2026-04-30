import { useState, useEffect } from "react";
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
import { useRole } from "@ramcar/features/adapters";
import { RecentEventsList, VisitPersonAccessEventForm, ImageSection } from "@ramcar/features/visitors";
import { ProviderForm } from "./provider-form";
import { ProviderEditForm } from "./provider-edit-form";
import { VehicleForm, VehicleManageList } from "@ramcar/features/shared/vehicle-form";
import type { InlineVehicleEntry, InlineVehicleEntryFields } from "@ramcar/features/shared/vehicle-form";

type ViewState = "default" | "manage" | "edit-vehicle" | "create-vehicle";

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
  justCreatedVehicleIdProp?: string | null;
  inlineVehicleEntries?: InlineVehicleEntry[];
  onAddInlineVehicle?: () => void;
  onRemoveInlineVehicle?: (clientId: string) => void;
  onUpdateInlineVehicle?: (clientId: string, patch: Partial<InlineVehicleEntryFields>) => void;
}

export function ProviderSidebar({
  open, mode, person, recentEvents, isLoadingRecentEvents, vehicles, isLoadingVehicles,
  isSaving, isCreating, isSavingEdit, images, isLoadingImages, onUploadImage, isUploadingImage,
  onClose, onSave, onCreatePerson, onSaveEdit,
  justCreatedVehicleIdProp,
  inlineVehicleEntries,
  onAddInlineVehicle,
  onRemoveInlineVehicle,
  onUpdateInlineVehicle,
}: ProviderSidebarProps) {
  const { t } = useTranslation();
  const { role } = useRole();
  const canDelete = role === "Admin" || role === "SuperAdmin";

  const [view, setView] = useState<ViewState>("default");
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [justCreatedVehicleId, setJustCreatedVehicleId] = useState<string | null>(null);

  useEffect(() => {
    setJustCreatedVehicleId(null);
    setEditingVehicle(null);
    setView("default");
  }, [person?.id]);

  useEffect(() => {
    if (justCreatedVehicleIdProp !== undefined) {
      setJustCreatedVehicleId(justCreatedVehicleIdProp);
    }
  }, [justCreatedVehicleIdProp]);

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
              inlineVehicleEntries={inlineVehicleEntries}
              onAddInlineVehicle={onAddInlineVehicle}
              onRemoveInlineVehicle={onRemoveInlineVehicle}
              onUpdateInlineVehicle={onUpdateInlineVehicle}
            />
          </div>
        ) : mode === "edit" && person && onSaveEdit ? (
          <div className="mt-6 space-y-6">
            {view === "edit-vehicle" && editingVehicle ? (
              <VehicleForm
                mode="edit"
                vehicle={editingVehicle}
                visitPersonId={person.id}
                onSaved={() => {
                  setEditingVehicle(null);
                  setView("default");
                }}
                onCancel={() => {
                  setEditingVehicle(null);
                  setView("default");
                }}
              />
            ) : (
              <>
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
                <Separator />
                <VehicleManageList
                  owner={{ kind: "visitPerson", visitPersonId: person.id }}
                  vehicles={vehicles}
                  isLoading={Boolean(isLoadingVehicles)}
                  canDelete={canDelete}
                  onEdit={(v) => {
                    setEditingVehicle(v);
                    setView("edit-vehicle");
                  }}
                  onClose={() => {}}
                />
              </>
            )}
          </div>
        ) : person && (
          <div className="mt-6 space-y-6">
            {view === "create-vehicle" && (
              <VehicleForm
                visitPersonId={person.id}
                onSaved={(vehicle) => {
                  setJustCreatedVehicleId(vehicle.id);
                  setView("default");
                }}
                onCancel={() => setView("default")}
              />
            )}

            {view === "manage" && (
              <VehicleManageList
                owner={{ kind: "visitPerson", visitPersonId: person.id }}
                vehicles={vehicles}
                isLoading={Boolean(isLoadingVehicles)}
                canDelete={canDelete}
                onEdit={(v) => {
                  setEditingVehicle(v);
                  setView("edit-vehicle");
                }}
                onClose={() => setView("default")}
              />
            )}

            {view === "edit-vehicle" && editingVehicle && (
              <VehicleForm
                mode="edit"
                vehicle={editingVehicle}
                visitPersonId={person.id}
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
              <>
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
                <VisitPersonAccessEventForm
                  vehicles={vehicles}
                  isLoadingVehicles={isLoadingVehicles}
                  onSave={onSave}
                  onCancel={onClose}
                  onAddVehicle={() => setView("create-vehicle")}
                  onManageVehicles={vehicles && vehicles.length > 0 ? () => setView("manage") : undefined}
                  isSaving={isSaving}
                  initialVehicleId={justCreatedVehicleId}
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
              </>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
