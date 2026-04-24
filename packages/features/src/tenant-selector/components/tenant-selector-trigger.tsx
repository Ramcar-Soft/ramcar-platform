import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { ChevronsUpDown } from "lucide-react";
import { Button, TenantAvatar } from "@ramcar/ui";
import { useAuthStore } from "../../adapters/tenant-selector-adapters";

interface TenantSelectorTriggerProps extends ComponentPropsWithoutRef<"button"> {
  supabaseUrl?: string;
  activeTenant?: { slug: string; imagePath?: string | null } | null;
}

export const TenantSelectorTrigger = forwardRef<HTMLButtonElement, TenantSelectorTriggerProps>(
  function TenantSelectorTrigger({ supabaseUrl = "", activeTenant, ...rest }, ref) {
    const { activeTenantName } = useAuthStore();

    return (
      <Button
        ref={ref}
        variant="ghost"
        role="combobox"
        {...rest}
        className="flex h-8 items-center gap-2 px-2 text-sm font-medium"
      >
        {activeTenant && (
          <TenantAvatar
            name={activeTenantName}
            slug={activeTenant.slug}
            imagePath={activeTenant.imagePath}
            supabaseUrl={supabaseUrl}
            size="sm"
          />
        )}
        <span className="max-w-[120px] truncate">{activeTenantName}</span>
        <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-50" />
      </Button>
    );
  },
);
