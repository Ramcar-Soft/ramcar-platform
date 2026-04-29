import { Badge } from "@ramcar/ui";

interface PlatesCellProps {
  plates?: string[];
}

export function PlatesCell({ plates }: PlatesCellProps) {
  if (!plates || plates.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  const [first, ...rest] = plates;
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-xs">{first}</span>
      {rest.length > 0 && (
        <Badge variant="secondary" className="h-5 px-1.5 text-xs font-normal">
          +{rest.length}
        </Badge>
      )}
    </div>
  );
}
