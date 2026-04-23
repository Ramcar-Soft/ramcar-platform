"use client";

import { useRef, useState } from "react";
import { Button } from "@ramcar/ui";
import { useTranslations } from "next-intl";
import { tenantImageFileSchema } from "@ramcar/shared";
import { toast } from "sonner";

interface TenantImageUploadProps {
  currentImagePath?: string | null;
  onPendingChange: (pending: File | "remove" | "unchanged") => void;
}

export function TenantImageUpload({ currentImagePath, onPendingChange }: TenantImageUploadProps) {
  const t = useTranslations("tenants");
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pendingRemove, setPendingRemove] = useState(false);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const currentUrl = currentImagePath && supabaseUrl
    ? `${supabaseUrl}/storage/v1/object/public/tenant-images/${currentImagePath}`
    : null;

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = tenantImageFileSchema.safeParse({
      name: file.name,
      size: file.size,
      type: file.type,
    });

    if (!result.success) {
      const msg = result.error.errors[0]?.message ?? "Invalid file";
      toast.error(t(msg as Parameters<typeof t>[0]));
      e.target.value = "";
      return;
    }

    const url = URL.createObjectURL(file);
    setPreview(url);
    setPendingRemove(false);
    onPendingChange(file);
  }

  function handleRemove() {
    setPendingRemove(true);
    setPreview(null);
    onPendingChange("remove");
  }

  function handleReplace() {
    inputRef.current?.click();
  }

  const displayUrl = preview ?? (!pendingRemove ? currentUrl : null);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{t("form.image.label")}</p>
      {displayUrl ? (
        <div className="flex items-center gap-3">
          <img
            src={displayUrl}
            alt="tenant logo"
            className="h-16 w-16 rounded-md object-cover border"
          />
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleReplace}>
              {t("form.image.replace")}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={handleRemove}>
              {t("form.image.remove")}
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          {t("form.image.upload")}
        </Button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}
