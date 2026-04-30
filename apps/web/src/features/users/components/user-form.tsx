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
import { useRole } from "@ramcar/features/adapters";
import { canEditUserTenantField } from "@ramcar/features";
import { InlineVehicleSection } from "@ramcar/features/shared/vehicle-form";
import type { InlineVehicleEntry, InlineVehicleEntryFields } from "@ramcar/features/shared/vehicle-form";
import {
  getAssignableRoles,
  normalizePhone,
  phoneOptionalSchema,
  stripUsernameChars,
  usernameOptionalSchema,
  emailSchema,
} from "@ramcar/shared";
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
  inlineVehicleEntries?: InlineVehicleEntry[];
  onAddInlineVehicle?: () => void;
  onRemoveInlineVehicle?: (clientId: string) => void;
  onUpdateInlineVehicle?: (clientId: string, patch: Partial<InlineVehicleEntryFields>) => void;
  initialInlineVehicles?: InlineVehicleEntryFields[];
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
  inlineVehicleEntries,
  onAddInlineVehicle,
  onRemoveInlineVehicle,
  onUpdateInlineVehicle,
}: UserFormProps) {
  const t = useTranslations("users");
  const tForms = useTranslations("forms");
  const tError = useTranslations();
  const currentUser = useAppStore((s) => s.user);
  const activeTenantId = useAppStore((s) => s.activeTenantId);
  const actorRole = (currentUser?.role ?? "resident") as Role;
  const { role: featureRole } = useRole();
  const tenantFieldLocked = !canEditUserTenantField(featureRole);
  const allAssignableRoles = getAssignableRoles(actorRole);
  const assignableRoles = allAssignableRoles.filter(
    (r) => r !== "admin" || actorRole === "super_admin",
  );

  const isEdit = mode === "edit";
  const initialRole = initialData?.role ?? "";

  // For edit mode with legacy multi-tenant data, pick one tenant (FR-019).
  const initialTenantId =
    initialData?.tenantId ??
    initialData?.tenantIds?.[0] ??
    (tenantFieldLocked ? (activeTenantId ?? currentUser?.tenantId ?? "") : "");

  const [formData, setFormData] = useState<UserFormData>(() => ({
    fullName: initialData?.fullName ?? "",
    email: initialData?.email ?? "",
    role: initialRole,
    tenantId: tenantFieldLocked
      ? (activeTenantId ?? currentUser?.tenantId ?? "")
      : initialTenantId,
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

  const validateField = (name: keyof UserFormData, value: string): string | null => {
    if (name === "email") {
      if (!value.trim()) return null;
      const parsed = emailSchema.safeParse(value);
      return parsed.success ? null : "forms.emailInvalid";
    }
    if (name === "phone") {
      if (!value.trim()) return null;
      const parsed = phoneOptionalSchema.safeParse(value);
      return parsed.success ? null : "forms.phoneInvalid";
    }
    if (name === "username") {
      if (!value) return null;
      const parsed = usernameOptionalSchema.safeParse(value);
      if (parsed.success) return null;
      const first = parsed.error.issues[0]?.message;
      return first ?? "users.validation.usernameInvalid";
    }
    return null;
  };

  const handleBlurField = (name: keyof UserFormData) => () => {
    const value = (formData[name] ?? "") as string;
    const err = validateField(name, value);
    setErrors((prev) => {
      const next = { ...prev };
      if (err) next[name] = tError(err);
      else delete next[name];
      return next;
    });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formData.fullName.trim()) errs.fullName = "Required";
    const emailErr = validateField("email", formData.email);
    if (emailErr) errs.email = tError(emailErr);
    if (!formData.role) errs.role = "Required";

    const role = formData.role;
    if (role === "resident" || role === "admin" || role === "guard") {
      if (!formData.tenantId) errs.tenantId = t("validation.tenantRequired");
    }

    if (role === "resident" && !formData.address.trim()) {
      errs.address = "Required";
    }

    const phoneErr = validateField("phone", formData.phone);
    if (phoneErr) errs.phone = tError(phoneErr);

    const usernameErr = validateField("username", formData.username);
    if (usernameErr) errs.username = tError(usernameErr);

    if (!isEdit && formData.password && formData.password.length > 0) {
      if (formData.password.length < 8) errs.password = "Min 8 characters";
      if (formData.password !== formData.confirmPassword)
        errs.confirmPassword = "Passwords do not match";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const normalizedPhone = formData.phone.trim()
      ? normalizePhone(formData.phone)
      : "";
    const trimmedEmail = formData.email.trim().toLowerCase();
    const trimmedUsername = formData.username.trim();

    const submitData: Record<string, unknown> = {
      ...formData,
      email: trimmedEmail.length > 0 ? trimmedEmail : undefined,
      phone: normalizedPhone ? normalizedPhone : undefined,
      username: trimmedUsername.length > 0 ? trimmedUsername : undefined,
    };

    if (isEdit || !submitData.password) {
      delete submitData.password;
      delete submitData.confirmPassword;
    }
    if (roleLocked) {
      delete submitData.role;
    }

    const role = formData.role;
    if (role === "admin" || role === "guard") {
      // API contract from spec 020: send tenant_ids array + primary_tenant_id (FR-022).
      submitData.tenant_ids = [formData.tenantId];
      submitData.primary_tenant_id = formData.tenantId;
      delete submitData.tenantId;
    } else if (role === "resident") {
      // Resident endpoint takes singular tenant_id — keep as-is.
    } else {
      // super_admin: wildcard '*' is server-derived; do not send tenant.
      delete submitData.tenantId;
    }

    try {
      await onSubmit(submitData as unknown as UserFormData);
      clearDraft();
    } catch {
      // Submission failed — keep draft for recovery
    }
  };

  const isSelf = mode === "edit" && initialData?.userId === currentUser?.userId;
  const roleLocked = isSelf && actorRole === "admin";

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
          <Label htmlFor="email">{t("form.email")}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="none"
            value={formData.email}
            onChange={(e) => updateField("email", e.target.value)}
            onBlur={handleBlurField("email")}
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
          <Label>
            {t("form.tenant")}
            {formData.role === "super_admin" ? "" : " *"}
          </Label>
          {formData.role === "super_admin" ? (
            <p className="text-sm text-muted-foreground">
              {t("form.tenant")}: ★
            </p>
          ) : (
            <>
              <Select
                value={formData.tenantId}
                onValueChange={(v) => updateField("tenantId", v)}
                disabled={tenantFieldLocked || isPending}
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
              {tenantFieldLocked && (
                <p className="text-xs text-muted-foreground">
                  {t("form.tenantLockedHint")}
                </p>
              )}
              {errors.tenantId && (
                <p className="text-sm text-destructive">{errors.tenantId}</p>
              )}
            </>
          )}
        </div>

        <div className="space-y-2 sm:col-span-1">
          <div className="space-y-2">
            <Label htmlFor="phone">{t("form.phone")}</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              onBlur={handleBlurField("phone")}
              placeholder={tForms("phonePlaceholder")}
              aria-invalid={!!errors.phone}
            />
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone}</p>
            )}
            {!errors.phone && (
              <p className="text-xs text-muted-foreground">
                {tForms("phoneHelp")}
              </p>
            )}
          </div>

          <div className="space-y-2 pt-2">
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
        </div>


        <div className="space-y-2">
          <Label htmlFor="username">{t("form.username")}</Label>
          <Input
            id="username"
            value={formData.username}
            autoComplete="off"
            onChange={(e) =>
              updateField("username", stripUsernameChars(e.target.value))
            }
            onBlur={handleBlurField("username")}
            placeholder={t("form.usernamePlaceholder")}
            aria-invalid={!!errors.username}
          />
          {errors.username && (
            <p className="text-sm text-destructive">{errors.username}</p>
          )}
          {!errors.username && (
            <p className="text-xs text-muted-foreground">
              {t("form.usernameHelp")}
            </p>
          )}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="address">
            {t("form.address")}
            {formData.role === "resident" ? " *" : ""}
          </Label>
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
                autoComplete="new-password"
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

      {mode === "create" && formData.role === "resident" && onAddInlineVehicle && (
        <InlineVehicleSection
          ownerKind="resident"
          entries={inlineVehicleEntries ?? []}
          onAddEntry={onAddInlineVehicle}
          onRemoveEntry={onRemoveInlineVehicle ?? (() => {})}
          onUpdateEntry={onUpdateInlineVehicle ?? (() => {})}
          disabled={isPending}
          sectionTitleKey="vehicles.inline.sectionTitleResident"
        />
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending} className="flex-1">
          {isPending
            ? mode === "create"
              ? t("form.creating")
              : t("form.saving")
            : mode === "create"
              ? t("form.create")
              : t("form.save")}
        </Button>
        <Button
          className="flex-1"
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
