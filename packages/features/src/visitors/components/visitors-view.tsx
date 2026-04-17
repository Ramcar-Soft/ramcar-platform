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
import { useKeyboardNavigation } from "../hooks/use-keyboard-navigation";
import { VisitorsTable } from "./visitors-table";
import { VisitPersonSidebar } from "./visit-person-sidebar";
import { useI18n } from "../../adapters";

interface VisitPersonFormDraft {
  fullName: string;
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

  useKeyboardNavigation({
    searchInputRef,
    sidebarOpen,
    persons: data?.data,
    highlightedIndex,
    setHighlightedIndex,
    onSelectPerson: handleSelectPerson,
  });

  const handleRegisterNew = useCallback(() => {
    setSelectedPerson(null);
    setSidebarMode("create");
    setSidebarOpen(true);
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
    setSelectedPerson(null);
    setSidebarMode("view");
  }, []);

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
        let failed = 0;
        for (const [imageType, file] of formData.stagedImages) {
          try {
            await uploadImage.mutateAsync({ visitPersonId: person.id, file, imageType });
          } catch {
            failed += 1;
          }
        }
        if (failed > 0) {
          toast.error(t("visitPersons.messages.imageUploadFailed", { count: failed }));
        }
      }

      setSelectedPerson(person);
      setSidebarMode("view");
    },
    [createVisitPerson, uploadImage, t],
  );

  const handleSave = useCallback(
    async (formData: {
      direction: Direction;
      accessMode: AccessMode;
      vehicleId?: string;
      notes: string;
    }) => {
      if (!selectedPerson) return;
      await createAccessEvent.mutateAsync({
        personType: "visitor",
        visitPersonId: selectedPerson.id,
        direction: formData.direction,
        accessMode: formData.accessMode,
        vehicleId: formData.vehicleId,
        notes: formData.notes || undefined,
        source: "web",
      });
      toast.success(t("accessEvents.messages.created"));
      handleCloseSidebar();
    },
    [selectedPerson, createAccessEvent, t, handleCloseSidebar],
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
          onError: () => {
            toast.error(t("visitPersons.messages.errorUpdating"));
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
        isCreating={createVisitPerson.isPending}
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
      />
    </div>
  );
}
