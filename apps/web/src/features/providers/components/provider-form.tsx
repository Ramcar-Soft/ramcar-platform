"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Button,
  Input,
  Label,
  Textarea,
} from "@ramcar/ui";
import { useTranslations } from "next-intl";
import { ResidentSelect } from "@/shared/components/resident-select/resident-select";
import { VisitPersonStatusSelect } from "@/shared/components/visit-person-status-select";
import { useFormPersistence } from "@/shared/hooks/use-form-persistence";
import type { VisitPersonStatus } from "../types";

interface ProviderFormData {
  fullName: string;
  phone: string;
  company: string;
  status: VisitPersonStatus;
  residentId: string;
  notes: string;
}

interface ProviderFormProps {
  onSave: (data: ProviderFormData) => void;
  onCancel: () => void;
  isSaving: boolean;
}

export function ProviderForm({ onSave, onCancel, isSaving }: ProviderFormProps) {
  const t = useTranslations("visitPersons.form");
  const tCommon = useTranslations("common");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<VisitPersonStatus>("allowed");
  const [residentId, setResidentId] = useState("");
  const [notes, setNotes] = useState("");

  const composedData = useMemo(
    () => ({ fullName, phone, company, status, residentId, notes }),
    [fullName, phone, company, status, residentId, notes],
  );

  const { wasRestored, discardDraft, clearDraft } = useFormPersistence(
    "provider-create",
    composedData,
    {
      onRestore: (draft) => {
        setFullName(draft.fullName ?? "");
        setPhone(draft.phone ?? "");
        setCompany(draft.company ?? "");
        setStatus(draft.status ?? "allowed");
        setResidentId(draft.residentId ?? "");
        setNotes(draft.notes ?? "");
      },
    },
  );

  useEffect(() => {
    if (wasRestored) {
      console.log(tCommon("draftRestored", { time: "" }));
    }
  }, [wasRestored, tCommon, discardDraft]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    clearDraft();
    onSave({ fullName: fullName.trim(), phone, company, status, residentId, notes });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>{t("fullName")}</Label>
        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
      </div>

      <div className="space-y-2">
        <Label>{t("phone")}</Label>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label>{t("company")}</Label>
        <Input value={company} onChange={(e) => setCompany(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label>{t("status")}</Label>
        <VisitPersonStatusSelect value={status} onValueChange={setStatus} />
      </div>

      <div className="space-y-2">
        <Label>{t("residentId")}</Label>
        <ResidentSelect value={residentId} onChange={setResidentId} />
      </div>

      <div className="space-y-2">
        <Label>{t("notes")}</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={isSaving || !fullName.trim()} className="flex-1">
          {isSaving ? t("saving") : t("save")}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
