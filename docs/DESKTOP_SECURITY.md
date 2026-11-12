# COLLECTBOT DESKTOP CONVERSION — APPLICATION SECURITY AUDIT & SPECIFICATION

**Document Version:** 2.0.0 (Updated Phase 2 Implementation)  
**Date:** November 11, 2026  
**Auditor:** Application Security Engineer, Principal Architect  
**Scope:** Hardened Electron Desktop Shell Wrapping Hosted SaaS Application  
**Status:** **IMPLEMENTED & VERIFIED** (All Phase 2 Controls Active & Tested)  

---

## 1. ELECTRON THREAT MODEL & HARDENING CHECKLIST

Hosting a remote web application inside an Electron shell exposes a unique attack surface. If an attacker gains Cross-Site Scripting (XSS) on the website or hijacks network traffic, an insecurely configured Electron app could allow arbitrary Remote Code Execution (RCE) on the user's local operating system.

CollectBot implements defense-in-depth across the following hardening controls:

| # | Security Control | Target Value | Implementation Verification |
| :--- | :--- | :--- | :--- |
| **1** | **`nodeIntegration`** | **`false`** | Verified in `desktop/src/main.ts`. Website scripts cannot access `require()`, `process`, or native Node.js filesystem APIs. |
| **2** | **`contextIsolation`** | **`true`** | Verified in `desktop/src/main.ts`. Preload scripts and web page scripts execute in isolated JavaScript contexts. |
| **3** | **`sandbox`** | **`true`** | Verified in `desktop/src/main.ts`. Chromium renderer process runs inside OS-level sandboxes. |
| **4** | **`webSecurity`** | **`true`** | Verified in `desktop/src/main.ts`. Enforces Same-Origin Policy (SOP), CORS checks, and blocks unauthorized cross-domain resource requests. |
| **5** | **`allowRunningInsecureContent`** | **`false`** | Verified in `desktop/src/main.ts`. Blocks mixed HTTP content over HTTPS. |
| **6** | **`enableRemoteModule`** | **`false`** | Verified in `desktop/src/main.ts`. `remote` module is disabled. |
| **7** | **`webviewTag`** | **`false`** | Verified in `desktop/src/main.ts`. Disables `<webview>` tags to prevent guest frame escape exploits. |
| **8** | **Navigation Whitelisting** | **Enforced** | Implemented in `desktop/src/security.ts`. Intercepts `will-navigate` and `setWindowOpenHandler`; rejects all non-whitelisted navigation. |
| **9** | **IPC Sender Verification** | **Enforced** | Implemented in `desktop/src/security.ts`. Validates `event.senderFrame.url` on every IPC message to verify that only `https://collectbot.in` sent the call. |
| **10** | **DevTools in Production** | **Disabled** | Implemented in `desktop/src/security.ts` & `desktop/src/menu.ts`. Blocks F12, Ctrl+Shift+I, and DevTools shortcuts in production. |

---

## 2. CREDENTIAL & SECRET MANAGEMENT SPECIFICATION

### Absolute Invariant: Zero Server Secrets in Desktop Distribution
- **Never Packaged:**
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `RAZORPAY_KEY_SECRET`
  - `RAZORPAY_WEBHOOK_SECRET`
  - `SMTP_PASS`
  - `INTERAKT_API_KEY`
  - `CRON_SECRET`
- **Location of Secrets:** All administrative and sensitive keys remain exclusively stored as encrypted environment variables in the **Vercel Project Settings**.
- **Desktop Bundle Contents:**
  The `desktop/dist/` distribution contains only:
  1. Compiled JavaScript (`desktop/dist/main.js`, `desktop/dist/preload.js`).
  2. Public assets (`icon.ico`, `offline.html`).
  3. Chromium and Node runtime libraries.
  4. Standard package metadata.

No `.env` or `.env.local` files are packaged or referenced in the desktop bundle.

---

## 3. IPC (INTER-PROCESS COMMUNICATION) DEFENSE

Unrestricted IPC handlers can be abused if a malicious script executes within the renderer.

### IPC Implementation (`desktop/src/security.ts`)
1. **Channel Whitelist:** Only predefined, strongly typed IPC channels are registered:
   - `desktop:get-version`
   - `desktop:reload`
   - `desktop:open-external`
2. **Sender Origin Verification (`event.senderFrame`):**
   ```typescript
   function verifySender(senderUrl: string | undefined, allowedOrigin: string, isDev: boolean) {
     if (!senderUrl) throw new Error("Security Violation: Missing sender origin")
     const sender = new URL(senderUrl)
     if (sender.protocol === "file:") return // Offline asset
     if (sender.origin === allowedOrigin) return
     if (isDev && ALLOWED_DEV_HOSTS.includes(sender.hostname)) return
     throw new Error(`Security Violation: Unauthorized IPC sender origin (${sender.origin})`)
   }
   ```
3. **URL Scheme Validation:**
   In `desktop:open-external`, target URLs are parsed and restricted strictly to `https:`, `http:`, and `mailto:`. Dangerous schemes (`javascript:`, `file:`, `data:`, `vbscript:`) are rejected.
4. **No Shell Execution or Dynamic `eval()`:**
   The Main process never exposes `child_process.exec`, `child_process.spawn`, or arbitrary file write APIs over IPC.

---

## 4. SESSION & COOKIE PERSISTENCE SECURITY

1. **Storage Partitioning:**
   - Dedicated persistent session partition configured: `persist:collectbot`.
   - Chromium automatically encrypts persistent cookies on disk using the **Windows Data Protection API (DPAPI)** (`CryptProtectData`).
   - The encryption key is tied to the current logged-in Windows user account.
2. **Cookie Security Flags:**
   - Supabase SSR cookies (`sb-*-auth-token`) are marked `HttpOnly` and `Secure`.
   - The multi-workspace cookie `cb_active_business_id` is scoped to `path=/` and `sameSite=lax`.

---

## 5. AUTOMATED SECURITY TEST VERIFICATION

Automated tests in `tests/desktop-security.test.mjs` verify:
1. Strict canonical origin enforcement in production (`collectbot.in`, `www.collectbot.in`).
2. Localhost rejection in production mode.
3. Razorpay, WhatsApp, and Google identity host approval for external browser launching.
4. Immediate rejection of dangerous schemes (`javascript:`, `file:`, `data:`, `vbscript:`).
5. Preload script integrity and absence of leaked Node/IPC APIs.
6. Self-contained offline fallback asset integrity.
