import React from "react";
import { Geist, Inter } from "next/font/google";
import { cookies } from "next/headers";
import { getLocale } from "next-intl/server";
import { ThemeProvider } from "@/shared/components/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-heading",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const cookieStore = await cookies();
  const saved = cookieStore.get("theme")?.value;
  const htmlClass = saved === "dark" || saved === "light" ? saved : undefined;

  return (
    <html lang={locale} className={htmlClass} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${inter.variable} font-body antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme={saved ?? "light"}
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
