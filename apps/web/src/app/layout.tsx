import type { Metadata } from "next";
import React from "react";
import { Geist, Inter } from "next/font/google";
import "./globals.css";
import "@ramcar/ui/globals.css";

const geistSans = Geist({
  variable: "--font-heading",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ramcar Web",
  description: "Ramcar Web Portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${inter.variable} font-body antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
