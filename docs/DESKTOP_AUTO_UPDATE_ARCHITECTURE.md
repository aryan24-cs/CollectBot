# COLLECTBOT DESKTOP — AUTO-UPDATE ARCHITECTURE

**Target Platform:** Windows 10 / Windows 11 (x64)  
**Distribution Engine:** Electron + NSIS  
**Update Engine:** `electron-updater` (v6.8.11)  
**Hosting Provider:** GitHub Releases (`aryan24-cs/CollectBot`)  
**Deployment Paradigm:** Option A — Hosted Next.js Application inside Hardened Electron Shell  
**Status:** **PHASE 5 COMPLETE & VERIFIED**

---

## 1. ARCHITECTURE OVERVIEW

CollectBot Desktop uses `electron-updater` to provide silent, differential, and cryptographically verified background updates. Because CollectBot Desktop operates under **Option A** (the Electron container loads `https://collectbot.in` dynamically), updates to the desktop binary are only required when the native shell, preload bridge, Chromium engine, or native OS integrations evolve. The hosted SaaS web application updates continuously on Vercel without requiring desktop client downloads.

```mermaid
flowchart TD
    subgraph GitHub["GitHub Cloud Infrastructure"]
        Release["GitHub Releases (aryan24-cs/CollectBot)"]
        FeedStable["latest.yml (Stable Manifest)"]
        FeedBeta["beta.yml (Beta Manifest)"]
        Blockmap["CollectBotSetup-<version>-x64.exe.blockmap"]
        Installer["CollectBotSetup-<version>-x64.exe"]
        
        Release --> FeedStable
        Release --> FeedBeta
        Release --> Blockmap
        Release --> Installer
    end

    subgraph Client["Windows Client Operating System"]
        subgraph AppData["Local File System (%APPDATA%\\CollectBot)"]
            Config["update-config.json (Channel: stable | beta)"]
            State["update-state.json (Failure Counter & Backoff)"]
        end

        subgraph MainProcess["Electron Main Process (updater.ts)"]
            UpdaterEngine["electron-updater (AppUpdater)"]
            ChannelManager["Channel Selector & Downgrade Guard"]
            Guard["Active Workflow Guard (URL Inspector)"]
            
            Config --> ChannelManager
            State --> ChannelManager
            ChannelManager --> UpdaterEngine
            Guard -.->|Blocks Restart if editing invoice/payment| UpdaterEngine
        end

        subgraph Window["BrowserWindow (https://collectbot.in)"]
            Renderer["Next.js Web Page"]
            Preload["Preload Bridge (getUpdateStatus)"]
            Renderer --> Preload
            Preload -->|desktop:get-update-status (Read-Only)| MainProcess
        end
    end

    UpdaterEngine -->|HTTPS Check (every 4 hrs or manual)| FeedStable
    UpdaterEngine -->|HTTPS Check (if beta channel)| FeedBeta
    FeedStable -->|Update Available| UpdaterEngine
    UpdaterEngine -->|HTTP Range Requests| Blockmap
    UpdaterEngine -->|Differential Chunk Download| Installer
    UpdaterEngine -->|Prompts Restart when safe| Window
```

---

## 2. UPDATE LIFECYCLE STATE MACHINE

The update engine transitions through strict, deterministic states:

```
[ IDLE ] 
   │
   ├─► (Scheduled Interval: 4h / Manual Menu Click)
   │
   ▼
[ CHECKING ] ──► (No Update / Error / Circuit Broken) ──► [ IDLE ]
   │
   ├─► Update Detected (Semantic version > Current version)
   │
   ▼
[ AVAILABLE ]
   │
   ├─► Download Started (Background stream via HTTP range requests)
   │
   ▼
[ DOWNLOADING ] ──► (Network Interrupted) ──► [ ERROR: State Logged ] ──► [ IDLE ]
   │
   ├─► Differential Assembly & SHA-512 Verification Complete
   │
   ▼
[ DOWNLOADED ]
   │
   ├─► Check Active Screen Guard:
   │     ├─► User is on /invoices/new, /invoices/*, /payments/*, /deals/*
   │     │     └─► [ DEFERRED ] (Wait for safe route navigation or app quit)
   │     │
   │     └─► User is on safe route (Dashboard, Settings, Reports, etc.)
   │           └─► [ PROMPT USER ] 
   │                 ├─► User clicks "Restart Now" ──► [ RESTART & INSTALL ]
   │                 └─► User clicks "Later" ──────► [ INSTALL ON QUIT ]
```

