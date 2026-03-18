import React from "react";
import { getTranslations } from "next-intl/server";

export default async function Home() {
  const t = await getTranslations("hero");

  return (
    <main>
      {/* Sections will be added as they are built — each is a "use client" component with its own useTranslations */}
      <section
        id="hero"
        className="flex min-h-screen items-center justify-center bg-teal-700"
      >
        <h1 className="text-4xl font-bold text-white">{t("headline")}</h1>
      </section>
    </main>
  );
}
