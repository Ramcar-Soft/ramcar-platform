import React from "react";

import Features from "@/components/Features";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import Navbar from "@/components/Navbar";
import TheProblem from "@/components/TheProblem";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <TheProblem />
        <HowItWorks />
        <Features />
      </main>
    </>
  );
}
