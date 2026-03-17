import React from "react";
import {
  Navbar,
  Hero,
  TheProblem,
  HowItWorks,
  Features,
  WhyUs,
  SocialProof,
  Pricing,
  FAQ,
  FinalCTA,
  Footer,
} from "@/features/landing";

export default function LandingPage(): React.JSX.Element {
  return (
    <div className="parallax-container">
      <Navbar />
      <Hero />
      <TheProblem />
      <HowItWorks />
      <Features />
      <WhyUs />
      <SocialProof />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  );
}
