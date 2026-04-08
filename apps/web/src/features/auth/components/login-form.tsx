"use client";

import React, { useActionState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Input,
} from "@ramcar/ui";
import { login, type LoginState } from "../actions/login";

export function LoginForm(): React.JSX.Element {
  const t = useTranslations("auth.login");
  const [state, formAction, isPending] = useActionState<LoginState, FormData>(
    login,
    null,
  );

  return (
    <Card className="w-full sm:w-[450px] shadow-md ">
      <CardHeader>
        <CardTitle className="text-4xl font-bold flex gap-2 items-center">
          <Image
            alt="icon"
            src="/assets/images/icon.png"
            width={80}
            height={80}
          />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="flex flex-col gap-4">
          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-sm font-medium">
              {t("emailLabel")}
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder={t("emailPlaceholder")}
              required
              autoComplete="email"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-sm font-medium">
              {t("passwordLabel")}
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder={t("passwordPlaceholder")}
              required
              autoComplete="current-password"
            />
          </div>
        </CardContent>
        <CardFooter className="pt-12">
          <Button
            type="submit"
            className="w-full"
            disabled={isPending}
            variant="default"
          >
            {isPending ? t("submittingButton") : t("submitButton")}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
