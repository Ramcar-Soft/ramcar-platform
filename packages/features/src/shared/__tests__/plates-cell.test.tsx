import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { PlatesCell } from "../plates-cell";

afterEach(() => cleanup());

describe("PlatesCell", () => {
  it("renders an em-dash when plates is undefined", () => {
    render(<PlatesCell plates={undefined} />);
    expect(screen.getByText("—")).toBeDefined();
  });

  it("renders an em-dash when plates is empty", () => {
    render(<PlatesCell plates={[]} />);
    expect(screen.getByText("—")).toBeDefined();
  });

  it("renders a single plate without a badge", () => {
    render(<PlatesCell plates={["ABC-123"]} />);
    expect(screen.getByText("ABC-123")).toBeDefined();
    expect(screen.queryByText(/^\+\d+$/)).toBeNull();
  });

  it("renders the first plate with a +N badge when multiple plates exist", () => {
    render(<PlatesCell plates={["ABC-123", "DEF-456", "GHI-789"]} />);
    expect(screen.getByText("ABC-123")).toBeDefined();
    expect(screen.getByText("+2")).toBeDefined();
    expect(screen.queryByText("DEF-456")).toBeNull();
    expect(screen.queryByText("GHI-789")).toBeNull();
  });
});
