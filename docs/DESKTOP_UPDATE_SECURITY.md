# COLLECTBOT DESKTOP — UPDATE SECURITY & THREAT MODEL

**Target Platform:** Windows 10 / Windows 11 (x64)  
**Security Standard:** Zero-Trust Desktop Updating  
**Status:** **PHASE 5 COMPLETE & AUDITED**

---

## 1. THREAT MODEL & MITIGATIONS

Auto-update mechanisms are historically prime targets for supply chain and remote code execution (RCE) attacks. CollectBot Desktop enforces multi-layered defense-in-depth across the update pipeline:

| Threat Vector | Attack Scenario | CollectBot Desktop Defense |
| :--- | :--- | :--- |
| **Man-in-the-Middle (MITM)** | Attacker intercepts update check and serves malicious installer. | **Strict HTTPS Enforcement:** All metadata and payload transfers use TLS 1.3 to official GitHub Release endpoints (`https://github.com/aryan24-cs/CollectBot/releases`). |
| **Tampered Binary Payload** | Binary modified in transit or mirror compromised. | **SHA-512 Cryptographic Checksums:** `latest.yml` / `beta.yml` specify mandatory SHA-512 hashes. Installer binary and every blockmap chunk are validated prior to execution. |
| **Downgrade / Rollback Attack** | Attacker serves an older, signed version containing a known Chromium or Node vulnerability. | **Enforced Downgrade Defense:** `autoUpdater.allowDowngrade = false` rejects any update with a version `<= currentVersion`. |
| **Malicious Web Page IPC Hijack** | Malicious script in web context triggers silent `quitAndInstall()` or passes malicious flags. | **Preload Bridge Isolation:** The preload bridge exposes *only* read-only `getUpdateStatus()`. No execution, restart, or install commands are exposed to the DOM or window object. |
| **Unauthorized Origin IPC Calls** | Malicious frame or cross-origin popup calls desktop IPC. | **Sender Frame Verification:** IPC handlers validate `verifySender(event.senderFrame)` against `https://collectbot.in`. |
| **Update Crash Loop** | Defective update fails repeatedly, trapping the user in infinite restarts. | **Circuit Breaker:** `update-state.json` tracks consecutive failures and suspends auto-updating after 3 strikes. |

---

## 2. DOWNGRADE DEFENSE SPECIFICATION

In `desktop/src/updater.ts`, downgrade protection is strictly enabled:

```typescript
autoUpdater.allowDowngrade = false
```

### Why Downgrade Defense is Critical:
If an attacker could trick `electron-updater` into accepting an older release (e.g. v0.0.9), they could revert the desktop application back to an older Electron/Chromium runtime lacking current security patches, bypassing modern context isolation, or exploiting fixed bugs in IPC bridges.

With `allowDowngrade = false`, `electron-updater` compares semantic versions using SemVer standard:
- Only versions strictly greater than `app.getVersion()` are marked as available.
- Any payload advertising a version equal to or less than the running version is rejected immediately with an `update-not-available` event.

---

## 3. PRELOAD BRIDGE & RENDERER ISOLATION

Web applications running in Electron must **never** possess the capability to trigger executable installations or manipulate binary updater parameters.

### 1. Minimal Read-Only Preload Surface (`desktop/src/preload.ts`):
```typescript
getUpdateStatus: async () => {
  return ipcRenderer.invoke("desktop:get-update-status")
}
```

### 2. Strict IPC Origin Validation (`desktop/src/security.ts`):
```typescript
ipcMain.handle("desktop:get-update-status", (event) => {
  if (!verifySender(event.senderFrame)) {
    throw new Error("Unauthorized IPC invocation origin")
  }
  return getUpdateState()
})
```

### 3. Absolute Absence of Dangerous Primitives:
- `quitAndInstall()` is **not** exposed to the preload bridge.
- `checkForUpdates()` is **not** exposed to the preload bridge.
- Channel switching is **not** exposed to the preload bridge (it is exclusively accessible via native Windows menu items handled in the main process).
- The web application cannot spoof update events, pass command line flags, or force restarts.

---

## 4. METADATA & BLOCKMAP VALIDATION

When packaging releases, `electron-builder` generates the feed manifest:

```yaml
# dist/latest.yml
version: 0.1.0
files:
  - url: CollectBotSetup-0.1.0-x64.exe
    sha512: O1l8qVv5ZJzN8ZtH/sYqR9u...==
    size: 121213032
    blockMapSize: 129032
path: CollectBotSetup-0.1.0-x64.exe
sha512: O1l8qVv5ZJzN8ZtH/sYqR9u...==
releaseDate: '2026-11-11T17:15:20.123Z'
```

### Verification Pipeline:
1. `electron-updater` fetches `latest.yml` over HTTPS from GitHub.
2. It parses and validates that the file entry matches expected executable naming patterns (`CollectBotSetup-<version>-x64.exe`).
3. It downloads `CollectBotSetup-<version>-x64.exe.blockmap` over HTTPS.
4. During download, it verifies the SHA-512 checksum of each individual 64 KB block against the blockmap.
5. Once all chunks are assembled into the target installer binary in `%LOCALAPPDATA%\collectbot-updater`, it calculates the full-file SHA-512 checksum.
6. If the calculated hash does not match `latest.yml` bit-for-bit, the file is deleted immediately, an error is logged, and installation is aborted.

---

## 5. UPDATE RECOVERY & CIRCUIT BREAKER

To guarantee application availability, CollectBot tracks update health locally in `%APPDATA%\CollectBot\update-state.json`:

```json
{
  "consecutiveFailures": 0,
  "lastAttempt": "2026-11-11T22:30:00.000Z",
  "lastFailedVersion": null,
  "circuitBroken": false
}
```

- Every failed update attempt increments `consecutiveFailures`.
- If `consecutiveFailures >= 3`:
  - `circuitBroken` is set to `true`.
  - Automatic 4-hour background update polling is halted for the remainder of the application lifecycle.
  - This prevents battery drain, bandwidth consumption, and endless restart loops on defective networks or corrupted local filesystems.
  - The circuit breaker resets automatically when the user explicitly triggers a manual check via `Help -> Check for Updates...` or when a successful update succeeds.

---

## 6. CODE SIGNING INTEGRATION (AUTHENTICODE)

When an enterprise Authenticode certificate is supplied in CI/CD via `CSC_LINK` and `CSC_KEY_PASSWORD`:
1. `electron-builder` signs the executable with dual SHA-1 / SHA-256 signatures with timestamping via Sectigo/DigiCert timestamp servers.
2. Windows Defender SmartScreen validates the binary against Microsoft's reputation ledger.
3. Upon update download, Windows validates the digital signature before NSIS silent execution begins.

