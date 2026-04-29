import { cn } from "@ramcar/ui";
import { getBrandLogoUrl } from "./get-brand-logo-url";

export type VehicleBrandLogoSize = "sm" | "md";

export interface VehicleBrandLogoProps {
  brand: string | null | undefined;
  size?: VehicleBrandLogoSize;
  className?: string;
}

export function VehicleBrandLogo({ brand, size = "sm", className }: VehicleBrandLogoProps) {
  const url = getBrandLogoUrl(brand);
  const dim = size === "md" ? "w-10 h-10" : "w-8 h-8";
  const tile = "flex-none rounded bg-white dark:bg-zinc-100 inline-flex items-center justify-center";

  if (url) {
    return (
      <span aria-hidden="true" className={cn(tile, dim, className)}>
        <img src={url} alt="" className={cn(dim, "object-contain")} />
      </span>
    );
  }

  return <span role="presentation" aria-hidden="true" className={cn(tile, dim, "bg-muted/40", className)} />;
}
