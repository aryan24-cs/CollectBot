import { BrowserWindow, shell, ipcMain, app, dialog, Notification } from "electron"
import path from "node:path"
import fs from "node:fs/promises"
import crypto from "node:crypto"
import { getUpdateStatus } from "./updater"

const ALLOWED_PROD_HOSTS = ["collectbot.vercel.app"]
const ALLOWED_DEV_HOSTS = ["localhost", "127.0.0.1"]

// External service domains authorized to open in the user's default OS browser
const APPROVED_EXTERNAL_HOST_PATTERNS = [
  /^(.*\.)?razorpay\.com$/,
  /^rzp\.io$/,
  /^(.*\.)?whatsapp\.com$/,
  /^wa\.me$/,
  /^(.*\.)?supabase\.co$/,
  /^(.*\.)?google\.com$/,
  /^(.*\.)?accounts\.google\.com$/,
]

// In-memory registry of active OAuth state nonces (5-minute TTL)
const pendingAuthStates = new Map<string, number>()

function purgeExpiredAuthStates() {
  const now = Date.now()
  for (const [state, expiresAt] of pendingAuthStates.entries()) {
    if (expiresAt <= now) {
      pendingAuthStates.delete(state)
    }
  }
}

export function registerAuthState(state: string, ttlMs = 5 * 60 * 1000): void {
  purgeExpiredAuthStates()
  pendingAuthStates.set(state, Date.now() + ttlMs)
}

export function verifyAndConsumeAuthState(state: string): boolean {
  purgeExpiredAuthStates()
  if (!state || typeof state !== "string") return false
  const expiresAt = pendingAuthStates.get(state)
  if (!expiresAt || expiresAt <= Date.now()) {
    pendingAuthStates.delete(state)
    return false
  }
  // Single-use: burn state immediately upon verification
  pendingAuthStates.delete(state)
  return true
}

export function isAllowedHost(hostname: string, isDev: boolean): boolean {
  if (ALLOWED_PROD_HOSTS.includes(hostname)) return true
  if (isDev && ALLOWED_DEV_HOSTS.includes(hostname)) return true
  return false
}

export function isApprovedExternalUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl)
    if (parsed.protocol === "mailto:") return true
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false

    return APPROVED_EXTERNAL_HOST_PATTERNS.some((pattern) => pattern.test(parsed.hostname))
  } catch {
    return false
  }
}

export function configureSecurity(mainWindow: BrowserWindow, targetUrl: string, isDev: boolean): void {
  const allowedOrigin = new URL(targetUrl).origin

  // 1. Navigation Guard for Top-Level Window Navigation
  mainWindow.webContents.on("will-navigate", (event, navigationUrl) => {
    try {
      const parsed = new URL(navigationUrl)

      // Allow internal app navigation
      if (isAllowedHost(parsed.hostname, isDev)) {
        return
      }

      // Allow local offline asset
      if (parsed.protocol === "file:") {
        return
      }

      // External navigation intercepted
      event.preventDefault()
      if (isApprovedExternalUrl(navigationUrl)) {
        shell.openExternal(navigationUrl)
      } else {
        console.warn(`[Security] Blocked unauthorized navigation attempt to: ${navigationUrl}`)
      }
    } catch {
      event.preventDefault()
    }
  })

  // 2. Window Open Guard (window.open, target="_blank", window popups)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url)

      // If internal, open in same window or deny
      if (isAllowedHost(parsed.hostname, isDev)) {
        mainWindow.loadURL(url)
        return { action: "deny" }
      }

      // If approved external service, delegate to system default browser
      if (isApprovedExternalUrl(url)) {
        shell.openExternal(url)
        return { action: "deny" }
      }

      // Standard web links fallback (http/https only)
      if (parsed.protocol === "https:" || parsed.protocol === "http:" || parsed.protocol === "mailto:") {
        shell.openExternal(url)
        return { action: "deny" }
      }

      console.warn(`[Security] Rejected window.open request for untrusted protocol: ${url}`)
      return { action: "deny" }
    } catch {
      return { action: "deny" }
    }
  })

  // 3. Disable DevTools Shortcuts in Production
  if (!isDev) {
    mainWindow.webContents.on("before-input-event", (event, input) => {
      const isDevToolsKey =
        (input.control && input.shift && input.key.toLowerCase() === "i") ||
        input.key === "F12"
      if (isDevToolsKey) {
        event.preventDefault()
      }
    })
  }

  // 4. Secure IPC Handlers with Origin Verification
  setupIpcHandlers(allowedOrigin, isDev, mainWindow)
}

