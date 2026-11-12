# COLLECTBOT DESKTOP CONVERSION — COMPATIBILITY REPORT (PHASE 1)

**Document Version:** 1.0.0  
**Date:** November 11, 2026  
**Auditor / Architect:** Principal Software Architect, Senior Electron Engineer, Next.js Specialist  
**Application Target:** CollectBot — One Business OS (Finance • Sales • Marketing)  
**Conversion Paradigm:** Option A — Hosted Next.js Application Inside Native Electron Windows Shell  

---

## 1. CURRENT APPLICATION ARCHITECTURE

CollectBot is an enterprise-grade, multi-tenant Business Operating System (B2B SaaS) built on the modern web stack:

- **Framework:** Next.js 16.2.10 (App Router, React 19.2.4, TypeScript 5).
- **Styling & Components:** Tailwind CSS v4, Radix UI primitives, Lucide icons, Sonner toast notifications.
- **Backend & Database:** Supabase (PostgreSQL 15+, Row-Level Security, Auth SSR, Storage, Service-Role clients).
- **Authentication:** Supabase SSR Auth with HTTP-only session cookies (`sb-*-auth-token`), multi-workplace resolution cookie (`cb_active_business_id`), Email/Password login, Google OAuth 2.0.
- **Hosting & Infrastructure:** Vercel serverless runtime edge proxy (`src/proxy.ts`), PostgreSQL managed on Supabase Cloud.
- **Third-Party Integrations:** Razorpay (UPI, cards, payment links, webhooks), Resend/Nodemailer (transactional email), Interakt (WhatsApp messaging), `@react-pdf/renderer` (dynamic invoice/receipt compilation).

### Architecture Verification Snapshot
- **Total Registered App Routes:** 72 routes (10 static public/legal routes, 62 server-rendered & dynamic routes).
- **API Endpoints:** 38 REST route handlers covering Admin, Auth, Clients, Invoices, Expenses, Payments, Sales Leads, Marketing Campaigns, Settings, and Webhooks.
- **Automated Tests:** 27 test cases across 6 test suites passing cleanly with zero failures.

---

## 2. NEXT.JS & WEB FEATURE COMPATIBILITY MATRIX

Under **Option A**, the desktop application runs a Chromium-based Electron `BrowserWindow` pointing directly to the verified hosted production domain (`https://collectbot.in`). The compatibility of each subsystem is evaluated below:

| # | Subsystem / Feature | Compatibility Status | Evaluation & Technical Behavior in Electron | Required Configuration or Changes |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Server-Side Rendering (SSR)** | **Fully Compatible** | Next.js Server Components and dynamic routes execute on the remote Vercel server. Electron receives HTML/CSS over HTTPS exactly like standard Chrome. | None. Remote SSR functions identically. |
| **2** | **Client Components ("use client")** | **Fully Compatible** | Hydration, React 19 concurrent hooks, state, and DOM event listeners run within Chromium's renderer process. | None. Standard browser runtime execution. |
| **3** | **API Route Handlers (`/api/*`)** | **Fully Compatible** | Client fetch requests to `/api/*` use HTTPS with credentials/cookies forwarded automatically by Electron's network stack. | Ensure CORS and Origin headers in Electron match allowed hosts. |
| **4** | **Next.js 16 Middleware (`src/proxy.ts`)** | **Fully Compatible** | Server-side proxy inspects incoming cookies (`sb-*-auth-token`, `cb_active_business_id`), verifies tenant isolation, and issues redirects. | Electron preserves cookies across requests in persistent session. |
| **5** | **Authentication Cookies** | **Fully Compatible** | Electron uses Chromium's persistent cookie jar (`session.defaultSession.cookies`). Cookies are stored encrypted in `%APPDATA%\CollectBot\Network\Cookies`. | Ensure session partition is persistent (default partition). |
| **6** | **Supabase SSR Client** | **Fully Compatible** | `@supabase/ssr` (`createBrowserClient` / `createServerClient`) reads/writes standard browser cookies. Auto-refresh of JWT tokens works transparently. | Ensure token refresh background intervals do not sleep when window is minimized. |
| **7** | **Dynamic Routing & Navigation** | **Fully Compatible** | Next.js client-side router (`next/navigation`, `router.push`, `<Link>`) updates internal URLs without reloading. | Electron `will-navigate` handler must allow in-app paths while intercepting external domains. |
| **8** | **File Uploads (Business Logos)** | **Fully Compatible** | Standard `<input type="file" accept="image/*">` in `src/app/(dashboard)/settings/page.tsx` triggers Windows native Open File dialog automatically. | None. Chromium handles `<input type="file">` natively. |
| **9** | **File Downloads (Exports & PDFs)** | **Compatible with Configuration** | CSV/XML exports create Object URLs (`window.URL.createObjectURL(blob)`). Invoices open PDF in new tab (`window.open(url, '_blank')`). | Intercept `will-download` on `session.defaultSession` to present native Windows Save Dialog and desktop download notification. |
| **10** | **Printing Invoices (`window.print()`)** | **Compatible with Configuration** | Triggered in `src/app/(dashboard)/invoices/[id]/page.tsx`. In default Electron, `window.print()` triggers silent print or standard print dialog. | Configure `webContents.print()` or allow native print dialog with printer selection. |
| **11** | **Clipboard Operations** | **Fully Compatible** | `navigator.clipboard.writeText(...)` used in invoice share links and employee invites is supported natively in Electron. | Grant `clipboard-sanitized-write` permission in Electron session permission handler. |
| **12** | **Payment Gateway (Razorpay)** | **Compatible with Configuration** | Invoice payment links (`https://rzp.io/i/...`) and external checkouts must NOT open inside the administrative desktop window. | Intercept external domains in `setWindowOpenHandler` and route them to the user's default system browser via `shell.openExternal`. |
| **13** | **Content Security Policy (CSP)** | **Fully Compatible** | Existing CSP in `next.config.ts` enforces `frame-ancestors 'self'`. Because Electron loads the URL as top-level browsing context, it is not blocked. | Maintain HTTPS origin loading in Electron `loadURL`. |
| **14** | **Google OAuth Authentication** | **Requires Implementation Changes** | Google blocks OAuth logins from embedded webviews (`403: disallowed_useragent`). Embedded OAuth violates RFC 8252. | Implement external system browser OAuth flow with deep linking (`collectbot://`) or one-time exchange ticket. |
| **15** | **Offline Handling / Network Drops** | **Requires Implementation Changes** | If WiFi disconnects while using a hosted web app inside Electron, a raw Chromium error screen (`ERR_INTERNET_DISCONNECTED`) appears. | Add offline fallback page (`offline.html`) in Electron package with auto-retry on reconnect. |

