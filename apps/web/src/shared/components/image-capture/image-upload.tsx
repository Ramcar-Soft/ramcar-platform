"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { Button, Label } from "@ramcar/ui";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { ImageType } from "@ramcar/shared";

interface ImageUploadProps {
  imageType: ImageType;
  onUpload: (file: File, imageType: ImageType) => void;
  isUploading: boolean;
  label?: string;
}

export interface ImageUploadHandle {
  openFilePicker: () => void;
}

const ACCEPTED_TYPES = "image/jpeg,image/png";
const ACCEPTED_MIME = ["image/jpeg", "image/png"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

function isValidImageFile(file: File): boolean {
  if (!ACCEPTED_MIME.includes(file.type)) return false;
  if (file.size > MAX_SIZE_BYTES) return false;
  return true;
}

export const ImageUpload = forwardRef<ImageUploadHandle, ImageUploadProps>(
  function ImageUpload({ imageType, onUpload, isUploading, label }, ref) {
    const t = useTranslations("images");
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(
      ref,
      () => ({
        openFilePicker: () => inputRef.current?.click(),
      }),
      [],
    );

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      const input = inputRef.current;
      if (!file) return;

      if (!isValidImageFile(file)) {
        toast.error(t("invalidFile"));
        if (input) input.value = "";
        return;
      }

      onUpload(file, imageType);
      if (input) input.value = "";
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
          {isUploading ? t("uploading") : t("upload")}
        </Button>
      </div>
    );
  },
);
