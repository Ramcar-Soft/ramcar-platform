import React from "react";
import { LoginForm } from "@/features/auth/components/login-form";

export default function LoginPage(): React.JSX.Element {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Ramcar Platform</h1>
      </div>
      <LoginForm />
    </main>
  );
}
