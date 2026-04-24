"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Button,
  Input,
  Label,
  Textarea,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@ramcar/ui";
import { useTranslations } from "next-intl";
import { normalizePhone, phoneOptionalSchema } from "@ramcar/shared";
import type { UpdateVisitPersonInput } from "@ramcar/shared";
import { ResidentSelect } from "@ramcar/features/shared/resident-select";
import { VisitPersonStatusSelect } from "@ramcar/features/shared/visit-person-status-select";
import { useFormPersistence } from "@/shared/hooks/use-form-persistence";
import type { VisitPerson, VisitPersonStatus } from "../types";

interface ProviderEditFormProps {
  person: VisitPerson;
  onSave: (patch: UpdateVisitPersonInput) => void;
  onCancel: () => void;
  isSaving: boolean;
}

interface EditFormState {
  fullName: string;
  phone: string;
  company: string;
  status: VisitPersonStatus;
  residentId: string;
  notes: string;
  [key: string]: unknown;
}

function initialFromPerson(person: VisitPerson): EditFormState {
  return {
    fullName: person.fullName,
    phone: person.phone ?? "",
    company: person.company ?? "",
    status: person.status,
    residentId: person.residentId ?? "",
    notes: person.notes ?? "",
  };
}

function hasChanges(initial: EditFormState, current: EditFormState): boolean {
  return (
    initial.fullName !== current.fullName ||
    initial.phone !== current.phone ||
    initial.company !== current.company ||
    initial.status !== current.status ||
    initial.residentId !== current.residentId ||
    initial.notes !== current.notes
  );
}

export function ProviderEditForm({
  person,
  onSave,
  onCancel,
  isSaving,
}: ProviderEditFormProps) {
  const t = useTranslations("visitPersons.form");
  const tEdit = useTranslations("visitPersons.edit");
  const tCommon = useTranslations("common");
  const tForms = useTranslations("forms");

  const initial = useMemo(() => initialFromPerson(person), [person]);
  const [state, setState] = useState<EditFormState>(initial);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const handlePhoneBlur = () => {
    if (!state.phone.trim()) {
      setPhoneError(null);
      return;
    }
    const parsed = phoneOptionalSchema.safeParse(state.phone);
    setPhoneError(parsed.success ? null : "forms.phoneInvalid");
  };

  const composedData = useMemo(() => state, [state]);

  const { wasRestored, discardDraft, clearDraft } = useFormPersistence<EditFormState>(
    `provider-edit-${person.id}`,
    composedData,
    {
      onRestore: (draft) => {
        setState({
          fullName: draft.fullName ?? initial.fullName,
          phone: draft.phone ?? initial.phone,
          company: draft.company ?? initial.company,
          status: draft.status ?? initial.status,
          residentId: draft.residentId ?? initial.residentId,
          notes: draft.notes ?? initial.notes,
        });
      },
    },
  );

  useEffect(() => {
    if (wasRestored) {
      console.log(tCommon("draftRestored", { time: "" }));
    }
  }, [wasRestored, tCommon, discardDraft]);

  const dirty = hasChanges(initial, state);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.fullName.trim()) return;
    const normalizedPhone = state.phone.trim() ? normalizePhone(state.phone) : "";
    if (state.phone.trim() && normalizedPhone === null) {
      setPhoneError("forms.phoneInvalid");
      return;
    }
    clearDraft();
    onSave({
      fullName: state.fullName.trim(),
      phone: normalizedPhone ?? "",
      company: state.company,
      status: state.status,
      residentId: state.residentId || null,
      notes: state.notes,
    });
  };

  const handleCancel = () => {
    if (dirty) {
      setConfirmDiscardOpen(true);
      return;
    }
    onCancel();
  };

  const handleConfirmDiscard = () => {
    clearDraft();
    setConfirmDiscardOpen(false);
    onCancel();
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>{t("fullName")}</Label>
          <Input
            value={state.fullName}
            onChange={(e) => setState((s) => ({ ...s, fullName: e.target.value }))}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="provider-edit-phone">{t("phone")}</Label>
          <Input
            id="provider-edit-phone"
            value={state.phone}
            onChange={(e) => setState((s) => ({ ...s, phone: e.target.value }))}
            onBlur={handlePhoneBlur}
            placeholder={tForms("phonePlaceholder")}
            aria-invalid={!!phoneError}
          />
          {phoneError ? (
            <p className="text-sm text-destructive">{tForms("phoneInvalid")}</p>
          ) : (
            <p className="text-xs text-muted-foreground">{tForms("phoneHelp")}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>{t("company")}</Label>
          <Input
            value={state.company}
            onChange={(e) => setState((s) => ({ ...s, company: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label>{t("status")}</Label>
          <VisitPersonStatusSelect
            value={state.status}
            onValueChange={(v) => setState((s) => ({ ...s, status: v }))}
          />
        </div>

        <div className="space-y-2">
          <Label>{t("residentId")}</Label>
          <ResidentSelect
            value={state.residentId}
            onChange={(v) => setState((s) => ({ ...s, residentId: v }))}
          />
        </div>

        <div className="space-y-2">
          <Label>{t("notes")}</Label>
          <Textarea
            value={state.notes}
            onChange={(e) => setState((s) => ({ ...s, notes: e.target.value }))}
            rows={2}
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            type="submit"
            disabled={isSaving || !state.fullName.trim()}
            className="flex-1"
          >
            {isSaving ? tEdit("saving") : tEdit("save")}
          </Button>
          <Button
            type="button"
            className="flex-1"
            variant="outline"
            onClick={handleCancel}
            disabled={isSaving}
          >
            {t("cancel")}
          </Button>
        </div>
      </form>

      <Dialog open={confirmDiscardOpen} onOpenChange={setConfirmDiscardOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tEdit("discardConfirmTitle")}</DialogTitle>
            <DialogDescription>{tEdit("discardConfirmBody")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDiscardOpen(false)}>
              {tEdit("keepEditing")}
            </Button>
            <Button variant="destructive" onClick={handleConfirmDiscard}>
              {tEdit("discard")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
