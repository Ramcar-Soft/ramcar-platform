import { useState, useMemo } from "react";
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
import { useTranslation } from "react-i18next";
import type { UpdateVisitPersonInput } from "@ramcar/shared";
import { VisitPersonStatusSelect } from "../../../shared/components/visit-person-status-select";
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
  notes: string;
}

function initialFromPerson(person: VisitPerson): EditFormState {
  return {
    fullName: person.fullName,
    phone: person.phone ?? "",
    company: person.company ?? "",
    status: person.status,
    notes: person.notes ?? "",
  };
}

function hasChanges(initial: EditFormState, current: EditFormState): boolean {
  return (
    initial.fullName !== current.fullName ||
    initial.phone !== current.phone ||
    initial.company !== current.company ||
    initial.status !== current.status ||
    initial.notes !== current.notes
  );
}

export function ProviderEditForm({
  person,
  onSave,
  onCancel,
  isSaving,
}: ProviderEditFormProps) {
  const { t } = useTranslation();

  const initial = useMemo(() => initialFromPerson(person), [person]);
  const [state, setState] = useState<EditFormState>(initial);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);

  const dirty = hasChanges(initial, state);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.fullName.trim()) return;
    onSave({
      fullName: state.fullName.trim(),
      phone: state.phone,
      company: state.company,
      status: state.status,
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
          <Label>{t("visitPersons.form.phone")}</Label>
          <Input
            value={state.phone}
            onChange={(e) => setState((s) => ({ ...s, phone: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label>{t("visitPersons.form.company")}</Label>
          <Input
            value={state.company}
            onChange={(e) => setState((s) => ({ ...s, company: e.target.value }))}
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
