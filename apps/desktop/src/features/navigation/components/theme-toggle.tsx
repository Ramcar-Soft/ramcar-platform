import { useTranslation } from "react-i18next";
import { useAppStore } from "@ramcar/store";
import { Sun, Moon } from "lucide-react";
import { Button } from "@ramcar/ui";

function resolveTheme(theme: string): "light" | "dark" {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme === "dark" ? "dark" : "light";
}

export function ThemeToggle() {
  const { t } = useTranslation();
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(resolveTheme(theme) === "dark" ? "light" : "dark")}
      aria-label={t("topbar.toggleTheme")}
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );
}
