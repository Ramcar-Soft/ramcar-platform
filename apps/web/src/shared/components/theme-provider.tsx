"use client";
import { ReactNode} from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes";

type ThemeProviderPropsWithChildren = ThemeProviderProps & { children: ReactNode };

export function ThemeProvider({ children, ...props }: ThemeProviderPropsWithChildren) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
