import { app, ipcMain, BrowserWindow } from "electron";
import { fileURLToPath } from "node:url";
import path, { join } from "node:path";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
const SETTINGS_FILE = "settings.json";
const VALID_LOCALES = ["es", "en"];
const DEFAULT_LOCALE = "es";
function getSettingsPath() {
  return join(app.getPath("userData"), SETTINGS_FILE);
}
function readSettings() {
  const path2 = getSettingsPath();
  if (!existsSync(path2)) {
    return { language: DEFAULT_LOCALE };
  }
  try {
    const data = readFileSync(path2, "utf-8");
    const parsed = JSON.parse(data);
    if (!VALID_LOCALES.includes(parsed.language)) {
      return { language: DEFAULT_LOCALE };
    }
    return parsed;
  } catch {
    return { language: DEFAULT_LOCALE };
  }
}
function writeSettings(settings) {
  const path2 = getSettingsPath();
  try {
    writeFileSync(path2, JSON.stringify(settings, null, 2), "utf-8");
  } catch {
  }
}
function getLanguage() {
  return readSettings().language;
}
function setLanguage(locale) {
  if (!VALID_LOCALES.includes(locale)) return;
  writeSettings({ language: locale });
}
function registerSettingsHandlers() {
  ipcMain.handle("get-language", () => {
    return getLanguage();
  });
  ipcMain.handle("set-language", (_event, locale) => {
    setLanguage(locale);
  });
}
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs")
    }
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(() => {
  registerSettingsHandlers();
  createWindow();
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
