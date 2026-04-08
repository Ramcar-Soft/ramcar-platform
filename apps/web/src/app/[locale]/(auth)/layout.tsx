import React from "react";
import { LanguageSwitcher } from "@/shared/components/language-switcher";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center p-4 bg-linear-to-br from-emerald-600 to-emerald-100">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      {children}
    </main>
  );
}
