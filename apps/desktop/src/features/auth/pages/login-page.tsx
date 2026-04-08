import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@ramcar/ui";
import { LoginForm } from "../components/login-form";

interface LoginPageProps {
  onLogin: (email: string, password: string) => Promise<void>;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Ramcar Platform</CardTitle>
          <CardDescription>Sign in to the guard booth</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm onSubmit={onLogin} />
        </CardContent>
      </Card>
    </div>
  );
}
