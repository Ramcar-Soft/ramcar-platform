import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { ExtendedUserProfile, Direction, AccessMode, ResidentFiltersInput } from "@ramcar/shared";
import { useResidents } from "../hooks/use-residents";
import { useRecentAccessEvents } from "../hooks/use-recent-access-events";
import { useCreateAccessEvent } from "../hooks/use-create-access-event";
import { useResidentVehicles } from "../hooks/use-resident-vehicles";
import { useKeyboardNavigation } from "../hooks/use-keyboard-navigation";
import { ResidentsTable } from "./residents-table";
import { AccessEventSidebar } from "./access-event-sidebar";

export function ResidentsPageClient() {
  const { t } = useTranslation();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [selectedResident, setSelectedResident] = useState<ExtendedUserProfile | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters] = useState<ResidentFiltersInput>({
    page: 1,
    pageSize: 20,
    sortBy: "full_name",
    sortOrder: "asc",
  });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isError } = useResidents({
    ...filters,
    search: debouncedSearch || undefined,
  });

  const { data: recentEvents, isLoading: isLoadingRecentEvents } = useRecentAccessEvents(
    selectedResident?.id ?? null,
  );

  const { data: vehicles, isLoading: isLoadingVehicles } = useResidentVehicles(
    selectedResident?.id ?? null,
  );

  const createAccessEvent = useCreateAccessEvent();

  useKeyboardNavigation({
    searchInputRef,
    sidebarOpen,
    residents: data?.data,
    highlightedIndex,
    setHighlightedIndex,
    onSelectResident: (resident) => {
      setSelectedResident(resident);
      setSidebarOpen(true);
      setSearch("");
      setHighlightedIndex(-1);
    },
  });

  const handleSelectResident = useCallback((resident: ExtendedUserProfile) => {
    setSelectedResident(resident);
    setSidebarOpen(true);
    setSearch("");
    setHighlightedIndex(-1);
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
    setSelectedResident(null);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setHighlightedIndex(-1);
  }, []);

  const handleSave = useCallback(
    (formData: { direction: Direction; accessMode: AccessMode; vehicleId?: string; notes: string }) => {
      if (!selectedResident) return;

      createAccessEvent.mutate(
        {
          personType: "resident",
          userId: selectedResident.id,
          direction: formData.direction,
          accessMode: formData.accessMode,
          vehicleId: formData.vehicleId,
          notes: formData.notes || undefined,
          source: "desktop",
        },
        {
          onSuccess: () => {
            toast.success(t("accessEvents.messages.created"));
            handleCloseSidebar();
          },
          onError: () => {
            toast.error(t("accessEvents.messages.errorCreating"));
          },
        },
      );
    },
    [selectedResident, createAccessEvent, t, handleCloseSidebar],
  );

  return (
    <div className="space-y-4">
      <ResidentsTable
        ref={searchInputRef}
        data={data}
        isLoading={isLoading}
        isError={isError}
        highlightedIndex={highlightedIndex}
        search={search}
        onSearchChange={handleSearchChange}
        onSelectResident={handleSelectResident}
      />
      <AccessEventSidebar
        open={sidebarOpen}
        resident={selectedResident}
        recentEvents={recentEvents}
        isLoadingRecentEvents={isLoadingRecentEvents}
        vehicles={vehicles}
        isLoadingVehicles={isLoadingVehicles}
        isSaving={createAccessEvent.isPending}
        onClose={handleCloseSidebar}
        onSave={handleSave}
      />
    </div>
  );
}
