# COLLECTBOT DESKTOP — UPDATE CHANNELS & VERSION MANAGEMENT

**Target Platform:** Windows 10 / Windows 11 (x64)  
**Supported Channels:** `stable` (Default) | `beta` (Opt-in Prerelease)  
**Configuration File:** `%APPDATA%\CollectBot\update-config.json`  
**Status:** **PHASE 5 COMPLETE & VERIFIED**

---

## 1. CHANNEL ARCHITECTURE

CollectBot Desktop supports two distinct update channels to provide both enterprise stability and early testing:

| Channel | Intended Audience | Update Feed Manifest | GitHub Release Tag | `allowPrerelease` |
| :--- | :--- | :--- | :--- | :--- |
| **`stable`** | All production businesses and regular staff | `latest.yml` | `v*.*.*` (e.g., `v1.0.0`) | `false` |
| **`beta`** | Internal testers, QA team, early adopters | `beta.yml` | `v*.*.*-beta*` (e.g., `v1.1.0-beta.1`) | `true` |

```mermaid
flowchart LR
    subgraph Channels["Update Channel Selection"]
        StableChoice["Stable Channel (Default)"]
        BetaChoice["Beta Channel (Opt-in)"]
    end

    subgraph Config["%APPDATA%\\CollectBot\\update-config.json"]
        SavedConfig["{ \"channel\": \"stable\" | \"beta\" }"]
    end

    subgraph Feeds["GitHub Releases Update Feeds"]
        StableFeed["latest.yml (Stable Manifest)"]
        BetaFeed["beta.yml (Beta Manifest)"]
    end

    StableChoice -->|Writes| SavedConfig
    BetaChoice -->|Writes| SavedConfig

    SavedConfig -->|Configures allowPrerelease: false| StableFeed
    SavedConfig -->|Configures allowPrerelease: true| BetaFeed
```

---

## 2. CHANNEL CONFIGURATION PERSISTENCE

User channel preference is stored persistently on the local Windows system:
- **Location:** `%APPDATA%\CollectBot\update-config.json`
- **Schema:**
  ```json
  {
    "channel": "stable",
    "lastSwitched": "2026-11-11T22:45:00.000Z"
  }
  ```

### Whitelist & Fallback Defense:
The channel loader (`loadUpdateConfig` in `desktop/src/updater.ts`) strictly sanitizes the file:
```typescript
export function loadUpdateConfig(): UpdateConfig {
  try {
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, "utf-8"))
      if (data.channel === "beta" || data.channel === "stable") {
        return { channel: data.channel }
      }
    }
  } catch (err) {
    console.error("[Updater] Failed to load update config:", err)
  }
  return { channel: "stable" } // Default safe fallback
}
```
Any malformed, unknown, or corrupted channel value instantly defaults back to `"stable"`.

---

## 3. UI CHANNEL SELECTOR & MENU INTEGRATION

Channel selection is surfaced directly in the Windows Application Menu (`desktop/src/menu.ts`) under `Help -> Update Channel`:

```
Help
├── Check for Updates...
├── Update Channel
│   ├── (•) Stable (Recommended)
│   └── ( ) Beta (Prerelease)
├── View Documentation (F1)
├── -----------------------------
└── About CollectBot
```

### Channel Switch Workflow:
1. When a user clicks **"Beta (Prerelease)"**, a native confirmation dialog opens:
   > **Title:** Switch to Beta Channel  
   > **Message:** *"You are switching to the Beta update channel. Beta releases contain pre-release features and bug fixes that are still being tested. You may switch back to Stable at any time."*  
   > **Buttons:** `[Switch to Beta]` `[Cancel]`
2. If confirmed:
   - Channel config updates to `"beta"`.
   - `autoUpdater.allowPrerelease = true`.
   - `autoUpdater.channel = "beta"`.
   - An immediate manual update check triggers against `beta.yml`.
3. When switching from Beta back to **"Stable"**:
   - Channel config updates to `"stable"`.
   - `autoUpdater.allowPrerelease = false`.
   - `autoUpdater.channel = "latest"`.
   - An immediate update check triggers against `latest.yml`.
4. The active channel is also displayed in the **About CollectBot** dialog (`Help -> About CollectBot`):
   > *"CollectBot Desktop — One Business OS*\n
   > *Desktop Shell: v0.1.0*\n
   > *Update Channel: stable*\n
   > *Electron: 45.3.0 | Node.js: 24.2.0 | Chromium: 146.0.7680.165"*

---

## 4. STAGED ROLLOUT REALITIES & GITHUB RELEASES

### GitHub Releases Limitations:
Unlike enterprise CDNs (e.g. AWS CloudFront or Google Cloud CDN with traffic splitting), **GitHub Releases does not support percentage-based traffic routing** (e.g., rolling out to 10% of users).

### CollectBot's Staged Rollout Strategy:
1. **Stage 1 (Internal Canary):**
   - Package installer and test on clean Windows test systems.
2. **Stage 2 (Opt-in Beta Cohort):**
   - Publish prerelease tag `v*.*.*-beta*`.
   - Electron-builder uploads `beta.yml`, `CollectBotSetup-<version>-x64.exe`, and `.blockmap`.
   - Only users opted into the `beta` channel receive this update.
   - Run in beta for 48–72 hours to gather stability telemetry and verify auth ticket flows.
3. **Stage 3 (General Availability Stable):**
   - Publish release tag `v*.*.*`.
   - Electron-builder uploads `latest.yml`, the signed installer, and `.blockmap`.
   - All desktop clients on the `stable` channel receive the update.

---

## 5. SEMANTIC VERSIONING RULES

Tags must strictly follow Semantic Versioning (`vMAJOR.MINOR.PATCH[-PRERELEASE]`):

| Type | Tag Pattern | Package.json Version | Feed Generated | Target Audience |
| :--- | :--- | :--- | :--- | :--- |
| **Stable Release** | `v1.0.0` | `"1.0.0"` | `latest.yml` | General Public |
| **Stable Patch** | `v1.0.1` | `"1.0.1"` | `latest.yml` | General Public |
| **Beta Release** | `v1.1.0-beta.1` | `"1.1.0-beta.1"` | `beta.yml` | Beta Channel Users |
| **Beta Revision** | `v1.1.0-beta.2` | `"1.1.0-beta.2"` | `beta.yml` | Beta Channel Users |

> [!IMPORTANT]
> Always update `package.json` version to match the Git tag before triggering the GitHub Actions release workflow.

