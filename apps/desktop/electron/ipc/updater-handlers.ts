import { ipcMain } from "electron";
import { installUpdateNow } from "../services/auto-updater";

export function registerUpdaterHandlers(): void {
  ipcMain.handle("updater:install", () => {
    installUpdateNow();
  });
}
