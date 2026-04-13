import { useState } from "react";
import {
  Button, Input, Label, Textarea,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@ramcar/ui";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();

  const [fullName, setFullName] = useState("");
  const [status, setStatus] = useState<VisitPersonStatus>("allowed");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    onSave({ fullName: fullName.trim(), status, residentId: "", notes });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>{t("visitPersons.form.fullName")}</Label>
        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
      </div>

      <div className="space-y-2">
        <Label>{t("visitPersons.form.status")}</Label>
        <Select value={status} onValueChange={(v) => setStatus(v as VisitPersonStatus)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="allowed">{t("visitPersons.status.allowed")}</SelectItem>
            <SelectItem value="flagged">{t("visitPersons.status.flagged")}</SelectItem>
            <SelectItem value="denied">{t("visitPersons.status.denied")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>{t("visitPersons.form.notes")}</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={isSaving || !fullName.trim()} className="flex-1">
          {isSaving ? t("visitPersons.form.saving") : t("visitPersons.form.save")}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
          {t("visitPersons.form.cancel")}
        </Button>
      </div>
    </form>
  );
}
