import { useEffect, useCallback } from "react";
import { useAppStore } from "@ramcar/store";
import { extractUserProfile } from "@ramcar/shared";
import { LoadingScreen } from "@ramcar/ui";
import { supabase } from "./shared/lib/supabase";
import { LoginPage } from "./features/auth/pages/login-page";
import { PageRouter } from "./shared/components/page-router";

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

  const retrySession = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      setUser(extractUserProfile(data.session.user));
    } else {
      clearAuth();
    }
  }, [setUser, clearAuth]);

  if (isLoading) {
    return <LoadingScreen onRetry={retrySession} />;
  }

  if (isAuthenticated) {
    return <PageRouter onLogout={handleLogout} />;
  }

  return <LoginPage onLogin={handleLogin} />;
}

export default App;
