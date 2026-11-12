import { autoUpdater, UpdateInfo } from "electron-updater"
import { app, BrowserWindow, dialog, Notification } from "electron"
import path from "node:path"
import fs from "node:fs"

export type UpdateChannel = "stable" | "beta"

export interface UpdateStatus {
  currentVersion: string
  channel: UpdateChannel
  status: "idle" | "checking" | "available" | "not-available" | "downloading" | "downloaded" | "error"
  updateInfo?: {
    version: string
    releaseDate?: string
  }
  downloadProgress?: {
    percent: number
    transferred: number
    total: number
  }
  error?: string
}

export interface UpdateLoopState {
  consecutiveFailures: number
  lastAttempt: string
  lastFailedVersion: string | null
  circuitBroken: boolean
}

let activeStatus: UpdateStatus = {
  currentVersion: app.getVersion(),
  channel: "stable",
  status: "idle",
}

let isManualCheck = false
let updateLoopTracker: UpdateLoopState = {
  consecutiveFailures: 0,
  lastAttempt: new Date().toISOString(),
  lastFailedVersion: null,
  circuitBroken: false,
}

let isDeferredPromptAttached = false

function getConfigPath(): string {
  return path.join(app.getPath("userData"), "update-config.json")
}

function getLoopStatePath(): string {
  return path.join(app.getPath("userData"), "update-state.json")
}

export function getUpdateChannel(): UpdateChannel {
  try {
    const configPath = getConfigPath()
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, "utf-8")
      const parsed = JSON.parse(raw)
      if (parsed.channel === "beta") return "beta"
    }
  } catch {
    // Fall back safely to stable on read errors
  }
  return "stable"
}

export function setUpdateChannel(channel: UpdateChannel): boolean {
  if (channel !== "stable" && channel !== "beta") {
    console.warn(`[AutoUpdater] Rejected invalid update channel: ${channel}`)
    return false
  }

  try {
    const configPath = getConfigPath()
    fs.mkdirSync(path.dirname(configPath), { recursive: true })
    fs.writeFileSync(configPath, JSON.stringify({ channel, updatedAt: new Date().toISOString() }, null, 2), "utf-8")

    activeStatus.channel = channel
    // For stable channel, channel must be null (or latest) so electron-updater looks for latest.yml
    autoUpdater.channel = channel === "beta" ? "beta" : null
    autoUpdater.allowPrerelease = channel === "beta"

    console.log(`[AutoUpdater] Update channel explicitly switched to: ${channel}`)
    return true
  } catch (err: any) {
    console.error("[AutoUpdater] Failed to write channel config:", err?.message)
    return false
  }
}

export function getUpdateStatus(): UpdateStatus {
  return { ...activeStatus }
}

function loadLoopState(): void {
  try {
    const p = getLoopStatePath()
    if (fs.existsSync(p)) {
      const parsed = JSON.parse(fs.readFileSync(p, "utf-8"))
      updateLoopTracker = {
        consecutiveFailures: Number(parsed.consecutiveFailures) || 0,
        lastAttempt: parsed.lastAttempt || new Date().toISOString(),
        lastFailedVersion: parsed.lastFailedVersion || null,
        circuitBroken: Boolean(parsed.circuitBroken),
      }
    }
  } catch {
    updateLoopTracker = {
      consecutiveFailures: 0,
      lastAttempt: new Date().toISOString(),
      lastFailedVersion: null,
      circuitBroken: false,
    }
  }
}

function recordUpdateFailure(targetVersion: string): void {
  try {
    const nextCount = (updateLoopTracker.consecutiveFailures || 0) + 1
    updateLoopTracker = {
      consecutiveFailures: nextCount,
      lastAttempt: new Date().toISOString(),
      lastFailedVersion: targetVersion,
      circuitBroken: nextCount >= 3,
    }
    const p = getLoopStatePath()
    fs.mkdirSync(path.dirname(p), { recursive: true })
    fs.writeFileSync(p, JSON.stringify(updateLoopTracker, null, 2), "utf-8")
  } catch {}
}

