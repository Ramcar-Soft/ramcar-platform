"use client";

import { Button } from "@ramcar/ui";
import { useTranslations } from "next-intl";
import { RefreshCw } from "lucide-react";
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
      {images.map((img) => {
        const typeLabel = t(`types.${img.imageType}`);
        return (
          <div
            key={img.id}
            className="relative group aspect-square rounded-md overflow-hidden border"
          >
            {img.signedUrl ? (
              <img
                src={img.signedUrl}
                alt={typeLabel}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                {typeLabel}
              </div>
            )}
            <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-xs px-2 py-1 flex items-center justify-between gap-2">
              <span className="truncate">{typeLabel}</span>
              {onReplace && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={t("replaceAria", { type: typeLabel })}
                  className="h-auto font-semibold text-white hover:text-white bg-white/15 hover:bg-white/25 backdrop-blur-sm px-2 py-0.5 rounded text-xs gap-1 focus-visible:ring-2 focus-visible:ring-white/70 outline-none"
                  onClick={() => onReplace(img.imageType)}
                >
                  <RefreshCw className="h-3 w-3" />
                  {t("replace")}
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
