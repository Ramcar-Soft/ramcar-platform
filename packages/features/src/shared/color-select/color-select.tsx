import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@ramcar/ui";
import { ChevronDown } from "lucide-react";
import enMessages from "@ramcar/i18n/messages/en";
import esMessages from "@ramcar/i18n/messages/es";
import { useI18n } from "../../adapters";
import {
  COLOR_CATALOG,
  COLOR_CATEGORIES,
  type ColorCategory,
  type ColorEntry,
} from "./color-catalog";
import {
  lookupByHex,
  normalizeHex,
  buildSearchToken,
  normalizeSearch,
} from "./color-lookup";

const EN_OPTIONS = (enMessages as { vehicles?: { color?: { options?: Record<string, string> } } })
  .vehicles?.color?.options ?? {};
const ES_OPTIONS = (esMessages as { vehicles?: { color?: { options?: Record<string, string> } } })
  .vehicles?.color?.options ?? {};

export interface ColorSelectProps {
  value: string | null;
  onChange: (hex: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  ariaLabel?: string;
}

export type SwatchVariant = "none" | "flat" | "legacy" | "chameleon" | "chrome";

interface TriggerDisplay {
  variant: SwatchVariant;
  color: string | null;
  label: string;
  isPlaceholder: boolean;
}

export interface ResolvedSwatch {
  variant: SwatchVariant;
  color: string | null;
  label: string;
}

export function swatchVariantForEntry(entry: ColorEntry): SwatchVariant {
  if (entry.effect === "chameleon") return "chameleon";
  if (entry.effect === "chrome") return "chrome";
  return "flat";
}

export function computeTriggerDisplay(
  value: string | null,
  placeholder: string,
  t: (key: string) => string,
): TriggerDisplay {
  if (value == null || value === "") {
    return { variant: "none", color: null, label: placeholder, isPlaceholder: true };
  }

  const canonicalHex = normalizeHex(value);
  if (canonicalHex) {
    const entry = lookupByHex(canonicalHex);
    if (entry) {
      return {
        variant: swatchVariantForEntry(entry),
        color: entry.hex,
        label: t(`vehicles.color.options.${entry.key}`),
        isPlaceholder: false,
      };
    }
    return { variant: "flat", color: canonicalHex, label: canonicalHex, isPlaceholder: false };
  }

  return { variant: "legacy", color: null, label: value, isPlaceholder: false };
}

export function resolveSwatch(
  colorValue: string | null | undefined,
  t: (key: string) => string,
): ResolvedSwatch {
  if (colorValue == null || colorValue === "") {
    return { variant: "none", color: null, label: "" };
  }

  const canonicalHex = normalizeHex(colorValue);
  if (canonicalHex) {
    const entry = lookupByHex(canonicalHex);
    if (entry) {
      return {
        variant: swatchVariantForEntry(entry),
        color: entry.hex,
        label: t(`vehicles.color.options.${entry.key}`),
      };
    }
    return { variant: "flat", color: canonicalHex, label: canonicalHex };
  }

  return { variant: "legacy", color: null, label: colorValue };
}

export function Swatch({ variant, color }: { variant: SwatchVariant; color: string | null }) {
  if (variant === "none") return null;
  const base = "h-4 w-4 rounded-full border border-border shrink-0";

  if (variant === "legacy") {
    return (
      <span
        data-testid="color-select-swatch"
        data-variant="legacy"
        aria-hidden="true"
        className={`${base} border-dashed bg-transparent`}
      />
    );
  }

  if (variant === "chameleon") {
    return (
      <span
        data-testid="color-select-swatch"
        data-variant="chameleon"
        aria-hidden="true"
        className={base}
        style={{
          background:
            "conic-gradient(from 0deg, #6E4E9E, #00A86B, #E75480, #30D5C8, #6E4E9E)",
        }}
      />
    );
  }

  if (variant === "chrome") {
    return (
      <span
        data-testid="color-select-swatch"
        data-variant="chrome"
        aria-hidden="true"
        className={base}
        style={{
          background:
            "linear-gradient(135deg, #D8D9DC 0%, #7D7E82 50%, #D8D9DC 100%)",
        }}
      />
    );
  }

  return (
    <span
      data-testid="color-select-swatch"
      data-variant="flat"
      aria-hidden="true"
      className={base}
      style={{ backgroundColor: color ?? undefined }}
    />
  );
}

function useCatalogRows(t: (key: string) => string) {
  return useMemo(() => {
    const byCategory = new Map<
      ColorCategory,
      Array<{
        entry: ColorEntry;
        searchValue: string;
        label: string;
        variant: SwatchVariant;
      }>
    >();
    for (const cat of COLOR_CATEGORIES) byCategory.set(cat, []);

    for (const entry of COLOR_CATALOG) {
      const label = t(`vehicles.color.options.${entry.key}`);
      const enLabel = EN_OPTIONS[entry.key] ?? entry.key;
      const esLabel = ES_OPTIONS[entry.key] ?? entry.key;
      const searchValue = buildSearchToken({
        key: entry.key,
        hex: entry.hex,
        en: enLabel,
        es: esLabel,
      });
      byCategory.get(entry.category)!.push({
        entry,
        searchValue,
        label,
        variant: swatchVariantForEntry(entry),
      });
    }
    return byCategory;
  }, [t]);
}

export function ColorSelect({
  value,
  onChange,
  placeholder,
  disabled,
  id,
  ariaLabel,
}: ColorSelectProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const nativeInputRef = useRef<HTMLInputElement>(null);

  const effectivePlaceholder = placeholder ?? t("vehicles.color.placeholder");
  const display = useMemo(
    () => computeTriggerDisplay(value, effectivePlaceholder, t),
    [value, effectivePlaceholder, t],
  );
  const rowsByCategory = useCatalogRows(t);

  const canonicalHex = value != null ? normalizeHex(value) : null;
  const isCustomHex = canonicalHex != null && lookupByHex(canonicalHex) == null;

  // Use a ref so the native listener always calls the latest onChange.
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; });

  // Native event listener so raw dispatchEvent("change") works in tests
  // (React's synthetic onChange doesn't fire for imperative dispatchEvent).
  useEffect(() => {
    const input = nativeInputRef.current;
    if (!input) return;
    function handleChange(e: Event) {
      const canonical = normalizeHex((e.target as HTMLInputElement).value);
      if (canonical) {
        // flushSync ensures state updates apply synchronously (needed for native dispatchEvent interop).
        flushSync(() => {
          onChangeRef.current(canonical);
          setOpen(false);
          setSearch("");
        });
      }
    }
    input.addEventListener("change", handleChange);
    return () => input.removeEventListener("change", handleChange);
  }, []);

  function handleSelectCatalog(entry: ColorEntry) {
    onChange(entry.hex);
    setOpen(false);
    setSearch("");
  }

  function handleOpenNativePicker() {
    nativeInputRef.current?.click();
  }

  return (
    <>
      <input
        ref={nativeInputRef}
        data-testid="color-select-native-input"
        type="color"
        aria-hidden="true"
        tabIndex={-1}
        readOnly
        className="sr-only absolute h-0 w-0 overflow-hidden opacity-0"
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            id={id}
            disabled={disabled}
            aria-label={ariaLabel ?? t("vehicles.color.ariaLabel")}
            aria-expanded={open}
            role="button"
            className="w-full justify-start gap-2 font-normal"
          >
            <Swatch variant={display.variant} color={display.color} />
            <span
              className={
                display.isPlaceholder ? "text-muted-foreground truncate" : "truncate"
              }
            >
              {display.label}
            </span>
            <ChevronDown className="ml-auto h-4 w-4 opacity-50" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[--radix-popover-trigger-width] p-0"
        >
          <Command
            filter={(itemValue: string, searchTerm: string) => {
              const needle = normalizeSearch(searchTerm);
              return itemValue.includes(needle) ? 1 : 0;
            }}
          >
            <CommandInput
              placeholder={t("vehicles.color.searchPlaceholder")}
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>
                {t("vehicles.color.noResults").replace("{query}", search)}
              </CommandEmpty>
              <CommandGroup>
                <CommandItem
                  key="__add_custom__"
                  value="__add_custom__ add custom agregar color personalizado"
                  onSelect={handleOpenNativePicker}
                >
                  <span aria-hidden="true" className="h-4 w-4 shrink-0" />
                  <span className="truncate">{t("vehicles.color.addCustom")}</span>
                </CommandItem>
                {isCustomHex && canonicalHex ? (
                  <CommandItem
                    key="__current__"
                    value={`__current__ ${canonicalHex.toLowerCase()}`}
                    onSelect={() => {
                      setOpen(false);
                      setSearch("");
                    }}
                  >
                    <Swatch variant="flat" color={canonicalHex} />
                    <span className="truncate flex items-center gap-1">
                      <span>{t("vehicles.color.current")}</span>
                      <span className="text-muted-foreground">— {canonicalHex}</span>
                    </span>
                  </CommandItem>
                ) : null}
              </CommandGroup>
              {COLOR_CATEGORIES.map((cat) => {
                const rows = rowsByCategory.get(cat) ?? [];
                if (rows.length === 0) return null;
                return (
                  <CommandGroup key={cat} heading={t(`vehicles.color.categories.${cat}`)}>
                    {rows.map(({ entry, searchValue, label, variant }) => (
                      <CommandItem
                        key={entry.key}
                        value={searchValue}
                        onSelect={() => handleSelectCatalog(entry)}
                      >
                        <Swatch variant={variant} color={entry.hex} />
                        <span className="truncate">{label}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </>
  );
}

export { COLOR_CATALOG, type ColorEntry };
