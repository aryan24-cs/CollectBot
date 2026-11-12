# COLLECTBOT DESKTOP — RELEASE RUNBOOK

**Target Platform:** Windows 10 / Windows 11 (x64)  
**Distribution Pipeline:** GitHub Actions (`.github/workflows/release-desktop.yml`)  
**Artifacts Produced:** NSIS Installer, Blockmaps, SHA-256 Checksums, Update Manifests (`latest.yml`, `beta.yml`)  
**Status:** **PHASE 5 OPERATIONAL RUNBOOK**

---

## 1. PRE-RELEASE READINESS CHECKLIST

Before creating any release tag, the release engineer must verify each gate:

- [ ] **1. Test Suite Passes:**  
  Run `node tests/desktop-security.test.mjs` locally. All 34 assertions / 22 test suites must pass with zero failures.
- [ ] **2. Static Type Checks:**  
  Run `npx tsc --noEmit`. Must exit with code `0` and 0 errors.
- [ ] **3. Desktop Bundle Verification:**  
  Run `npm run desktop:compile`. Confirm `desktop/dist/main.js` and `desktop/dist/preload.js` are produced cleanly with esbuild.
- [ ] **4. Production Database Migration Applied:**  
  Confirm `schema.sql` migration containing `desktop_auth_tickets` table and atomic RPC functions has been executed in the live Supabase production project (`https://collectbot.in`).
- [ ] **5. GitHub Repository Secrets Configured:**  
  Verify the following secrets exist in GitHub Repository Settings (`Settings -> Secrets and variables -> Actions`):
  - `GH_TOKEN` or default `GITHUB_TOKEN` (with `contents: write` permissions)
  - `CSC_LINK` (Base64-encoded `.p12` / `.pfx` Authenticode certificate, optional in development, required for production)
  - `CSC_KEY_PASSWORD` (Password for the code signing certificate)

---

## 2. STABLE RELEASE PROCEDURE (`latest.yml`)

Use this procedure to publish an official production update to all desktop users on the **Stable** channel.

### Step 1: Update Application Version
Edit `package.json` and set the target semantic version:
```json
{
  "name": "collectbot",
  "version": "1.0.0"
}
```

### Step 2: Commit Version Bump
```powershell
git add package.json package-lock.json
git commit -m "chore(release): bump desktop version to 1.0.0"
git push origin master
```

### Step 3: Create and Push Git Tag
Create an annotated tag matching `v*.*.*`:
```powershell
git tag -a v1.0.0 -m "Release CollectBot Desktop v1.0.0"
git push origin v1.0.0
```

### Step 4: Monitor GitHub Actions Workflow
1. Navigate to `https://github.com/aryan24-cs/CollectBot/actions`.
2. Select the running **"Build & Release Desktop Windows Installer"** workflow.
3. Observe the pipeline execution:
   - Sets up Node.js 24.
   - Installs production and dev dependencies.
   - Runs `tests/desktop-security.test.mjs`.
   - Runs TypeScript validation (`tsc --noEmit`).
   - Compiles desktop bundles via `npm run desktop:compile`.
   - Determines channel: detects stable tag (`is_prerelease = false`).
   - Executes `electron-builder` to package NSIS installer, generate `dist/latest.yml`, and build `.blockmap`.
   - Computes SHA-256 checksum (`CollectBotSetup-1.0.0-x64.exe.sha256`).
   - Verifies update feed integrity.
   - Publishes official release to GitHub Releases.

### Step 5: Verify Release Assets
Confirm the following files are present on the GitHub Release page:
- `CollectBotSetup-1.0.0-x64.exe` (NSIS Installer)
- `CollectBotSetup-1.0.0-x64.exe.blockmap` (Differential update blockmap)
- `CollectBotSetup-1.0.0-x64.exe.sha256` (Checksum file)
- `latest.yml` (Stable update manifest)

---

## 3. BETA RELEASE PROCEDURE (`beta.yml`)

Use this procedure to release an early-access build to internal testers and opted-in beta users without impacting stable production users.

### Step 1: Update Application Version with Beta Suffix
Edit `package.json`:
```json
{
  "name": "collectbot",
  "version": "1.1.0-beta.1"
}
```

### Step 2: Commit and Tag Prerelease
```powershell
git add package.json package-lock.json
git commit -m "chore(release): bump desktop version to 1.1.0-beta.1"
git push origin master

git tag -a v1.1.0-beta.1 -m "Release CollectBot Desktop v1.1.0-beta.1"
git push origin v1.1.0-beta.1
```

### Step 3: CI/CD Execution & Validation
The GitHub Actions workflow automatically identifies the `-beta` tag substring:
- Sets `is_prerelease = true`.
- Electron-builder automatically generates `dist/beta.yml` instead of `latest.yml`.
- The release is published with GitHub's **Prerelease** badge.
- Only users with the `beta` channel enabled in their desktop menu will see and download this version.

---

## 4. EMERGENCY ROLLOUT PAUSE & WITHDRAWAL PROCEDURE

If a critical regression is discovered in a published release (e.g., unexpected crash on a specific Windows 10 build):

### Immediate Action: Halt Fleet Updates (< 2 Minutes)
1. Navigate to `https://github.com/aryan24-cs/CollectBot/releases`.
2. Click on the affected release (e.g., `v1.0.0`).
3. Click **Edit Release**.
4. In the release assets list, find **`latest.yml`** (or `beta.yml`).
5. **Delete `latest.yml` from the release assets.**
6. Save the release.

### Technical Consequence:
- When running desktop clients query `https://github.com/aryan24-cs/CollectBot/releases/download/v1.0.0/latest.yml`, GitHub responds with **HTTP 404 Not Found**.
- `electron-updater` logs `update-not-available` / `error`, aborts all download requests, and leaves existing clients untouched.
- Fleet updates are immediately frozen worldwide without needing to recall installed packages.

### Follow-up Action: Forward-Fix Release
Because `allowDowngrade = false` prevents auto-updating backward to an older version number:
1. Revert the problematic code on `master`.
2. Bump `package.json` to the next patch version (e.g., `1.0.1`).
3. Follow the standard Stable Release Procedure to publish `v1.0.1`.
4. All clients will safely update from `v1.0.0` (or `v0.1.0`) directly to `v1.0.1`.

