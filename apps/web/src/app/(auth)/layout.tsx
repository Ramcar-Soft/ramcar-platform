import React from "react";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted p-4">
      {children}
    </main>
  );
}
