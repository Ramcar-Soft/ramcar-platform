import React from "react";

import Navbar from "@/components/Navbar";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        {/* Sections will be added as they are built — each is a "use client" component with its own useTranslations */}
        <section
          id="hero"
          className="flex min-h-screen items-center justify-center bg-teal-700"
        >
          <h1 className="text-4xl font-bold text-white">
            RamcarSoft Landing Page
          </h1>
        </section>
      </main>
    </>
  );
}
