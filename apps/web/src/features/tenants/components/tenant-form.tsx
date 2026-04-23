"use client";

import { useState } from "react";
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ramcar/ui";
import { useTranslations } from "next-intl";
import { useAppStore } from "@ramcar/store";
import { createTenantSchema, updateTenantSchema } from "@ramcar/shared";
import { TenantImageUpload } from "./tenant-image-upload";
import type { Tenant, TenantStatus } from "../types";

interface TenantFormData {
  name: string;
  address: string;
  status: TenantStatus;
}

interface TenantFormErrors {
  name?: string;
  address?: string;
  status?: string;
}

interface TenantFormProps {
  mode: "create" | "edit";
  initialValues?: Partial<Tenant>;
  onSubmit: (values: TenantFormData, pendingImage: File | "remove" | "unchanged") => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function TenantForm({ mode, initialValues, onSubmit, onCancel, isSubmitting }: TenantFormProps) {
  const t = useTranslations("tenants");
  const user = useAppStore((s) => s.user);
  const isSuperAdmin = user?.role === "super_admin";

  const [formData, setFormData] = useState<TenantFormData>({
    name: initialValues?.name ?? "",
    address: initialValues?.address ?? "",
    status: initialValues?.status ?? "active",
  });
  const [errors, setErrors] = useState<TenantFormErrors>({});
  const [pendingImage, setPendingImage] = useState<File | "remove" | "unchanged">("unchanged");

  function handleChange(field: keyof TenantFormData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const schema = mode === "create" ? createTenantSchema : updateTenantSchema;
    const result = schema.safeParse(formData);

    if (!result.success) {
      const newErrors: TenantFormErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof TenantFormErrors;
        if (field) newErrors[field] = t(issue.message as Parameters<typeof t>[0]);
      }
      setErrors(newErrors);
      return;
    }

    await onSubmit(formData, pendingImage);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="tenant-name">{t("form.name")}</Label>
        <Input
          id="tenant-name"
          value={formData.name}
          onChange={(e) => handleChange("name", e.target.value)}
          aria-invalid={!!errors.name}
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="tenant-address">{t("form.address")}</Label>
        <Input
          id="tenant-address"
          value={formData.address}
          onChange={(e) => handleChange("address", e.target.value)}
          aria-invalid={!!errors.address}
        />
        {errors.address && <p className="text-sm text-destructive">{errors.address}</p>}
      </div>

      {isSuperAdmin && (
        <div className="space-y-1">
          <Label htmlFor="tenant-status">{t("form.statusLabel")}</Label>
          <Select
            value={formData.status}
            onValueChange={(val) => handleChange("status", val)}
          >
            <SelectTrigger id="tenant-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">{t("status.active")}</SelectItem>
              <SelectItem value="inactive">{t("status.inactive")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <TenantImageUpload
        currentImagePath={initialValues?.image_path}
        onPendingChange={setPendingImage}
      />

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "…" : t("form.submit")}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("form.cancel")}
        </Button>
      </div>
    </form>
  );
}