---

## 3. SUPABASE COMPATIBILITY AUDIT

CollectBot interacts with Supabase through two primary clients:
1. **Browser Client (`src/lib/supabase/client.ts`):**
   - Implemented via `@supabase/ssr` `createBrowserClient()`.
   - Stores session tokens in `document.cookie`.
   - Electron Compatibility: **100% Compatible**. Chromium's V8 engine executes the client SDK and forwards credentials to `https://*.supabase.co`.
2. **Server Client & Service-Role Client (`src/lib/supabase/server.ts`, `serviceRole.ts`):**
   - Runs exclusively on the Vercel server in Server Components, Route Handlers, and `src/proxy.ts`.
   - Electron Compatibility: **100% Compatible**. These clients never execute on the user's local machine, meaning service-role keys and database credentials remain safe on the backend.

### Realtime Subscriptions
- Codebase inspection confirmed that no active Supabase Realtime WebSocket listeners (`.channel()`, `.on('postgres_changes')`) exist in the application. All updates occur via RESTful queries, Server Components, and client revalidation.
- If Realtime is added in future iterations, Chromium's WebSocket implementation natively supports standard WSS protocols.

---

## 4. AUTHENTICATION & SESSION PERSISTENCE AUDIT

### Session Creation & Lifecycle
1. **Email / Password Sign-In:**
   - Handled directly in `src/app/(auth)/login/page.tsx` via `supabase.auth.signInWithPassword()`.
   - After authentication, the client calls `/api/auth/route-user` to determine whether the user is Super Admin, belongs to a single workspace, or must choose among multiple workplaces (`/select-workspace`).
   - Compatibility: **100% compatible in Electron**. No external browser handoff is needed for standard email/password authentication.
2. **Multi-Workplace Membership Resolution:**
   - Active workspace is stored in cookie `cb_active_business_id`.
   - `src/proxy.ts` verifies that the authenticated user belongs to the requested business before allowing access to departmental modules (`/invoices`, `/dashboard/sales`, `/dashboard/marketing`).
   - Compatibility: **100% compatible**. Persistent cookie storage maintains the active workspace selection across desktop restarts.
3. **Session Persistence Across Application Restarts:**
   - Supabase SSR sets access tokens (1-hour expiration) and refresh tokens (sliding 30-day expiration).
   - In Electron, using the default session partition ensures Chromium commits cookies to disk. When the user re-launches `CollectBot.exe`, the expired access token is automatically refreshed using the valid refresh token via `@supabase/ssr`.

---

## 5. GOOGLE OAUTH FINDINGS & BOTTLENECK ANALYSIS

### The Core Problem
When a user clicks "Sign in with Google", Supabase initiates OAuth redirection to:
`https://accounts.google.com/o/oauth2/v2/auth?...`

In an embedded Electron `BrowserWindow`, Google's identity servers detect the embedded Chromium user agent and reject the request with:
> **Error 403: disallowed_useragent**  
> "This browser or app may not be secure. Learn more. Try using a different browser."

Attempting to bypass this by spoofing the `User-Agent` header is fragile, violates Google's OAuth Policy, and risks account bans or sudden breakage.

### Evaluated Desktop OAuth Architectural Options

