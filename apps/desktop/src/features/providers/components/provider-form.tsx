import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Input, Label, Separator, Textarea } from "@ramcar/ui";
import { useTranslation } from "react-i18next";
import { normalizePhone, phoneOptionalSchema } from "@ramcar/shared";
import type { ImageType } from "@ramcar/shared";
import { useRole } from "@ramcar/features/adapters";
import { VisitPersonStatusSelect } from "@ramcar/features/shared/visit-person-status-select";
import { InlineVehicleSection } from "@ramcar/features/shared/vehicle-form";
import type { InlineVehicleEntry, InlineVehicleEntryFields } from "@ramcar/features/shared/vehicle-form";
import { ImageSection, type StagedImage } from "@ramcar/features/visitors";
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
  inlineVehicleEntries?: InlineVehicleEntry[];
  onAddInlineVehicle?: () => void;
  onRemoveInlineVehicle?: (clientId: string) => void;
  onUpdateInlineVehicle?: (clientId: string, patch: Partial<InlineVehicleEntryFields>) => void;
}

export function ProviderForm({
  onSave,
  onCancel,
  isSaving,
  isUploadingStagedImages,
  inlineVehicleEntries,
  onAddInlineVehicle,
  onRemoveInlineVehicle,
  onUpdateInlineVehicle,
}: ProviderFormProps) {
  const { t } = useTranslation();
  const { role } = useRole();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<VisitPersonStatus>("flagged");
  const [notes, setNotes] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const handlePhoneBlur = () => {
    if (!phone.trim()) {
      setPhoneError(null);
      return;
    }
    const parsed = phoneOptionalSchema.safeParse(phone);
    setPhoneError(parsed.success ? null : "forms.phoneInvalid");
  };
  const [stagedImages, setStagedImages] = useState<Map<ImageType, StagedImage>>(
    () => new Map(),
  );
  const stagedImagesRef = useRef(stagedImages);
  stagedImagesRef.current = stagedImages;

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
      company,
      status,
      residentId: "",
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
        <Label htmlFor="desktop-provider-fullName">{t("visitPersons.form.fullName")}</Label>
        <Input
          id="desktop-provider-fullName"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="desktop-provider-phone">{t("visitPersons.form.phone")}</Label>
        <Input
          id="desktop-provider-phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onBlur={handlePhoneBlur}
          placeholder={t("forms.phonePlaceholder")}
          aria-invalid={!!phoneError}
        />
        {phoneError ? (
          <p className="text-sm text-destructive">{t("forms.phoneInvalid")}</p>
        ) : (
          <p className="text-xs text-muted-foreground">{t("forms.phoneHelp")}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label>{t("visitPersons.form.company")}</Label>
        <Input value={company} onChange={(e) => setCompany(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>{t("visitPersons.form.status")}</Label>
        <VisitPersonStatusSelect
          value={status}
          onValueChange={setStatus}
          disabled={role === "Guard"}
        />
      </div>
      <div className="space-y-2">
        <Label>{t("visitPersons.form.notes")}</Label>
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

      {onAddInlineVehicle && (
        <InlineVehicleSection
          ownerKind="visitPerson"
          entries={inlineVehicleEntries ?? []}
          onAddEntry={onAddInlineVehicle}
          onRemoveEntry={onRemoveInlineVehicle ?? (() => {})}
          onUpdateEntry={onUpdateInlineVehicle ?? (() => {})}
          disabled={submitting}
        />
      )}

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={submitting || !fullName.trim()} className="flex-1">
          {submitting ? t("visitPersons.form.saving") : t("visitPersons.form.save")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={submitting}
          className="flex-1"
        >
          {t("visitPersons.form.cancel")}
        </Button>
      </div>
    </form>
  );
}
