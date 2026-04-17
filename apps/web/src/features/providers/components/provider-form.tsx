"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  Button,
  Input,
  Label,
  Separator,
  Textarea,
} from "@ramcar/ui";
import { useTranslations } from "next-intl";
import type { ImageType } from "@ramcar/shared";
import { ResidentSelect } from "@/shared/components/resident-select/resident-select";
import { VisitPersonStatusSelect } from "@/shared/components/visit-person-status-select";
import { useFormPersistence } from "@/shared/hooks/use-form-persistence";
import { ImageSection, type StagedImage } from "@/features/visitors/components/image-section";
import type { VisitPersonStatus } from "../types";

interface ProviderFormData {
  fullName: string;
  phone: string;
  company: string;
  status: VisitPersonStatus;
  residentId: string;
  notes: string;
  stagedImages: Map<ImageType, File>;
}

interface ProviderFormProps {
  onSave: (data: ProviderFormData) => void;
  onCancel: () => void;
  isSaving: boolean;
  isUploadingStagedImages?: boolean;
}

export function ProviderForm({
  onSave,
  onCancel,
  isSaving,
  isUploadingStagedImages,
}: ProviderFormProps) {
  const t = useTranslations("visitPersons.form");
  const tCommon = useTranslations("common");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<VisitPersonStatus>("allowed");
  const [residentId, setResidentId] = useState("");
  const [notes, setNotes] = useState("");
  const [stagedImages, setStagedImages] = useState<Map<ImageType, StagedImage>>(
    () => new Map(),
  );
  const stagedImagesRef = useRef(stagedImages);
  stagedImagesRef.current = stagedImages;

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
    clearDraft();
    const filesByType = new Map<ImageType, File>();
    stagedImages.forEach(({ file }, type) => filesByType.set(type, file));
    onSave({
      fullName: fullName.trim(),
      phone,
      company,
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
          {submitting ? t("saving") : t("save")}
        </Button>
        <Button
          type="button"
          className="flex-1"
          variant="outline"
          onClick={handleCancel}
          disabled={submitting}
        >
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
