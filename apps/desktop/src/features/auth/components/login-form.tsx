import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Button, CardContent, CardFooter, Input } from "@ramcar/ui";
import { loginSchema } from "@ramcar/shared";

interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
}

export function LoginForm({ onSubmit }: LoginFormProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Clear any previous-session tenant selection so the next sign-in starts
  // from the user's primary tenant. Prevents stale tenant scope leaking
  // across different users on the same machine.
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.removeItem("ramcar.auth.activeTenantId");
    localStorage.removeItem("ramcar.auth.activeTenantName");
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(email, password);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("common.error"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <CardContent className="flex flex-col gap-4">
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-sm font-medium">
            {t("auth.login.emailLabel")}
          </label>
          <Input
            id="email"
            type="email"
            placeholder={t("auth.login.emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
            autoComplete="email"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="text-sm font-medium">
            {t("auth.login.passwordLabel")}
          </label>
          <Input
            id="password"
            type="password"
            placeholder={t("auth.login.passwordPlaceholder")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isSubmitting}
            autoComplete="current-password"
          />
        </div>
      </CardContent>
      <CardFooter className="pt-12">
        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting}
          variant="default"
        >
          {isSubmitting
            ? t("auth.login.submittingButton")
            : t("auth.login.submitButton")}
        </Button>
      </CardFooter>
    </form>
  );
}
