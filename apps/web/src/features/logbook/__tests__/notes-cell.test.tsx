/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { NotesCell } from "../components/notes-cell";

afterEach(() => cleanup());

describe("NotesCell", () => {
  it("renders an em-dash when notes is null", () => {
    render(<NotesCell notes={null} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders the full text without a tooltip when ≤ 40 characters", () => {
    render(<NotesCell notes="Short note." />);
    expect(screen.getByText("Short note.")).toBeInTheDocument();
    // No tooltip trigger means no element with cursor-help class.
    expect(document.querySelector(".cursor-help")).toBeNull();
  });

  it("truncates with ellipsis and a tooltip trigger when > 40 characters", () => {
    const long = "A".repeat(60);
    render(<NotesCell notes={long} />);
    const truncated = `${"A".repeat(40)}…`;
    expect(screen.getByText(truncated)).toBeInTheDocument();
    expect(document.querySelector(".cursor-help")).not.toBeNull();
  });
});
