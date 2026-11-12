# COLLECTBOT DESKTOP CONVERSION — BUILD & PACKAGING GUIDE

**Document Version:** 2.0.0 (Updated Phase 2 Implementation)  
**Date:** November 11, 2026  
**Target Platform:** Windows x64 (10 / 11)  
**Packaging Technology:** Electron + esbuild + NSIS (`electron-builder`)  
**Artifact Output:** `desktop/dist/main.js`, `desktop/dist/preload.js` (Installer: `dist/CollectBotSetup-<version>.exe`)  

---

## 1. INSTALLED DESKTOP DEPENDENCY MATRIX

All desktop tooling is installed as isolated development dependencies (`devDependencies`) to preserve the purity of the Next.js production build:

```json
{
  "devDependencies": {
    "cross-env": "^10.1.0",
    "electron": "^45.3.0",
    "electron-builder": "^26.18.0",
    "esbuild": "^0.28.2"
  }
}
```

- **`electron` (v45.3.0):** Chromium (v134+) and Node.js (v22.13.1) runtime execution shell for Windows.
- **`esbuild` (v0.28.2):** Bundles TypeScript main and preload scripts into CommonJS in ~67ms.
- **`cross-env` (v10.1.0):** Platform-agnostic environment variable setting.
- **`electron-builder` (v26.18.0):** Windows NSIS packaging and code signing hooks.

---

## 2. REPOSITORY DESKTOP ARCHITECTURE (IMPLEMENTED)

```text
CollectBot/
├── desktop/
│   ├── assets/
│   │   ├── icon.ico                 # Verified CollectBot multi-resolution Windows icon (25.9 KB)
│   │   └── offline.html             # Self-contained branded network failure fallback screen
│   ├── src/
│   │   ├── main.ts                  # Main process: lifecycle, single-instance lock, persistent partition
│   │   ├── preload.ts               # Context-isolated secure preload bridge (window.collectbotAPI)
│   │   ├── security.ts              # Origin whitelisting, navigation guards, IPC sender verification
│   │   └── menu.ts                  # Safe native Windows application menu (Zoom, Reload, Navigation)
│   ├── dist/
│   │   ├── main.js                  # Compiled main process (5.8 KB)
│   │   └── preload.js               # Compiled preload bridge (714 B)
│   ├── build.mjs                    # esbuild build script compiling desktop/src into desktop/dist
│   └── dev-runner.mjs               # Development orchestrator with localhost:3000 health check
├── src/                             # Existing Next.js Web Application (100% Intact)
└── package.json                     # Scripts: desktop:compile, desktop:build, desktop:dev, desktop:start
```

---

## 3. PACKAGE.JSON DESKTOP SCRIPTS

The following scripts are registered in `package.json`:

```json
{
  "scripts": {
    "desktop:compile": "node desktop/build.mjs",
    "desktop:build": "node desktop/build.mjs",
    "desktop:dev": "node desktop/build.mjs && node desktop/dev-runner.mjs",
    "desktop:start": "node desktop/build.mjs && electron desktop/dist/main.js"
  }
}
```

### Script Behaviors
1. **`npm run desktop:compile`:**
   Compiles `desktop/src/main.ts` and `desktop/src/preload.ts` to `desktop/dist/` using `esbuild`. Fast compile (typically < 100ms).
2. **`npm run desktop:dev`:**
   Compiles the desktop layer, polls `http://localhost:3000` until the Next.js development server is responsive, and then launches the Electron desktop shell with `COLLECTBOT_DESKTOP_ENV=development`.
3. **`npm run desktop:start`:**
   Compiles the desktop layer in production mode and launches Electron loading the verified production canonical URL: `https://collectbot.in`.

---

## 4. WINDOWS PACKAGING SPECIFICATION (`electron-builder.yml`)

```yaml
appId: in.collectbot.desktop
productName: CollectBot
copyright: Copyright © 2026 CollectBot Technologies

directories:
  output: dist
  buildResources: desktop/assets

files:
  - desktop/dist/**/*
  - desktop/assets/**/*
  - package.json

extraMetadata:
  main: desktop/dist/main.js

win:
  target:
    - target: nsis
      arch:
        - x64
  icon: desktop/assets/icon.ico
  legalTrademarks: CollectBot Technologies
  artifactName: "${productName}Setup-${version}.${ext}"

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  perMachine: false
  createDesktopShortcut: true
  createStartMenuShortcut: true
  shortcutName: CollectBot
  deleteAppDataOnUninstall: false
  installerIcon: desktop/assets/icon.ico
  uninstallerIcon: desktop/assets/icon.ico
  uninstallDisplayName: "${productName}"
  runAfterFinish: true
```
