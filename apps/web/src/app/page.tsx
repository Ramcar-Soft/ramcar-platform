import React from "react";
import { Button } from "@ramcar/ui";

export default function Home(): React.JSX.Element {
  return (
    <main className="flex min-h-screen items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">RamcarSoftWeb Portal</h1>
      <Button>Get Started</Button>
    </main>
  );
}
