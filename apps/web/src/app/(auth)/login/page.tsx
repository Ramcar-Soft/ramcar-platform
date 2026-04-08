import React from "react";
import { LoginForm } from "@/features/auth/components/login-form";

export default function LoginPage(): React.JSX.Element {
  return (
    <div className="flex flex-col items-center gap-6">
      <LoginForm />
    </div>
  );
}
