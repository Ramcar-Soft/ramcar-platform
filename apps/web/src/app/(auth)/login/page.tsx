import React from "react";
import { LoginForm } from "@/features/auth/components/login-form";

export default function LoginPage(): React.JSX.Element {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Ramcar Platform</h1>
      </div>
      <LoginForm />
    </div>
  );
}