function setupIpcHandlers(allowedOrigin: string, isDev: boolean, mainWindow: BrowserWindow) {
  // Clear any existing handlers to prevent duplicate registration
  const handlers = [
    "desktop:get-version",
    "desktop:reload",
    "desktop:open-external",
    "desktop:start-google-auth",
    "desktop:logout",
    "desktop:notify",
    "desktop:save-file-dialog",
    "desktop:save-file-content",
    "desktop:open-file-dialog",
    "desktop:get-update-status",
  ]
  handlers.forEach((h) => ipcMain.removeHandler(h))

  ipcMain.handle("desktop:get-version", (event) => {
    verifySender(event.senderFrame?.url, allowedOrigin, isDev)
    return app.getVersion()
  })

  ipcMain.handle("desktop:get-update-status", (event) => {
    verifySender(event.senderFrame?.url, allowedOrigin, isDev)
    return getUpdateStatus()
  })

  ipcMain.handle("desktop:reload", (event) => {
    verifySender(event.senderFrame?.url, allowedOrigin, isDev)
    mainWindow.loadURL(allowedOrigin)
    return
  })

  ipcMain.handle("desktop:logout", async (event) => {
    verifySender(event.senderFrame?.url, allowedOrigin, isDev)
    try {
      await mainWindow.webContents.session.clearStorageData({
        storages: ["cookies", "localstorage"],
      })
      console.log("[DesktopAuth] Desktop session storage cleared successfully on logout.")
      return true
    } catch (err: any) {
      console.error("[DesktopAuth] Error clearing desktop session on logout:", err?.message)
      return false
    }
  })

  ipcMain.handle("desktop:open-external", async (event, targetUrl: string) => {
    verifySender(event.senderFrame?.url, allowedOrigin, isDev)

    if (typeof targetUrl !== "string") {
      throw new Error("Invalid URL parameter")
    }

    try {
      const parsed = new URL(targetUrl)
      if (!["https:", "http:", "mailto:"].includes(parsed.protocol)) {
        throw new Error("Disallowed protocol")
      }
      await shell.openExternal(targetUrl)
      return true
    } catch (err: any) {
      console.warn(`[Security] desktop:open-external error: ${err.message}`)
      return false
    }
  })

  // ─────────────────────────────────────────────────────────────
  // Google OAuth Desktop Trigger
  // ─────────────────────────────────────────────────────────────
  ipcMain.handle("desktop:start-google-auth", async (event) => {
    verifySender(event.senderFrame?.url, allowedOrigin, isDev)

    try {
      // Generate 256-bit cryptographic state nonce
      const stateNonce = crypto.randomBytes(32).toString("hex")
      registerAuthState(stateNonce)

      const authUrl = `${allowedOrigin}/api/auth/desktop/login?state=${encodeURIComponent(stateNonce)}`
      console.log("[DesktopAuth] Launching system browser for Google OAuth:", authUrl)

      await shell.openExternal(authUrl)
      return true
    } catch (err: any) {
      console.error("[DesktopAuth] Failed to launch Google OAuth in external browser:", err)
      return false
    }
  })

  // ─────────────────────────────────────────────────────────────
  // Native Desktop Notifications
  // ─────────────────────────────────────────────────────────────
  ipcMain.handle("desktop:notify", (event, options: { title: string; body: string; silent?: boolean }) => {
    verifySender(event.senderFrame?.url, allowedOrigin, isDev)

    if (!Notification.isSupported()) {
      return false
    }

    // Sanitize title and body
    const cleanTitle = (options.title || "CollectBot").replace(/<[^>]*>?/gm, "").substring(0, 100)
    const cleanBody = (options.body || "").replace(/<[^>]*>?/gm, "").substring(0, 250)

    const iconPath = path.join(__dirname, "../assets/icon.ico")
    const notification = new Notification({
      title: cleanTitle,
      body: cleanBody,
      icon: iconPath,
      silent: !!options.silent,
    })

    notification.on("click", () => {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    })

    notification.show()
    return true
  })

  // ─────────────────────────────────────────────────────────────
  // Native File Operations
  // ─────────────────────────────────────────────────────────────
  ipcMain.handle("desktop:save-file-dialog", async (event, args: { defaultName?: string; filters?: any[] }) => {
    verifySender(event.senderFrame?.url, allowedOrigin, isDev)

    const safeDefault = path.basename(args.defaultName || "document.pdf").replace(/[^a-zA-Z0-9._-]/g, "_")
    const result = await dialog.showSaveDialog(mainWindow, {
      title: "Save Document",
      defaultPath: safeDefault,
      filters: args.filters || [{ name: "All Files", extensions: ["*"] }],
    })

    if (result.canceled || !result.filePath) {
      return null
    }

    return result.filePath
  })

  ipcMain.handle("desktop:save-file-content", async (event, args: { filePath: string; buffer: ArrayBuffer }) => {
    verifySender(event.senderFrame?.url, allowedOrigin, isDev)

    if (!args.filePath || typeof args.filePath !== "string") {
      throw new Error("Invalid file path")
    }

    // 1. Prevent path traversal
    if (args.filePath.includes("..")) {
      throw new Error("Security Violation: Path traversal detected")
    }
    const normalized = path.normalize(args.filePath)
    if (normalized.includes("..")) {
      throw new Error("Security Violation: Path traversal detected")
    }

    // 2. Enforce absolute path
    if (!path.isAbsolute(normalized)) {
      throw new Error("Security Violation: Save path must be an absolute path")
    }

    // 3. Allowed document extension whitelist (prevents saving executables/scripts)
    const ext = path.extname(normalized).toLowerCase().replace(".", "")
    const allowedExtensions = ["pdf", "csv", "xml", "json", "xlsx", "png", "jpg", "jpeg", "txt"]
    if (!allowedExtensions.includes(ext)) {
      throw new Error(`Security Violation: Disallowed file extension (.${ext})`)
    }

    // 4. Disallow overwriting symbolic links
    try {
      const lstat = await fs.lstat(normalized)
      if (lstat.isSymbolicLink()) {
        throw new Error("Security Violation: Disallowed write to symbolic link target")
      }
    } catch (err: any) {
      if (err.code !== "ENOENT") throw err
    }

    // 5. Payload size cap (50MB)
    const nodeBuffer = Buffer.from(args.buffer)
    if (nodeBuffer.length > 50 * 1024 * 1024) {
      throw new Error("Security Violation: File size exceeds 50MB maximum limit")
    }

    await fs.writeFile(normalized, nodeBuffer)
    return true
  })

  ipcMain.handle("desktop:open-file-dialog", async (event, args: { filters?: any[] }) => {
    verifySender(event.senderFrame?.url, allowedOrigin, isDev)

    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Select File to Upload",
      properties: ["openFile"],
      filters: args.filters || [{ name: "Supported Files", extensions: ["png", "jpg", "jpeg", "pdf", "csv"] }],
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    const chosenPath = result.filePaths[0]

    // Check for symbolic link
    const lstat = await fs.lstat(chosenPath)
    if (lstat.isSymbolicLink()) {
      throw new Error("Security Violation: Disallowed reading from symbolic link target")
    }

    const stat = await fs.stat(chosenPath)

    // Max 10MB limit
    if (stat.size > 10 * 1024 * 1024) {
      throw new Error("File too large. Maximum allowed size is 10MB.")
    }

    const fileBuffer = await fs.readFile(chosenPath)
    return {
      filePath: chosenPath,
      fileName: path.basename(chosenPath),
      fileData: fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength),
    }
  })
}

function verifySender(senderUrl: string | undefined, allowedOrigin: string, isDev: boolean) {
  if (!senderUrl) {
    throw new Error("Security Violation: Missing sender origin")
  }

  try {
    const sender = new URL(senderUrl)
    // Allow local offline page
    if (sender.protocol === "file:") return

    // Allow configured target origin
    if (sender.origin === allowedOrigin) return

    // In dev mode, allow localhost/127.0.0.1
    if (isDev && ALLOWED_DEV_HOSTS.includes(sender.hostname)) return

    throw new Error(`Security Violation: Unauthorized IPC sender origin (${sender.origin})`)
  } catch (err: any) {
    throw new Error(`Security Violation: ${err.message}`)
  }
}
