import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, X } from "lucide-react";
import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@ramcar/ui";
import type { PaginatedResponse, ExtendedUserProfile, PhoneType } from "@ramcar/shared";
import { useI18n, useTransport, useRole } from "../../adapters";

function formatPhoneWithType(
  phone: string | null,
  phoneType: PhoneType | null,
  t: (key: string) => string,
): string | null {
  if (!phone) return null;
  if (!phoneType) return phone;
  return `${t(`users.phoneTypes.${phoneType}`)} · ${phone}`;
}

export interface ResidentSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
  id?: string;
}

export function ResidentSelect({
  value,
  onChange,
  placeholder,
  disabled,
  ariaLabel,
  id,
}: ResidentSelectProps) {
  const { t } = useI18n();
  const transport = useTransport();
  const { tenantId } = useRole();

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const {
    data: listData,
    isPending: listPending,
    isError: listError,
  } = useQuery<PaginatedResponse<ExtendedUserProfile>>({
    queryKey: ["residents", tenantId, "select", debouncedSearch],
    queryFn: () =>
      transport.get<PaginatedResponse<ExtendedUserProfile>>("/residents", {
        params: {
          search: (debouncedSearch.trim()) || undefined,
          pageSize: 50,
          status: "active",
          sortBy: "full_name",
          sortOrder: "asc",
        },
      }),
  });

  const residents = listData?.data ?? [];
  const currentPageContainsValue = residents.some((r) => r.id === value);

  const { data: resolvedResident } = useQuery<ExtendedUserProfile>({
    queryKey: ["residents", tenantId, "detail", value],
    queryFn: () => transport.get<ExtendedUserProfile>(`/residents/${value}`),
    enabled: Boolean(value && !currentPageContainsValue),
    retry: false,
  });

  const selectedResident = residents.find((r) => r.id === value) ?? resolvedResident;

  function getTriggerLabel() {
    if (selectedResident) {
      return selectedResident.address
        ? `${selectedResident.fullName} — ${selectedResident.address}`
        : selectedResident.fullName;
    }
    return placeholder ?? t("residents.select.placeholder");
  }

  const isPlaceholder = !selectedResident;

  function commit(residentId: string) {
    onChange(residentId);
    setOpen(false);
    setSearch("");
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange("");
    setSearch("");
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          id={id}
          disabled={disabled}
          aria-label={ariaLabel ?? t("residents.select.ariaLabel")}
          aria-expanded={open}
          role="combobox"
          className="w-full justify-start gap-2 font-normal"
        >
          <span className={isPlaceholder ? "text-muted-foreground truncate flex-1" : "truncate flex-1"}>
            {getTriggerLabel()}
          </span>
          {!isPlaceholder && (
            <span
              role="button"
              aria-label={t("residents.select.clear")}
              onClick={clear}
              className="text-muted-foreground hover:text-foreground rounded"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          )}
          <ChevronDown className="h-4 w-4 opacity-50 shrink-0" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-0">
        <Command filter={() => 1}>
          <CommandInput
            placeholder={t("residents.select.searchPlaceholder")}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {listPending && !listData ? (
              <CommandItem disabled className="text-muted-foreground justify-center">
                {t("residents.select.loading")}
              </CommandItem>
            ) : listError ? (
              <CommandItem disabled className="text-muted-foreground justify-center">
                {t("residents.select.error")}
              </CommandItem>
            ) : (
              <>
                <CommandEmpty>{t("residents.select.empty")}</CommandEmpty>
                <CommandGroup>
                  {residents.map((resident) => {
                    const phoneLabel = formatPhoneWithType(
                      resident.phone,
                      resident.phoneType,
                      t,
                    );
                    return (
                      <CommandItem
                        key={resident.id}
                        value={resident.id}
                        onSelect={() => commit(resident.id)}
                      >
                        <div className="flex flex-col w-full min-w-0 gap-0.5">
                          <div className="flex items-center justify-between gap-2 min-w-0">
                            <span className="truncate">{resident.fullName}</span>
                            {phoneLabel && (
                              <span className="text-muted-foreground text-xs shrink-0 tabular-nums">
                                {phoneLabel}
                              </span>
                            )}
                          </div>
                          {resident.address && (
                            <span className="text-muted-foreground text-xs truncate">
                              {resident.address}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
