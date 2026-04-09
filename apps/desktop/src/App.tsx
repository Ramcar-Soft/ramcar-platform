import { useEffect, useCallback } from "react";
import { useAppStore } from "@ramcar/store";
import type { UserProfile, Role } from "@ramcar/shared";
import { supabase } from "./shared/lib/supabase";
import { LoginPage } from "./features/auth/pages/login-page";
import { PageRouter } from "./shared/components/page-router";

function extractUserProfile(user: { id: string; email?: string; app_metadata: Record<string, unknown> }): UserProfile {
  const meta = user.app_metadata;
  return {
    id: (meta.profile_id as string) ?? user.id,
    userId: user.id,
    tenantId: (meta.tenant_id as string) ?? "",
    email: user.email ?? "",
    fullName: (meta.full_name as string) ?? "",
    role: (meta.role as Role) ?? "resident",
  };
}

function App() {
  const isLoading = useAppStore((s) => s.isLoading);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const setUser = useAppStore((s) => s.setUser);
  const setLoading = useAppStore((s) => s.setLoading);
  const clearAuth = useAppStore((s) => s.clearAuth);

  useEffect(() => {
    const initialize = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        setUser(extractUserProfile(data.session.user));
      } else {
        clearAuth();
      }
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(extractUserProfile(session.user));
      } else {
        clearAuth();
      }
    });

    return () => subscription.unsubscribe();
  }, [setUser, setLoading, clearAuth]);

  const handleLogin = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    clearAuth();
  }, [clearAuth]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-emerald-600 to-emerald-100">
        <p className="text-white/80">Loading...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <PageRouter onLogout={handleLogout} />;
  }

  return <LoginPage onLogin={handleLogin} />;
}

export default App;
