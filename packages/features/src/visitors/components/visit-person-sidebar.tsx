import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  Separator,
} from "@ramcar/ui";
import { useI18n } from "../../adapters/i18n";
import { useRole } from "../../adapters/role";
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
import { VehicleForm, VehicleManageList } from "../../shared/vehicle-form";
import { VisitPersonStatusBadge } from "./visit-person-status-badge";
import { RecentEventsList } from "./recent-events-list";
import { VisitPersonAccessEventForm } from "./visit-person-access-event-form";
import { VisitPersonForm } from "./visit-person-form";
import { VisitPersonEditForm } from "./visit-person-edit-form";
import { ImageSection } from "./image-section";
import type { InlineVehicleEntry, InlineVehicleEntryFields } from "../../shared/vehicle-form/inline-vehicle-types";

type ViewState = "default" | "manage" | "edit-vehicle" | "create-vehicle";

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
    phone: string;
    status: VisitPersonStatus;
    residentId: string;
    notes: string;
  };
  onDraftChange?: (draft: {
    fullName: string;
    phone: string;
    status: VisitPersonStatus;
    residentId: string;
    notes: string;
  }) => void;
  justCreatedVehicleId?: string | null;
  inlineVehicleEntries?: InlineVehicleEntry[];
  onAddInlineVehicle?: () => void;
  onRemoveInlineVehicle?: (clientId: string) => void;
  onUpdateInlineVehicle?: (clientId: string, patch: Partial<InlineVehicleEntryFields>) => void;
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
  justCreatedVehicleId: justCreatedVehicleIdProp,
  inlineVehicleEntries,
  onAddInlineVehicle,
  onRemoveInlineVehicle,
  onUpdateInlineVehicle,
}: VisitPersonSidebarProps) {
  const { t } = useI18n();
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
              mode="create"
              onSave={onCreatePerson}
              onCancel={onClose}
              isSaving={isCreating}
              isUploadingStagedImages={isUploadingImage}
              initialDraft={initialDraft}
              onDraftChange={onDraftChange}
              inlineVehicleEntries={inlineVehicleEntries}
              onAddInlineVehicle={onAddInlineVehicle}
              onRemoveInlineVehicle={onRemoveInlineVehicle}
              onUpdateInlineVehicle={onUpdateInlineVehicle}
            />
          </div>
        ) : mode === "edit" && person && onSaveEdit ? (
          <div className="space-y-6 mt-2">
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
        ) : person ? (
          <div className="space-y-6">
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
                  onAddVehicle={() => setView("create-vehicle")}
                  onManageVehicles={vehicles && vehicles.length > 0 ? () => setView("manage") : undefined}
                  isSaving={isSaving}
                  initialVehicleId={justCreatedVehicleId}
                />
              </>
            )}

            {view === "default" && onUploadImage && (
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
