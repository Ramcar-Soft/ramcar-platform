/// <reference types="@testing-library/jest-dom/vitest" />
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { LogbookToolbar } from "../components/logbook-toolbar";
import type { LogbookFilters } from "../types";

afterEach(() => cleanup());

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

// DateRangeFilter has its own deps (useTranslations, Popover, etc.) — stub it out.
vi.mock("../components/date-range-filter", () => ({
  DateRangeFilter: ({ onApply }: { onApply: (v: unknown) => void }) => (
    <button
      data-testid="date-range-filter"
      onClick={() => onApply({ datePreset: "last_7d" })}
    >
      DateRangeFilter
    </button>
  ),
}));

// TenantSelect reaches into the Zustand store + React Query — stub it out.
vi.mock("../components/tenant-select", () => ({
  TenantSelect: () => null,
}));

// ExportMenu has its own deps — stub it out.
vi.mock("../components/export-menu", () => ({
  ExportMenu: () => <div data-testid="export-menu" />,
}));

// ResidentSelect uses adapters + React Query — stub it out.
vi.mock("@ramcar/features/shared/resident-select", () => ({
  ResidentSelect: () => <div data-testid="resident-select" />,
}));

const baseFilters: LogbookFilters = {
  datePreset: "today",
  page: 1,
  pageSize: 25,
};

describe("LogbookToolbar", () => {
  it("renders search input with placeholder from i18n", () => {
    render(
      <LogbookToolbar
        filters={baseFilters}
        onFilterChange={vi.fn()}
        onSearchChange={vi.fn()}
        onResidentChange={vi.fn()}
        onTenantChange={vi.fn()}
        personType="visitor"
        onExportAll={vi.fn()}
      />,
    );
    const input = screen.getByRole("textbox", {
      name: "toolbar.search.ariaLabel",
    });
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute(
      "placeholder",
      "toolbar.search.placeholder",
    );
  });

  it("calls onSearchChange when user types in the search input", () => {
    const onSearchChange = vi.fn();
    render(
      <LogbookToolbar
        filters={baseFilters}
        onFilterChange={vi.fn()}
        onSearchChange={onSearchChange}
        onResidentChange={vi.fn()}
        onTenantChange={vi.fn()}
        personType="visitor"
        onExportAll={vi.fn()}
      />,
    );
    const input = screen.getByRole("textbox", {
      name: "toolbar.search.ariaLabel",
    });
    fireEvent.change(input, { target: { value: "Jane" } });
    expect(onSearchChange).toHaveBeenCalledWith("Jane");
  });

  it("clears the input and calls onSearchChange('') when Escape is pressed", () => {
    const onSearchChange = vi.fn();
    render(
      <LogbookToolbar
        filters={baseFilters}
        onFilterChange={vi.fn()}
        onSearchChange={onSearchChange}
        onResidentChange={vi.fn()}
        onTenantChange={vi.fn()}
        personType="visitor"
        onExportAll={vi.fn()}
      />,
    );
    const input = screen.getByRole("textbox", {
      name: "toolbar.search.ariaLabel",
    }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "test" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(onSearchChange).toHaveBeenLastCalledWith("");
    expect(input.value).toBe("");
  });

  it("shows clear button when filters.search is set and clears on click", () => {
    const onSearchChange = vi.fn();
    const filtersWithSearch: LogbookFilters = {
      ...baseFilters,
      search: "Jane",
    };
    render(
      <LogbookToolbar
        filters={filtersWithSearch}
        onFilterChange={vi.fn()}
        onSearchChange={onSearchChange}
        onResidentChange={vi.fn()}
        onTenantChange={vi.fn()}
        personType="visitor"
        onExportAll={vi.fn()}
      />,
    );
    const clearBtn = screen.getByRole("button", { name: "toolbar.search.clear" });
    expect(clearBtn).toBeInTheDocument();
    fireEvent.click(clearBtn);
    expect(onSearchChange).toHaveBeenCalledWith("");
  });

  it("calls onFilterChange when DateRangeFilter applies a new value", () => {
    const onFilterChange = vi.fn();
    render(
      <LogbookToolbar
        filters={baseFilters}
        onFilterChange={onFilterChange}
        onSearchChange={vi.fn()}
        onResidentChange={vi.fn()}
        onTenantChange={vi.fn()}
        personType="visitor"
        onExportAll={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId("date-range-filter"));
    expect(onFilterChange).toHaveBeenCalledWith({ datePreset: "last_7d" });
  });

  it("does not show clear button when search is not set", () => {
    render(
      <LogbookToolbar
        filters={baseFilters}
        onFilterChange={vi.fn()}
        onSearchChange={vi.fn()}
        onResidentChange={vi.fn()}
        onTenantChange={vi.fn()}
        personType="visitor"
        onExportAll={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "toolbar.search.clear" }),
    ).not.toBeInTheDocument();
  });
});
