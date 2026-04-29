"use client";

import { useCallback, useState } from "react";
import { VisitorsView } from "@ramcar/features/visitors";
import { useFormPersistence } from "@/shared/hooks/use-form-persistence";
import type { VisitPersonStatus } from "@ramcar/features/visitors";

interface VisitorFormDraft {
  fullName: string;
  phone: string;
  status: VisitPersonStatus;
  residentId: string;
  notes: string;
  [key: string]: unknown;
}

const DEFAULT_DRAFT: VisitorFormDraft = {
  fullName: "",
  phone: "",
  status: "flagged",
  residentId: "",
  notes: "",
};

function VisitorsPageClient() {
  const [draft, setDraft] = useState<VisitorFormDraft>(DEFAULT_DRAFT);

  useFormPersistence("visit-person-create", draft, {
    onRestore: (restored) => {
      setDraft({
        fullName: (restored.fullName as string) ?? "",
        phone: (restored.phone as string) ?? "",
        status: (restored.status as VisitPersonStatus) ?? "flagged",
        residentId: (restored.residentId as string) ?? "",
        notes: (restored.notes as string) ?? "",
      });
    },
  });

  const handleDraftChange = useCallback(
    (d: {
      fullName: string;
      phone: string;
      status: VisitPersonStatus;
      residentId: string;
      notes: string;
    }) => setDraft({ ...d }),
    [],
  );

  return (
    <VisitorsView
      initialDraft={draft}
      onDraftChange={handleDraftChange}
    />
  );
}

export default function VisitorsPage() {
  return <VisitorsPageClient />;
}
