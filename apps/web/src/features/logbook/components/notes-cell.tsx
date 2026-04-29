"use client";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@ramcar/ui";

const TRUNCATE_AT = 40;

export function NotesCell({ notes }: { notes: string | null }) {
  if (!notes) return <span className="text-muted-foreground">—</span>;
  const truncated = notes.length > TRUNCATE_AT;
  const display = truncated ? `${notes.slice(0, TRUNCATE_AT)}…` : notes;

  if (!truncated) return <span className="text-sm">{display}</span>;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-sm cursor-help">{display}</span>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm whitespace-pre-wrap">{notes}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
