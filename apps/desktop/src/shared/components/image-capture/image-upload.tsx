import { useRef } from "react";
import { Button, Label } from "@ramcar/ui";
import { useTranslation } from "react-i18next";
import type { ImageType } from "@ramcar/shared";

interface ImageUploadProps {
  imageType: ImageType;
  onUpload: (file: File, imageType: ImageType) => void;
  isUploading: boolean;
  label?: string;
}

const ACCEPTED_TYPES = "image/jpeg,image/png";
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export function ImageUpload({ imageType, onUpload, isUploading, label }: ImageUploadProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_SIZE_BYTES) {
      return;
    }

    onUpload(file, imageType);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-1">
      {label && <Label className="text-xs">{label}</Label>}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        onChange={handleFileChange}
        className="hidden"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
      >
        {isUploading ? t("images.uploading") : t("images.upload")}
      </Button>
    </div>
  );
}
