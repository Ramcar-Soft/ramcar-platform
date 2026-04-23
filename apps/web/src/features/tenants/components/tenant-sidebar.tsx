"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@ramcar/ui";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAppStore } from "@ramcar/store";
import { TenantForm } from "./tenant-form";
import { useTenant } from "../hooks/use-tenant";
import { useCreateTenant } from "../hooks/use-create-tenant";
import { useUpdateTenant } from "../hooks/use-update-tenant";
import { useUploadTenantImage } from "../hooks/use-upload-tenant-image";
import { useDeleteTenantImage } from "../hooks/use-delete-tenant-image";
import type { TenantStatus } from "../types";

interface TenantSidebarProps {
  open: boolean;
  mode: "create" | "edit";
  tenantId?: string;
  onClose: () => void;
}

export function TenantSidebar({ open, mode, tenantId, onClose }: TenantSidebarProps) {
  const t = useTranslations("tenants");
  const queryClient = useQueryClient();
  const user = useAppStore((s) => s.user);

  const { data: tenant } = useTenant(tenantId, open, mode);
  const createMutation = useCreateTenant();
  const updateMutation = useUpdateTenant(tenantId ?? "");
  const uploadImageMutation = useUploadTenantImage(tenantId ?? "");
  const deleteImageMutation = useDeleteTenantImage(tenantId ?? "");

  const isSubmitting =
    createMutation.isPending ||
    updateMutation.isPending ||
    uploadImageMutation.isPending ||
    deleteImageMutation.isPending;

  async function handleSubmit(
    values: { name: string; address: string; status: TenantStatus },
    pendingImage: File | "remove" | "unchanged",
  ) {
    try {
      let savedTenantId = tenantId;
      let data = {
        name: values.name,
        address: values.address,
        status: undefined,
      } as {
        name: string;
        address: string;
        status?: "active" | "inactive";
      }
      if (user?.role === "super_admin") {
        data = {
          ...data,
          status: values.status,
        };
      }
      if (mode === "create") {
        const created = await createMutation.mutateAsync(data);
        savedTenantId = created.id;
      } else {
        await updateMutation.mutateAsync(data);
      }

      if (savedTenantId) {
        if (pendingImage instanceof File) {
          await uploadImageMutation.mutateAsync(pendingImage);
        } else if (pendingImage === "remove") {
          await deleteImageMutation.mutateAsync();
        }
      }

      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast.success(t("toast.createSuccess"));
      onClose();
    } catch {
      toast.error(t("toast.loadFailed"));
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-[400px] sm:w-[800px] sm:max-w-[800px] overflow-y-auto px-4"
      >
        <SheetHeader>
          <SheetTitle>
            {mode === "create" ? t("sidebar.createTitle") : t("sidebar.editTitle")}
          </SheetTitle>
          <SheetDescription>{t("sidebar.description")}</SheetDescription>
        </SheetHeader>
        <div className="mt-6">
          <TenantForm
            mode={mode}
            initialValues={mode === "edit" ? tenant : undefined}
            onSubmit={handleSubmit}
            onCancel={onClose}
            isSubmitting={isSubmitting}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
