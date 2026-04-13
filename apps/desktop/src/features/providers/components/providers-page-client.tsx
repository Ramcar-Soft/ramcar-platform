import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { VisitPerson, VisitPersonFiltersInput, VisitPersonStatus, Direction, AccessMode } from "../types";
import { useVisitPersons } from "../hooks/use-visit-persons";
import { useRecentVisitPersonEvents } from "../hooks/use-recent-visit-person-events";
import { useCreateAccessEvent } from "../hooks/use-create-access-event";
import { useCreateVisitPerson } from "../hooks/use-create-visit-person";
import { useUpdateAccessEvent } from "../hooks/use-update-access-event";
import { useVisitPersonVehicles } from "../hooks/use-visit-person-vehicles";
import { useKeyboardNavigation } from "../hooks/use-keyboard-navigation";
import { ProvidersTable } from "./providers-table";
import { ProviderSidebar } from "./provider-sidebar";

export function ProvidersPageClient() {
  const { t } = useTranslation();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [selectedPerson, setSelectedPerson] = useState<VisitPerson | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarMode, setSidebarMode] = useState<"view" | "create">("view");
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

  const createAccessEvent = useCreateAccessEvent();
  const createVisitPerson = useCreateVisitPerson();
  const updateAccessEvent = useUpdateAccessEvent();

  const handleSelectPerson = useCallback((person: VisitPerson) => {
    setSelectedPerson(person);
    setSidebarMode("view");
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
    async (data: { fullName: string; phone: string; company: string; status: VisitPersonStatus; residentId: string; notes: string }) => {
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
      setSelectedPerson(person);
      setSidebarMode("view");
    },
    [createVisitPerson, t],
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

  const handleUpdateEvent = useCallback(
    async (eventId: string, formData: { direction: Direction; accessMode: AccessMode; vehicleId?: string; notes: string }) => {
      await updateAccessEvent.mutateAsync({
        id: eventId,
        direction: formData.direction,
        accessMode: formData.accessMode,
        vehicleId: formData.vehicleId,
        notes: formData.notes || undefined,
      });
      toast.success(t("accessEvents.messages.updated"));
    },
    [updateAccessEvent, t],
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
        isSaving={createAccessEvent.isPending || updateAccessEvent.isPending}
        isCreating={createVisitPerson.isPending}
        onClose={handleCloseSidebar}
        onSave={handleSave}
        onUpdateEvent={handleUpdateEvent}
        onCreatePerson={handleCreatePerson}
      />
    </div>
  );
}
