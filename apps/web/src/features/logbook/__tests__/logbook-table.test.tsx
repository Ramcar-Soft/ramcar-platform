/// <reference types="@testing-library/jest-dom/vitest" />
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import type { AccessEventListItem, PaginationMeta } from "@ramcar/shared";
import { LogbookTable } from "../components/logbook-table";
import type { LogbookColumn } from "../types";

afterEach(() => cleanup());

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, string>) => {
    if (params) {
      // Simulate ICU-ish substitution: just join values
      return `${key}:${Object.values(params).join("/")}`;
    }
    return key;
  },
}));

const sampleItem: AccessEventListItem = {
  id: "evt-1",
  tenantId: "t1",
  tenantName: "Tenant A",
  personType: "visitor",
  direction: "entry",
  accessMode: "pedestrian",
  notes: null,
  createdAt: "2026-04-22T10:00:00.000Z",
  visitPerson: {
    id: "vp-1",
    code: "V001",
    fullName: "Jane Visitor",
    phone: null,
    company: null,
    status: "allowed",
    residentId: null,
    residentFullName: "Rick Resident",
  },
  resident: null,
  vehicle: null,
  registeredBy: {
    id: "g-1",
    fullName: "Guard Person",
  },
};

const columns: LogbookColumn[] = [
  {
    id: "code",
    header: "Code",
    cell: (item) => <span data-testid="code">{item.visitPerson?.code}</span>,
  },
  {
    id: "name",
    header: "Name",
    cell: (item) => item.visitPerson?.fullName ?? "—",
  },
];

const meta: PaginationMeta = {
  page: 1,
  pageSize: 25,
  total: 1,
  totalPages: 1,
};

describe("LogbookTable", () => {
  it("shows skeleton rows while loading", () => {
    const { container } = render(
      <LogbookTable
        columns={columns}
        data={[]}
        isLoading={true}
        onPageChange={() => {}}
        onPageSizeChange={() => {}}
      />,
    );
    // Table renders with skeletons inside cells
    expect(container.querySelector("table")).toBeInTheDocument();
    // 5 skeleton rows × 3 columns (tenant + 2 caller-supplied) = 15 placeholders
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBe(15);
  });

  it("shows empty state when no data", () => {
    render(
      <LogbookTable
        columns={columns}
        data={[]}
        isLoading={false}
        onPageChange={() => {}}
        onPageSizeChange={() => {}}
      />,
    );
    expect(screen.getByText("empty.title")).toBeInTheDocument();
  });

  it("shows error state when error is provided", () => {
    render(
      <LogbookTable
        columns={columns}
        data={[]}
        isLoading={false}
        error={new Error("boom")}
        onPageChange={() => {}}
        onPageSizeChange={() => {}}
      />,
    );
    expect(screen.getByText("error.title")).toBeInTheDocument();
  });

  it("renders rows when data is present", () => {
    render(
      <LogbookTable
        columns={columns}
        data={[sampleItem]}
        meta={meta}
        isLoading={false}
        onPageChange={() => {}}
        onPageSizeChange={() => {}}
      />,
    );
    expect(screen.getByText("V001")).toBeInTheDocument();
    expect(screen.getByText("Jane Visitor")).toBeInTheDocument();
  });
});
