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
import type { UpdateVisitPersonInput } from "@ramcar/shared";
import { useI18n } from "../../adapters/i18n";
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
  status: VisitPersonStatus;
  residentId: string;
  notes: string;
  [key: string]: unknown;
}

function initialFromPerson(person: VisitPerson): EditFormState {
  return {
    fullName: person.fullName,
    status: person.status,
    residentId: person.residentId ?? "",
    notes: person.notes ?? "",
  };
}

function hasChanges(initial: EditFormState, current: EditFormState): boolean {
  return (
    initial.fullName !== current.fullName ||
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

  const initial = useMemo(() => initialFromPerson(person), [person]);
  const [state, setState] = useState<EditFormState>(initialDraft ?? initial);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);

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
    onSave({
      fullName: state.fullName.trim(),
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
          <Label>{t("visitPersons.form.status")}</Label>
          <VisitPersonStatusSelect
            value={state.status}
            onValueChange={(v) => setState((s) => ({ ...s, status: v }))}
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
