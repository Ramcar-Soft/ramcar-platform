import { useEffect, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  Badge,
  TenantAvatar,
} from "@ramcar/ui";
import { Check } from "lucide-react";
import { useAuthStore } from "../../adapters/tenant-selector-adapters";
import { useI18n } from "../../adapters/i18n";
import { useRole } from "../../adapters/role";
import { useTenantList } from "../hooks/use-tenant-list";
import { useTenantSwitch } from "../hooks/use-tenant-switch";
import { TenantSelectorTrigger } from "./tenant-selector-trigger";
import { ConfirmSwitchDialog } from "./confirm-switch-dialog";
import { canShowTenantSelector } from "../policy/can-show-tenant-selector";

interface TenantSelectorProps {
  supabaseUrl?: string;
}

export function TenantSelector({ supabaseUrl = "" }: TenantSelectorProps) {
  const { activeTenantId, activeTenantName, setActiveTenant } = useAuthStore();
  const { t } = useI18n();
  const { role, tenantId: profilesTenantId } = useRole();
  const { data: tenants = [] } = useTenantList();
  const [open, setOpen] = useState(false);
  const tenantSwitch = useTenantSwitch();

  // Sync activeTenantName from the fetched tenant list when it's empty or stale.
  // For non-SuperAdmin roles: also enforce the deterministic "current tenant" rule
  // (FR-003): prefer activeTenantId if valid, then profiles.tenant_id, then
  // the lexicographically-first tenant by name (FR-003 / research R6).
  useEffect(() => {
    if (tenants.length === 0) return;

    if (!canShowTenantSelector(role)) {
      // Non-SuperAdmin: pick one current tenant deterministically.
      let candidateId: string | undefined;

      if (activeTenantId && tenants.some((t) => t.id === activeTenantId)) {
        candidateId = activeTenantId;
      } else if (profilesTenantId && tenants.some((t) => t.id === profilesTenantId)) {
        candidateId = profilesTenantId;
      } else {
        candidateId = [...tenants].sort((a, b) => a.name.localeCompare(b.name))[0]?.id;
      }

      if (!candidateId) return;
      const candidateName = tenants.find((t) => t.id === candidateId)?.name ?? "";
      if (candidateId !== activeTenantId || candidateName !== activeTenantName) {
        setActiveTenant(candidateId, candidateName);
      }
      return;
    }

    // SuperAdmin: only sync name when it's stale.
    if (!activeTenantId) return;
    const match = tenants.find((tenant) => tenant.id === activeTenantId);
    if (match && match.name !== activeTenantName) {
      setActiveTenant(activeTenantId, match.name);
    }
  }, [activeTenantId, activeTenantName, tenants, setActiveTenant, role, profilesTenantId]);

  const activeTenant = tenants.find((t) => t.id === activeTenantId) ?? null;

  // Non-SuperAdmin: render a static display (no dropdown). FR-001/FR-002.
  if (!canShowTenantSelector(role)) {
    return (
      <span className="flex items-center gap-2 px-2 text-sm font-medium">
        {activeTenant ? (
          <TenantAvatar
            name={activeTenant.name}
            slug={activeTenant.slug}
            imagePath={activeTenant.image_path}
            supabaseUrl={supabaseUrl}
            size="sm"
          />
        ) : null}
        <span className="truncate">{activeTenantName || activeTenant?.name}</span>
      </span>
    );
  }

  const handleSelect = (id: string) => {
    tenantSwitch.onSelect(id);
    setOpen(false);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <TenantSelectorTrigger
            supabaseUrl={supabaseUrl}
            activeTenant={
              activeTenant
                ? { slug: activeTenant.slug ?? activeTenant.name, imagePath: activeTenant.image_path }
                : null
            }
          />
        </PopoverTrigger>
        <PopoverContent className="w-[220px] p-0" align="start">
          <Command>
            <CommandInput
              placeholder={t("tenants.selector.searchPlaceholder")}
            />
            <CommandList>
              <CommandEmpty>{t("tenants.selector.noResults")}</CommandEmpty>
              <CommandGroup>
                {tenants.map((tenant) => (
                  <CommandItem
                    key={tenant.id}
                    value={tenant.name}
                    onSelect={() => handleSelect(tenant.id)}
                    className="flex items-center gap-2"
                  >
                    <TenantAvatar
                      name={tenant.name}
                      slug={tenant.slug}
                      imagePath={tenant.image_path}
                      supabaseUrl={supabaseUrl}
                      size="sm"
                    />
                    <span className="flex-1 truncate">{tenant.name}</span>
                    {role === "SuperAdmin" && tenant.status === "inactive" && (
                      <Badge variant="secondary" className="shrink-0 text-xs">
                        {t("tenants.status.inactive")}
                      </Badge>
                    )}
                    {tenant.id === activeTenantId && (
                      <Check className="h-4 w-4 shrink-0" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <ConfirmSwitchDialog
        open={tenantSwitch.dialogOpen}
        sourceTenantName={tenantSwitch.sourceTenantName}
        targetTenantName={tenantSwitch.targetName}
        hasUnsavedChanges={tenantSwitch.hasUnsavedChanges}
        onCancel={tenantSwitch.onCancel}
        onConfirm={tenantSwitch.onConfirm}
      />
    </>
  );
}
