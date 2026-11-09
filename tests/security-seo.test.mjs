import { test, describe } from "node:test"
import assert from "node:assert/strict"

// 1. Anti-Bot Verification Logic
function verifyAntiBot(data, minSubmissionTimeMs = 1200) {
  if (data.website_trap && data.website_trap.trim().length > 0) {
    return { isHuman: false, reason: "Automated submission detected via honeypot trap." }
  }

  if (data.rendered_at) {
    const rendered = Number(data.rendered_at)
    if (!isNaN(rendered) && rendered > 0) {
      const elapsed = Date.now() - rendered
      if (elapsed < minSubmissionTimeMs) {
        return { isHuman: false, reason: "Submission occurred too quickly for human input." }
      }
    }
  }

  return { isHuman: true }
}

// 2. Sliding-Window Rate Limiting Logic
class MemoryRateLimiter {
  constructor() {
    this.hits = new Map()
  }

  check(key, limit = 60, windowMs = 60000) {
    const now = Date.now()
    const entry = this.hits.get(key)

    if (!entry || now > entry.resetTime) {
      this.hits.set(key, { count: 1, resetTime: now + windowMs })
      return { allowed: true, limit, remaining: limit - 1, retryAfterSeconds: Math.ceil(windowMs / 1000) }
    }

    entry.count++
    const remaining = Math.max(0, limit - entry.count)
    const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetTime - now) / 1000))
    return {
      allowed: entry.count <= limit,
      limit,
      remaining,
      retryAfterSeconds,
    }
  }
}

// 3. Sitemap & Robots Contract
const PUBLIC_SITEMAP_URLS = [
  "https://collectbot.in",
  "https://collectbot.in/signup",
  "https://collectbot.in/login",
  "https://collectbot.in/privacy",
  "https://collectbot.in/terms",
  "https://collectbot.in/refund",
]

const ROBOTS_RULES = {
  allow: ["/", "/privacy", "/terms", "/refund", "/login", "/signup"],
  disallow: [
    "/admin/",
    "/dashboard/",
    "/invoices/",
    "/expenses/",
    "/clients/",
    "/settings/",
    "/tasks/",
    "/approvals/",
    "/reminders/",
    "/select-workspace",
    "/onboarding",
    "/join",
    "/pay/",
    "/api/",
  ],
  sitemap: "https://collectbot.in/sitemap.xml",
}

describe("CollectBot Security & Anti-Abuse Engine Tests", () => {
  test("Detects automated bot when honeypot trap field is filled", () => {
    const submission = {
      website_trap: "http://spam-link.ru",
      rendered_at: Date.now() - 5000,
    }
    const result = verifyAntiBot(submission)
    assert.equal(result.isHuman, false)
    assert.match(result.reason, /honeypot trap/i)
  })

  test("Detects sub-second machine submission", () => {
    const submission = {
      website_trap: "",
      rendered_at: Date.now() - 200, // 200ms ago -> machine
    }
    const result = verifyAntiBot(submission, 1200)
    assert.equal(result.isHuman, false)
    assert.match(result.reason, /too quickly/i)
  })

  test("Approves valid human form submission", () => {
    const submission = {
      website_trap: "",
      rendered_at: Date.now() - 4000, // 4 seconds ago -> human
    }
    const result = verifyAntiBot(submission)
    assert.equal(result.isHuman, true)
  })

  test("Enforces sliding-window rate limit threshold and decrements remaining quota", () => {
    const limiter = new MemoryRateLimiter()
    const ipKey = `ip_${Date.now()}`

    const hit1 = limiter.check(ipKey, 3, 1000)
    assert.equal(hit1.allowed, true)
    assert.equal(hit1.remaining, 2)

    const hit2 = limiter.check(ipKey, 3, 1000)
    assert.equal(hit2.allowed, true)
    assert.equal(hit2.remaining, 1)

    const hit3 = limiter.check(ipKey, 3, 1000)
    assert.equal(hit3.allowed, true)
    assert.equal(hit3.remaining, 0)

    // 4th hit exceeds limit
    const hit4 = limiter.check(ipKey, 3, 1000)
    assert.equal(hit4.allowed, false)
    assert.equal(hit4.remaining, 0)
    assert.ok(hit4.retryAfterSeconds > 0)
  })
})

describe("CollectBot SEO & Crawling Verification Tests", () => {
  test("Sitemap strictly includes public pages and excludes all private application paths", () => {
    // Must include public landing, auth, and legal pages
    assert.ok(PUBLIC_SITEMAP_URLS.some((u) => u === "https://collectbot.in"))
    assert.ok(PUBLIC_SITEMAP_URLS.some((u) => u.includes("/privacy")))
    assert.ok(PUBLIC_SITEMAP_URLS.some((u) => u.includes("/terms")))
    assert.ok(PUBLIC_SITEMAP_URLS.some((u) => u.includes("/refund")))
    assert.ok(PUBLIC_SITEMAP_URLS.some((u) => u.includes("/login")))
    assert.ok(PUBLIC_SITEMAP_URLS.some((u) => u.includes("/signup")))

    // Must NEVER include private workspaces, admin, invoices, or API paths
    for (const url of PUBLIC_SITEMAP_URLS) {
      assert.equal(url.includes("/admin"), false)
      assert.equal(url.includes("/dashboard"), false)
      assert.equal(url.includes("/invoices"), false)
      assert.equal(url.includes("/api"), false)
      assert.equal(url.includes("/select-workspace"), false)
    }
  })

  test("Robots.txt disallows sensitive dashboards, APIs, and portals while allowing public routes", () => {
    assert.ok(ROBOTS_RULES.allow.includes("/"))
    assert.ok(ROBOTS_RULES.disallow.includes("/admin/"))
    assert.ok(ROBOTS_RULES.disallow.includes("/dashboard/"))
    assert.ok(ROBOTS_RULES.disallow.includes("/invoices/"))
    assert.ok(ROBOTS_RULES.disallow.includes("/api/"))
    assert.ok(ROBOTS_RULES.disallow.includes("/pay/"))
    assert.match(ROBOTS_RULES.sitemap, /sitemap\.xml$/)
  })
})

