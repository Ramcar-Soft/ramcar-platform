import React from "react";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { messages } from "@ramcar/i18n";
import type { Locale } from "@ramcar/i18n";
import { routing } from "@/i18n/routing";

interface Props {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: Props): Promise<React.JSX.Element> {
  const { locale } = await params;

  if (!routing.locales.includes(locale as "es" | "en")) {
    notFound();
  }

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <NextIntlClientProvider locale={locale} messages={messages[locale as Locale]} {...({ children } as any)} />
  );
}
