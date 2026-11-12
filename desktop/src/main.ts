import { app, BrowserWindow, session, Notification, dialog } from "electron"
import path from "node:path"
import { configureSecurity, verifyAndConsumeAuthState } from "./security"
import { createAppMenu } from "./menu"
import { initAutoUpdater, isCriticalFinancialRoute } from "./updater"

// Define application target origins
const PROD_URL = "https://collectbot.vercel.app"
const DEV_URL = process.env.DESKTOP_DEV_URL || "http://localhost:3000"

const isDev =
  process.env.NODE_ENV === "development" ||
  process.env.COLLECTBOT_DESKTOP_ENV === "development"

// Resolve target URL safely
const targetUrl = isDev ? DEV_URL : PROD_URL

let mainWindow: BrowserWindow | null = null
let persistentSession: Electron.Session | null = null

// ─────────────────────────────────────────────────────────────
// Windows Protocol Registration (collectbot://)
// ─────────────────────────────────────────────────────────────
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient("collectbot", process.execPath, [path.resolve(process.argv[1])])
  }
} else {
  app.setAsDefaultProtocolClient("collectbot")
}

// ─────────────────────────────────────────────────────────────
// Deep-Link Protocol Handler (OAuth Callback)
// ─────────────────────────────────────────────────────────────
async function handleDeepLink(rawUrl: string) {
  // Redact raw ticket and sensitive tokens from console logging
  try {
    const sanitizedUrl = new URL(rawUrl)
    if (sanitizedUrl.searchParams.has("ticket")) {
      sanitizedUrl.searchParams.set("ticket", "[REDACTED]")
    }
    console.log(`[CollectBot DeepLink] Received protocol invocation: ${sanitizedUrl.toString()}`)
  } catch {
    console.log("[CollectBot DeepLink] Received protocol invocation (url parsing failed)")
  }

  try {
    const parsed = new URL(rawUrl)

    if (parsed.protocol !== "collectbot:") {
      console.warn(`[CollectBot DeepLink] Rejected invalid protocol: ${parsed.protocol}`)
      return
    }

    // Expected shape: collectbot://auth/callback?ticket=...&state=...
    const isAuthCallback =
      parsed.hostname === "auth" &&
      (parsed.pathname === "/callback" || parsed.pathname === "//callback" || parsed.pathname === "")

    if (!isAuthCallback) {
      console.warn(`[CollectBot DeepLink] Disallowed deep-link path: ${parsed.hostname}${parsed.pathname}`)
      return
    }

    const ticket = parsed.searchParams.get("ticket")
    const state = parsed.searchParams.get("state")

    if (!ticket || !state) {
      console.warn("[CollectBot DeepLink] Missing ticket or state parameters in callback URL.")
      return
    }

    // Verify state nonce against in-memory registry (CSRF & Transaction Binding)
    const isStateValid = verifyAndConsumeAuthState(state)
    if (!isStateValid) {
      console.error("[CollectBot DeepLink] Invalid, expired, or unprompted OAuth state nonce.")
      if (Notification.isSupported()) {
        new Notification({
          title: "Sign-In Failed",
          body: "Authentication session expired or security verification failed. Please try again.",
          icon: path.join(__dirname, "../assets/icon.ico"),
        }).show()
      }
      return
    }

    // Exchange one-time ticket with Next.js backend
    console.log("[CollectBot DeepLink] Exchanging one-time authentication ticket with backend...")
    const exchangeEndpoint = `${targetUrl}/api/auth/desktop/exchange`
    const exchangeRes = await fetch(exchangeEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticket }),
    })

    if (!exchangeRes.ok) {
      const errData = await exchangeRes.json().catch(() => ({}))
      console.error("[CollectBot DeepLink] Ticket exchange failed:", errData.error || exchangeRes.statusText)
      return
    }

    const exchangeData = await exchangeRes.json()
    console.log("[CollectBot DeepLink] Ticket exchanged successfully. Establishing session...")

    // Inject session cookies into persistent Chromium partition
    if (persistentSession) {
      const cookieUrl = targetUrl

      if (exchangeData.supabaseCookie) {
        await persistentSession.cookies.set({
          url: cookieUrl,
          name: exchangeData.supabaseCookie.name,
          value: exchangeData.supabaseCookie.value,
          path: "/",
          secure: !isDev,
          httpOnly: true,
          sameSite: "lax",
          expirationDate: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30 days
        })
      }

      if (exchangeData.activeBusinessId) {
        await persistentSession.cookies.set({
          url: cookieUrl,
          name: "cb_active_business_id",
          value: exchangeData.activeBusinessId,
          path: "/",
          secure: !isDev,
          httpOnly: false,
          sameSite: "lax",
          expirationDate: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
        })
      }
    }

    // Bring desktop application to front
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()

      const dest = exchangeData.destination || "/dashboard"
      console.log(`[CollectBot DeepLink] Navigating window to: ${dest}`)
      mainWindow.loadURL(`${targetUrl}${dest}`)

      if (Notification.isSupported()) {
        new Notification({
          title: "CollectBot Desktop",
          body: "Signed in successfully. Welcome back!",
          icon: path.join(__dirname, "../assets/icon.ico"),
        }).show()
      }
    }
  } catch (err: any) {
    console.error("[CollectBot DeepLink] Error handling deep link:", err?.message)
  }
}

