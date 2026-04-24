"use client";

import { useTranslations } from "next-intl";
import { useAppStore } from "@ramcar/store";
import { useActiveTenant } from "@ramcar/features";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ramcar/ui";
import { useTenants } from "../hooks/use-tenants";

interface TenantSelectProps {
  /**
   * The currently active tenant_id as read from the URL search params.
   * This component is fully controlled — it does NOT write back to authSlice.
   */
  value: string | undefined;
  /**
   * Called when the user selects a different tenant.
   * Callers are responsible for writing the new value to the URL only.
   */
  onChange: (tenantId: string | undefined) => void;
}

const ALL_SENTINEL = "ALL";

/**
 * In-page tenant filter for the Logbook (Bitacora).
 *
 * Design contract (spec 021, User Story 3):
 *   - The `value` prop is always URL-driven (authoritative filter).
 *   - Changing the dropdown updates the URL only — it does NOT call
 *     setActiveTenant or touch authSlice in any way.
 *   - Valid values: a UUID present in the user's `tenantIds` list, or "ALL"
 *     (super-admin cross-tenant sentinel).
 *   - If `value` is neither of the above, we fall back to `activeTenantId`
 *     and emit a console.warn so the issue is visible during development.
 */
export function TenantSelect({ value, onChange }: TenantSelectProps) {
  const t = useTranslations("logbook");
  const user = useAppStore((s) => s.user);
  const { activeTenantId, tenantIds } = useActiveTenant();
  const { data: tenants } = useTenants();

  if (!["super_admin", "admin"].includes(user?.role || "")) return null;

  // Validate value: must be "ALL" (super-admin sentinel) or a known tenantId.
  // If invalid, fall back to activeTenantId and warn.
  const isAllSentinel = value === ALL_SENTINEL;
  const isKnownTenant = value !== undefined && tenantIds.includes(value);
  const isValid = isAllSentinel || isKnownTenant;

  let resolvedValue: string;
  if (!value) {
    // No value — use ALL sentinel as display placeholder
    resolvedValue = ALL_SENTINEL;
  } else if (isValid) {
    resolvedValue = value;
  } else {
    console.warn(
      `[TenantSelect] Unknown tenant_id "${value}" in URL — falling back to activeTenantId "${activeTenantId}". ` +
        "This may happen briefly during navigation. If it persists, check the URL seeding logic in useLogbookFilters.",
    );
    resolvedValue = activeTenantId || ALL_SENTINEL;
  }

  return (
    <Select
      value={resolvedValue}
      onValueChange={(v) => onChange(v === ALL_SENTINEL ? undefined : v)}
    >
      <SelectTrigger className="h-9 w-48">
        <SelectValue placeholder={t("toolbar.tenantSelect.placeholder")} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_SENTINEL}>
          {t("toolbar.tenantSelect.allOption")}
        </SelectItem>
        {tenants?.map((tenant) => (
          <SelectItem key={tenant.id} value={tenant.id}>
            {tenant.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
