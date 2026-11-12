# COLLECTBOT DESKTOP CONVERSION — ARCHITECTURE SPECIFICATION

**Document Version:** 4.0.0 (Phase 5 Auto-Update & Channel Management Architecture)  
**Date:** November 11, 2026  
**Target Environment:** Windows 10 / Windows 11 (x64)  
**Distribution Target:** Standalone NSIS Executable (`CollectBotSetup-<version>-x64.exe`)  
**Deployment Paradigm:** Option A — Hosted Next.js Application Inside Hardened Electron Shell  
**Status:** **PHASE 5 COMPLETE & AUDITED**  

---

## 1. HIGH-LEVEL ARCHITECTURE OVERVIEW

CollectBot Desktop operates as an enterprise Windows desktop shell wrapping the verified, production-hosted Next.js web application (`https://collectbot.in`). 

The desktop conversion introduces **no backend modifications, no database duplication, and no static export constraints**. The Next.js server on Vercel remains the single source of truth for business logic, multi-tenant isolation, and SSR rendering.

```mermaid
flowchart TD
    subgraph Client["Windows Client Operating System"]
        User["Business Owner / Employee"]
        OS["Windows 10 / 11 Shell"]
        Exe["CollectBot.exe (NSIS Installed)"]
        User -->|Launches| Exe
        Exe --> OS
        
        subgraph ElectronRuntime["Electron Application Runtime"]
            Main["Electron Main Process (Node.js + Chromium)"]
            Preload["Secure Preload Bridge (contextBridge)"]
            Window["BrowserWindow (Chromium Engine)"]
            Updater["Auto-Updater Engine (electron-updater)"]
            
            Main -->|Instantiates & Configures| Window
            Main -->|Injects Securely| Preload
            Main -->|Initializes & Polls| Updater
            Preload -->|Exposes window.collectbotAPI| Window
            Window -->|Typed IPC Calls| Main
        end
        
        subgraph LocalStore["Encrypted Local Storage (%APPDATA%)"]
            Cookies["Chromium Cookie Jar (sb-*-auth-token, cb_active_business_id)"]
            UpdateCfg["update-config.json (stable | beta)"]
            UpdateState["update-state.json (Failure Counter)"]
            Window -.->|Persistent Auth (persist:collectbot)| Cookies
            Updater -.->|Persists Channel & Circuit Breaker| UpdateCfg
            Updater -.-> UpdateState
        end
    end

    subgraph CloudInfra["Hosted Production Infrastructure (Cloud)"]
        Vercel["Vercel Edge & Serverless Runtime (Next.js 16)"]
        Proxy["Next.js Proxy / Middleware (src/proxy.ts)"]
        Routes["Server Components & Route Handlers (/api/*)"]
        Supabase["Supabase Cloud (Auth SSR, PostgreSQL 15, Storage)"]
        Tickets["desktop_auth_tickets (256-bit Hash, 60s TTL)"]
        Gateways["Payment & Comms Gateways (Razorpay, Resend, WhatsApp)"]

        Window -->|HTTPS / WSS (https://collectbot.in)| Vercel
        Vercel --> Proxy
        Proxy --> Routes
        Routes -->|Service-Role Client| Supabase
        Routes --> Tickets
        Routes --> Gateways
    end

    subgraph GitHubInfra["GitHub Releases (aryan24-cs/CollectBot)"]
        Feeds["latest.yml / beta.yml Manifests"]
        Blockmaps["*.blockmap Differential Chunks"]
        Updater -->|HTTPS Check (every 4 hrs)| Feeds
        Updater -->|HTTP Range Requests| Blockmaps
    end

    subgraph ExtBrowser["External System Browser (Chrome / Edge / Firefox)"]
        GoogleAuth["Google Accounts Login (accounts.google.com)"]
    end

    Window -.->|Google OAuth Click| Main
    Main -->|shell.openExternal| ExtBrowser
    ExtBrowser -->|OAuth Handshake| GoogleAuth
    GoogleAuth -->|OAuth Callback| Vercel
    Vercel -->|Ticket Generation & Redirect| ExtBrowser
    ExtBrowser -->|Deep Link: collectbot://auth/callback| OS
    OS -->|second-instance / process.argv| Main
    Main -->|POST /api/auth/desktop/exchange| Vercel
    Vercel -->|Atomically Burn Ticket & Return Session| Main
    Main -->|Sets Cookies on persist:collectbot & Navigates| Window
```

---

## 2. PRELOAD BRIDGE INTERFACE (`desktop/src/preload.ts`)

