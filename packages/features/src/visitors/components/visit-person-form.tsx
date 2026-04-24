import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  Button,
  Input,
  Label,
  Separator,
  Textarea,
} from "@ramcar/ui";
import { normalizePhone, phoneOptionalSchema } from "@ramcar/shared";
import type { ImageType } from "@ramcar/shared";
import { useI18n } from "../../adapters/i18n";
import { ResidentSelect } from "../../shared/resident-select";
import { VisitPersonStatusSelect } from "../../shared/visit-person-status-select";
import type { VisitPersonStatus } from "../types";
import { ImageSection, type StagedImage } from "./image-section";

interface VisitPersonFormData {
  fullName: string;
  phone: string;
  status: VisitPersonStatus;
  residentId: string;
  notes: string;
  stagedImages: Map<ImageType, File>;
}

interface VisitPersonFormDraft {
  fullName: string;
  phone: string;
  status: VisitPersonStatus;
  residentId: string;
  notes: string;
}

interface VisitPersonFormProps {
  onSave: (data: VisitPersonFormData) => void;
  onCancel: () => void;
  isSaving: boolean;
  isUploadingStagedImages?: boolean;
  initialDraft?: VisitPersonFormDraft;
  onDraftChange?: (draft: VisitPersonFormDraft) => void;
}

export function VisitPersonForm({
  onSave,
  onCancel,
  isSaving,
  isUploadingStagedImages,
  initialDraft,
  onDraftChange,
}: VisitPersonFormProps) {
  const { t } = useI18n();

  const [fullName, setFullName] = useState(initialDraft?.fullName ?? "");
  const [phone, setPhone] = useState(initialDraft?.phone ?? "");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [status, setStatus] = useState<VisitPersonStatus>(
    initialDraft?.status ?? "allowed",
  );
  const [residentId, setResidentId] = useState(initialDraft?.residentId ?? "");
  const [notes, setNotes] = useState(initialDraft?.notes ?? "");
  const [stagedImages, setStagedImages] = useState<Map<ImageType, StagedImage>>(
    () => new Map(),
  );
  const stagedImagesRef = useRef(stagedImages);
  stagedImagesRef.current = stagedImages;

  const handlePhoneBlur = () => {
    if (!phone.trim()) {
      setPhoneError(null);
      return;
    }
    const parsed = phoneOptionalSchema.safeParse(phone);
    setPhoneError(parsed.success ? null : "forms.phoneInvalid");
  };

  const composedData = useMemo(
    () => ({ fullName, phone, status, residentId, notes }),
    [fullName, phone, status, residentId, notes],
  );

  const onDraftChangeRef = useRef(onDraftChange);
  onDraftChangeRef.current = onDraftChange;

  useEffect(() => {
    onDraftChangeRef.current?.(composedData);
  }, [composedData]);

  const revokeAllPreviews = useCallback(() => {
    stagedImagesRef.current.forEach(({ previewUrl }) =>
      URL.revokeObjectURL(previewUrl),
    );
  }, []);

  useEffect(() => {
    return () => {
      revokeAllPreviews();
    };
  }, [revokeAllPreviews]);

  const handleStageImage = useCallback((imageType: ImageType, file: File) => {
    setStagedImages((prev) => {
      const next = new Map(prev);
      const previous = next.get(imageType);
      if (previous) URL.revokeObjectURL(previous.previewUrl);
      next.set(imageType, { file, previewUrl: URL.createObjectURL(file) });
      return next;
    });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    const normalizedPhone = phone.trim() ? normalizePhone(phone) : "";
    if (phone.trim() && normalizedPhone === null) {
      setPhoneError("forms.phoneInvalid");
      return;
    }
    const filesByType = new Map<ImageType, File>();
    stagedImages.forEach(({ file }, type) => filesByType.set(type, file));
    onSave({
      fullName: fullName.trim(),
      phone: normalizedPhone ?? "",
      status,
      residentId,
      notes,
      stagedImages: filesByType,
    });
  };

  const handleCancel = () => {
    revokeAllPreviews();
    setStagedImages(new Map());
    onCancel();
  };

  const submitting = isSaving || !!isUploadingStagedImages;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>{t("visitPersons.form.fullName")}</Label>
        <Input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder={t("visitPersons.form.fullName")}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="visit-person-phone">{t("visitPersons.form.phone")}</Label>
        <Input
          id="visit-person-phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
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
        <VisitPersonStatusSelect value={status} onValueChange={setStatus} />
      </div>

      <div className="space-y-2">
        <Label>{t("visitPersons.form.residentId")}</Label>
        <ResidentSelect value={residentId} onChange={setResidentId} />
      </div>

      <div className="space-y-2">
        <Label>{t("visitPersons.form.notes")}</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </div>

      <Separator />

      <ImageSection
        mode="create"
        isLoading={false}
        isUploading={!!isUploadingStagedImages}
        stagedImages={stagedImages}
        onStageImage={handleStageImage}
      />

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={submitting || !fullName.trim()} className="flex-1">
          {submitting ? t("visitPersons.form.saving") : t("visitPersons.form.save")}
        </Button>
        <Button
          type="button"
          className="flex-1"
          variant="outline"
          onClick={handleCancel}
          disabled={submitting}
        >
          {t("visitPersons.form.cancel")}
        </Button>
      </div>
    </form>
  );
}
