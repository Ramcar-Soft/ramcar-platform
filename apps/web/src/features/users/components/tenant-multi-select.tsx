"use client";

import { useMemo, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { useTranslations } from "next-intl";
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

export interface TenantOption {
  id: string;
  name: string;
}

export interface TenantMultiSelectProps {
  value: string[];
  primary: string;
  onChange: (value: string[], primary: string) => void;
  options: TenantOption[];
  allowedIds?: string[];
  disabled?: boolean;
  error?: string;
}

export function TenantMultiSelect({
  value,
  primary,
  onChange,
  options,
  allowedIds,
  disabled,
  error,
}: TenantMultiSelectProps) {
  const t = useTranslations("users.form");
  const [open, setOpen] = useState(false);

  const visibleOptions = useMemo(() => {
    if (!allowedIds) return options;
    const allowed = new Set(allowedIds);
    return options.filter((o) => allowed.has(o.id));
  }, [options, allowedIds]);

  const optionsById = useMemo(() => {
    const map = new Map<string, TenantOption>();
    for (const o of options) map.set(o.id, o);
    return map;
  }, [options]);

  function toggle(id: string) {
    if (value.includes(id)) {
      const next = value.filter((v) => v !== id);
      const nextPrimary = primary === id ? (next[0] ?? "") : primary;
      onChange(next, nextPrimary);
    } else {
      const next = [...value, id];
      const nextPrimary = primary || id;
      onChange(next, nextPrimary);
    }
  }

  function remove(id: string) {
    const next = value.filter((v) => v !== id);
    const nextPrimary = primary === id ? (next[0] ?? "") : primary;
    onChange(next, nextPrimary);
  }

  function setPrimary(id: string) {
    if (!value.includes(id)) return;
    onChange(value, id);
  }

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <ul
          role="list"
          aria-label={t("tenantsMultiLabel")}
          className="flex flex-wrap gap-2"
        >
          {value.map((id) => {
            const opt = optionsById.get(id);
            const label = opt?.name ?? id;
            const isPrimary = id === primary;
            return (
              <li
                key={id}
                data-testid={`tenant-chip-${id}`}
                className="flex items-center gap-2 rounded-full border bg-muted px-3 py-1 text-sm"
              >
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="tenant-primary"
                    value={id}
                    checked={isPrimary}
                    onChange={() => setPrimary(id)}
                    aria-label={t("tenantSetPrimary")}
                    disabled={disabled}
                  />
                  <span className={isPrimary ? "font-medium" : ""}>
                    {label}
                  </span>
                  {isPrimary && (
                    <span className="text-xs text-muted-foreground">
                      ({t("tenantPrimaryLabel")})
                    </span>
                  )}
                </label>
                <button
                  type="button"
                  aria-label={t("tenantRemove")}
                  onClick={() => remove(id)}
                  disabled={disabled}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            aria-label={t("tenantsMultiLabel")}
            aria-expanded={open}
            role="combobox"
            className="w-full justify-between gap-2 font-normal"
          >
            <span className="text-muted-foreground truncate">
              {t("tenantsSearchPlaceholder")}
            </span>
            <ChevronDown className="h-4 w-4 opacity-50 shrink-0" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[--radix-popover-trigger-width] p-0"
        >
          <Command>
            <CommandInput placeholder={t("tenantsSearchPlaceholder")} />
            <CommandList>
              <CommandEmpty>{t("tenantsEmpty")}</CommandEmpty>
              <CommandGroup>
                {visibleOptions.map((opt) => {
                  const checked = value.includes(opt.id);
                  return (
                    <CommandItem
                      key={opt.id}
                      value={opt.name}
                      onSelect={() => toggle(opt.id)}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        readOnly
                        className="mr-2"
                        aria-hidden="true"
                        tabIndex={-1}
                      />
                      {opt.name}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