The Preload bridge exposes a minimal, strictly typed API to the web renderer via `contextBridge.exposeInMainWorld("collectbotAPI", ...)`:

```typescript
export interface CollectBotDesktopBridge {
  readonly isDesktop: true
  readonly platform: string
  getAppVersion: () => Promise<string>
  reloadApp: () => Promise<void>
  openExternal: (url: string) => Promise<boolean>
  startGoogleAuth: () => Promise<boolean>
  showNotification: (options: { title: string; body: string; silent?: boolean }) => Promise<boolean>
  saveFileDialog: (defaultName: string, filters?: FileFilter[]) => Promise<string | null>
  saveFileContent: (filePath: string, buffer: ArrayBuffer) => Promise<boolean>
  openFileDialog: (filters?: FileFilter[]) => Promise<OpenFileResult | null>
  getUpdateStatus: () => Promise<{
    status: "idle" | "checking" | "available" | "downloading" | "downloaded" | "error" | "not-available"
    channel: "stable" | "beta"
    version: string | null
    downloadProgress: number | null
  }>
}
```

---

## 3. BROWSERWINDOW CONFIGURATION & WEBPREFERENCES

```typescript
mainWindow = new BrowserWindow({
  width: 1366,
  height: 868,
  minWidth: 1024,
  minHeight: 700,
  center: true,
  show: false,
  backgroundColor: "#FAF8F5", // CollectBot Brand Canvas
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
```

---

## 4. OAUTH & TICKET EXCHANGE ARCHITECTURE

1. **State Nonce:** 32-byte cryptographic random string generated per OAuth transaction.
2. **One-Time Ticket:** 256-bit entropy random token stored hashed (`SHA-256`) in `desktop_auth_tickets`.
3. **Atomic Consumption:** Burn-on-read execution prevents token replay.
4. **Session Parity:** Injects `@supabase/ssr` cookies (`sb-*-auth-token`, `cb_active_business_id`) into persistent partition `persist:collectbot`.

---

## 5. PACKAGING & DISTRIBUTION ARCHITECTURE (`electron-builder` + NSIS)

1. **Packaging Engine:** `electron-builder` (v26.18.0) compiling to a Windows x64 NSIS installer (`CollectBotSetup-<version>-x64.exe`).
2. **Lean asar Archive:** The `app.asar` bundle contains exclusively `desktop/dist/` (compiled main, updater & preload scripts), `desktop/assets/` (icon & offline screen), and sanitized `package.json` (~48 KB). No Next.js server code, frontend components, or heavy web dependencies are bundled.
3. **Installer Policy:**
   - Per-user installation by default (`perMachine: false`) preventing unnecessary UAC elevation prompts.
   - User-configurable install directory (`allowToChangeInstallationDirectory: true`).
   - Start Menu and Desktop shortcuts enabled.
   - Preserves user application data on uninstall (`deleteAppDataOnUninstall: false`).
   - Windows Custom Protocol Handler (`collectbot://`) registered and unregistered automatically.
4. **CI/CD Automation:** GitHub Actions workflow (`.github/workflows/release-desktop.yml`) triggers on version tags (`v*.*.*` and `v*.*.*-beta*`), running tests, static type checking, compilation, packaging, SHA-256 checksum generation, and publishing official GitHub Releases.

---

## 6. AUTO-UPDATE & CHANNEL ARCHITECTURE (`desktop/src/updater.ts`)

1. **Engine:** `electron-updater` (v6.8.11) with GitHub Releases provider.
2. **Multi-Channel Management:**
   - **`stable`:** Consumes `latest.yml`, tags `v*.*.*`, `allowPrerelease: false`.
   - **`beta`:** Consumes `beta.yml`, tags `v*.*.*-beta*`, `allowPrerelease: true`.
   - Preference persisted in `%APPDATA%\CollectBot\update-config.json`.
3. **Differential Delivery:** NSIS blockmaps (`.blockmap`) enable chunked differential downloads via HTTP Range Requests, saving bandwidth and installation time.
4. **Active Workflow Guard:** Prevents prompt-and-restart execution if the user is currently on critical business routes (`/invoices/new`, `/invoices/*`, `/payments/*`, `/deals/*`), deferring installation to application exit (`autoInstallOnAppQuit: true`).
5. **Downgrade Defense:** `allowDowngrade = false` strictly enforced against rollback attacks.
6. **Circuit Breaker:** Tracks consecutive update failures in `update-state.json`; auto-update polling halts if 3 failures occur in succession.
