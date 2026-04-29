import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nProvider } from "../../../adapters/i18n";
import type { I18nPort } from "../../../adapters/i18n";
import { ContactSupportDialog } from "../contact-support-dialog";

afterEach(() => cleanup());

const mockI18n: I18nPort = {
  t: (key) => key,
  locale: "en",
};

function renderDialog(open: boolean, onClose = vi.fn()) {
  return render(
    <I18nProvider value={mockI18n}>
      <ContactSupportDialog open={open} onClose={onClose} />
    </I18nProvider>,
  );
}

describe("ContactSupportDialog", () => {
  it("renders title, body, support instruction, and close button when open", () => {
    renderDialog(true);
    expect(screen.getByText("tenants.contactSupport.title")).toBeDefined();
    expect(screen.getByText("tenants.contactSupport.body")).toBeDefined();
    expect(screen.getByText("tenants.contactSupport.supportInstruction")).toBeDefined();
    expect(screen.getByRole("button", { name: "tenants.contactSupport.close" })).toBeDefined();
  });

  it("does not render when closed", () => {
    renderDialog(false);
    expect(screen.queryByText("tenants.contactSupport.title")).toBeNull();
  });

  it("calls onClose when the close button is clicked", async () => {
    const onClose = vi.fn();
    renderDialog(true, onClose);
    await userEvent.click(screen.getByRole("button", { name: "tenants.contactSupport.close" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("contains no input fields (FR-011)", () => {
    const { container } = renderDialog(true);
    expect(container.querySelectorAll("input")).toHaveLength(0);
  });

  it("contains no links to a bypass path (FR-011)", () => {
    const { container } = renderDialog(true);
    // No anchor tags pointing to the Sheet or any bypass URL
    const anchors = container.querySelectorAll("a[href]");
    expect(anchors).toHaveLength(0);
  });
});
