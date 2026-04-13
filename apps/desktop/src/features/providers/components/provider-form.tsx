import { useState } from "react";
import { Button, Input, Label, Textarea } from "@ramcar/ui";
import { useTranslation } from "react-i18next";
import { VisitPersonStatusSelect } from "../../../shared/components/visit-person-status-select";
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
  const { t } = useTranslation();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<VisitPersonStatus>("allowed");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    onSave({ fullName: fullName.trim(), phone, company, status, residentId: "", notes });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>{t("visitPersons.form.fullName")}</Label>
        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label>{t("visitPersons.form.phone")}</Label>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>{t("visitPersons.form.company")}</Label>
        <Input value={company} onChange={(e) => setCompany(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>{t("visitPersons.form.status")}</Label>
        <VisitPersonStatusSelect value={status} onValueChange={setStatus} />
      </div>
      <div className="space-y-2">
        <Label>{t("visitPersons.form.notes")}</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={isSaving || !fullName.trim()} className="flex-1">
          {isSaving ? t("visitPersons.form.saving") : t("visitPersons.form.save")}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving} className="flex-1">
          {t("visitPersons.form.cancel")}
        </Button>
      </div>
    </form>
  );
}