export function clearUpdateFailureState(): void {
  try {
    updateLoopTracker = {
      consecutiveFailures: 0,
      lastAttempt: new Date().toISOString(),
      lastFailedVersion: null,
      circuitBroken: false,
    }
    const p = getLoopStatePath()
    if (fs.existsSync(p)) fs.unlinkSync(p)
  } catch {}
}

/**
 * Checks whether the current URL represents an active financial editing workflow
 * where prompt-and-restart dialogs would disrupt typing or transaction entry.
 */
export function isCriticalFinancialRoute(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false
  const criticalPatterns = [
    /\/invoices\/new/i,
    /\/invoices\/[a-zA-Z0-9_-]+/i,
    /\/payments\/[a-zA-Z0-9_-]+/i,
    /\/deals\/[a-zA-Z0-9_-]+/i,
  ]
  return criticalPatterns.some((pattern) => pattern.test(url))
}

export function initAutoUpdater(mainWindow: BrowserWindow, isDev: boolean): void {
  const currentChannel = getUpdateChannel()
  activeStatus.channel = currentChannel
  loadLoopState()

  if (isDev) {
    console.log("[AutoUpdater] Development environment detected. Auto-update checks disabled.")
    return
  }

  // Configure autoUpdater parameters
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.allowDowngrade = false
  autoUpdater.channel = currentChannel === "beta" ? "beta" : null
  autoUpdater.allowPrerelease = currentChannel === "beta"

  // 1. Checking for update
  autoUpdater.on("checking-for-update", () => {
    console.log(`[AutoUpdater] Querying release feed for updates (Channel: ${currentChannel})...`)
    activeStatus.status = "checking"
  })

  // 2. Update Available
  autoUpdater.on("update-available", (info: UpdateInfo) => {
    console.log(`[AutoUpdater] Update available: v${info.version} (Published: ${info.releaseDate})`)
    activeStatus.status = "available"
    activeStatus.updateInfo = {
      version: info.version,
      releaseDate: info.releaseDate,
    }

    // Circuit breaker loop defense: 3 consecutive failures halts background checks
    if (updateLoopTracker.circuitBroken || updateLoopTracker.consecutiveFailures >= 3) {
      console.warn(`[AutoUpdater] Aborting background update for v${info.version} — circuit breaker active (${updateLoopTracker.consecutiveFailures} consecutive failures).`)
      activeStatus.status = "error"
      activeStatus.error = `Automatic update suspended due to repeated failure. Please download fresh installer from https://collectbot.in.`
      return
    }

    if (Notification.isSupported()) {
      new Notification({
        title: "CollectBot Update Available",
        body: `Version v${info.version} is downloading in the background.`,
        icon: path.join(__dirname, "../assets/icon.ico"),
      }).show()
    }
  })

  // 3. Update Not Available
  autoUpdater.on("update-not-available", (info: UpdateInfo) => {
    console.log(`[AutoUpdater] Up to date (Current version: v${app.getVersion()})`)
    activeStatus.status = "not-available"
    activeStatus.updateInfo = {
      version: info.version,
    }

    if (isManualCheck) {
      isManualCheck = false
      dialog.showMessageBox(mainWindow, {
        type: "info",
        title: "No Updates Available",
        message: "CollectBot is Up to Date",
        detail: `You are running the latest version (v${app.getVersion()}) on the ${currentChannel} channel.`,
        buttons: ["OK"],
      })
    }
  })

  // 4. Download Progress
  autoUpdater.on("download-progress", (progressObj) => {
    activeStatus.status = "downloading"
    activeStatus.downloadProgress = {
      percent: Math.round(progressObj.percent),
      transferred: progressObj.transferred,
      total: progressObj.total,
    }
  })

  // 5. Update Downloaded & Ready
  autoUpdater.on("update-downloaded", (info: UpdateInfo) => {
    console.log(`[AutoUpdater] Update v${info.version} downloaded successfully.`)
    activeStatus.status = "downloaded"
    activeStatus.updateInfo = {
      version: info.version,
      releaseDate: info.releaseDate,
    }

    // Check financial workflow protection
    let currentUrl = ""
    try {
      if (!mainWindow.isDestroyed()) {
        currentUrl = mainWindow.webContents.getURL()
      }
    } catch {}

    if (isCriticalFinancialRoute(currentUrl)) {
      console.log(`[AutoUpdater] User on critical financial route (${currentUrl}). Deferring restart prompt.`)
      attachDeferredPrompt(mainWindow, info.version)
    } else {
      promptUserToRestart(mainWindow, info.version)
    }
  })

  // 6. Error Handling
  autoUpdater.on("error", (err) => {
    console.error("[AutoUpdater] Update error:", err?.message || err)
    activeStatus.status = "error"
    activeStatus.error = err?.message || "An unexpected error occurred during update."

    if (activeStatus.updateInfo?.version) {
      recordUpdateFailure(activeStatus.updateInfo.version)
    }

    if (isManualCheck) {
      isManualCheck = false
      dialog.showMessageBox(mainWindow, {
        type: "warning",
        title: "Update Check Failed",
        message: "Unable to Check for Updates",
        detail: `A network or server error occurred: ${err?.message || "Check your internet connection."}`,
        buttons: ["OK"],
      })
    }
  })

  // Perform initial quiet check after 5 seconds to ensure main window is loaded
  setTimeout(() => {
    if (!updateLoopTracker.circuitBroken) {
      autoUpdater.checkForUpdates().catch((err) => {
        console.warn("[AutoUpdater] Initial silent update check failed:", err?.message)
      })
    }
  }, 5000)
}