// ─────────────────────────────────────────────────────────────
// Single-Instance Lock & Second-Instance Deep-Link Handling
// ─────────────────────────────────────────────────────────────
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  console.log("[CollectBot Desktop] Another instance is already running. Quitting.")
  app.quit()
} else {
  app.on("second-instance", (_event, argv) => {
    // Restore and focus main window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }

    // Check if second instance was invoked via deep link on Windows
    const deepLinkUrl = argv.find((arg) => arg.startsWith("collectbot://"))
    if (deepLinkUrl) {
      handleDeepLink(deepLinkUrl)
    }
  })

  // macOS protocol handler support
  app.on("open-url", (event, url) => {
    event.preventDefault()
    handleDeepLink(url)
  })

  app.whenReady().then(async () => {
    // Configure dedicated persistent session partition for CollectBot
    persistentSession = session.fromPartition("persist:collectbot", {
      cache: true,
    })

    // Custom user agent branding
    const defaultUserAgent = persistentSession.getUserAgent()
    const appVersion = app.getVersion()
    persistentSession.setUserAgent(`${defaultUserAgent} CollectBotDesktop/${appVersion}`)

    // Native Download Management (PDF invoices and CSV exports)
    persistentSession.on("will-download", (_event, item) => {
      const filename = path.basename(item.getFilename() || "export.csv")
      const defaultSavePath = path.join(app.getPath("downloads"), filename)
      item.setSavePath(defaultSavePath)

      item.once("done", (_event, state) => {
        if (state === "completed" && Notification.isSupported()) {
          new Notification({
            title: "Download Complete",
            body: `File saved to Downloads: ${filename}`,
            icon: path.join(__dirname, "../assets/icon.ico"),
          }).show()
        }
      })
    })

    // Create main window
    mainWindow = new BrowserWindow({
      width: 1366,
      height: 868,
      minWidth: 1024,
      minHeight: 700,
      center: true,
      show: false,
      backgroundColor: "#FAF8F5",
      title: "CollectBot — One Business OS",
      icon: path.join(__dirname, "../assets/icon.ico"),
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        webSecurity: true,
        allowRunningInsecureContent: false,
        partition: "persist:collectbot",
      },
    })

    // Setup native Windows application menu
    createAppMenu(mainWindow, isDev)

    // Apply strict security controls and navigation guards
    configureSecurity(mainWindow, targetUrl, isDev)

    // Initialize background auto-updater with channel management
    initAutoUpdater(mainWindow, isDev)

    // Active financial workflow shutdown guard (prevent discarding unsaved work)
    let isForceClosing = false
    mainWindow.on("close", (event) => {
      if (isForceClosing) return
      try {
        const currentUrl = mainWindow?.webContents.getURL()
        if (isCriticalFinancialRoute(currentUrl)) {
          event.preventDefault()
          dialog
            .showMessageBox(mainWindow!, {
              type: "warning",
              title: "Unsaved Changes Warning",
              message: "Active Transaction or Record Detected",
              detail:
                "You are currently on an invoice, payment, or sales deal page. Closing CollectBot may discard unsaved changes. Do you want to close anyway?",
              buttons: ["Close Anyway", "Keep Working"],
              defaultId: 1,
              cancelId: 1,
            })
            .then((res) => {
              if (res.response === 0) {
                isForceClosing = true
                mainWindow?.close()
              }
            })
        }
      } catch {}
    })

    // Display window smoothly once initial DOM is ready
    mainWindow.once("ready-to-show", () => {
      mainWindow?.show()
    })

    // Network & Navigation Failure Handling (Offline fallback)
    mainWindow.webContents.on(
      "did-fail-load",
      (_event, errorCode, errorDescription, validatedURL) => {
        console.warn(
          `[CollectBot Desktop] Failed to load ${validatedURL} (Code: ${errorCode}, ${errorDescription})`
        )

        if (errorCode === -3) {
          return
        }

        const offlinePath = path.join(__dirname, "../assets/offline.html")
        mainWindow?.loadFile(offlinePath)
      }
    )

    // Load CollectBot target URL
    console.log(`[CollectBot Desktop] Loading application from: ${targetUrl}`)
    mainWindow.loadURL(targetUrl)

    // Check if cold start was triggered with a deep link
    const initialDeepLink = process.argv.find((arg) => arg.startsWith("collectbot://"))
    if (initialDeepLink) {
      setTimeout(() => {
        handleDeepLink(initialDeepLink)
      }, 1000)
    }

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = null
      }
    })
  })

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit()
    }
  })
}