#### Approach 1: Custom URI Scheme / Deep Linking (`collectbot://`)
1. User clicks "Sign in with Google" inside the desktop app.
2. The desktop app triggers an external browser launch (`shell.openExternal`) pointing to `https://collectbot.in/api/auth/desktop-login`.
3. The user authenticates with Google inside their trusted system browser (Chrome/Edge/Firefox).
4. Google redirects back to `https://collectbot.in/api/auth/callback`.
5. The callback endpoint verifies the user, issues a single-use cryptographically signed handoff token (valid for 60 seconds), and redirects the system browser to:
   `collectbot://auth/callback?ticket=<token>`
6. Windows detects the registered protocol and forwards the URL to the running `CollectBot.exe`.
7. Electron captures the `ticket`, calls `https://collectbot.in/api/auth/desktop-exchange` via POST, and receives the session cookies.
8. Electron writes the session cookies into `session.defaultSession.cookies` and navigates to `/dashboard`.

#### Approach 2: Ephemeral Local Loopback Server (`http://127.0.0.1:PORT`)
1. Electron spawns a temporary HTTP server on a random local port (`http://127.0.0.1:PORT`).
2. Opens system browser to Google OAuth with `redirect_uri=http://127.0.0.1:PORT/callback`.
3. Local server receives the authorization code, exchanges it with Supabase PKCE, and shuts down.
- *Limitation:* Requires registering dynamic localhost ports in Google Cloud Console, which Google OAuth 2.0 allows only for specific desktop client IDs.

#### Recommendation
**Approach 1 (Deep Linking with Short-Lived Exchange Ticket)** is the cleanest, most secure, and most resilient pattern for the existing Supabase SSR architecture.

---

## 6. BROWSER-SPECIFIC DEPENDENCIES & CODE AUDIT

Code inspection across `src/` revealed the following browser API usages:

| File | Line | Code Pattern | Desktop Compatibility Impact | Mitigation Strategy |
| :--- | :--- | :--- | :--- | :--- |
| `src/app/(auth)/login/page.tsx` | 43 | `window.location.origin` | Fully Compatible | Resolves to `https://collectbot.in` when hosted. |
| `src/app/(dashboard)/invoices/page.tsx` | 295 | `window.open(json.url, "_blank")` | Opens in Electron unless intercepted | Intercept in `setWindowOpenHandler` and delegate to `shell.openExternal`. |
| `src/app/(dashboard)/invoices/[id]/page.tsx` | 393 | `window.print()` | Opens print dialog | Supported natively; customize with Electron print options if needed. |
| `src/app/(dashboard)/invoices/[id]/page.tsx` | 633 | `navigator.clipboard.writeText(...)` | Fully Compatible | Explicitly allowed via Electron session permissions. |
| `src/app/(dashboard)/settings/exports/page.tsx` | 45 | `window.URL.createObjectURL(blob)` | Fully Compatible | Triggers Electron `will-download` event. |
| `src/app/pay/[invoiceId]/page.tsx` | 207 | `<a href={invoice.payment_link}>` | External Razorpay link | Intercept in `setWindowOpenHandler` to prevent taking over desktop app window. |

---

## 7. IDENTIFIED RISKS & REQUIRED MITIGATIONS

1. **Risk: White/Blank Screen on Network Loss (P1)**
   - *Impact:* If user starts the desktop app without internet, Next.js cannot load.
   - *Mitigation:* Load a packaged local `offline.html` asset whenever `did-fail-load` triggers with network error codes.
2. **Risk: External Phishing or Navigation Escape (P0)**
   - *Impact:* An attacker or malicious link could navigate the BrowserWindow away from `collectbot.in` to an untrusted third-party site.
   - *Mitigation:* Strict URL whitelist in `webContents.on('will-navigate')`. Any destination not matching `https://collectbot.in` is cancelled and opened in the default OS browser via `shell.openExternal()`.
3. **Risk: Remote Code Execution via Insecure Preload (P0)**
   - *Impact:* If `nodeIntegration` is enabled or `contextIsolation` is disabled, remote scripts on the website could execute arbitrary shell commands on the user's Windows PC.
   - *Mitigation:* `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`, and minimal, strictly typed IPC channels.
4. **Risk: Sensitive Secrets Leaked to Desktop Binary (P0)**
   - *Impact:* Service-role keys or database credentials packaged in Electron bundle.
   - *Mitigation:* Electron contains only the native shell (`main.ts`, `preload.ts`, assets). Zero server code or environment secrets are included in the desktop distribution.

---

## 8. REQUIRED CHANGES SUMMARY (ROADMAP FOR PHASE 2)

### Changes to Existing Web Codebase (Minimal & Backward-Compatible)
1. **`src/app/api/auth/` (New Optional Endpoints):**
   - Add `/api/auth/desktop-ticket` and `/api/auth/desktop-exchange` to facilitate secure Google OAuth handoff without modifying standard web logins.
2. **`src/proxy.ts`:**
   - Add `collectbot://` custom protocol support to allowed redirect handlers if necessary.
3. **Web Application:**
   - 100% of existing web application code, Vercel deployments, and responsive UI remains functional and untouched.

### New Desktop Application Layer (Isolated Subsystem)
- Create `desktop/` directory with Electron configuration, TypeScript build, preload security bridge, and Windows installer packaging.

