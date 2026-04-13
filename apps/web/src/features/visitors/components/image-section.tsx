"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@ramcar/ui";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { ImageType, VisitPersonImage } from "@ramcar/shared";
import { ImageGrid } from "@/shared/components/image-capture/image-grid";
import { ImageUpload } from "@/shared/components/image-capture/image-upload";

const IMAGE_TYPES: ImageType[] = ["face", "id_card", "vehicle_plate", "other"];

interface ImageSectionProps {
  visitPersonId: string;
  images: VisitPersonImage[] | undefined;
  isLoading: boolean;
  onUpload: (params: { visitPersonId: string; file: File; imageType: ImageType }) => void;
  isUploading: boolean;
}

export function ImageSection({
  visitPersonId,
  images,
  isLoading,
  onUpload,
  isUploading,
}: ImageSectionProps) {
  const t = useTranslations("images");
  const [selectedType, setSelectedType] = useState<ImageType>("face");

  const handleUpload = (file: File, imageType: ImageType) => {
    onUpload({ visitPersonId, file, imageType });
    toast.info(t("uploadStarted"));
  };

  const handleReplace = (imageType: ImageType) => {
    setSelectedType(imageType);
  };

  if (isLoading) {
    return <Skeleton className="h-20 w-full" />;
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold">{t("title")}</h4>

      {images && images.length > 0 && (
        <ImageGrid images={images} onReplace={handleReplace} />
      )}

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Select value={selectedType} onValueChange={(v) => setSelectedType(v as ImageType)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {IMAGE_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {t(`types.${type}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <ImageUpload
          imageType={selectedType}
          onUpload={handleUpload}
          isUploading={isUploading}
        />
      </div>
    </div>
  );
}
