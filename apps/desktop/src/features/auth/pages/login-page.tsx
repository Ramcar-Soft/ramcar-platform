import { useTranslation } from "react-i18next";
import { Card, CardHeader, CardTitle, CardDescription } from "@ramcar/ui";
import { LoginForm } from "../components/login-form";
import { LanguageSwitcher } from "../../../shared/components/language-switcher";
import logo from "../../../assets/icon.png";

interface LoginPageProps {
  onLogin: (email: string, password: string) => Promise<void>;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const { t } = useTranslation();

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center p-4 bg-linear-to-br from-emerald-600 to-emerald-100">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <Card className="w-full sm:w-[450px] shadow-md">
        <CardHeader>
          <div className="flex gap-2 items-center">
            <img
              src={logo}
              className="object-contain"
              alt="Application Logo"
              style={{ width: 80, height: 80 }}
            />
            <CardTitle className="text-4xl font-bold">
              {t("auth.login.title")}
            </CardTitle>
          </div>
          <CardDescription>{t("auth.login.description")}</CardDescription>
        </CardHeader>
        <LoginForm onSubmit={onLogin} />
      </Card>
    </main>
  );
}
