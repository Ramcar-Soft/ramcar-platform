import React from "react";

import Hero from "@/components/Hero";
import Navbar from "@/components/Navbar";
import TheProblem from "@/components/TheProblem";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <TheProblem />
      </main>
    </>
  );
}