### Lifecycle Event Handlers (`desktop/src/updater.ts`):
1. **`checking-for-update`:** Broadcasts status `checking`. Updates native menu state.
2. **`update-available`:** Broadcasts status `available` with target version. Logs update details.
3. **`update-not-available`:** Broadcasts status `not-available`. Resets failure counter in `update-state.json`.
4. **`download-progress`:** Calculates download speed, percentage, transferred bytes. Broadcasts status `downloading`.
5. **`update-downloaded`:** Validates SHA-512 checksum against blockmap. Invokes the Active Workflow Guard before showing restart confirmation dialog.
6. **`error`:** Increments failure counter in `update-state.json`. If 3 consecutive failures occur, enters circuit-breaker mode to avoid battery and bandwidth drain.

---

## 3. DIFFERENTIAL DOWNLOAD MECHANICS (BLOCKMAPS)

CollectBot Desktop uses NSIS differential blockmaps:
- **How Blockmaps Work:** When `electron-builder` packages `CollectBotSetup-<version>-x64.exe`, it simultaneously generates `CollectBotSetup-<version>-x64.exe.blockmap`.
- **Differential Calculation:** The blockmap breaks the 115 MB installer into indexed 64 KB compressed blocks, each identified by a SHA-512 hash.
- **Bandwidth Optimization:** When an update is downloaded:
  1. `electron-updater` downloads the remote blockmap (~80 KB).
  2. It compares the remote blockmap against the local installed files.
  3. Only the changed chunks (typically 2 MB to 15 MB for minor electron updates, or <500 KB for shell updates) are downloaded using HTTP Range Requests (`bytes=start-end`).
  4. The installer reconstructs the executable locally and verifies its composite SHA-512 checksum.
- **Fallback:** If range requests fail or blockmap parsing encounters an error, `electron-updater` automatically falls back to streaming the full binary installer over HTTPS.

---

## 4. ACTIVE WORKFLOW GUARD (DATA LOSS PREVENTION)

A critical hazard in desktop business software is an update restarting the application while a user is typing a tax invoice, processing a client payment, or entering sales deal terms.

CollectBot Desktop implements an **Active Workflow Guard** in `desktop/src/updater.ts`:

```typescript
function isUserInCriticalWorkflow(mainWindow: BrowserWindow): boolean {
  if (mainWindow.isDestroyed()) return false
  const currentUrl = mainWindow.webContents.getURL()

  const criticalRoutePatterns = [
    /\/invoices\/new/i,
    /\/invoices\/[a-zA-Z0-9_-]+\/edit/i,
    /\/payments\/new/i,
    /\/payments\/record/i,
    /\/deals\/new/i,
  ]

  return criticalRoutePatterns.some((pattern) => pattern.test(currentUrl))
}
```

### Guard Policy:
- When `update-downloaded` fires, `isUserInCriticalWorkflow(mainWindow)` is evaluated.
- If the user is actively on any of the protected routes, **no restart dialog is presented**.
- The installer sets `autoInstallOnAppQuit = true`. The update will seamlessly apply when the business owner finishes work and closes CollectBot.
- If the user navigates away to a safe route (e.g., Dashboard or Settings), the application gracefully prompts:
  > *"A new version of CollectBot (vX.Y.Z) is downloaded and ready to install. Restart now to apply the update, or install automatically when closing CollectBot?"*
  > `[Restart Now]` `[Later]`

---

## 5. UPDATE CONFIGURATION SPECIFICATION

The update system is configured in `electron-builder.yml`:

```yaml
publish:
  provider: github
  owner: aryan24-cs
  repo: CollectBot
  private: false
```

And initialized in the Electron main process:

```typescript
// desktop/src/updater.ts
autoUpdater.autoDownload = true
autoUpdater.autoInstallOnAppQuit = true
autoUpdater.allowDowngrade = false
```

Periodic checks are scheduled every 4 hours via `setInterval` in production, with initial check running 15 seconds after window launch to allow the web shell to complete initial render.

