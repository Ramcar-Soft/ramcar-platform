"use client";
import { ReactNode, useEffect, useLayoutEffect } from "react";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import type { ThemeProviderProps } from "next-themes";

const THEME_COOKIE = "theme";
const ONE_YEAR = 60 * 60 * 24 * 365;

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

function ThemeSync() {
  const { theme, resolvedTheme } = useTheme();
  const pathname = usePathname();

  useEffect(() => {
    if (!theme) return;
    document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=${ONE_YEAR}; SameSite=Lax`;
  }, [theme]);

  useIsomorphicLayoutEffect(() => {
    const target = theme === "system" ? resolvedTheme : theme;
    if (!target) return;
    const root = document.documentElement;
    if (!root.classList.contains(target)) {
      root.classList.remove("light", "dark");
      root.classList.add(target);
    }
  }, [pathname, theme, resolvedTheme]);

  return null;
}

type ThemeProviderPropsWithChildren = ThemeProviderProps & { children: ReactNode };

export function ThemeProvider({ children, ...props }: ThemeProviderPropsWithChildren) {
  return (
    <NextThemesProvider {...props}>
      <ThemeSync />
      {children}
    </NextThemesProvider>
  );
}
