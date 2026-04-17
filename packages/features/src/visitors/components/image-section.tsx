import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@ramcar/ui";
import { toast } from "sonner";
import type { ImageType, VisitPersonImage } from "@ramcar/shared";
import { useI18n } from "../../adapters/i18n";
import { ImageGrid } from "../../shared/image-capture";
import { ImageUpload, type ImageUploadHandle } from "../../shared/image-capture";

const IMAGE_TYPES: ImageType[] = ["face", "id_card", "vehicle_plate", "other"];

export type StagedImage = { file: File; previewUrl: string };

interface ImageSectionProps {
  mode?: "create" | "edit" | "view";
  visitPersonId?: string;
  images?: VisitPersonImage[];
  isLoading: boolean;
  onUpload?: (params: { visitPersonId: string; file: File; imageType: ImageType }) => void;
  isUploading: boolean;
  stagedImages?: Map<ImageType, StagedImage>;
  onStageImage?: (imageType: ImageType, file: File) => void;
}

function stagedToImages(staged: Map<ImageType, StagedImage>): VisitPersonImage[] {
  const nowIso = new Date().toISOString();
  return Array.from(staged.entries()).map(([imageType, { previewUrl }]) => ({
    id: `staged-${imageType}`,
    tenantId: "",
    visitPersonId: "",
    imageType,
    storagePath: "",
    signedUrl: previewUrl,
    createdAt: nowIso,
  }));
}

export function ImageSection({
  mode = "edit",
  visitPersonId,
  images,
  isLoading,
  onUpload,
  isUploading,
  stagedImages,
  onStageImage,
}: ImageSectionProps) {
  const { t } = useI18n();
  const [selectedType, setSelectedType] = useState<ImageType>("face");
  const uploadRef = useRef<ImageUploadHandle>(null);

  const isCreateMode = mode === "create";
  const gridImages = isCreateMode
    ? stagedImages
      ? stagedToImages(stagedImages)
      : []
    : (images ?? []);

  const handleUpload = (file: File, imageType: ImageType) => {
    if (isCreateMode) {
      onStageImage?.(imageType, file);
      return;
    }
    if (!visitPersonId || !onUpload) return;
    onUpload({ visitPersonId, file, imageType });
    toast.info(t("images.uploadStarted"));
  };

  const handleReplace = (imageType: ImageType) => {
    flushSync(() => {
      setSelectedType(imageType);
    });
    uploadRef.current?.openFilePicker();
  };

  if (isLoading) {
    return <Skeleton className="h-20 w-full" />;
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <h4 className="text-sm font-semibold">{t("images.title")}</h4>
        <p className="text-xs text-muted-foreground">{t("images.selectTypeHint")}</p>
      </div>

      {gridImages.length > 0 && (
        <ImageGrid images={gridImages} onReplace={handleReplace} />
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
                  {t(`images.types.${type}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <ImageUpload
          ref={uploadRef}
          imageType={selectedType}
          onUpload={handleUpload}
          isUploading={isUploading}
        />
      </div>
    </div>
  );
}
