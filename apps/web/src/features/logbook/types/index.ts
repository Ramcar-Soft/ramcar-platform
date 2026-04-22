import type { ReactNode } from "react";
import type { AccessEventListItem } from "@ramcar/shared";

export type { AccessEventListItem, AccessEventListResponse } from "@ramcar/shared";

export interface LogbookFilters {
  datePreset: "today" | "last_7d" | "last_30d" | "last_90d" | "custom";
  dateFrom?: string;
  dateTo?: string;
  tenantId?: string;
  residentId?: string;
  search?: string;
  page: number;
  pageSize: 10 | 25 | 50 | 100;
}

export interface LogbookColumn {
  id: string;
  header: string;
  cell: (item: AccessEventListItem) => ReactNode;
}
