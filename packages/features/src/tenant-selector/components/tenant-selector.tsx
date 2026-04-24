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

interface TenantSelectorProps {
  supabaseUrl?: string;
}

export function TenantSelector({ supabaseUrl = "" }: TenantSelectorProps) {
  const { tenantIds, activeTenantId, activeTenantName, setActiveTenant } = useAuthStore();
  const { t } = useI18n();
  const { role } = useRole();
  const { data: tenants = [] } = useTenantList();
  const [open, setOpen] = useState(false);
  const tenantSwitch = useTenantSwitch();

  // Sync activeTenantName from the fetched tenant list when it's empty or stale.
  // This covers the first-load case where hydrateActiveTenant picked an id but
  // had no name in localStorage yet.
  useEffect(() => {
    if (!activeTenantId || tenants.length === 0) return;
    const match = tenants.find((tenant) => tenant.id === activeTenantId);
    if (match && match.name !== activeTenantName) {
      setActiveTenant(activeTenantId, match.name);
    }
  }, [activeTenantId, activeTenantName, tenants, setActiveTenant]);

  const activeTenant = tenants.find((t) => t.id === activeTenantId) ?? null;

  // Single-tenant: render a static display (no dropdown) per FR-004
  if (tenantIds.length <= 1) {
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
