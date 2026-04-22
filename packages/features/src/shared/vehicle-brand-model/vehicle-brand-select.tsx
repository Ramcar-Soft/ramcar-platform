import { useState } from "react";
import { ChevronDown } from "lucide-react";
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
import { useI18n } from "../../adapters";
import { buildBrandIndex, normalizeForSearch, titleCase } from "./search";
import { VEHICLE_BRAND_MODEL } from "./data";

export interface VehicleBrandSelectProps {
  value: string | null;
  onChange: (brand: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
  id?: string;
  /** Ref to the model input element — focused after a brand is committed (US3). */
  modelInputRef?: React.RefObject<HTMLElement | null>;
}

export function VehicleBrandSelect({
  value,
  onChange,
  placeholder,
  disabled,
  ariaLabel,
  id,
  modelInputRef,
}: VehicleBrandSelectProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const effectivePlaceholder = placeholder ?? t("vehicles.brand.placeholder");
  const displayLabel = value ?? effectivePlaceholder;
  const isPlaceholder = value == null;

  function commit(brand: string | null) {
    onChange(brand);
    setOpen(false);
    setSearch("");
    if (brand !== null && modelInputRef?.current) {
      modelInputRef.current.focus();
    }
  }

  const brandIndex = buildBrandIndex();

  const hasTypedText = search.trim().length > 0;
  const isDatasetMatch =
    hasTypedText &&
    Object.keys(VEHICLE_BRAND_MODEL).some(
      (b) => normalizeForSearch(b) === normalizeForSearch(search.trim()),
    );
  const showFallback = hasTypedText && !isDatasetMatch;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          id={id}
          disabled={disabled}
          aria-label={ariaLabel ?? t("vehicles.brand.ariaLabel")}
          aria-expanded={open}
          role="combobox"
          className="w-full justify-start gap-2 font-normal"
        >
          <span className={isPlaceholder ? "text-muted-foreground truncate" : "truncate"}>
            {displayLabel}
          </span>
          <ChevronDown className="ml-auto h-4 w-4 opacity-50" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-0">
        <Command
          filter={(itemValue: string, searchTerm: string) => {
            if (itemValue.startsWith("__add_custom__")) return 1;
            const results = brandIndex.search(normalizeForSearch(searchTerm));
            const matchedNames = results.map((r) => normalizeForSearch(r.item.name));
            return matchedNames.includes(normalizeForSearch(itemValue)) ? 1 : 0;
          }}
        >
          <CommandInput
            placeholder={t("vehicles.brand.searchPlaceholder")}
            value={search}
            onValueChange={(v) => {
              setSearch(v);
              if (!v.trim()) {
                commit(null);
              }
            }}
          />
          <CommandList>
            <CommandEmpty>{t("vehicles.brand.noResults")}</CommandEmpty>
            <CommandGroup>
              {showFallback && (
                <CommandItem
                  key="__add_custom__"
                  value={`__add_custom__ ${search.trim()}`}
                  onSelect={() => commit(titleCase(search))}
                  data-testid="brand-fallback-row"
                >
                  <span className="truncate">
                    {t("vehicles.brand.addCustom", { query: titleCase(search) })}
                  </span>
                </CommandItem>
              )}
              {Object.keys(VEHICLE_BRAND_MODEL).map((brand) => (
                <CommandItem
                  key={brand}
                  value={brand}
                  onSelect={() => commit(brand)}
                >
                  <span className="truncate">{brand}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
