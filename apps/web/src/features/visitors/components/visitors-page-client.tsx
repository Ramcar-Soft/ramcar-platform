"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
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

export function VisitorsPageClient() {
  const t = useTranslations("accessEvents");
  const tVisitPersons = useTranslations("visitPersons");
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
    async (data: {
      fullName: string;
      status: VisitPersonStatus;
      residentId: string;
      notes: string;
    }) => {
      const person = await createVisitPerson.mutateAsync({
        type: "visitor",
        fullName: data.fullName,
        status: data.status,
        residentId: data.residentId || undefined,
        notes: data.notes || undefined,
      });
      toast.success(tVisitPersons("messages.created"));
      setSelectedPerson(person);
      setSidebarMode("view");
    },
    [createVisitPerson, tVisitPersons],
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
      toast.success(t("messages.created"));
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
            toast.success(tVisitPersons("messages.updated"));
            handleCloseSidebar();
          },
          onError: () => {
            toast.error(tVisitPersons("messages.errorUpdating"));
          },
        },
      );
    },
    [selectedPerson, updateVisitPerson, tVisitPersons, handleCloseSidebar],
  );

  return (
    <div className="space-y-4">
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
      />
    </div>
  );
}
