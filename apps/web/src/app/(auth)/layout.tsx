import React from "react";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-linear-to-br from-emerald-600 to-emerald-100 ">
      {children}
    </main>
  );
}
