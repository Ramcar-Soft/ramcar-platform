import { describe, it, expect, afterEach } from "vitest";
import { screen, cleanup } from "@testing-library/react";
import { renderWithHarness } from "../../../test/harness";
import { ShortcutsHint } from "../shortcuts-hint";

afterEach(() => cleanup());

describe("ShortcutsHint", () => {
  it("renders nothing when no flags are enabled", () => {
    const { container } = renderWithHarness(<ShortcutsHint />);
    expect(container.firstChild).toBeNull();
  });

  it("renders only the search group when only search is enabled", () => {
    renderWithHarness(<ShortcutsHint search />);
    // Mock i18n returns the key itself.
    expect(screen.getByText("shortcuts.search")).toBeInTheDocument();
    expect(screen.queryByText("shortcuts.navigate")).not.toBeInTheDocument();
    expect(screen.queryByText("shortcuts.select")).not.toBeInTheDocument();
    expect(screen.queryByText("shortcuts.create")).not.toBeInTheDocument();
  });

  it("renders search + navigate when both are enabled", () => {
    renderWithHarness(<ShortcutsHint search navigate />);
    expect(screen.getByText("shortcuts.search")).toBeInTheDocument();
    expect(screen.getByText("shortcuts.navigate")).toBeInTheDocument();
    expect(screen.queryByText("shortcuts.select")).not.toBeInTheDocument();
    expect(screen.queryByText("shortcuts.create")).not.toBeInTheDocument();
  });

  it("renders all four groups when every flag is enabled", () => {
    renderWithHarness(<ShortcutsHint search navigate select create />);
    expect(screen.getByText("shortcuts.search")).toBeInTheDocument();
    expect(screen.getByText("shortcuts.navigate")).toBeInTheDocument();
    expect(screen.getByText("shortcuts.select")).toBeInTheDocument();
    expect(screen.getByText("shortcuts.create")).toBeInTheDocument();
  });

  it("renders the search keys B and F as <kbd> elements", () => {
    const { container } = renderWithHarness(<ShortcutsHint search />);
    const kbds = container.querySelectorAll("kbd");
    const labels = Array.from(kbds).map((k) => k.textContent);
    expect(labels).toContain("B");
    expect(labels).toContain("F");
  });

  it("renders the arrow keys when navigate is enabled", () => {
    const { container } = renderWithHarness(<ShortcutsHint navigate />);
    const labels = Array.from(container.querySelectorAll("kbd")).map((k) => k.textContent);
    expect(labels).toContain("↑");
    expect(labels).toContain("↓");
  });

  it("renders the Enter glyph when select is enabled", () => {
    const { container } = renderWithHarness(<ShortcutsHint select />);
    const labels = Array.from(container.querySelectorAll("kbd")).map((k) => k.textContent);
    expect(labels).toContain("↵");
  });

  it("renders the N key when create is enabled", () => {
    const { container } = renderWithHarness(<ShortcutsHint create />);
    const labels = Array.from(container.querySelectorAll("kbd")).map((k) => k.textContent);
    expect(labels).toContain("N");
  });

  it("sets aria-label from shortcuts.ariaLabel on the root element", () => {
    renderWithHarness(<ShortcutsHint search />);
    expect(screen.getByLabelText("shortcuts.ariaLabel")).toBeInTheDocument();
  });

  it("merges a custom className onto the root", () => {
    renderWithHarness(<ShortcutsHint search className="custom-class" />);
    const root = screen.getByLabelText("shortcuts.ariaLabel");
    expect(root.className).toMatch(/custom-class/);
  });
});
