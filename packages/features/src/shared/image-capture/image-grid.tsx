import { useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogClose,
  DialogTitle,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@ramcar/ui";
import { RefreshCw, X } from "lucide-react";
import type { VisitPersonImage, ImageType } from "@ramcar/shared";
import { useI18n } from "../../adapters";

interface ImageGridProps {
  images: VisitPersonImage[];
  onReplace?: (imageType: ImageType) => void;
}

export function ImageGrid({ images, onReplace }: ImageGridProps) {
  const { t } = useI18n();
  const [activeImage, setActiveImage] = useState<VisitPersonImage | null>(null);

  if (images.length === 0) return null;

  const activeTypeLabel = activeImage
    ? t(`images.types.${activeImage.imageType}`)
    : "";

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {images.map((img) => {
          const typeLabel = t(`images.types.${img.imageType}`);
          const canView = Boolean(img.signedUrl);
          return (
            <div
              key={img.id}
              className="relative group aspect-square w-full max-w-[400px] mx-auto rounded-md overflow-hidden border"
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

              {canView && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label={t("images.viewFullImageAria", {
                        type: typeLabel,
                      })}
                      onClick={() => setActiveImage(img)}
                      className="absolute inset-0 w-full h-full cursor-zoom-in focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 outline-none"
                    />
                  </TooltipTrigger>
                  <TooltipContent>{t("images.viewFullImage")}</TooltipContent>
                </Tooltip>
              )}

              <div className="absolute bottom-0 inset-x-0 z-10 bg-black/60 text-white text-xs px-2 py-1 flex items-center justify-between gap-2">
                <span className="truncate">{typeLabel}</span>
                {onReplace && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={t("images.replaceAria", { type: typeLabel })}
                    className="h-auto font-semibold text-white hover:text-white bg-white/15 hover:bg-white/25 backdrop-blur-sm px-2 py-0.5 rounded text-xs gap-1 focus-visible:ring-2 focus-visible:ring-white/70 outline-none"
                    onClick={(e) => {
                      e.stopPropagation();
                      onReplace(img.imageType);
                    }}
                  >
                    <RefreshCw className="h-3 w-3" />
                    {t("images.replace")}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog
        open={!!activeImage}
        onOpenChange={(open) => {
          if (!open) setActiveImage(null);
        }}
      >
        <DialogContent className="max-w-[95vw] w-[95vw] sm:max-w-[90vw] h-[90vh] p-0 overflow-hidden">
          <DialogTitle className="sr-only">{activeTypeLabel}</DialogTitle>
          {activeImage?.signedUrl && (
            <img
              src={activeImage.signedUrl}
              alt={activeTypeLabel}
              className="w-full h-full object-contain bg-black"
            />
          )}
          <DialogClose
            aria-label={t("images.closeDialog")}
            className="absolute right-3 top-3 rounded-full bg-black/60 text-white p-2 hover:bg-black/80 focus-visible:ring-2 focus-visible:ring-white/70 outline-none"
          >
            <X className="h-4 w-4" />
          </DialogClose>
        </DialogContent>
      </Dialog>
    </>
  );
}
