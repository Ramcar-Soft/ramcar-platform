"use client";

import { useState } from "react";
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@ramcar/ui";
import { useTranslations } from "next-intl";
import { useFormPersistence } from "@/shared/hooks/use-form-persistence";
import { useAppStore } from "@ramcar/store";
import { getAssignableRoles } from "@ramcar/shared";
import type { Role } from "@ramcar/shared";
import type { ExtendedUserProfile, PhoneType, UserGroup } from "../types";

interface UserFormProps {
  mode: "create" | "edit";
  initialData?: ExtendedUserProfile;
  tenants: { id: string; name: string }[];
  userGroups: UserGroup[];
  isPending: boolean;
  onSubmit: (data: UserFormData) => Promise<void>;
  onCancel: () => void;
}

export interface UserFormData {
  fullName: string;
  email: string;
  role: string;
  tenantId: string;
  address: string;
  username: string;
  phone: string;
  password?: string;
  confirmPassword?: string;
  phoneType?: PhoneType;
  userGroupIds: string[];
  observations?: string;
}

const PHONE_TYPES: PhoneType[] = ["house", "cellphone", "work", "primary"];

export function UserForm({
  mode,
  initialData,
  tenants,
  userGroups,
  isPending,
  onSubmit,
  onCancel,
}: UserFormProps) {
  const t = useTranslations("users");
  const currentUser = useAppStore((s) => s.user);
  const actorRole = (currentUser?.role ?? "resident") as Role;
  const assignableRoles = getAssignableRoles(actorRole);

  const isEdit = mode === "edit";

  const [formData, setFormData] = useState<UserFormData>(() => ({
    fullName: initialData?.fullName ?? "",
    email: initialData?.email ?? "",
    role: initialData?.role ?? "",
    tenantId: initialData?.tenantId ?? currentUser?.tenantId ?? "",
    address: initialData?.address ?? "",
    username: initialData?.username ?? "",
    phone: initialData?.phone ?? "",
    password: "",
    confirmPassword: "",
    phoneType: initialData?.phoneType ?? undefined,
    userGroupIds: initialData?.userGroupIds ?? [],
    observations: initialData?.observations ?? "",
  }));

  const [errors, setErrors] = useState<Record<string, string>>({});

  const persistenceKey = isEdit
    ? `user-edit-${initialData?.id}`
    : "user-create";

  const { discardDraft, clearDraft } = useFormPersistence(
    persistenceKey,
    formData as unknown as Record<string, unknown>,
    {
      onRestore: (draft) =>
        setFormData((prev) => ({ ...prev, ...(draft as Partial<UserFormData>) })),
      excludeFields: ["password", "confirmPassword"],
    },
  );

  const updateField = <K extends keyof UserFormData>(
    key: K,
    value: UserFormData[K],
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formData.fullName.trim()) errs.fullName = "Required";
    if (!formData.email.trim()) errs.email = "Required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      errs.email = "Invalid email";
    if (!formData.role) errs.role = "Required";
    if (!formData.tenantId) errs.tenantId = "Required";
    if (!formData.address.trim()) errs.address = "Required";
    if (!formData.username.trim()) errs.username = "Required";
    else if (formData.username.length < 3)
      errs.username = "Min 3 characters";
    else if (!/^[a-zA-Z0-9_]*$/.test(formData.username))
      errs.username = "Only letters, numbers, underscores";
    if (!formData.phone.trim()) errs.phone = "Required";
    if (!isEdit && formData.password && formData.password.length > 0) {
      if (formData.password.length < 8)
        errs.password = "Min 8 characters";
      if (formData.password !== formData.confirmPassword)
        errs.confirmPassword = "Passwords do not match";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const submitData: Partial<UserFormData> = { ...formData };
    if (isEdit || !submitData.password) {
      delete submitData.password;
      delete submitData.confirmPassword;
    }
    if (roleLocked) {
      delete submitData.role;
    }
    try {
      await onSubmit(submitData as UserFormData);
      clearDraft();
    } catch {
      // Submission failed — keep draft for recovery
    }
  };

  const isSelf = mode === "edit" && initialData?.userId === currentUser?.userId;
  const roleLocked = isSelf && actorRole === "admin";
  const isSuperAdmin = actorRole === "super_admin";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="fullName">{t("form.fullName")} *</Label>
          <Input
            id="fullName"
            value={formData.fullName}
            onChange={(e) => updateField("fullName", e.target.value)}
            aria-invalid={!!errors.fullName}
          />
          {errors.fullName && (
            <p className="text-sm text-destructive">{errors.fullName}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">{t("form.email")} *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => updateField("email", e.target.value)}
            aria-invalid={!!errors.email}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>{t("form.role")} *</Label>
          <Select
            value={formData.role}
            onValueChange={(v) => updateField("role", v)}
            disabled={roleLocked}
          >
            <SelectTrigger aria-invalid={!!errors.role}>
              <SelectValue placeholder={t("form.selectRole")} />
            </SelectTrigger>
            <SelectContent>
              {assignableRoles.map((role) => (
                <SelectItem key={role} value={role}>
                  {t(`roles.${role}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {roleLocked && (
            <p className="text-xs text-muted-foreground">
              {t("form.roleLockedSelf")}
            </p>
          )}
          {errors.role && (
            <p className="text-sm text-destructive">{errors.role}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>{t("form.tenant")} *</Label>
          <Select
            value={formData.tenantId}
            onValueChange={(v) => updateField("tenantId", v)}
            disabled={!isSuperAdmin && mode === "create"}
          >
            <SelectTrigger aria-invalid={!!errors.tenantId}>
              <SelectValue placeholder={t("form.selectTenant")} />
            </SelectTrigger>
            <SelectContent>
              {tenants.map((tenant) => (
                <SelectItem key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.tenantId && (
            <p className="text-sm text-destructive">{errors.tenantId}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="username">{t("form.username")} *</Label>
          <Input
            id="username"
            value={formData.username}
            onChange={(e) => updateField("username", e.target.value)}
            aria-invalid={!!errors.username}
          />
          {errors.username && (
            <p className="text-sm text-destructive">{errors.username}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">{t("form.phone")} *</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => updateField("phone", e.target.value)}
            aria-invalid={!!errors.phone}
          />
          {errors.phone && (
            <p className="text-sm text-destructive">{errors.phone}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>{t("form.phoneType")}</Label>
          <Select
            value={formData.phoneType ?? ""}
            onValueChange={(v) =>
              updateField("phoneType", v as PhoneType)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder={t("form.selectPhoneType")} />
            </SelectTrigger>
            <SelectContent>
              {PHONE_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {t(`phoneTypes.${type}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="address">{t("form.address")} *</Label>
          <Input
            id="address"
            value={formData.address}
            onChange={(e) => updateField("address", e.target.value)}
            aria-invalid={!!errors.address}
          />
          {errors.address && (
            <p className="text-sm text-destructive">{errors.address}</p>
          )}
        </div>

        {!isEdit && (
          <>
            <div className="space-y-2">
              <Label htmlFor="password">{t("form.password")}</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => updateField("password", e.target.value)}
                aria-invalid={!!errors.password}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                {t("form.confirmPassword")}
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) =>
                  updateField("confirmPassword", e.target.value)
                }
                aria-invalid={!!errors.confirmPassword}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            {!formData.password && !formData.confirmPassword && (
              <p className="text-sm text-muted-foreground sm:col-span-2">
                {t("form.passwordResetInfo")}
              </p>
            )}
          </>
        )}
      </div>

      <div className="space-y-2">
        <Label>{t("form.userGroup")}</Label>
        <Select
          value={formData.userGroupIds[0] ?? "none"}
          onValueChange={(v) =>
            updateField("userGroupIds", v === "none" ? [] : [v])
          }
        >
          <SelectTrigger>
            <SelectValue placeholder={t("form.selectUserGroup")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t("form.noUserGroup")}</SelectItem>
            {userGroups.map((group) => (
              <SelectItem key={group.id} value={group.id}>
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="observations">{t("form.observations")}</Label>
        <Textarea
          id="observations"
          value={formData.observations}
          onChange={(e) => updateField("observations", e.target.value)}
          rows={3}
        />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? mode === "create"
              ? t("form.creating")
              : t("form.saving")
            : mode === "create"
              ? t("form.create")
              : t("form.save")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            discardDraft();
            onCancel();
          }}
        >
          {t("form.cancel")}
        </Button>
      </div>
    </form>
  );
}
