import { useState, useCallback, useRef, useEffect, type ReactNode } from "react";
import { toast } from "sonner";
import type { ImageType } from "@ramcar/shared";
import type {
  VisitPerson,
  VisitPersonFiltersInput,
  VisitPersonStatus,
  Direction,
  AccessMode,
  UpdateVisitPersonInput,
} from "../types";
import { useVisitPersons } from "../hooks/use-visit-persons";
import { useRecentVisitPersonEvents } from "../hooks/use-recent-visit-person-events";
import { useCreateAccessEvent } from "../hooks/use-create-access-event";
import { useCreateVisitPerson } from "../hooks/use-create-visit-person";
import { useUpdateVisitPerson } from "../hooks/use-update-visit-person";
import { useVisitPersonVehicles } from "../hooks/use-visit-person-vehicles";
import { useVisitPersonImages } from "../hooks/use-visit-person-images";
import { useUploadVisitPersonImage } from "../hooks/use-upload-visit-person-image";
import { useKeyboardNavigation } from "../../shared/hooks/use-keyboard-navigation";
import { useInlineVehicleSubmissions } from "../../shared/vehicle-form/use-inline-vehicle-submissions";
import { VisitorsTable } from "./visitors-table";
import { VisitPersonSidebar } from "./visit-person-sidebar";
import { useI18n } from "../../adapters";
import { useAccessEventFeedback } from "../../access-event-feedback/hooks/use-access-event-feedback";
import { AccessEventFeedbackOverlay } from "../../access-event-feedback/components/access-event-feedback-overlay";

interface VisitPersonFormDraft {
  fullName: string;
  phone: string;
  status: VisitPersonStatus;
  residentId: string;
  notes: string;
}


/**
 * Props for platform-specific extensions injected by the host app.
 *
 * - `topRightSlot`: Content rendered in the top-right of the view (e.g. sync badge on desktop).
 * - `trailingAction`: Row-level action (e.g. admin-only edit button on web).
 * - `emptyState`: Replacement for the default empty-state row.
 * - `initialDraft`: Pre-filled form data from a persisted draft (web only).
 * - `onDraftChange`: Callback for the host to persist form changes (web only).
 */
export interface VisitorsViewProps {
  topRightSlot?: ReactNode;
  trailingAction?: ReactNode;
  emptyState?: ReactNode;
  initialDraft?: VisitPersonFormDraft;
  onDraftChange?: (draft: VisitPersonFormDraft) => void;
}

