import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
import { useKeyboardNavigation } from "@ramcar/features";
import { ProvidersTable } from "./providers-table";
import { ProviderSidebar } from "./provider-sidebar";

export function ProvidersPageClient() {
  const { t } = useTranslation();
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
    type: "service_provider",
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

  useKeyboardNavigation<VisitPerson>({
    searchInputRef,
    disabled: sidebarOpen,
    items: data?.data,
    highlightedIndex,
    setHighlightedIndex,
    onSelectItem: handleSelectPerson,
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
    async (data: {
      fullName: string;
      phone: string;
      company: string;
      status: VisitPersonStatus;
      residentId: string;
      notes: string;
      stagedImages: Map<ImageType, File>;
    }) => {
      const person = await createVisitPerson.mutateAsync({
        type: "service_provider",
        fullName: data.fullName,
        status: data.status,
        phone: data.phone || undefined,
        company: data.company || undefined,
        residentId: data.residentId || undefined,
        notes: data.notes || undefined,
      });
      toast.success(t("providers.messages.created"));

      if (data.stagedImages.size > 0) {
        let failed = 0;
        for (const [imageType, file] of data.stagedImages) {
          try {
            await uploadImage.mutateAsync({
              visitPersonId: person.id,
              file,
              imageType,
            });
          } catch {
            failed += 1;
          }
        }
        if (failed > 0) {
          toast.error(t("providers.messages.imageUploadFailed", { count: failed }));
        }
      }

      setSelectedPerson(person);
      setSidebarMode("view");
    },
    [createVisitPerson, uploadImage, t],
  );

  const handleSave = useCallback(
    async (formData: { direction: Direction; accessMode: AccessMode; vehicleId?: string; notes: string }) => {
      if (!selectedPerson) return;
      await createAccessEvent.mutateAsync({
        personType: "service_provider",
        visitPersonId: selectedPerson.id,
        direction: formData.direction,
        accessMode: formData.accessMode,
        vehicleId: formData.vehicleId,
        notes: formData.notes || undefined,
        source: "desktop",
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
            toast.success(t("providers.messages.updated"));
            handleCloseSidebar();
          },
          onError: () => {
            toast.error(t("providers.messages.errorUpdating"));
          },
        },
      );
    },
    [selectedPerson, updateVisitPerson, t, handleCloseSidebar],
  );

  return (
    <div className="space-y-4">
      <ProvidersTable
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
      />
      <ProviderSidebar
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
      />
    </div>
  );
}
