# CollectBot Desktop — Windows Authenticode Code Signing Specification

**Target Platform:** Windows 10 / Windows 11 (x64)  
**Signing Standard:** Microsoft Authenticode (RSA-SHA256)  
**Packaging Framework:** `electron-builder` v26.18.0  
**Current Build Status:** **Unsigned Development & Test Builds (Zero Committed Secrets)**  

---

## 1. Overview & Purpose

Code signing provides cryptographic proof of the application's publisher identity and guarantees that the installer (`CollectBotSetup-<version>-x64.exe`) and installed executable (`CollectBot.exe`) have not been tampered with or corrupted after compilation.

### The Unsigned Binary Problem
When a user downloads an unsigned `.exe` file on Windows:
1. **Microsoft Defender SmartScreen:** Displays an *"Unrecognized app"* warning prompt requiring users to click *"More info"* and *"Run anyway"*.
2. **User Account Control (UAC):** Displays an orange/yellow shield with *"Publisher: Unknown"*.

Signing the application with an authentic Windows Authenticode certificate or Microsoft Azure Trusted Signing resolves these warnings, establishing immediate trust.

---

## 2. Current Implementation Status

| Environment | Signing Status | SmartScreen Behavior | Release Purpose |
| :--- | :---: | :--- | :--- |
| **Local Development** | **Unsigned** | None (runs from terminal or directory) | Rapid iteration, testing, debugging. |
| **Preview / Beta Builds** | **Unsigned** | Prompts SmartScreen warning | Internal QA, staging validation, early tester feedback. |
| **Production General Release** | **Signed** (Targeted) | Bypasses SmartScreen without warning | Public commercial distribution on `https://collectbot.in`. |

> [!IMPORTANT]
> **Strict Security Rule:**  
> No private keys, `.pfx` files, `.p12` certificates, or certificate passwords are ever stored or committed to this repository. All certificate file extensions (`*.pfx`, `*.p12`, `*.key`, `*.cer`, `*.pem`) are strictly excluded in `.gitignore`.

---

## 3. Configuration in `electron-builder`

CollectBot Desktop supports seamless environment-based code signing. `electron-builder` automatically detects signing credentials from environment variables without requiring any hardcoded settings in `electron-builder.yml`.

### Environment Variables
- `CSC_LINK` or `WIN_CSC_LINK`: The path to a local `.pfx` file, a remote URL, or a **Base64-encoded string** representing the entire certificate.
- `CSC_KEY_PASSWORD` or `WIN_CSC_KEY_PASSWORD`: The decryption password for the private key container.

When these variables are present in the build environment, `electron-builder` invokes Microsoft `signtool.exe` with RFC 3161 timestamping (`http://timestamp.digicert.com`). When omitted, it safely skips signing with a warning and produces an unsigned binary.

---

## 4. Setting Up GitHub Actions Code Signing (Standard PFX)

To enable automatic code signing during the GitHub Actions release workflow:

### Step 1: Export Certificate as PFX
Export your Authenticode code signing certificate (from DigiCert, Sectigo, or SSL.com) as a password-protected `.pfx` file.

### Step 2: Encode to Base64
In PowerShell:
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("path\to\your-certificate.pfx")) | Out-File -FilePath "cert_base64.txt" -Encoding ascii
```

### Step 3: Register GitHub Repository Secrets
1. In your GitHub repository, navigate to **Settings** > **Secrets and variables** > **Actions**.
2. Click **New repository secret**.
3. Create:
   - **`WIN_CSC_LINK`**: Paste the entire Base64 string from `cert_base64.txt`.
   - **`WIN_CSC_KEY_PASSWORD`**: Enter the certificate password.

The workflow `.github/workflows/release-desktop.yml` will automatically consume these secrets during tag-triggered builds.

---

## 5. Enterprise Alternative: Microsoft Azure Trusted Signing

For enterprise cloud-native code signing without physical USB hardware tokens or exported PFX keys, Microsoft provides **Azure Trusted Signing** (formerly Microsoft Identity Verification).

### Advantages
- Keys are secured within Microsoft-managed Hardware Security Modules (HSMs).
- Zero private key export risk.
- Native identity verification integrated directly with Microsoft Defender SmartScreen reputation.
- Low operational cost compared to traditional EV hardware tokens.

### CI/CD Integration with Azure Trusted Signing
In `.github/workflows/release-desktop.yml`, Azure Trusted Signing can be invoked via the official Microsoft action:

```yaml
- name: Azure Trusted Signing
  uses: azure/trusted-signing-action@v0.4.0
  with:
    azure-tenant-id: ${{ secrets.AZURE_TENANT_ID }}
    azure-client-id: ${{ secrets.AZURE_CLIENT_ID }}
    azure-client-secret: ${{ secrets.AZURE_CLIENT_SECRET }}
    endpoint: https://eus.codesigning.azure.net/
    trusted-signing-account-name: ${{ secrets.TRUSTED_SIGNING_ACCOUNT }}
    certificate-profile-name: ${{ secrets.CERTIFICATE_PROFILE }}
    files: |
      dist/CollectBotSetup-*-x64.exe
      dist/win-unpacked/CollectBot.exe
```

---

## 6. Verifying Authenticode Signatures

After building a signed installer, verify the cryptographic signature on Windows:

### Via PowerShell
```powershell
Get-AuthenticodeSignature .\dist\CollectBotSetup-*-x64.exe | Format-List
```
Expected output when signed:
```text
SignerCertificate : [CN=CollectBot Technologies, ...]
Status            : Valid
StatusMessage     : Signature verified.
TimeStamper       : [CN=DigiCert Timestamp Responder, ...]
```

### Via Windows GUI
1. Right-click the `.exe` file > **Properties**.
2. Select the **Digital Signatures** tab.
3. Select the signature in the list and click **Details**.
4. The dialog must show: *"This digital signature is OK."*

