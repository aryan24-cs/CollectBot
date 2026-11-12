# COLLECTBOT DESKTOP — BETA RELEASE CHECKLIST & PUBLISHING GUIDE

**Target Version:** `v0.1.1-beta.1`  
**Channel:** `beta` (Prerelease)  
**Distribution Engine:** GitHub Releases (`aryan24-cs/CollectBot`)  
**Installer Target:** Windows 10 & 11 (x64) NSIS Executable  
**Status:** **PREPARED & AWAITING EXPLICIT USER AUTHORIZATION**

---

## 1. PRE-RELEASE VERIFICATION CHECKLIST

Verify each item before triggering the beta release pipeline:

- [x] **1. Package Version Bump:**  
  `package.json` version is updated to `0.1.1-beta.1`.
- [x] **2. Desktop Layer Compilation:**  
  `npm run desktop:compile` succeeds, generating bundled `desktop/dist/main.js` and `desktop/dist/preload.js`.
- [x] **3. Core & Desktop Test Suites:**  
  `npm test` passes 100% (71 tests across 19 suites with 0 failures).
- [x] **4. Static Type Verification:**  
  `npx tsc --noEmit` exits with code 0 (0 diagnostic errors).
- [x] **5. Dedicated Database Migration Created:**  
  `supabase/migrations/20261111_desktop_auth_tickets.sql` is prepared.
- [ ] **6. Production Database Migration Executed:**  
  *(MANDATORY GATE)* Administrator has run the migration in Supabase Production SQL Editor. *(Status: PENDING)*
- [x] **7. GitHub Actions Release Workflow Configured:**  
  `.github/workflows/release-desktop.yml` includes trigger for `v*.*.*-beta*`, determines `is_prerelease = true`, verifies `beta.yml`, and uploads release artifacts.
- [ ] **8. Authenticode Code Signing:**  
  *(OPTIONAL FOR BETA)* `WIN_CSC_LINK` and `WIN_CSC_KEY_PASSWORD` in GitHub Secrets. *(Status: Unsigned Beta Preview)*

---

## 2. EXPECTED RELEASE ASSETS

Upon publishing tag `v0.1.1-beta.1`, the GitHub Actions workflow will produce and attach the following assets to the GitHub Release:

| Asset Name | Expected Size | Description |
| :--- | :--- | :--- |
| **`CollectBotSetup-0.1.1-beta.1-x64.exe`** | ~115 MB | Standalone NSIS Windows 64-bit installer |
| **`CollectBotSetup-0.1.1-beta.1-x64.exe.blockmap`** | ~130 KB | Differential update blockmap for fast delta updates |
| **`CollectBotSetup-0.1.1-beta.1-x64.exe.sha256`** | ~100 B | SHA-256 cryptographic checksum file |
| **`beta.yml`** | ~400 B | Auto-update manifest for beta channel desktop clients |
| **`SHA256SUMS.txt`** | ~200 B | Aggregate cryptographic verification ledger |

---

## 3. UNSIGNED BETA PREVIEW ADVISORY

> [!WARNING]
> Because an Authenticode EV/OV code signing certificate is currently pending (`Gate 2: PENDING`), Windows Defender SmartScreen may display an **"Unknown Publisher" / "Windows protected your PC"** dialog when users run the installer.
> 
> **To proceed on Windows:**
> Users must click **"More info"** followed by **"Run anyway"**.
> 
> This is expected standard behavior for unsigned beta preview software until an enterprise code-signing certificate is linked in GitHub Actions.

---

## 4. EXACT GIT COMMANDS TO PUBLISH (UPON USER APPROVAL)

When you are ready to publish the beta release, execute the following commands in your terminal:

```powershell
# 1. Stage all audited desktop files, workflows, and documentation
git add .

# 2. Commit the beta release implementation
git commit -m "chore(release): prepare CollectBot Desktop v0.1.1-beta.1"

# 3. Create the annotated beta tag
git tag -a v0.1.1-beta.1 -m "CollectBot Desktop v0.1.1-beta.1 (Beta Prerelease)"

# 4. Push master branch and the release tag to GitHub
git push origin master
git push origin v0.1.1-beta.1
```

Once pushed, GitHub Actions will automatically start the build, run test assertions, compile the desktop executable, generate `beta.yml` and blockmaps, and publish the release at:  
`https://github.com/aryan24-cs/CollectBot/releases/tag/v0.1.1-beta.1`

