"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
} from "@ramcar/ui";
import { useTranslations } from "next-intl";
import type { PaginatedResponse, ExtendedUserProfile } from "@ramcar/shared";
import { apiClient } from "@/shared/lib/api-client";

interface ResidentSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function ResidentSelect({ value, onChange, placeholder }: ResidentSelectProps) {
  const t = useTranslations("visitPersons.form");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data } = useQuery<PaginatedResponse<ExtendedUserProfile>>({
    queryKey: ["residents", "select", debouncedSearch],
    queryFn: () =>
      apiClient.get<PaginatedResponse<ExtendedUserProfile>>("/residents", {
        params: {
          search: debouncedSearch || undefined,
          pageSize: 50,
          status: "active",
        },
      }),
  });

  const residents = data?.data ?? [];

  return (
    <div className="space-y-2">
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={placeholder ?? t("selectResident")}
        className="mb-1"
      />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={t("selectResident")} />
        </SelectTrigger>
        <SelectContent>
          {residents.map((r) => (
            <SelectItem key={r.id} value={r.id}>
              {r.fullName}
              {r.address && ` — ${r.address}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
