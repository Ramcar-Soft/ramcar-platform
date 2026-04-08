import { ipcMain } from "electron";
import { getLanguage, setLanguage } from "../repositories/settings-repository";

export function registerSettingsHandlers(): void {
  ipcMain.handle("get-language", () => {
    return getLanguage();
  });

  ipcMain.handle("set-language", (_event, locale: string) => {
    setLanguage(locale);
  });
}
