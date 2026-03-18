import React from "react";

import Features from "@/components/Features";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import Navbar from "@/components/Navbar";
import SocialProof from "@/components/SocialProof";
import TheProblem from "@/components/TheProblem";
import WhyUs from "@/components/WhyUs";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <TheProblem />
        <HowItWorks />
        <Features />
        <WhyUs />
        <SocialProof />
      </main>
    </>
  );
}
