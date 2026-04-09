/// <reference types="@testing-library/jest-dom/vitest" />
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { UserStatusBadge } from "../components/user-status-badge";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

describe("UserStatusBadge", () => {
  it("renders active badge with default variant", () => {
    render(<UserStatusBadge status="active" />);
    const badge = screen.getByText("active");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute("data-variant", "default");
  });

  it("renders inactive badge with secondary variant", () => {
    render(<UserStatusBadge status="inactive" />);
    const badge = screen.getByText("inactive");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute("data-variant", "secondary");
  });
});
