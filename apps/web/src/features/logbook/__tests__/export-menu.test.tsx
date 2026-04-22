/// <reference types="@testing-library/jest-dom/vitest" />
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ExportMenu } from "../components/export-menu";
import type { LogbookFilters } from "../types";

afterEach(() => cleanup());

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

const mockExportCurrentView = vi.fn();
let mockIsExporting = false;

vi.mock("../hooks/use-logbook-export", () => ({
  useLogbookExport: () => ({
    isExporting: mockIsExporting,
    error: null,
    exportCurrentView: mockExportCurrentView,
  }),
}));

const baseFilters: LogbookFilters = {
  datePreset: "today",
  page: 1,
  pageSize: 25,
};

describe("ExportMenu", () => {
  beforeEach(() => {
    mockExportCurrentView.mockReset();
    mockIsExporting = false;
  });

  it("renders a trigger button that opens the menu", () => {
    render(
      <ExportMenu
        filters={baseFilters}
        personType="visitor"
        totalRows={5}
        onExportAll={vi.fn()}
      />,
    );
    const trigger = screen.getByRole("button", { name: /export/i });
    expect(trigger).toBeInTheDocument();
    fireEvent.click(trigger);
    // After opening, both menu items are visible
    expect(
      screen.getByRole("menuitem", { name: "export.menu.current" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "export.menu.all" }),
    ).toBeInTheDocument();
  });

  it("disables 'Export current view' and shows no-rows text when totalRows is 0", () => {
    render(
      <ExportMenu
        filters={baseFilters}
        personType="visitor"
        totalRows={0}
        onExportAll={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /export/i }));
    const item = screen.getByRole("menuitem", { name: "export.noRows" });
    expect(item).toBeDisabled();
  });

  it("calls exportCurrentView when 'Export current view' is clicked and rows > 0", () => {
    render(
      <ExportMenu
        filters={baseFilters}
        personType="visitor"
        totalRows={3}
        onExportAll={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /export/i }));
    fireEvent.click(
      screen.getByRole("menuitem", { name: "export.menu.current" }),
    );
    expect(mockExportCurrentView).toHaveBeenCalledTimes(1);
    expect(mockExportCurrentView).toHaveBeenCalledWith(
      baseFilters,
      "visitor",
      "en",
    );
  });

  it("calls onExportAll when 'Export all' is clicked", () => {
    const onExportAll = vi.fn();
    render(
      <ExportMenu
        filters={baseFilters}
        personType="visitor"
        totalRows={3}
        onExportAll={onExportAll}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /export/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: "export.menu.all" }));
    expect(onExportAll).toHaveBeenCalledTimes(1);
  });

  it("shows generating label and disables the current-view item while exporting", () => {
    mockIsExporting = true;
    render(
      <ExportMenu
        filters={baseFilters}
        personType="visitor"
        totalRows={3}
        onExportAll={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /export/i }));
    const item = screen.getByRole("menuitem", { name: "export.generating" });
    expect(item).toBeDisabled();
  });
});
