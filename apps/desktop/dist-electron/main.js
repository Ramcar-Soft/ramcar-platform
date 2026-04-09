import { app as s, ipcMain as c, BrowserWindow as l } from "electron";
import { fileURLToPath as _ } from "node:url";
import t, { join as E } from "node:path";
import { existsSync as m, readFileSync as S, writeFileSync as L } from "node:fs";
const R = "settings.json", g = ["es", "en"], i = "es";
function u() {
  return E(s.getPath("userData"), R);
}
function h() {
  const e = u();
  if (!m(e))
    return { language: i };
  try {
    const o = S(e, "utf-8"), a = JSON.parse(o);
    return g.includes(a.language) ? a : { language: i };
  } catch {
    return { language: i };
  }
}
function w(e) {
  const o = u();
  try {
    L(o, JSON.stringify(e, null, 2), "utf-8");
  } catch {
  }
}
function P() {
  return h().language;
}
function T(e) {
  g.includes(e) && w({ language: e });
}
function I() {
  c.handle("get-language", () => P()), c.handle("set-language", (e, o) => {
    T(o);
  });
}
const d = t.dirname(_(import.meta.url));
process.env.APP_ROOT = t.join(d, "..");
const r = process.env.VITE_DEV_SERVER_URL, D = t.join(process.env.APP_ROOT, "dist-electron"), p = t.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = r ? t.join(process.env.APP_ROOT, "public") : p;
let n;
function f() {
  n = new l({
    icon: t.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: t.join(d, "preload.mjs")
    }
  }), n.webContents.on("did-finish-load", () => {
    n == null || n.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), r ? n.loadURL(r) : n.loadFile(t.join(p, "index.html"));
}
s.on("window-all-closed", () => {
  process.platform !== "darwin" && (s.quit(), n = null);
});
s.on("activate", () => {
  l.getAllWindows().length === 0 && f();
});
s.whenReady().then(() => {
  I(), f();
});
export {
  D as MAIN_DIST,
  p as RENDERER_DIST,
  r as VITE_DEV_SERVER_URL
};
