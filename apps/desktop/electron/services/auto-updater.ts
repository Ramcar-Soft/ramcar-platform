import { app, BrowserWindow } from 'electron'
import log from 'electron-log'
import pkg from 'electron-updater'

const { autoUpdater } = pkg

const CHECK_INTERVAL_MS = 60 * 60 * 1000

let intervalHandle: NodeJS.Timeout | null = null

function broadcast(channel: string, payload: unknown) {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, payload)
  }
}

export function startAutoUpdater() {
  if (!app.isPackaged) {
    log.info('[auto-updater] skipped: not a packaged build')
    return
  }

  autoUpdater.logger = log
  log.transports.file.level = 'info'

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => log.info('[auto-updater] checking'))
  autoUpdater.on('update-available', (info) => log.info('[auto-updater] available', info.version))
  autoUpdater.on('update-not-available', () => log.info('[auto-updater] up to date'))
  autoUpdater.on('download-progress', (p) => log.info(`[auto-updater] ${p.percent.toFixed(1)}%`))
  autoUpdater.on('update-downloaded', (info) => {
    log.info('[auto-updater] downloaded', info.version)
    broadcast('updater:update-downloaded', { version: info.version })
  })
  autoUpdater.on('error', (err) => log.error('[auto-updater] error', err))

  void autoUpdater.checkForUpdates().catch((err) => log.error('[auto-updater] initial check failed', err))

  intervalHandle = setInterval(() => {
    void autoUpdater.checkForUpdates().catch((err) => log.error('[auto-updater] periodic check failed', err))
  }, CHECK_INTERVAL_MS)
}

export function installUpdateNow() {
  log.info('[auto-updater] user-triggered quit and install')
  autoUpdater.quitAndInstall()
}

export function stopAutoUpdater() {
  if (intervalHandle) {
    clearInterval(intervalHandle)
    intervalHandle = null
  }
}
