"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Button,
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ramcar/ui";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ResidentSelect } from "@/shared/components/resident-select/resident-select";
import { useFormPersistence } from "@/shared/hooks/use-form-persistence";
import type { VisitPersonStatus } from "../types";

interface VisitPersonFormData {
  fullName: string;
  status: VisitPersonStatus;
  residentId: string;
  notes: string;
}

interface VisitPersonFormProps {
  onSave: (data: VisitPersonFormData) => void;
  onCancel: () => void;
  isSaving: boolean;
}

export function VisitPersonForm({ onSave, onCancel, isSaving }: VisitPersonFormProps) {
  const t = useTranslations("visitPersons.form");
  const tStatus = useTranslations("visitPersons.status");
  const tCommon = useTranslations("common");

  const [fullName, setFullName] = useState("");
  const [status, setStatus] = useState<VisitPersonStatus>("allowed");
  const [residentId, setResidentId] = useState("");
  const [notes, setNotes] = useState("");

  const composedData = useMemo(
    () => ({ fullName, status, residentId, notes }),
    [fullName, status, residentId, notes],
  );

  const { wasRestored, discardDraft, clearDraft } = useFormPersistence(
    "visit-person-create",
    composedData,
    {
      onRestore: (draft) => {
        setFullName(draft.fullName ?? "");
        setStatus(draft.status ?? "allowed");
        setResidentId(draft.residentId ?? "");
        setNotes(draft.notes ?? "");
      },
    },
  );

  useEffect(() => {
    if (wasRestored) {
      toast.info(tCommon("draftRestored", { time: "" }), {
        action: { label: tCommon("discardDraft"), onClick: () => discardDraft() },
      });
    }
  }, [wasRestored, tCommon, discardDraft]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    clearDraft();
    onSave({ fullName: fullName.trim(), status, residentId, notes });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>{t("fullName")}</Label>
        <Input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder={t("fullName")}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>{t("status")}</Label>
        <Select value={status} onValueChange={(v) => setStatus(v as VisitPersonStatus)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="allowed">{tStatus("allowed")}</SelectItem>
            <SelectItem value="flagged">{tStatus("flagged")}</SelectItem>
            <SelectItem value="denied">{tStatus("denied")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>{t("residentId")}</Label>
        <ResidentSelect value={residentId} onChange={setResidentId} />
      </div>

      <div className="space-y-2">
        <Label>{t("notes")}</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={isSaving || !fullName.trim()} className="flex-1">
          {isSaving ? t("saving") : t("save")}
        </Button>
        <Button type="button" className="flex-1" variant="outline" onClick={onCancel} disabled={isSaving}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
