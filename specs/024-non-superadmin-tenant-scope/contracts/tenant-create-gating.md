# UI Contract: Tenants Catalog Create Gating

**Spec**: 024 | **Story**: User Story 2 | **Requirements**: FR-008, FR-009, FR-010, FR-011, FR-012, FR-013, FR-023, FR-025

This document is the contract for the Create button on `/catalogs/tenants` (web only). It uses the existing Sheet from spec 020 in the unrestricted path and a new info-only Dialog (`<ContactSupportDialog />`) in the gated path.

---

## Components

### A. `<TenantsTable />` (existing, modified)

**Location**: `apps/web/src/features/tenants/components/tenants-table.tsx`

**Modified**: `handleCreate` callback at `tenants-table.tsx:48-52`. New behavior:

```ts
const role = mapRoleFromUser(currentUser); // existing pattern via useAppStore + role mapper
const tenantsCount = (data?.data ?? []).length;

const handleCreate = useCallback(() => {
  if (canCreateAnotherTenant(role, tenantsCount)) {
    setSelectedTenantId(undefined);
    setSidebarMode("create");
    setSidebarOpen(true);
  } else {
    setContactDialogOpen(true);
  }
}, [role, tenantsCount]);
```

**New state**: `const [contactDialogOpen, setContactDialogOpen] = useState(false);`

**New render**: `<ContactSupportDialog open={contactDialogOpen} onClose={() => setContactDialogOpen(false)} />` mounted alongside the existing `<TenantSidebar />`.

The Create button itself does NOT change appearance, label, or position based on role. It is always rendered (FR-013 covers SuperAdmin; for Admin the button stays visible because clicking it could legitimately be the first-tenant flow when count === 0). Whether it opens the Sheet or the Dialog is a runtime decision.

### B. `<ContactSupportDialog />` (new)

**Location**: `packages/features/src/tenant-selector/components/contact-support-dialog.tsx`

