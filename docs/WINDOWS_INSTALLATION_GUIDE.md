# CollectBot Desktop — Windows Installation & User Guide

**Application:** CollectBot Desktop — One Business OS  
**Platform:** Windows 10 / Windows 11 (x64)  
**Distribution Format:** NSIS Installer (`CollectBotSetup-<version>-x64.exe`)  
**Architecture:** Hosted Next.js 16 SaaS inside hardened Electron 45 shell  
**Target Domain:** `https://collectbot.in`  

---

## 1. System Requirements

| Specification | Requirement |
| :--- | :--- |
| **Operating System** | Windows 10 (64-bit, Version 1909 or higher) or Windows 11 (64-bit) |
| **Processor** | Intel / AMD x64 (64-bit architecture) |
| **Memory (RAM)** | 4 GB minimum (8 GB recommended) |
| **Disk Space** | ~250 MB free disk space |
| **Network** | Broadband internet connection (required to connect to `https://collectbot.in`) |
| **Default Browser** | Google Chrome, Microsoft Edge, or Mozilla Firefox (for Google OAuth authentication) |

---

## 2. Downloading & Verifying the Installer

### 2.1 Official Download
Download the official release installer and SHA-256 checksum file from the GitHub Releases page:
- **Installer:** `CollectBotSetup-<version>-x64.exe`
- **Checksum:** `CollectBotSetup-<version>-x64.exe.sha256`

### 2.2 Cryptographic Integrity Verification (SHA-256)
Before running the installer, verify that the downloaded executable has not been corrupted or tampered with in transit:

Open **PowerShell** in your `Downloads` directory:
```powershell
# Compute the SHA-256 hash
Get-FileHash -Algorithm SHA256 .\CollectBotSetup-*-x64.exe

# Compare against the provided checksum file
$expected = (Get-Content .\CollectBotSetup-*-x64.exe.sha256).Split(" ")[0].Trim()
$actual = (Get-FileHash -Algorithm SHA256 .\CollectBotSetup-*-x64.exe).Hash
if ($expected -ieq $actual) {
    Write-Host "VERIFIED: Checksum matches authentic release." -ForegroundColor Green
} else {
    Write-Host "WARNING: Checksum mismatch! Do not execute." -ForegroundColor Red
}
```

---

## 3. Step-by-Step Installation Walkthrough

### Step 1: Launch the Installer
Double-click `CollectBotSetup-<version>-x64.exe`.

> [!NOTE]
> **Microsoft Defender SmartScreen Prompt (Unsigned Test Releases)**  
> If installing an unsigned development or preview build, Windows Defender SmartScreen may display:  
> *"Windows protected your PC — Microsoft Defender SmartScreen prevented an unrecognized app from starting."*  
> To proceed:
> 1. Click **More info**.
> 2. Click **Run anyway**.  
> *(Official signed production releases using an Authenticode EV or Azure Trusted Signing certificate bypass this prompt automatically).*

### Step 2: Choose Installation Options
1. **Installation Type:** CollectBot installs as a **per-user application** by default into `%LOCALAPPDATA%\Programs\CollectBot`. It does **not** require Windows Administrator (UAC) elevation.
2. **Installation Directory:** You may accept the default directory or select a custom path using **Browse...**.
3. **Shortcuts:** The installer automatically creates:
   - A **Desktop Shortcut** (`CollectBot.lnk`)
   - A **Start Menu Shortcut** under `CollectBot`
   - Windows Custom Protocol association for `collectbot://`

### Step 3: Complete Installation
Click **Install**. Once files are copied, check **Run CollectBot** and click **Finish**.

---

## 4. Signing In & First Launch

1. **Launch CollectBot:** Open the application via the Desktop or Start Menu shortcut.
2. **Sign In with Email / Password:** Enter your credentials directly into the CollectBot login interface.
3. **Sign In with Google (Recommended):**
   - Click **Sign in with Google**.
   - CollectBot securely launches your **default Windows system browser** (e.g., Chrome or Edge) to complete Google authentication.
   - Authorize your account on Google's login page.
   - Upon successful authorization, your browser prompts:  
     *"Open CollectBot?"* -> Click **Open CollectBot**.
   - The desktop application automatically brings itself to the foreground, securely exchanges the one-time ticket, installs session cookies, and routes directly to your business dashboard.

---

## 5. Working with Native Desktop Features

- **Multi-Workplace Navigation:** Switch between businesses using the workplace selector. Authentication and active business cookies persist across restarts.
- **Downloading Invoices & Reports:** Invoices exported as PDF and financial reports exported as CSV download directly to your Windows `Downloads` folder, accompanied by a native Windows notification toast.
- **Payment & External Links:** Razorpay payment links, WhatsApp customer messaging, and external help links open safely in your default Windows browser.
- **Safe Application Menu:** Use the top menu bar (`File`, `Edit`, `View`, `History`, `Help`) or standard shortcuts:
  - `Ctrl + R`: Reload page
  - `Ctrl + Plus` / `Ctrl + Minus`: Zoom In / Out
  - `Alt + Left` / `Alt + Right`: Back / Forward navigation
  - `Alt + F4`: Exit application

---

## 6. Offline Handling

If your internet connection drops or the service is temporarily unreachable, CollectBot displays a native **Offline Fallback Screen** with a **Reconnect / Try Again** button. Once internet connectivity is restored, clicking the button reloads the SaaS workspace.

---

## 7. Clean Uninstallation Walkthrough

To remove CollectBot from your system:

### Method A: Windows Settings (Standard)
1. Open **Windows Settings** (`Win + I`).
2. Go to **Apps** > **Installed apps** (or *Apps & features*).
3. Search for **CollectBot**.
4. Click the three dots (`...`) and select **Uninstall**.
5. Follow the uninstaller prompts.

### Method B: Start Menu
1. Open the **Start Menu**.
2. Find **CollectBot** in the application list.
3. Right-click **CollectBot** > **Uninstall**.

### Data Preservation Notice
- The uninstaller removes the application executable, libraries, shortcuts, and `collectbot://` protocol registry keys.
- By design, the uninstaller **preserves** your local login session and workspace cookies in `%APPDATA%\CollectBot` so upgrading or reinstalling does not require re-authenticating.
- If you wish to perform a complete wipe of all session cookies:
  ```powershell
  Remove-Item -Recurse -Force "$env:APPDATA\CollectBot"
  ```

