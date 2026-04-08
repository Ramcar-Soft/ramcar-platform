import React from "react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@ramcar/ui";
import { redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { logout } from "@/features/auth/actions/logout";

export default async function DashboardPage(): Promise<React.JSX.Element> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const fullName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    "User";
  const email = user.email ?? "No email";
  const role =
    (user.app_metadata?.role as string) ?? "No role assigned";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome, {fullName}</CardTitle>
          <CardDescription>You are signed in to the Ramcar Platform.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Email</span>
            <span>{email}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Role</span>
            <span className="capitalize">{role}</span>
          </div>
          <form action={logout} className="mt-4">
            <Button type="submit" variant="outline" className="w-full">
              Sign Out
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
