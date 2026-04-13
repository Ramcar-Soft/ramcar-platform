"use client";

import { Button } from "@ramcar/ui";
import { useTranslations } from "next-intl";
import type { VisitPersonImage, ImageType } from "@ramcar/shared";

interface ImageGridProps {
  images: VisitPersonImage[];
  onReplace?: (imageType: ImageType) => void;
}

export function ImageGrid({ images, onReplace }: ImageGridProps) {
  const t = useTranslations("images");

  if (images.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-2">
      {images.map((img) => (
        <div key={img.id} className="relative group rounded-md overflow-hidden border">
          {img.signedUrl ? (
            <img
              src={img.signedUrl}
              alt={t(`types.${img.imageType}`)}
              className="w-full h-24 object-cover"
            />
          ) : (
            <div className="w-full h-24 bg-muted flex items-center justify-center text-xs text-muted-foreground">
              {t(`types.${img.imageType}`)}
            </div>
          )}
          <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-xs px-1 py-0.5 flex items-center justify-between">
            <span>{t(`types.${img.imageType}`)}</span>
            {onReplace && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-white hover:text-white/80 text-xs"
                onClick={() => onReplace(img.imageType)}
              >
                {t("replace")}
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
