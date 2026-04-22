"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@ramcar/ui";
import type { ReactNode } from "react";

interface LogbookShellProps {
  children: ReactNode;
  toolbar?: ReactNode;
}

type TabValue = "visitors" | "providers" | "residents";

export function LogbookShell({ children, toolbar }: LogbookShellProps) {
  const t = useTranslations("logbook");
  const pathname = usePathname();
  const locale = useLocale();

  const activeTab: TabValue = pathname.includes("/providers")
    ? "providers"
    : pathname.includes("/residents")
      ? "residents"
      : "visitors";

  const tabs: { value: TabValue; label: string; href: string }[] = [
    {
      value: "visitors",
      label: t("tabs.visitors"),
      href: `/${locale}/logbook/visitors`,
    },
    {
      value: "providers",
      label: t("tabs.providers"),
      href: `/${locale}/logbook/providers`,
    },
    {
      value: "residents",
      label: t("tabs.residents"),
      href: `/${locale}/logbook/residents`,
    },
  ];

  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>

      <nav
        role="tablist"
        aria-label={t("title")}
        className="inline-flex h-9 w-fit items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground"
      >
        {tabs.map((tab) => {
          const isActive = tab.value === activeTab;
          return (
            <Link
              key={tab.value}
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? "page" : undefined}
              href={tab.href}
              className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all",
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {toolbar && <div className="flex flex-col gap-2">{toolbar}</div>}

      <div>{children}</div>
    </div>
  );
}
