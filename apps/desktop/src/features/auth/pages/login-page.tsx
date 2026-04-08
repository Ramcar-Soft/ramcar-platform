import { Card, CardHeader, CardTitle, CardDescription } from "@ramcar/ui";
import { LoginForm } from "../components/login-form";

interface LoginPageProps {
  onLogin: (email: string, password: string) => Promise<void>;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-linear-to-br from-emerald-600 to-emerald-100">
      <Card className="w-full sm:w-[450px] shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl">RamcarSoft</CardTitle>
          <CardDescription>
            Enter your credentials to access the platform.
          </CardDescription>
        </CardHeader>
        <LoginForm onSubmit={onLogin} />
      </Card>
    </main>
  );
}
