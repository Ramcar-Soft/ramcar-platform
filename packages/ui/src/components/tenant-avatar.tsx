import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { cn } from "../lib/utils";

function hashToHsl(slug: string): string {
  let hash = 2166136261;
  for (const ch of slug.toLowerCase()) {
    hash ^= ch.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 45%)`;
}

function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const letters = trimmed.match(/\p{L}/gu) ?? [];
  if (letters.length === 0) return "?";
  if (letters.length === 1) return letters[0]!.toUpperCase();
  return (letters[0]! + letters[1]!).toUpperCase();
}

const sizeClasses = {
  sm: "h-6 w-6 text-xs",
  md: "h-8 w-8 text-sm",
  lg: "h-10 w-10 text-base",
} as const;

interface TenantAvatarProps {
  name: string;
  slug: string;
  imagePath?: string | null;
  supabaseUrl?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function TenantAvatar({
  name,
  slug,
  imagePath,
  supabaseUrl = "",
  size = "md",
  className,
}: TenantAvatarProps) {
  const publicUrl = imagePath && supabaseUrl
    ? `${supabaseUrl}/storage/v1/object/public/tenant-images/${imagePath}`
    : undefined;

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {publicUrl && (
        <AvatarImage
          src={publicUrl}
          alt={name}
          style={{ objectFit: "cover" }}
        />
      )}
      <AvatarFallback
        style={{ backgroundColor: hashToHsl(slug) }}
        className="text-white font-medium"
      >
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
