import { useState, useMemo, useEffect, useRef } from "react";
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
import { normalizePhone, phoneOptionalSchema } from "@ramcar/shared";
import type { UpdateVisitPersonInput } from "@ramcar/shared";
import { useI18n, useRole } from "../../adapters";
import { ResidentSelect } from "../../shared/resident-select";
import { VisitPersonStatusSelect } from "../../shared/visit-person-status-select";
import type { VisitPerson, VisitPersonStatus } from "../types";

interface VisitPersonEditFormProps {
  person: VisitPerson;
  onSave: (patch: UpdateVisitPersonInput) => void;
  onCancel: () => void;
  isSaving: boolean;
  initialDraft?: EditFormState;
  onDraftChange?: (draft: EditFormState) => void;
}

interface EditFormState {
  fullName: string;
  phone: string;
  status: VisitPersonStatus;
  residentId: string;
  notes: string;
  [key: string]: unknown;
}

function initialFromPerson(person: VisitPerson): EditFormState {
  return {
    fullName: person.fullName,
    phone: person.phone ?? "",
    status: person.status,
    residentId: person.residentId ?? "",
    notes: person.notes ?? "",
  };
}

function hasChanges(initial: EditFormState, current: EditFormState): boolean {
  return (
    initial.fullName !== current.fullName ||
    initial.phone !== current.phone ||
    initial.status !== current.status ||
    initial.residentId !== current.residentId ||
    initial.notes !== current.notes
  );
}

export function VisitPersonEditForm({
  person,
  onSave,
  onCancel,
  isSaving,
  initialDraft,
  onDraftChange,
}: VisitPersonEditFormProps) {
  const { t } = useI18n();
  const { role } = useRole();

  const initial = useMemo(() => initialFromPerson(person), [person]);
  const [state, setState] = useState<EditFormState>(initialDraft ?? initial);
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

  const onDraftChangeRef = useRef(onDraftChange);
  onDraftChangeRef.current = onDraftChange;

  useEffect(() => {
    onDraftChangeRef.current?.(composedData);
  }, [composedData]);

  const dirty = hasChanges(initial, state);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.fullName.trim()) return;
    const normalizedPhone = state.phone.trim() ? normalizePhone(state.phone) : "";
    if (state.phone.trim() && normalizedPhone === null) {
      setPhoneError("forms.phoneInvalid");
      return;
    }
    onSave({
      fullName: state.fullName.trim(),
      phone: normalizedPhone ?? "",
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
    setConfirmDiscardOpen(false);
    onCancel();
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>{t("visitPersons.form.fullName")}</Label>
          <Input
            value={state.fullName}
            onChange={(e) => setState((s) => ({ ...s, fullName: e.target.value }))}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="visit-person-edit-phone">{t("visitPersons.form.phone")}</Label>
          <Input
            id="visit-person-edit-phone"
            value={state.phone}
            onChange={(e) => setState((s) => ({ ...s, phone: e.target.value }))}
            onBlur={handlePhoneBlur}
            placeholder="(555) 123-4567"
            aria-invalid={!!phoneError}
          />
          {phoneError ? (
            <p className="text-sm text-destructive">{t(phoneError)}</p>
          ) : (
            <p className="text-xs text-muted-foreground">{t("forms.phoneHelp")}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>{t("visitPersons.form.status")}</Label>
          <VisitPersonStatusSelect
            value={state.status}
            onValueChange={(v) => setState((s) => ({ ...s, status: v }))}
            disabled={role === "Guard"}
          />
        </div>

        <div className="space-y-2">
          <Label>{t("visitPersons.form.residentId")}</Label>
          <ResidentSelect
            value={state.residentId}
            onChange={(v) => setState((s) => ({ ...s, residentId: v }))}
          />
        </div>

        <div className="space-y-2">
          <Label>{t("visitPersons.form.notes")}</Label>
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
            {isSaving ? t("visitPersons.edit.saving") : t("visitPersons.edit.save")}
          </Button>
          <Button
            type="button"
            className="flex-1"
            variant="outline"
            onClick={handleCancel}
            disabled={isSaving}
          >
            {t("visitPersons.form.cancel")}
          </Button>
        </div>
      </form>

      <Dialog open={confirmDiscardOpen} onOpenChange={setConfirmDiscardOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("visitPersons.edit.discardConfirmTitle")}</DialogTitle>
            <DialogDescription>{t("visitPersons.edit.discardConfirmBody")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDiscardOpen(false)}>
              {t("visitPersons.edit.keepEditing")}
            </Button>
            <Button variant="destructive" onClick={handleConfirmDiscard}>
              {t("visitPersons.edit.discard")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