**Why shared**: lives in `packages/features/` so the same primitive can be reused by other v1 gates (Story 3's locked-field hint may link out to it; future tier upgrades may surface it elsewhere). Current consumer: web only.

**Shape**:

```tsx
interface ContactSupportDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ContactSupportDialog({ open, onClose }: ContactSupportDialogProps) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent
        className="sm:max-w-md"
        onEscapeKeyDown={onClose}
        onInteractOutside={onClose}
      >
        <DialogHeader>
          <DialogTitle>{t("tenants.contactSupport.title")}</DialogTitle>
          <DialogDescription>{t("tenants.contactSupport.body")}</DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {t("tenants.contactSupport.supportInstruction")}
        </p>
        <DialogFooter>
          <Button onClick={onClose} autoFocus>
            {t("tenants.contactSupport.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Forbidden by FR-011**: no input fields, no link to the Sheet, no "create anyway" button.

**Permitted dismissals**:
- The OK / close button (`DialogFooter`).
- Escape key (`onEscapeKeyDown={onClose}`).
- Click outside the dialog content (`onInteractOutside={onClose}`).
- The `[data-radix-dialog-close]` X button rendered automatically by the shadcn `<DialogContent>` primitive — wired by `onOpenChange`.

---

## Decision table

| Actor role | Existing tenant count (from `useTenants`) | Create button behavior |
|------------|-------------------------------------------|------------------------|
| SuperAdmin | any | Open Sheet (existing spec-020 behavior). |
| Admin | 0 | Open Sheet (first-tenant onboarding). |
| Admin | ≥ 1 | Open ContactSupportDialog. |
| Guard | n/a | Catalog is not navigable; if URL-forced, existing role guards deny. |
| Resident | n/a | Catalog is not navigable; existing role guards deny. |

The decision is re-evaluated on **every** click. There is no cached "I have shown the dialog already" flag (FR-007 of Story 2 acceptance: "navigate away and return; gating is re-evaluated on next click").

---

## Re-evaluation after a successful first creation (FR-012)

```text
T0  Admin signs in. tenant_ids = []. tenants list resolves with 0 rows.
    Click Create → canCreateAnotherTenant("Admin", 0) === true → Sheet opens.

T1  Admin submits the form. POST /api/tenants succeeds.
    Backend auto-assigns the new tenant via user_tenants (spec 020).
    React Query invalidates ["tenants"] (existing useCreateTenant.onSuccess).

T2  TenantsTable re-renders. data.data.length === 1. (Note: JWT may still
    say tenant_ids = [] until refresh; we read from the API response, not
    the JWT — see research R3.)

T3  Admin clicks Create again.
    canCreateAnotherTenant("Admin", 1) === false → ContactSupportDialog opens.
```

The transition T1 → T3 happens within a single session without a sign-in / sign-out. No timer, no manual refresh.

---

## i18n keys

Added to `packages/i18n/src/messages/en.json` (English) and `es.json` (Spanish), under the existing `tenants` namespace and the existing `users.form` namespace:

```jsonc
{
  "tenants": {
    "contactSupport": {
      "title":               "...",   // <50 chars
      "body":                "...",   // 1-2 sentences, plain language
      "supportInstruction":  "...",   // 1 sentence, holds the actual contact channel
      "close":               "..."    // single word, button label
    }
  }
}
```

Final copy (English):

| Key | Value |
|-----|-------|
| `tenants.contactSupport.title` | `"Contact support to add another community"` |
| `tenants.contactSupport.body` | `"Your account is set up to manage one community. Reach out to support and we'll help you add another."` |
| `tenants.contactSupport.supportInstruction` | `"Email info@ramcarsoft.com or open a request from the Help menu."` |
| `tenants.contactSupport.close` | `"OK"` |

Final copy (Spanish):

| Key | Value |
|-----|-------|
| `tenants.contactSupport.title` | `"Contacta a soporte para añadir otra comunidad"` |
| `tenants.contactSupport.body` | `"Tu cuenta está configurada para gestionar una comunidad. Contacta a soporte y te ayudaremos a añadir otra."` |
| `tenants.contactSupport.supportInstruction` | `"Escribe a info@ramcarsoft.com o abre una solicitud desde el menú de Ayuda."` |
| `tenants.contactSupport.close` | `"Aceptar"` |

`supportInstruction` is the editable contact channel — copy may evolve without a code release (e.g., when an in-app help center launches).

---

## Test plan

| Layer | File | Cases |
|-------|------|-------|
| Unit | `packages/features/src/tenant-selector/policy/policy.test.ts` | `canCreateAnotherTenant` × 4 roles × {0, 1, 2, 50}. |
| Component | `apps/web/src/features/tenants/__tests__/tenants-table.gating.test.tsx` | Admin role + `tenants = []` → click Create → Sheet visible. Admin role + `tenants = [{...}]` → click Create → Sheet absent, ContactSupportDialog visible. SuperAdmin role + `tenants = [...]` → click Create → Sheet visible (no dialog). After successful creation invalidates the query, the next click opens the dialog (simulate via `queryClient.setQueryData`). |
| Component | `packages/features/src/tenant-selector/components/__tests__/contact-support-dialog.test.tsx` | Renders title, body, instruction, close button. Has no input fields. Closes on Escape, click-outside, and OK button. |
| E2E (web) | `apps/web/e2e/tenant-create-gating.spec.ts` | Brand-new Admin (zero tenants): Create → Sheet → fill → save → Create again → Dialog. SuperAdmin: Create → Sheet always. |

---

## Backwards compatibility

- SuperAdmin behavior is unchanged.
- Admin's first-tenant flow is unchanged from spec 020 (the Sheet, the form, the auto-assignment, the success toast).
- The existing `tenants.toast.adminCreateInfo` (post-create info hint about the next sign-in) remains relevant; this contract does not affect that toast.

## Out of scope

- A "request to upgrade" form embedded in the Dialog. The Dialog is informational per FR-011.
- Linking the Dialog to a marketing or pricing page. Not in v1.
- Hiding the Create button entirely for gated Admins. The button stays visible because of the first-tenant case; gating is decided on click.
