type Listener = () => void;

let pendingVersion: string | null = null;
const listeners = new Set<Listener>();
let ipcUnsubscribe: (() => void) | null = null;

function notify() {
  for (const listener of listeners) listener();
}

function ensureSubscribed() {
  if (ipcUnsubscribe || !window.api?.updater) return;
  ipcUnsubscribe = window.api.updater.onUpdateDownloaded(({ version }) => {
    pendingVersion = version;
    notify();
  });
}

export const updaterStore = {
  subscribe(listener: Listener) {
    ensureSubscribed();
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot(): string | null {
    return pendingVersion;
  },
  installNow() {
    void window.api.updater.installNow();
  },
};
