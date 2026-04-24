import { useSyncExternalStore } from "react";
import { updaterStore } from "../lib/updater-store";

export function usePendingUpdate(): string | null {
  return useSyncExternalStore(updaterStore.subscribe, updaterStore.getSnapshot, () => null);
}