export function VisitorsView({
  topRightSlot,
  trailingAction,
  emptyState,
  initialDraft,
  onDraftChange,
}: VisitorsViewProps) {
  const { t } = useI18n();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [selectedPerson, setSelectedPerson] = useState<VisitPerson | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarMode, setSidebarMode] = useState<"view" | "create" | "edit">("view");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters] = useState<Omit<VisitPersonFiltersInput, "type" | "search">>({
    page: 1,
    pageSize: 20,
    sortBy: "full_name",
    sortOrder: "asc",
  });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isError } = useVisitPersons({
    ...filters,
    type: "visitor",
    search: debouncedSearch || undefined,
  });

  const { data: recentEvents, isLoading: isLoadingRecentEvents } =
    useRecentVisitPersonEvents(selectedPerson?.id ?? null);

  const { data: vehicles, isLoading: isLoadingVehicles } =
    useVisitPersonVehicles(selectedPerson?.id ?? null);

  const { data: images, isLoading: isLoadingImages } =
    useVisitPersonImages(selectedPerson?.id ?? null);

  const createAccessEvent = useCreateAccessEvent();
  const createVisitPerson = useCreateVisitPerson();
  const updateVisitPerson = useUpdateVisitPerson();
  const uploadImage = useUploadVisitPersonImage();
  const feedback = useAccessEventFeedback();
  const inlineVehicles = useInlineVehicleSubmissions();
  const { entries: inlineVehicleEntries, isSubmittingAny: inlineIsSubmitting, addEntry: addInlineVehicle, removeEntry: removeInlineVehicle, updateEntry: updateInlineVehicle, reset: resetInlineVehicles, submitAll: submitAllVehicles } = inlineVehicles;
  const [justCreatedVehicleId, setJustCreatedVehicleId] = useState<string | null>(null);

  const handleSelectPerson = useCallback((person: VisitPerson) => {
    setSelectedPerson(person);
    setSidebarMode("view");
    setSidebarOpen(true);
    setHighlightedIndex(-1);
  }, []);

  const handleOpenEdit = useCallback((person: VisitPerson) => {
    setSelectedPerson(person);
    setSidebarMode("edit");
    setSidebarOpen(true);
    setHighlightedIndex(-1);
  }, []);

  const handleRegisterNew = useCallback(() => {
    setSelectedPerson(null);
    setSidebarMode("create");
    setSidebarOpen(true);
  }, []);

  useKeyboardNavigation<VisitPerson>({
    searchInputRef,
    disabled: sidebarOpen,
    items: data?.data,
    highlightedIndex,
    setHighlightedIndex,
    onSelectItem: handleSelectPerson,
    onCreate: handleRegisterNew,
  });

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
    setSelectedPerson(null);
    setSidebarMode("view");
    setJustCreatedVehicleId(null);
    resetInlineVehicles();
  }, [resetInlineVehicles]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setHighlightedIndex(-1);
  }, []);

  const handleCreatePerson = useCallback(
    async (formData: {
      fullName: string;
      status: VisitPersonStatus;
      residentId: string;
      notes: string;
      stagedImages: Map<ImageType, File>;
    }) => {
      const person = await createVisitPerson.mutateAsync({
        type: "visitor",
        fullName: formData.fullName,
        status: formData.status,
        residentId: formData.residentId || undefined,
        notes: formData.notes || undefined,
      });
      toast.success(t("visitPersons.messages.created"));

      if (formData.stagedImages.size > 0) {
        let imageFailed = 0;
        for (const [imageType, file] of formData.stagedImages) {
          try {
            await uploadImage.mutateAsync({ visitPersonId: person.id, file, imageType });
          } catch {
            imageFailed += 1;
          }
        }
        if (imageFailed > 0) {
          toast.error(t("visitPersons.messages.imageUploadFailed", { count: imageFailed }));
        }
      }

      if (inlineVehicleEntries.length > 0) {
        const { saved, failed } = await submitAllVehicles(person.id, "visitPerson");
        if (failed.length === 0) {
          if (saved.length === 1 && saved[0].vehicleId) {
            setJustCreatedVehicleId(saved[0].vehicleId);
          }
          setSelectedPerson(person);
          setSidebarMode("view");
        } else {
          // Keep sidebar open on partial failure; person is already saved
          setSelectedPerson(person);
        }
      } else {
        setSelectedPerson(person);
        setSidebarMode("view");
      }
    },
    [createVisitPerson, uploadImage, t, inlineVehicleEntries, submitAllVehicles],
  );

  const handleSave = useCallback(
    async (formData: {
      direction: Direction;
      accessMode: AccessMode;
      vehicleId?: string;
      notes: string;
    }) => {
      if (!selectedPerson) return;
      feedback.show(
        () =>
          createAccessEvent.mutateAsync({
            personType: "visitor",
            visitPersonId: selectedPerson.id,
            direction: formData.direction,
            accessMode: formData.accessMode,
            vehicleId: formData.vehicleId,
            notes: formData.notes || undefined,
            source: "web",
          }),
        {
          personName: selectedPerson.fullName,
          direction: formData.direction,
          accessMode: formData.accessMode,
        },
      );
      handleCloseSidebar();
    },
    [selectedPerson, createAccessEvent, feedback, handleCloseSidebar],
  );

  const handleSaveEdit = useCallback(
    (patch: UpdateVisitPersonInput) => {
      if (!selectedPerson) return;
      updateVisitPerson.mutate(
        { id: selectedPerson.id, patch },
        {
          onSuccess: () => {
            toast.success(t("visitPersons.messages.updated"));
            handleCloseSidebar();
          },
          onError: (err: unknown) => {
            const status = (err as { status?: number })?.status;
            if (status === 403) {
              toast.error(t("visitPersons.messages.forbidden"));
            } else {
              toast.error(t("visitPersons.messages.errorUpdating"));
            }
          },
        },
      );
    },
    [selectedPerson, updateVisitPerson, t, handleCloseSidebar],
  );

  return (
    <div className="space-y-4">
      {topRightSlot && (
        <div className="flex justify-end">{topRightSlot}</div>
      )}
      <VisitorsTable
        ref={searchInputRef}
        data={data}
        isLoading={isLoading}
        isError={isError}
        highlightedIndex={highlightedIndex}
        search={search}
        onSearchChange={handleSearchChange}
        onSelectPerson={handleSelectPerson}
        onEditPerson={handleOpenEdit}
        onRegisterNew={handleRegisterNew}
        emptyState={emptyState}
        trailingAction={trailingAction}
      />

      <VisitPersonSidebar
        open={sidebarOpen}
        mode={sidebarMode}
        person={selectedPerson}
        recentEvents={recentEvents}
        isLoadingRecentEvents={isLoadingRecentEvents}
        vehicles={vehicles}
        isLoadingVehicles={isLoadingVehicles}
        isSaving={createAccessEvent.isPending}
        isCreating={createVisitPerson.isPending || inlineIsSubmitting}
        isSavingEdit={updateVisitPerson.isPending}
        images={images}
        isLoadingImages={isLoadingImages}
        onUploadImage={uploadImage.mutate}
        isUploadingImage={uploadImage.isPending}
        onClose={handleCloseSidebar}
        onSave={handleSave}
        onCreatePerson={handleCreatePerson}
        onSaveEdit={handleSaveEdit}
        initialDraft={initialDraft}
        onDraftChange={onDraftChange}
        justCreatedVehicleId={justCreatedVehicleId}
        inlineVehicleEntries={inlineVehicleEntries}
        onAddInlineVehicle={addInlineVehicle}
        onRemoveInlineVehicle={removeInlineVehicle}
        onUpdateInlineVehicle={updateInlineVehicle}
      />

      <AccessEventFeedbackOverlay controller={feedback} />
    </div>
  );
}
