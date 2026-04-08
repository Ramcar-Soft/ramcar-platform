import { app } from "electron";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const SETTINGS_FILE = "settings.json";
const VALID_LOCALES = ["es", "en"];
const DEFAULT_LOCALE = "es";

interface Settings {
  language: string;
}

function getSettingsPath(): string {
  return join(app.getPath("userData"), SETTINGS_FILE);
}

function readSettings(): Settings {
  const path = getSettingsPath();
  if (!existsSync(path)) {
    return { language: DEFAULT_LOCALE };
  }
  try {
    const data = readFileSync(path, "utf-8");
    const parsed = JSON.parse(data) as Settings;
    if (!VALID_LOCALES.includes(parsed.language)) {
      return { language: DEFAULT_LOCALE };
    }
    return parsed;
  } catch {
    return { language: DEFAULT_LOCALE };
  }
}

function writeSettings(settings: Settings): void {
  const path = getSettingsPath();
  try {
    writeFileSync(path, JSON.stringify(settings, null, 2), "utf-8");
  } catch {
    // Silently fail — language will reset to default on next launch
  }
}

export function getLanguage(): string {
  return readSettings().language;
}

export function setLanguage(locale: string): void {
  if (!VALID_LOCALES.includes(locale)) return;
  writeSettings({ language: locale });
}
