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
import type { UpdateVisitPersonInput } from "@ramcar/shared";
import { ResidentSelect } from "@/shared/components/resident-select/resident-select";
import { useFormPersistence } from "@/shared/hooks/use-form-persistence";
import type { VisitPerson, VisitPersonStatus } from "../types";
import { VisitPersonStatusSelect } from "@/shared/components/visit-person-status-select";

interface VisitPersonEditFormProps {
  person: VisitPerson;
  onSave: (patch: UpdateVisitPersonInput) => void;
  onCancel: () => void;
  isSaving: boolean;
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
}: VisitPersonEditFormProps) {
  const t = useTranslations("visitPersons.form");
  const tEdit = useTranslations("visitPersons.edit");
  const tCommon = useTranslations("common");

  const initial = useMemo(() => initialFromPerson(person), [person]);
  const [state, setState] = useState<EditFormState>(initial);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);

  const composedData = useMemo(() => state, [state]);

  const { wasRestored, discardDraft, clearDraft } = useFormPersistence<EditFormState>(
    `visit-person-edit-${person.id}`,
    composedData,
    {
      onRestore: (draft) => {
        setState({
          fullName: draft.fullName ?? initial.fullName,
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
    clearDraft();
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