function attachDeferredPrompt(mainWindow: BrowserWindow, version: string) {
  if (isDeferredPromptAttached || mainWindow.isDestroyed()) return
  isDeferredPromptAttached = true

  const checkAndPrompt = () => {
    if (mainWindow.isDestroyed()) return
    const url = mainWindow.webContents.getURL()
    if (!isCriticalFinancialRoute(url)) {
      mainWindow.webContents.removeListener("did-navigate", checkAndPrompt)
      mainWindow.webContents.removeListener("did-navigate-in-page", checkAndPrompt)
      isDeferredPromptAttached = false
      promptUserToRestart(mainWindow, version)
    }
  }

  mainWindow.webContents.on("did-navigate", checkAndPrompt)
  mainWindow.webContents.on("did-navigate-in-page", checkAndPrompt)
}

export function checkForUpdatesManually(mainWindow: BrowserWindow): void {
  isManualCheck = true
  clearUpdateFailureState() // Manual check resets circuit breaker
  console.log("[AutoUpdater] Manual update check initiated by user.")
  autoUpdater.checkForUpdates().catch((err) => {
    isManualCheck = false
    dialog.showMessageBox(mainWindow, {
      type: "warning",
      title: "Update Check Failed",
      message: "Could Not Connect to Update Server",
      detail: err?.message || "Please check your network connection and try again.",
      buttons: ["OK"],
    })
  })
}

function promptUserToRestart(mainWindow: BrowserWindow, newVersion: string): void {
  if (mainWindow.isDestroyed()) return

  dialog
    .showMessageBox(mainWindow, {
      type: "question",
      title: "Update Ready to Install",
      message: "CollectBot Update Ready",
      detail: `CollectBot v${newVersion} has been downloaded and verified. Restart now to apply the update?`,
      buttons: ["Restart Now", "Later (On Exit)"],
      defaultId: 0,
      cancelId: 1,
    })
    .then((result) => {
      if (result.response === 0) {
        console.log("[AutoUpdater] User accepted restart. Quitting and installing update...")
        clearUpdateFailureState()
        autoUpdater.quitAndInstall(false, true)
      } else {
        console.log("[AutoUpdater] User postponed restart. Update will install silently on app quit.")
      }
    })
}
