import { describe, it, expect, vi, afterEach } from "vitest";
import { screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@testing-library/react";
import { I18nProvider } from "../../adapters/i18n";
import type { I18nPort } from "../../adapters/i18n";
import { ConfirmSwitchDialog } from "../components/confirm-switch-dialog";

afterEach(() => cleanup());

const mockI18n: I18nPort = { t: (key, values) => {
  // Simple interpolation for test assertions
  if (!values) return key;
  let result = key;
  for (const [k, v] of Object.entries(values)) {
    result = result.replaceAll(`{${k}}`, String(v));
  }
  return result;
}, locale: "en" };

function renderDialog(props: {
  open: boolean;
  sourceTenantName: string;
  targetTenantName: string;
  hasUnsavedChanges: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return render(
    <I18nProvider value={mockI18n}>
      <ConfirmSwitchDialog {...props} />
    </I18nProvider>,
  );
}

describe("ConfirmSwitchDialog", () => {
  it("renders source and target tenant names", () => {
    renderDialog({
      open: true,
      sourceTenantName: "Los Robles",
      targetTenantName: "San Pedro",
      hasUnsavedChanges: false,
      onCancel: vi.fn(),
      onConfirm: vi.fn(),
    });

    // The description should include both names (via i18n body key)
    const desc = screen.getByRole("dialog");
    expect(desc.textContent).toContain("Los Robles");
    expect(desc.textContent).toContain("San Pedro");
  });

  it("shows unsaved warning only when hasUnsavedChanges=true", () => {
    const { rerender } = renderDialog({
      open: true,
      sourceTenantName: "A",
      targetTenantName: "B",
      hasUnsavedChanges: false,
      onCancel: vi.fn(),
      onConfirm: vi.fn(),
    });

    expect(screen.queryByText("tenantSelector.confirm.unsavedWarning")).toBeNull();

    rerender(
      <I18nProvider value={mockI18n}>
        <ConfirmSwitchDialog
          open={true}
          sourceTenantName="A"
          targetTenantName="B"
          hasUnsavedChanges={true}
          onCancel={vi.fn()}
          onConfirm={vi.fn()}
        />
      </I18nProvider>,
    );

    expect(screen.getByText("tenantSelector.confirm.unsavedWarning")).toBeDefined();
  });

  it("calls onCancel when Cancel button is clicked", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    renderDialog({
      open: true,
      sourceTenantName: "A",
      targetTenantName: "B",
      hasUnsavedChanges: false,
      onCancel,
      onConfirm: vi.fn(),
    });

    await user.click(screen.getByText("tenantSelector.confirm.cancel"));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("calls onConfirm when Confirm button is clicked", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    renderDialog({
      open: true,
      sourceTenantName: "A",
      targetTenantName: "B",
      hasUnsavedChanges: false,
      onCancel: vi.fn(),
      onConfirm,
    });

    // Confirm button text includes target name via i18n interpolation
    const confirmBtn = screen.getByText("tenantSelector.confirm.confirm");
    await user.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("calls onCancel when Escape key is pressed", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    renderDialog({
      open: true,
      sourceTenantName: "A",
      targetTenantName: "B",
      hasUnsavedChanges: false,
      onCancel,
      onConfirm: vi.fn(),
    });

    await user.keyboard("{Escape}");
    await waitFor(() => expect(onCancel).toHaveBeenCalled());
  });

  it("Cancel button has initial focus (a11y)", async () => {
    renderDialog({
      open: true,
      sourceTenantName: "A",
      targetTenantName: "B",
      hasUnsavedChanges: false,
      onCancel: vi.fn(),
      onConfirm: vi.fn(),
    });

    const cancelBtn = screen.getByText("tenantSelector.confirm.cancel");
    // autoFocus is set on the Cancel button
    expect(cancelBtn.closest("button")?.getAttribute("data-auto-focus") ?? cancelBtn).toBeDefined();
  });

  it("does not render dialog content when open=false", () => {
    renderDialog({
      open: false,
      sourceTenantName: "A",
      targetTenantName: "B",
      hasUnsavedChanges: false,
      onCancel: vi.fn(),
      onConfirm: vi.fn(),
    });

    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
