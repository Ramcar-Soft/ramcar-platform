import { ipcMain } from "electron";
import { getSyncStatus, triggerSync, setAuthToken } from "../services/sync-engine";
import { getPendingCount } from "../repositories/sync-outbox-repository";
import { setVisitPersonsAuthToken, setVisitPersonsActiveTenant } from "./visit-persons-handlers";

export function registerSyncHandlers(): void {
  ipcMain.handle("sync:status", () => {
    return getSyncStatus();
  });

  ipcMain.handle("sync:trigger", () => {
    triggerSync();
    return { triggered: true };
  });

  ipcMain.handle("sync:outbox-count", () => {
    return getPendingCount();
  });

  ipcMain.handle("sync:set-auth-token", (_event, token: string | null) => {
    setAuthToken(token);
    setVisitPersonsAuthToken(token);
  });

  ipcMain.handle("sync:set-active-tenant", (_event, tenantId: string) => {
    setVisitPersonsActiveTenant(tenantId);
  });
}
