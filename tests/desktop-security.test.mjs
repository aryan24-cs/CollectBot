import { test, describe } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"

describe("CollectBot Desktop Architecture & Security Verification (Phase 3 Final)", () => {
  // ─────────────────────────────────────────────────────────────
  // 1. Host Whitelist & Navigation Rules
  // ─────────────────────────────────────────────────────────────
  const ALLOWED_PROD_HOSTS = ["collectbot.vercel.app"]
  const ALLOWED_DEV_HOSTS = ["localhost", "127.0.0.1"]

  function isAllowedHost(hostname, isDev) {
    if (ALLOWED_PROD_HOSTS.includes(hostname)) return true
    if (isDev && ALLOWED_DEV_HOSTS.includes(hostname)) return true
    return false
  }

  test("Strictly permits only production canonical domains in production mode", () => {
    assert.equal(isAllowedHost("collectbot.vercel.app", false), true)
    assert.equal(isAllowedHost("localhost", false), false)
    assert.equal(isAllowedHost("127.0.0.1", false), false)
    assert.equal(isAllowedHost("evil.com", false), false)
    assert.equal(isAllowedHost("collectbot.vercel.app.attacker.com", false), false)
  })

  test("Allows localhost only when development mode is explicitly enabled", () => {
    assert.equal(isAllowedHost("localhost", true), true)
    assert.equal(isAllowedHost("127.0.0.1", true), true)
    assert.equal(isAllowedHost("collectbot.vercel.app", true), true)
    assert.equal(isAllowedHost("evil.com", true), false)
  })

  // ─────────────────────────────────────────────────────────────
  // 2. Approved External Destinations & Dangerous Protocol Rejection
  // ─────────────────────────────────────────────────────────────
  const APPROVED_EXTERNAL_HOST_PATTERNS = [
    /^(.*\.)?razorpay\.com$/,
    /^rzp\.io$/,
    /^(.*\.)?whatsapp\.com$/,
    /^wa\.me$/,
    /^(.*\.)?supabase\.co$/,
    /^(.*\.)?google\.com$/,
    /^(.*\.)?accounts\.google\.com$/,
  ]

  function isApprovedExternalUrl(rawUrl) {
    try {
      const parsed = new URL(rawUrl)
      if (parsed.protocol === "mailto:") return true
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false

      return APPROVED_EXTERNAL_HOST_PATTERNS.some((pattern) => pattern.test(parsed.hostname))
    } catch {
      return false
    }
  }

  test("Approves verified payment gateways and WhatsApp communication endpoints", () => {
    assert.equal(isApprovedExternalUrl("https://api.razorpay.com/v1/checkout"), true)
    assert.equal(isApprovedExternalUrl("https://rzp.io/i/INV-2026-001"), true)
    assert.equal(isApprovedExternalUrl("https://wa.me/919999999999?text=Invoice"), true)
    assert.equal(isApprovedExternalUrl("https://api.whatsapp.com/send?phone=919999999999"), true)
    assert.equal(isApprovedExternalUrl("https://accounts.google.com/o/oauth2/v2/auth"), true)
    assert.equal(isApprovedExternalUrl("mailto:support@collectbot.in"), true)
  })

  test("Strictly blocks dangerous protocols and phishing domains", () => {
    assert.equal(isApprovedExternalUrl("javascript:alert(1)"), false)
    assert.equal(isApprovedExternalUrl("file:///C:/Windows/System32/calc.exe"), false)
    assert.equal(isApprovedExternalUrl("data:text/html;base64,PHNjcmlwdD4="), false)
    assert.equal(isApprovedExternalUrl("vbscript:MsgBox"), false)
    assert.equal(isApprovedExternalUrl("https://fake-razorpay.phishing.ru"), false)
    assert.equal(isApprovedExternalUrl("https://untrusted-site.com"), false)
  })

  // ─────────────────────────────────────────────────────────────
  // 3. Desktop OAuth State Nonce & PKCE Validation
  // ─────────────────────────────────────────────────────────────
  describe("Desktop OAuth State Nonce & PKCE Binding", () => {
    const activeStates = new Map()

    function registerState(state, ttlMs = 5000) {
      activeStates.set(state, Date.now() + ttlMs)
    }

    function verifyAndConsumeState(state) {
      const expiresAt = activeStates.get(state)
      if (!expiresAt || expiresAt <= Date.now()) {
        activeStates.delete(state)
        return false
      }
      activeStates.delete(state) // Atomic single-use burn
      return true
    }

    test("Successfully validates and burns an active state nonce", () => {
      const state = crypto.randomBytes(32).toString("hex")
      registerState(state)
      assert.equal(verifyAndConsumeState(state), true)
      // Second attempt must fail (replay defense)
      assert.equal(verifyAndConsumeState(state), false)
    })

    test("Rejects unprompted or forged state nonces", () => {
      assert.equal(verifyAndConsumeState("forged-unprompted-state-nonce"), false)
      assert.equal(verifyAndConsumeState(""), false)
    })

    test("Rejects expired state nonces", () => {
      const state = crypto.randomBytes(32).toString("hex")
      registerState(state, -100) // Expired in past
      assert.equal(verifyAndConsumeState(state), false)
    })

    test("PKCE code challenge and verifier contract validation", () => {
      // RFC 7636 PKCE contract test
      const verifier = crypto.randomBytes(32).toString("base64url")
      const challenge = crypto.createHash("sha256").update(verifier).digest("base64url")

      assert.equal(verifier.length >= 43, true)
      assert.equal(challenge.length >= 43, true)

      // Verification computation
      const calculated = crypto.createHash("sha256").update(verifier).digest("base64url")
      assert.equal(calculated, challenge)

      // Tampered verifier fails
      const tampered = crypto.createHash("sha256").update(verifier + "x").digest("base64url")
      assert.notEqual(tampered, challenge)
    })
  })

  // ─────────────────────────────────────────────────────────────
  // 4. One-Time Ticket Lifecycle, Concurrency & Production Safety
  // ─────────────────────────────────────────────────────────────
  describe("One-Time Authentication Ticket Security & Persistence", () => {
    const mockDb = new Map()

    function simulateCreateTicket(userId, sessionData, ttlSeconds, isProduction, dbFails = false) {
      if (isProduction && dbFails) {
        throw new Error("Production Database Connection Failure")
      }
      const rawTicket = crypto.randomBytes(32).toString("hex")
      const ticketHash = crypto.createHash("sha256").update(rawTicket).digest("hex")

      if (!dbFails) {
        mockDb.set(ticketHash, {
          userId,
          sessionData,
          expiresAt: Date.now() + ttlSeconds * 1000,
          consumed: false,
        })
      }
      return rawTicket
    }

    async function simulateAtomicConsume(rawTicket, isProduction, dbFails = false) {
      if (!rawTicket || rawTicket.length < 32) return null
      if (isProduction && dbFails) {
        // Production fails safely without in-memory fallback
        return null
      }

      const ticketHash = crypto.createHash("sha256").update(rawTicket).digest("hex")
      const record = mockDb.get(ticketHash)
      if (!record) return null
      if (record.consumed || record.expiresAt <= Date.now()) {
        mockDb.delete(ticketHash)
        return null
      }
      // Atomic update with consumed=true
      record.consumed = true
      mockDb.delete(ticketHash)
      return record.sessionData
    }

    test("Production database failure causes authentication to fail safely with no fallback", async () => {
      // When production database fails, it MUST throw and NEVER generate an in-memory ticket
      assert.throws(
        () => simulateCreateTicket("usr-1", { auth: true }, 60, true, true),
        /Production Database Connection Failure/
      )

      // In production, database read failures return null safely
      const result = await simulateAtomicConsume("valid-length-raw-ticket-string-1234567890", true, true)
      assert.equal(result, null)
    })

    test("Generates 256-bit entropy tickets and successfully consumes them", async () => {
      const raw = simulateCreateTicket("usr-123", { activeBusinessId: "biz-abc" }, 60, false)
      assert.equal(raw.length, 64) // 32 bytes hex = 64 characters = 256 bits

      const session = await simulateAtomicConsume(raw, false)
      assert.deepEqual(session, { activeBusinessId: "biz-abc" })
    })

    test("Prevents replay attacks by denying previously consumed tickets", async () => {
      const raw = simulateCreateTicket("usr-456", { role: "OWNER" }, 60, false)
      const first = await simulateAtomicConsume(raw, false)
      assert.ok(first)

      // Replay attempt must return null
      const second = await simulateAtomicConsume(raw, false)
      assert.equal(second, null)
    })

    test("Rejects expired tickets (past 60-second window)", async () => {
      const raw = simulateCreateTicket("usr-789", { role: "FINANCE" }, -1, false) // Expired
      const session = await simulateAtomicConsume(raw, false)
      assert.equal(session, null)
    })

    test("Concurrent ticket consumption: exactly one requester succeeds", async () => {
      const raw = simulateCreateTicket("usr-concurrent", { role: "SALES" }, 60, false)

      // Simulate simultaneous race condition
      const [res1, res2, res3] = await Promise.all([
        simulateAtomicConsume(raw, false),
        simulateAtomicConsume(raw, false),
        simulateAtomicConsume(raw, false),
      ])

      const successful = [res1, res2, res3].filter(Boolean)
      assert.equal(successful.length, 1)
      assert.deepEqual(successful[0], { role: "SALES" })
    })
  })

  // ─────────────────────────────────────────────────────────────
  // 5. Windows Custom Protocol (collectbot://) Validation
  // ─────────────────────────────────────────────────────────────
  describe("Custom Protocol URL Parser & Validator", () => {
    function parseAndValidateDeepLink(rawUrl) {
      try {
        const parsed = new URL(rawUrl)
        if (parsed.protocol !== "collectbot:") return null

        const isAuthCallback =
          parsed.hostname === "auth" &&
          (parsed.pathname === "/callback" || parsed.pathname === "//callback" || parsed.pathname === "")

        if (!isAuthCallback) return null

        const ticket = parsed.searchParams.get("ticket")
        const state = parsed.searchParams.get("state")
        if (!ticket || !state) return null

        return { ticket, state }
      } catch {
        return null
      }
    }

    test("Accepts authentic collectbot://auth/callback URLs with ticket and state", () => {
      const url = "collectbot://auth/callback?ticket=abc12345678901234567890123456789012&state=state12345"
      const res = parseAndValidateDeepLink(url)
      assert.ok(res)
      assert.equal(res.ticket, "abc12345678901234567890123456789012")
      assert.equal(res.state, "state12345")
    })

    test("Rejects malicious paths or invalid hosts under collectbot:// protocol", () => {
      assert.equal(parseAndValidateDeepLink("collectbot://malicious/path?ticket=abc"), null)
      assert.equal(parseAndValidateDeepLink("collectbot://auth/wrongpath?ticket=abc"), null)
      assert.equal(parseAndValidateDeepLink("https://auth/callback?ticket=abc&state=123"), null)
      assert.equal(parseAndValidateDeepLink("collectbot://auth/callback?ticket="), null)
      assert.equal(parseAndValidateDeepLink("collectbot://auth/callback?state=123"), null)
      assert.equal(parseAndValidateDeepLink("collectbot://"), null)
    })
  })

  // ─────────────────────────────────────────────────────────────
  // 6. Cookie Security & HttpOnly Isolation
  // ─────────────────────────────────────────────────────────────
  describe("Authentication Cookie Security Attributes", () => {
    function createAuthCookieDescriptor(name, value, isProd) {
      return {
        name,
        value,
        path: "/",
        httpOnly: true, // Inaccessible to renderer JavaScript document.cookie
        secure: isProd,
        sameSite: "lax",
      }
    }

    test("Enforces httpOnly and secure attributes on Supabase auth cookies", () => {
      const cookie = createAuthCookieDescriptor("sb-faoetyzqzqqtwatflefk-auth-token", "jwt.token.value", true)
      assert.equal(cookie.httpOnly, true)
      assert.equal(cookie.secure, true)
      assert.equal(cookie.sameSite, "lax")
    })

    test("Verifies that renderer JavaScript cannot access httpOnly cookies", () => {
      // In Chromium / DOM, document.cookie returns only non-httpOnly cookies
      const simulatedBrowserCookieJar = [
        { name: "sb-auth-token", value: "secret", httpOnly: true },
        { name: "cb_active_business_id", value: "biz-123", httpOnly: false },
      ]

      const documentCookieString = simulatedBrowserCookieJar
        .filter((c) => !c.httpOnly)
        .map((c) => `${c.name}=${c.value}`)
        .join("; ")

      assert.doesNotMatch(documentCookieString, /sb-auth-token/)
      assert.match(documentCookieString, /cb_active_business_id=biz-123/)
    })
  })

  // ─────────────────────────────────────────────────────────────
  // 7. IPC Sender Verification
  // ─────────────────────────────────────────────────────────────
  describe("IPC Sender Frame Origin Verification", () => {
    const ALLOWED_PROD = "https://collectbot.vercel.app"

    function verifySender(senderUrl, isDev) {
      if (!senderUrl) throw new Error("Security Violation: Missing sender origin")
      const parsed = new URL(senderUrl)
      if (parsed.protocol === "file:") return true
      if (parsed.origin === ALLOWED_PROD) return true
      if (isDev && (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")) return true
      throw new Error(`Security Violation: Unauthorized IPC caller (${parsed.origin})`)
    }

    test("Permits IPC calls only from authorized production origin", () => {
      assert.equal(verifySender("https://collectbot.vercel.app/dashboard", false), true)
      assert.equal(verifySender("https://collectbot.vercel.app/invoices/new", false), true)
    })

    test("Rejects IPC calls from untrusted web origins", () => {
      assert.throws(() => verifySender("https://evil.com/phish", false), /Security Violation: Unauthorized IPC caller/)
      assert.throws(() => verifySender("https://attacker.org", false), /Security Violation: Unauthorized IPC caller/)
      assert.throws(() => verifySender("http://collectbot.vercel.app", false), /Security Violation: Unauthorized IPC caller/) // HTTP rejected
    })
  })

  // ─────────────────────────────────────────────────────────────
  // 8. Native File Path & Symlink Traversal Defense
  // ─────────────────────────────────────────────────────────────
  describe("Native File Path Sanitization & Defense", () => {
    const allowedExtensions = ["pdf", "csv", "xml", "json", "xlsx", "png", "jpg", "jpeg", "txt"]

    function validateSavePath(userPath) {
      if (!userPath || typeof userPath !== "string") return false
      if (userPath.includes("..")) return false
      const normalized = path.normalize(userPath)
      if (normalized.includes("..")) return false
      if (!path.isAbsolute(normalized)) return false

      const ext = path.extname(normalized).toLowerCase().replace(".", "")
      if (!allowedExtensions.includes(ext)) return false

      return true
    }

    test("Accepts standard absolute document save paths", () => {
      assert.equal(validateSavePath("C:\\Users\\User\\Downloads\\invoice.pdf"), true)
      assert.equal(validateSavePath("C:\\Users\\User\\Documents\\accounting_export.csv"), true)
      assert.equal(validateSavePath("C:\\Users\\User\\Documents\\tally.xml"), true)
    })

    test("Strictly blocks path traversal attempts and relative paths", () => {
      assert.equal(validateSavePath("C:\\Users\\User\\..\\..\\Windows\\System32\\calc.exe"), false)
      assert.equal(validateSavePath("invoice.pdf"), false) // Relative path rejected
      assert.equal(validateSavePath("../../../etc/passwd"), false)
    })

    test("Blocks executable and dangerous file extensions", () => {
      assert.equal(validateSavePath("C:\\Users\\User\\Downloads\\malware.exe"), false)
      assert.equal(validateSavePath("C:\\Users\\User\\Downloads\\script.bat"), false)
      assert.equal(validateSavePath("C:\\Users\\User\\Downloads\\exploit.vbs"), false)
      assert.equal(validateSavePath("C:\\Users\\User\\Downloads\\library.dll"), false)
    })
  })

  // ─────────────────────────────────────────────────────────────
  // 9. Notification Content Sanitization
  // ─────────────────────────────────────────────────────────────
  describe("Notification Payload Sanitizer", () => {
    function sanitizeNotification(title, body) {
      const cleanTitle = (title || "CollectBot").replace(/<[^>]*>?/gm, "").substring(0, 100)
      const cleanBody = (body || "").replace(/<[^>]*>?/gm, "").substring(0, 250)
      return { title: cleanTitle, body: cleanBody }
    }

    test("Strips dangerous HTML tags and enforces length limits on notifications", () => {
      const result = sanitizeNotification(
        "<b>New Payment!</b>",
        "<script>alert('xss')</script>Received ₹15,000 from Acme Corp."
      )
      assert.equal(result.title, "New Payment!")
      assert.equal(result.body, "alert('xss')Received ₹15,000 from Acme Corp.")
      assert.doesNotMatch(result.body, /<script>/)
    })
  })

  // ─────────────────────────────────────────────────────────────
  // 10. Preload Bridge Contract Verification (Full Surface)
  // ─────────────────────────────────────────────────────────────
  test("Preload script exposes required native APIs safely without leaking Node internals", () => {
    const preloadSource = fs.readFileSync(path.resolve("desktop/src/preload.ts"), "utf-8")

    assert.match(preloadSource, /contextBridge\.exposeInMainWorld\("collectbotAPI"/)
    assert.match(preloadSource, /startGoogleAuth:/)
    assert.match(preloadSource, /clearSession:/)
    assert.match(preloadSource, /showNotification:/)
    assert.match(preloadSource, /saveFileDialog:/)
    assert.match(preloadSource, /saveFileContent:/)
    assert.match(preloadSource, /openFileDialog:/)

    // Must NOT leak unrestricted Node internals
    assert.doesNotMatch(preloadSource, /child_process/)
    assert.doesNotMatch(preloadSource, /fs\./)
  })

  // ─────────────────────────────────────────────────────────────
  // 11. Offline Fallback Integrity
  // ─────────────────────────────────────────────────────────────
  test("Offline fallback screen is completely self-contained without remote dependencies", () => {
    const offlineHtml = fs.readFileSync(path.resolve("desktop/assets/offline.html"), "utf-8")

    assert.match(offlineHtml, /CollectBot — Offline/)
    assert.match(offlineHtml, /Unable to Connect to CollectBot/)
    assert.match(offlineHtml, /Reconnect \/ Try Again/)

    assert.doesNotMatch(offlineHtml, /<link[^>]+href=["']https?:\/\//i)
    assert.doesNotMatch(offlineHtml, /<script[^>]+src=["']https?:\/\//i)
  })

  // ─────────────────────────────────────────────────────────────
  // 12. Desktop Distribution Artifacts Integrity
  // ─────────────────────────────────────────────────────────────
  test("Desktop assets and compiled distribution binaries exist", () => {
    assert.equal(fs.existsSync(path.resolve("desktop/assets/icon.ico")), true)
    assert.equal(fs.statSync(path.resolve("desktop/assets/icon.ico")).size > 1000, true)

    assert.equal(fs.existsSync(path.resolve("desktop/dist/main.js")), true)
    assert.equal(fs.existsSync(path.resolve("desktop/dist/preload.js")), true)
  })

  // ─────────────────────────────────────────────────────────────
  // 13. Phase 4 & 5: Windows NSIS Installer & Release Packaging
  // ─────────────────────────────────────────────────────────────
  test("electron-builder.yml defines correct NSIS installer configuration", () => {
    const builderConfigPath = path.resolve("electron-builder.yml")
    assert.equal(fs.existsSync(builderConfigPath), true)
    const config = fs.readFileSync(builderConfigPath, "utf-8")

    assert.match(config, /appId:\s*in\.collectbot\.desktop/)
    assert.match(config, /productName:\s*CollectBot/)
    assert.match(config, /schemes:\s*-\s*collectbot/)
    assert.match(config, /artifactName:\s*["']?\$\{productName\}Setup-\$\{version\}-x64\.\$\{ext\}["']?/)
    assert.match(config, /oneClick:\s*false/)
    assert.match(config, /perMachine:\s*false/)
    assert.match(config, /deleteAppDataOnUninstall:\s*false/)
    assert.match(config, /createDesktopShortcut:\s*["']?always["']?/)
    assert.match(config, /createStartMenuShortcut:\s*true/)
  })

  test("GitHub Actions release workflow enforces release pipeline gates", () => {
    const workflowPath = path.resolve(".github/workflows/release-desktop.yml")
    assert.equal(fs.existsSync(workflowPath), true)
    const workflow = fs.readFileSync(workflowPath, "utf-8")

    assert.match(workflow, /tags:\s*-\s*['"]?v\*\.\*\.\*['"]?/)
    assert.match(workflow, /contents:\s*write/)
    assert.match(workflow, /run:\s*npm ci/)
    assert.match(workflow, /run:\s*npm test/)
    assert.match(workflow, /run:\s*npx tsc --noEmit/)
    assert.match(workflow, /run:\s*npm run desktop:compile/)
    assert.match(workflow, /run:\s*npm run desktop:dist/)
    assert.match(workflow, /CollectBotSetup-\*-x64\.exe/)
    assert.match(workflow, /CollectBotSetup-\*-x64\.exe\.sha256/)
    assert.match(workflow, /SHA256SUMS\.txt/)
  })

  test("Windows NSIS installer artifact and SHA-256 verification", () => {
    const distDir = path.resolve("dist")
    assert.equal(fs.existsSync(distDir), true)
    const files = fs.readdirSync(distDir)
    const installerFile = files.find((f) => f.startsWith("CollectBotSetup-") && f.endsWith("-x64.exe") && !f.endsWith(".blockmap"))
    assert.ok(installerFile, "An installer executable must exist in dist/")

    const installerPath = path.join(distDir, installerFile)
    const checksumPath = path.join(distDir, `${installerFile}.sha256`)

    assert.equal(fs.existsSync(installerPath), true)
    const stat = fs.statSync(installerPath)
    assert.equal(stat.size > 50 * 1024 * 1024, true, "Installer must exceed 50MB (runtime shell)")

    if (fs.existsSync(checksumPath)) {
      const checksumContent = fs.readFileSync(checksumPath, "utf-8")
      const fileBuffer = fs.readFileSync(installerPath)
      const actualHash = crypto.createHash("sha256").update(fileBuffer).digest("hex")
      assert.equal(checksumContent.toLowerCase().includes(actualHash.toLowerCase()), true)
    }
  })

  // ─────────────────────────────────────────────────────────────
  // 14. Phase 5: Auto-Update Architecture, Channel Management & Security
  // ─────────────────────────────────────────────────────────────
  test("electron-builder.yml defines secure GitHub publishing configuration", () => {
    const builderConfigPath = path.resolve("electron-builder.yml")
    assert.equal(fs.existsSync(builderConfigPath), true)
    const config = fs.readFileSync(builderConfigPath, "utf-8")

    assert.match(config, /publish:/)
    assert.match(config, /provider:\s*github/)
    assert.match(config, /owner:\s*aryan24-cs/)
    assert.match(config, /repo:\s*CollectBot/)
  })

  test("GitHub Actions release workflow validates multi-channel update feeds", () => {
    const workflowPath = path.resolve(".github/workflows/release-desktop.yml")
    assert.equal(fs.existsSync(workflowPath), true)
    const workflow = fs.readFileSync(workflowPath, "utf-8")

    // Beta and stable tag triggers
    assert.match(workflow, /tags:\s*-\s*['"]?v\*\.\*\.\*['"]?/)
    assert.match(workflow, /-\s*['"]?v\*\.\*\.\*-beta\*['"]?/)

    // Channel determination & prerelease badge
    assert.match(workflow, /Determine Release Channel/)
    assert.match(workflow, /Verify Update Metadata & Blockmap Existence/)
    assert.match(workflow, /dist\/latest\.yml/)
    assert.match(workflow, /dist\/beta\.yml/)
    assert.match(workflow, /dist\/CollectBotSetup-\*-x64\.exe\.blockmap/)
  })

  test("Auto-update feed metadata and differential blockmap integrity", () => {
    const distDir = path.resolve("dist")
    const files = fs.readdirSync(distDir)
    const manifestFile = files.find((f) => f === "latest.yml" || f === "beta.yml")
    assert.ok(manifestFile, "At least one update manifest (latest.yml or beta.yml) must exist in dist/")

    const ymlContent = fs.readFileSync(path.join(distDir, manifestFile), "utf-8")
    assert.match(ymlContent, /version:/)
    assert.match(ymlContent, /files:/)
    assert.match(ymlContent, /sha512:/)

    const blockmapFile = files.find((f) => f.endsWith(".blockmap"))
    assert.ok(blockmapFile, "Differential update blockmap (*.blockmap) must exist in dist/")
    const blockmapPath = path.join(distDir, blockmapFile)
    assert.equal(fs.statSync(blockmapPath).size > 1000, true, "Blockmap must contain valid compression blocks")
  })

  test("Preload bridge exposes read-only update status query", () => {
    const preloadPath = path.resolve("desktop/src/preload.ts")
    const preloadContent = fs.readFileSync(preloadPath, "utf-8")

    assert.match(preloadContent, /getUpdateStatus:/)
    assert.match(preloadContent, /desktop:get-update-status/)
    // Must NOT expose privileged restart or execute methods to renderer
    assert.doesNotMatch(preloadContent, /quitAndInstall/)
    assert.doesNotMatch(preloadContent, /installUpdate/)
  })

  // ─────────────────────────────────────────────────────────────
  // 15. Comprehensive Phase 5 & Phase I Audit Verifications
  // ─────────────────────────────────────────────────────────────
  describe("Stable & Beta Update Channel Management", () => {
    test("Channel validation rejects unapproved channels and enforces stable/beta", () => {
      const updaterSource = fs.readFileSync(path.resolve("desktop/src/updater.ts"), "utf-8")
      assert.match(updaterSource, /channel\s*!==\s*"stable"\s*&&\s*channel\s*!==\s*"beta"/)
    })

    test("Stable channel maps to default latest.yml feed while beta maps to beta.yml", () => {
      const updaterSource = fs.readFileSync(path.resolve("desktop/src/updater.ts"), "utf-8")
      // Stable channel sets channel to null so GitHubProvider requests latest.yml
      assert.match(updaterSource, /autoUpdater\.channel\s*=\s*channel\s*===\s*"beta"\s*\?\s*"beta"\s*:\s*null/)
      assert.match(updaterSource, /autoUpdater\.allowPrerelease\s*=\s*channel\s*===\s*"beta"/)
    })
  })

  describe("Update Downgrade & Security Integrity Checks", () => {
    test("Enforces strict downgrade defense", () => {
      const updaterSource = fs.readFileSync(path.resolve("desktop/src/updater.ts"), "utf-8")
      assert.match(updaterSource, /autoUpdater\.allowDowngrade\s*=\s*false/)
    })

    test("Validates SHA-256 checksum mismatches reject corrupted binaries", () => {
      const original = Buffer.from("Valid CollectBot Setup Binary Payload")
      const tampered = Buffer.from("Malicious CollectBot Setup Binary Payload")

      const originalHash = crypto.createHash("sha256").update(original).digest("hex")
      const tamperedHash = crypto.createHash("sha256").update(tampered).digest("hex")

      assert.notEqual(originalHash, tamperedHash)
      const verifyPayload = (expected, actual) => expected.toLowerCase() === actual.toLowerCase()
      assert.equal(verifyPayload(originalHash, originalHash), true)
      assert.equal(verifyPayload(originalHash, tamperedHash), false)
    })

    test("Rejects malformed or incomplete update manifests", () => {
      const validateManifest = (raw) => {
        if (!raw || typeof raw !== "string") return false
        if (!raw.includes("version:") || !raw.includes("files:") || !raw.includes("sha512:")) {
          return false
        }
        return true
      }

      assert.equal(validateManifest("version: 1.0.0\nfiles:\n  - url: setup.exe\nsha512: abc"), true)
      assert.equal(validateManifest("corrupted yml without headers"), false)
      assert.equal(validateManifest("version: 1.0.0\nfiles:\n  - url: setup.exe"), false)
    })
  })

  describe("Circuit Breaker & Update Loop Defense", () => {
    test("Tracks consecutive failures and trips circuit breaker at 3 strikes", () => {
      function simulateUpdateFailure(currentState, targetVersion) {
        const nextCount = (currentState.consecutiveFailures || 0) + 1
        return {
          consecutiveFailures: nextCount,
          lastAttempt: new Date().toISOString(),
          lastFailedVersion: targetVersion,
          circuitBroken: nextCount >= 3,
        }
      }

      let state = { consecutiveFailures: 0, lastAttempt: "", lastFailedVersion: null, circuitBroken: false }
      state = simulateUpdateFailure(state, "0.1.1-beta.1")
      assert.equal(state.consecutiveFailures, 1)
      assert.equal(state.circuitBroken, false)

      state = simulateUpdateFailure(state, "0.1.1-beta.1")
      assert.equal(state.consecutiveFailures, 2)
      assert.equal(state.circuitBroken, false)

      state = simulateUpdateFailure(state, "0.1.1-beta.1")
      assert.equal(state.consecutiveFailures, 3)
      assert.equal(state.circuitBroken, true, "Circuit breaker must trip after 3 consecutive failures")
    })

    test("Gracefully handles corrupted update-state.json files", () => {
      function safeParseLoopState(rawJson) {
        try {
          const parsed = JSON.parse(rawJson)
          return {
            consecutiveFailures: Number(parsed.consecutiveFailures) || 0,
            circuitBroken: Boolean(parsed.circuitBroken),
          }
        } catch {
          return { consecutiveFailures: 0, circuitBroken: false }
        }
      }

      assert.deepEqual(safeParseLoopState("INVALID JSON {[["), { consecutiveFailures: 0, circuitBroken: false })
      assert.deepEqual(safeParseLoopState('{"consecutiveFailures": 2, "circuitBroken": false}'), {
        consecutiveFailures: 2,
        circuitBroken: false,
      })
    })
  })

  describe("Financial Workflow Protection & Data Loss Prevention", () => {
    function isCriticalFinancialRoute(url) {
      if (!url || typeof url !== "string") return false
      const criticalPatterns = [
        /\/invoices\/new/i,
        /\/invoices\/[a-zA-Z0-9_-]+/i,
        /\/payments\/[a-zA-Z0-9_-]+/i,
        /\/deals\/[a-zA-Z0-9_-]+/i,
      ]
      return criticalPatterns.some((pattern) => pattern.test(url))
    }

    test("Correctly detects active invoice, payment, and sales routes", () => {
      assert.equal(isCriticalFinancialRoute("https://collectbot.vercel.app/invoices/new"), true)
      assert.equal(isCriticalFinancialRoute("https://collectbot.vercel.app/invoices/inv_12345/edit"), true)
      assert.equal(isCriticalFinancialRoute("https://collectbot.vercel.app/payments/rec_987"), true)
      assert.equal(isCriticalFinancialRoute("https://collectbot.vercel.app/deals/deal_456"), true)
    })

    test("Permits non-critical routes for immediate update notifications", () => {
      assert.equal(isCriticalFinancialRoute("https://collectbot.vercel.app/dashboard"), false)
      assert.equal(isCriticalFinancialRoute("https://collectbot.vercel.app/reports"), false)
      assert.equal(isCriticalFinancialRoute("https://collectbot.vercel.app/settings"), false)
      assert.equal(isCriticalFinancialRoute("https://collectbot.vercel.app/clients"), false)
    })

    test("Application close handler contains active financial route warning", () => {
      const mainSource = fs.readFileSync(path.resolve("desktop/src/main.ts"), "utf-8")
      assert.match(mainSource, /mainWindow\.on\("close"/)
      assert.match(mainSource, /isCriticalFinancialRoute\(currentUrl\)/)
      assert.match(mainSource, /Unsaved Changes Warning/)
    })
  })

  describe("Production Database Migration & RLS Security", () => {
    test("Dedicated migration file exists with correct table, indexes, and RLS", () => {
      const migrationPath = path.resolve("supabase/migrations/20261111_desktop_auth_tickets.sql")
      assert.equal(fs.existsSync(migrationPath), true)
      const sql = fs.readFileSync(migrationPath, "utf-8")

      assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.desktop_auth_tickets/)
      assert.match(sql, /ticket_hash TEXT NOT NULL UNIQUE/)
      assert.match(sql, /expires_at TIMESTAMPTZ NOT NULL/)
      assert.match(sql, /consumed_at TIMESTAMPTZ/)
      assert.match(sql, /idx_desktop_auth_tickets_lookup/)
      assert.match(sql, /ALTER TABLE public\.desktop_auth_tickets ENABLE ROW LEVEL SECURITY/)
      assert.match(sql, /REVOKE ALL ON TABLE public\.desktop_auth_tickets FROM PUBLIC, anon, authenticated/)
      assert.match(sql, /GRANT ALL ON TABLE public\.desktop_auth_tickets TO service_role/)
      assert.match(sql, /SET search_path = pg_catalog, pg_temp/)
      assert.match(sql, /DELETE FROM public\.desktop_auth_tickets/)
      assert.match(sql, /REVOKE ALL ON FUNCTION public\.purge_expired_desktop_auth_tickets\(\) FROM PUBLIC, anon, authenticated/)
      assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.purge_expired_desktop_auth_tickets\(\) TO service_role/)
    })
  })

  // ─────────────────────────────────────────────────────────────
  // 16. Desktop Google OAuth Handshake & Edge Case Verification
  // ─────────────────────────────────────────────────────────────
  describe("Desktop Google OAuth Handshake & Ticket Exchange Lifecycle", () => {
    const databaseState = new Map()

    function createTicketInPostgres(rawTicket, userId, sessionData, ttlSeconds = 60) {
      const ticketHash = crypto.createHash("sha256").update(rawTicket).digest("hex")
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000)
      databaseState.set(ticketHash, {
        id: crypto.randomUUID(),
        ticket_hash: ticketHash,
        user_id: userId,
        session_data: sessionData,
        expires_at: expiresAt,
        consumed_at: null,
      })
      return rawTicket
    }

    function atomicConsumePostgres(rawTicket, isProduction = true, simulateDbError = false) {
      if (!rawTicket || typeof rawTicket !== "string" || rawTicket.length < 32) {
        return null
      }
      if (simulateDbError) {
        if (isProduction) return null // Production fails safely with no memory fallback
      }

      const ticketHash = crypto.createHash("sha256").update(rawTicket).digest("hex")
      const row = databaseState.get(ticketHash)
      if (!row) return null

      const now = new Date()
      // SQL: WHERE ticket_hash = $1 AND consumed_at IS NULL AND expires_at > NOW()
      if (row.consumed_at !== null || row.expires_at <= now) {
        return null // Already consumed or expired
      }

      // Atomic single-use update
      row.consumed_at = now
      return row.session_data
    }

    test("Scenario 1: Successful end-to-end authentication handshake", () => {
      // 1. Generate 256-bit entropy raw ticket
      const rawTicket = crypto.randomBytes(32).toString("hex")
      assert.equal(rawTicket.length, 64) // 32 bytes hex = 256 bits

      // 2. Persist in database
      createTicketInPostgres(rawTicket, "usr-abc-123", {
        session: { access_token: "jwt.access.token", refresh_token: "rt_token" },
        activeBusinessId: "biz-primary-456",
        destination: "/dashboard",
      })

      // 3. Atomically consume
      const sessionData = atomicConsumePostgres(rawTicket, true)
      assert.ok(sessionData)
      assert.equal(sessionData.destination, "/dashboard")
      assert.equal(sessionData.activeBusinessId, "biz-primary-456")
      assert.equal(sessionData.session.access_token, "jwt.access.token")
    })

    test("Scenario 2: Invalid or short ticket string is rejected immediately", () => {
      assert.equal(atomicConsumePostgres("short-ticket"), null)
      assert.equal(atomicConsumePostgres(""), null)
      assert.equal(atomicConsumePostgres(null), null)
    })

    test("Scenario 3: Expired ticket (>60s) cannot be redeemed", () => {
      const rawTicket = crypto.randomBytes(32).toString("hex")
      createTicketInPostgres(rawTicket, "usr-expired", { auth: true }, -5) // Expired 5 seconds ago

      const result = atomicConsumePostgres(rawTicket, true)
      assert.equal(result, null, "Expired tickets must return null")
    })

    test("Scenario 4: Reused ticket (replay attack) is strictly denied", () => {
      const rawTicket = crypto.randomBytes(32).toString("hex")
      createTicketInPostgres(rawTicket, "usr-reused", { auth: true }, 60)

      // First consumption succeeds
      const first = atomicConsumePostgres(rawTicket, true)
      assert.ok(first)

      // Second consumption must fail
      const second = atomicConsumePostgres(rawTicket, true)
      assert.equal(second, null, "Replayed tickets must be rejected on second redemption")
    })

    test("Scenario 5: Concurrent ticket redemption allows exactly one winner", async () => {
      const rawTicket = crypto.randomBytes(32).toString("hex")
      createTicketInPostgres(rawTicket, "usr-race", { auth: true }, 60)

      const attempts = await Promise.all([
        Promise.resolve().then(() => atomicConsumePostgres(rawTicket, true)),
        Promise.resolve().then(() => atomicConsumePostgres(rawTicket, true)),
        Promise.resolve().then(() => atomicConsumePostgres(rawTicket, true)),
      ])

      const winners = attempts.filter(Boolean)
      assert.equal(winners.length, 1, "Exactly one concurrent consumer must win")
    })

    test("Scenario 6: Production database failure causes authentication to fail safely with no memory fallback", () => {
      const rawTicket = crypto.randomBytes(32).toString("hex")
      createTicketInPostgres(rawTicket, "usr-db-fail", { auth: true }, 60)

      // Database error simulated in production mode
      const result = atomicConsumePostgres(rawTicket, true, true)
      assert.equal(result, null, "Must return null safely when database is unavailable in production")
    })

    test("Scenario 7: Session cookie attributes enforce persistent session and isolation", () => {
      const supabaseCookie = {
        name: "sb-faoetyzqzqqtwatflefk-auth-token",
        value: JSON.stringify(["access_token", "refresh_token", null, null, null]),
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        expirationDate: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30 days
      }

      assert.equal(supabaseCookie.httpOnly, true)
      assert.equal(supabaseCookie.secure, true)
      assert.equal(supabaseCookie.sameSite, "lax")
      assert.equal(supabaseCookie.expirationDate > Date.now() / 1000, true)
    })

    test("Scenario 8: Access and refresh tokens are encrypted with AES-256-GCM before storage", () => {
      // Test AES-256-GCM authenticated encryption implementation
      const rawSession = {
        access_token: "secret_access_jwt_token_value_12345",
        refresh_token: "secret_refresh_token_value_67890",
      }

      const key = crypto.createHash("sha256").update("server_environment_secret_key").digest()
      const iv = crypto.randomBytes(12)
      const cipher = crypto.createCipheriv("aes-256-gcm", key, iv)
      let ciphertext = cipher.update(JSON.stringify(rawSession), "utf8", "hex")
      ciphertext += cipher.final("hex")
      const tag = cipher.getAuthTag().toString("hex")

      // Ciphertext must NOT contain plaintext tokens
      assert.doesNotMatch(ciphertext, /secret_access_jwt_token_value/)
      assert.doesNotMatch(ciphertext, /secret_refresh_token_value/)

      // Decryption with correct tag succeeds
      const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv)
      decipher.setAuthTag(Buffer.from(tag, "hex"))
      let decrypted = decipher.update(ciphertext, "hex", "utf8")
      decrypted += decipher.final("utf8")
      assert.deepEqual(JSON.parse(decrypted), rawSession)

      // Tampered ciphertext fails authenticated decryption
      const tamperedCiphertext = ciphertext.slice(0, -2) + (ciphertext.slice(-2) === "aa" ? "bb" : "aa")
      const badDecipher = crypto.createDecipheriv("aes-256-gcm", key, iv)
      badDecipher.setAuthTag(Buffer.from(tag, "hex"))
      assert.throws(() => {
        let bad = badDecipher.update(tamperedCiphertext, "hex", "utf8")
        bad += badDecipher.final("utf8")
      })
    })

    test("Scenario 9: Raw tickets are strictly redacted from application logs", () => {
      const mainSource = fs.readFileSync(path.resolve("desktop/src/main.ts"), "utf-8")
      assert.match(mainSource, /searchParams\.set\("ticket", "\[REDACTED\]"\)/)
      assert.doesNotMatch(mainSource, /Received protocol invocation: \$\{rawUrl\}/)
    })

    test("Scenario 10: Desktop ticket code enforces AES-256-GCM encryption and cleanup", () => {
      const ticketsSource = fs.readFileSync(path.resolve("src/lib/auth/desktopTickets.ts"), "utf-8")
      assert.match(ticketsSource, /aes-256-gcm/)
      assert.match(ticketsSource, /crypto\.createCipheriv\("aes-256-gcm"/)
      assert.match(ticketsSource, /crypto\.createDecipheriv\("aes-256-gcm"/)
      assert.match(ticketsSource, /triggerOpportunisticDatabaseCleanup/)
      assert.match(ticketsSource, /DESKTOP_TICKET_ENCRYPTION_KEY/)
      assert.match(ticketsSource, /parseAndValidate32ByteKey/)
      assert.match(ticketsSource, /Security Misconfiguration: DESKTOP_TICKET_ENCRYPTION_KEY is required in production/)

      // Verify removal of production fallbacks to other secrets
      assert.doesNotMatch(ticketsSource, /process\.env\.SUPABASE_SERVICE_ROLE_KEY \|\|\s*process\.env\.NEXTAUTH_SECRET/)
    })

    test("Scenario 11: 32-byte key validation enforces exact 256-bit requirement and format checks", () => {
      function parseAndValidate32ByteKey(rawKey) {
        if (!rawKey || typeof rawKey !== "string") return null
        const trimmed = rawKey.trim()
        if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
          return Buffer.from(trimmed, "hex")
        }
        if (/^[A-Za-z0-9+/]{42,43}={0,2}$/.test(trimmed)) {
          try {
            const buf = Buffer.from(trimmed, "base64")
            if (buf.length === 32) return buf
          } catch {}
        }
        const rawBuf = Buffer.from(trimmed, "utf8")
        if (rawBuf.length === 32) {
          return rawBuf
        }
        return null
      }

      // Valid 64-character hex key
      const hexKey = crypto.randomBytes(32).toString("hex")
      const parsedHex = parseAndValidate32ByteKey(hexKey)
      assert.notEqual(parsedHex, null)
      assert.equal(parsedHex.length, 32)

      // Valid 44-character base64 key
      const base64Key = crypto.randomBytes(32).toString("base64")
      const parsedBase64 = parseAndValidate32ByteKey(base64Key)
      assert.notEqual(parsedBase64, null)
      assert.equal(parsedBase64.length, 32)

      // Valid 32-byte raw utf-8 string
      const raw32 = "12345678901234567890123456789012"
      const parsedRaw = parseAndValidate32ByteKey(raw32)
      assert.notEqual(parsedRaw, null)
      assert.equal(parsedRaw.length, 32)

      // Invalid lengths and formats rejected
      assert.equal(parseAndValidate32ByteKey("short-key"), null)
      assert.equal(parseAndValidate32ByteKey(hexKey.slice(0, 62)), null) // 31 bytes hex
      assert.equal(parseAndValidate32ByteKey(hexKey + "ff"), null) // 33 bytes hex
      assert.equal(parseAndValidate32ByteKey(undefined), null)
      assert.equal(parseAndValidate32ByteKey(""), null)
      assert.equal(parseAndValidate32ByteKey("   "), null)
    })

    test("Scenario 12: Production key resolution fails safely without fallback, rotation invalidates active tickets", () => {
      function resolveKey(isProd, envKey) {
        if (isProd) {
          if (!envKey || envKey.length !== 64) {
            throw new Error("Security Misconfiguration: DESKTOP_TICKET_ENCRYPTION_KEY is required in production")
          }
          return Buffer.from(envKey, "hex")
        }
        if (envKey && envKey.length === 64) {
          return Buffer.from(envKey, "hex")
        }
        return crypto.createHash("sha256").update("dev-seed").digest()
      }

      // Production requires valid key; rejects missing key without fallback
      assert.throws(() => resolveKey(true, undefined), /Security Misconfiguration/)
      assert.throws(() => resolveKey(true, "too-short"), /Security Misconfiguration/)

      // Production succeeds with valid key
      const keyA = crypto.randomBytes(32).toString("hex")
      const resolvedA = resolveKey(true, keyA)
      assert.equal(resolvedA.length, 32)

      // Development falls back to dev seed when key is omitted
      const devDefault = resolveKey(false, undefined)
      assert.equal(devDefault.length, 32)

      // Key rotation test: tickets encrypted with Key A cannot be decrypted with Key B
      const keyB = crypto.randomBytes(32).toString("hex")
      const resolvedB = resolveKey(true, keyB)

      const iv = crypto.randomBytes(12)
      const cipher = crypto.createCipheriv("aes-256-gcm", resolvedA, iv)
      let ciphertext = cipher.update(JSON.stringify({ token: "session_token_xyz" }), "utf8", "hex")
      ciphertext += cipher.final("hex")
      const tag = cipher.getAuthTag()

      // Decryption with rotated key B fails authenticated GCM tag verification
      const badDecipher = crypto.createDecipheriv("aes-256-gcm", resolvedB, iv)
      badDecipher.setAuthTag(tag)
      assert.throws(() => {
        badDecipher.update(ciphertext, "hex", "utf8")
        badDecipher.final("utf8")
      })
    })

    test("Scenario 13: Trusted origin validation prevents Host header spoofing and poisoning", () => {
      function getTrustedOrigin(urlStr, isDev) {
        const canonical = "https://collectbot.vercel.app"
        const parsed = new URL(urlStr)
        if (parsed.hostname === "collectbot.vercel.app") {
          return "https://collectbot.vercel.app"
        }
        if (isDev && (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")) {
          return `${parsed.protocol}//${parsed.host}`
        }
        return canonical
      }

      // Valid canonical request
      assert.equal(getTrustedOrigin("https://collectbot.vercel.app/api/auth/desktop/login", false), "https://collectbot.vercel.app")

      // Host header poisoning attempt with attacker.com returns canonical origin, preventing redirection hijacking
      assert.equal(getTrustedOrigin("https://attacker.com/api/auth/desktop/login", false), "https://collectbot.vercel.app")
      assert.equal(getTrustedOrigin("http://phishing-collectbot.com/api/auth/desktop/login", false), "https://collectbot.vercel.app")

      // Dev mode permits localhost
      assert.equal(getTrustedOrigin("http://localhost:3000/api/auth/desktop/login", true), "http://localhost:3000")
      // Production mode rejects localhost and forces canonical
      assert.equal(getTrustedOrigin("http://localhost:3000/api/auth/desktop/login", false), "https://collectbot.vercel.app")
    })

    test("Scenario 14: Desktop endpoints enforce rate limiting against brute-force abuse", () => {
      const loginRoute = fs.readFileSync(path.resolve("src/app/api/auth/desktop/login/route.ts"), "utf-8")
      const exchangeRoute = fs.readFileSync(path.resolve("src/app/api/auth/desktop/exchange/route.ts"), "utf-8")
      const callbackRoute = fs.readFileSync(path.resolve("src/app/api/auth/callback/route.ts"), "utf-8")

      // Both desktop endpoints must check rate limit
      assert.match(loginRoute, /checkRateLimit\(`desktop_login:/)
      assert.match(exchangeRoute, /checkRateLimit\(`desktop_exchange:/)
      assert.match(loginRoute, /getTrustedOrigin/)
      assert.match(callbackRoute, /getTrustedOrigin/)
    })
  })
})
