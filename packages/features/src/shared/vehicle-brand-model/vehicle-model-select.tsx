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
import { searchModels, normalizeForSearch, titleCase } from "./search";
import { VEHICLE_BRAND_MODEL } from "./data";

export interface VehicleModelSelectProps {
  brand: string | null;
  value: string | null;
  onChange: (model: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
  id?: string;
}

export function VehicleModelSelect({
  brand,
  value,
  onChange,
  placeholder,
  disabled,
  ariaLabel,
  id,
}: VehicleModelSelectProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const isDisabled = disabled || brand === null;
  const effectivePlaceholder =
    brand === null
      ? t("vehicles.model.disabled")
      : (placeholder ?? t("vehicles.model.placeholder"));

  const displayLabel = value ?? effectivePlaceholder;
  const isPlaceholder = value == null;

  const isBrandInDataset = brand !== null && brand in VEHICLE_BRAND_MODEL;

  function commit(model: string | null) {
    onChange(model);
    setOpen(false);
    setSearch("");
  }

  const hasTypedText = search.trim().length > 0;
  const datasetModels = isBrandInDataset ? searchModels(brand!, search) : [];
  const isExactDatasetMatch =
    hasTypedText &&
    isBrandInDataset &&
    datasetModels.some(
      (m) => normalizeForSearch(m) === normalizeForSearch(search.trim()),
    );
  const showFallback = !isBrandInDataset || (hasTypedText && !isExactDatasetMatch);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          id={id}
          disabled={isDisabled}
          aria-label={ariaLabel ?? t("vehicles.model.ariaLabel")}
          aria-expanded={open}
          role="combobox"
          aria-disabled={isDisabled}
          title={brand === null ? t("vehicles.model.disabled") : undefined}
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
          filter={(itemValue: string) => {
            if (itemValue.startsWith("__add_custom__")) return 1;
            return 1;
          }}
        >
          <CommandInput
            placeholder={t("vehicles.model.searchPlaceholder")}
            value={search}
            onValueChange={(v) => {
              setSearch(v);
              if (!v.trim()) {
                commit(null);
              }
            }}
          />
          <CommandList>
            <CommandEmpty>{t("vehicles.model.noResults")}</CommandEmpty>
            <CommandGroup>
              {showFallback && hasTypedText && (
                <CommandItem
                  key="__add_custom__"
                  value={`__add_custom__ ${search.trim()}`}
                  onSelect={() => commit(titleCase(search))}
                  data-testid="model-fallback-row"
                >
                  <span className="truncate">
                    {t("vehicles.model.addCustom", { query: titleCase(search) })}
                  </span>
                </CommandItem>
              )}
              {isBrandInDataset &&
                datasetModels.map((model) => (
                  <CommandItem
                    key={model}
                    value={model}
                    onSelect={() => commit(model)}
                  >
                    <span className="truncate">{model}</span>
                  </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
