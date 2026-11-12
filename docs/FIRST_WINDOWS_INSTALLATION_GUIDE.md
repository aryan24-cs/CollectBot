# COLLECTBOT DESKTOP — FIRST WINDOWS INSTALLATION & TESTING GUIDE

**Application:** CollectBot Desktop  
**Target Environment:** Windows 10 & Windows 11 (64-bit / x64)  
**Release Tag:** `v0.1.1-beta.1`  
**Distribution Channel:** Beta (Prerelease)  
**Architecture:** Option A — Secure Electron Container Hosting `https://collectbot.in`  

---

## 1. ARCHITECTURE NOTE: HOSTED SAAS RUNTIME

CollectBot Desktop is an enterprise desktop container wrapping the live, production-hosted Next.js web application at `https://collectbot.in`. 
- **Continuous Web Updates:** UI enhancements, bug fixes, database changes, and business feature updates deploy continuously to the web application without requiring you to reinstall the desktop software.
- **Desktop Updates:** You only need desktop installer updates when the native container, Windows deep-link protocol, offline caching, or Chromium/Electron engine receive major upgrades. These will automatically update in the background via the built-in update engine.

---

## 2. STEP-BY-STEP FIRST INSTALLATION INSTRUCTIONS

Follow these 14 steps to install, authenticate, and test CollectBot Desktop:

### Step 1: Open GitHub Releases
Open your browser and navigate to the official CollectBot GitHub Releases page:  
👉 **`https://github.com/aryan24-cs/CollectBot/releases`**

---

### Step 2: Locate the Beta Release
Find the release tagged **`v0.1.1-beta.1`** (marked with the orange **Prerelease** badge).

---

### Step 3: Download the Windows Installer
Under **Assets**, download:
- **`CollectBotSetup-0.1.1-beta.1-x64.exe`** (~121 MB)
- *(Optional)* **`CollectBotSetup-0.1.1-beta.1-x64.exe.sha256`**

---

### Step 4: Verify Cryptographic SHA-256 Checksum
Open PowerShell in the folder where you downloaded the installer (e.g., `Downloads`) and run:

```powershell
Get-FileHash -Algorithm SHA256 .\CollectBotSetup-0.1.1-beta.1-x64.exe
```

**Expected Hash:**
```
63EA847EF50C101D0FFF08DA50DC047AC1E93203DCE46F3D25E8DD3BEC66E205
```
Confirm that the output matches this exact string (case-insensitive).

---

### Step 5: Handle Windows SmartScreen Warning (Unsigned Beta Preview)
Because this is an early beta preview and an Authenticode EV certificate has not yet been attached to the CI pipeline:
1. When you run the installer, Windows Defender SmartScreen may display:  
   **"Windows protected your PC — Microsoft Defender SmartScreen prevented an unrecognized app from starting."**
2. Click **"More info"**.
3. Click the **"Run anyway"** button that appears.

> [!NOTE]
> This warning occurs solely because the build is an unsigned preview. Once an Authenticode EV certificate is acquired for the GA release, SmartScreen will establish reputation and launch without prompts.

---

### Step 6: Run the NSIS Installer
The CollectBot Setup wizard will start. It runs in **per-user mode** and does not require administrator privileges.

---

### Step 7: Complete Installation
1. Choose the destination directory (default: `%LOCALAPPDATA%\Programs\CollectBot`).
2. Click **Install**.
3. The installer creates Start Menu and Desktop shortcuts and registers the Windows custom protocol: `collectbot://`.
4. Click **Finish** with "Run CollectBot" checked.

---

### Step 8: Launch CollectBot Desktop
CollectBot Desktop opens in a high-resolution window (`1366x868`) displaying the CollectBot brand canvas and loading `https://collectbot.in`.

---

### Step 9: Sign In with Google OAuth
1. On the login screen, click **"Sign in with Google"**.
2. CollectBot Desktop launches your Windows default web browser (Chrome, Edge, or Firefox) to the secure Google sign-in page.
3. Authenticate with your Google account.
4. Upon successful Google authentication, the browser displays a handoff screen: *"Authentication Successful — Returning to CollectBot Desktop"*.
5. The browser invokes the `collectbot://` deep link, bringing CollectBot Desktop to the foreground.
6. The desktop app exchanges the one-time ticket and logs you into your workspace.

> [!IMPORTANT]
> **Production Database Migration Prerequisite:** Desktop Google OAuth requires the `desktop_auth_tickets` migration in `supabase/migrations/20261111_desktop_auth_tickets.sql` to have been executed in the live Supabase production project. If the migration has not been run, the browser handoff will display an error.

---

### Step 10: Verify Workspace Access
Confirm that your active company profile, finance dashboard, invoices, leads, and marketing campaigns render correctly.

---

### Step 11: Test Logout and Re-Login
1. Click your profile avatar -> **Sign Out** (or use native menu `File -> Logout`).
2. Verify that you are redirected to the login screen and session cookies are cleared.
3. Sign back in using email/password or Google OAuth to verify re-authentication.

---

### Step 12: Test File Downloads & Native Windows Notifications
1. Navigate to **Finance -> Invoices**.
2. Open any invoice and click **Download PDF** or export CSV.
3. Verify that the file saves directly to your Windows `Downloads` folder.
4. Verify that a native Windows toast notification appears in the bottom-right corner:  
   *"Download Complete — File saved to Downloads: invoice-INV-...pdf"*.

---

### Step 13: Verify Application Restart & Session Persistence
1. Close CollectBot Desktop (click the `X` button).
2. Re-launch CollectBot Desktop from your Start Menu or Desktop shortcut.
3. Confirm that you remain **fully logged in** without being prompted for credentials. (Session cookies are securely persisted in `%APPDATA%\CollectBot\Partitions\persist_collectbot`).

---

### Step 14: Reporting Issues & Diagnostic Logs
If you encounter any unexpected behavior, collect diagnostics from:
- **Application Logs:** `%APPDATA%\CollectBot`
- **Update Configuration:** `%APPDATA%\CollectBot\update-config.json`
- **Update Failure State:** `%APPDATA%\CollectBot\update-state.json`

Open an issue on GitHub with reproduction steps and attach the log files:  
👉 `https://github.com/aryan24-cs/CollectBot/issues`

