import { NextRequest, NextResponse } from "next/server"

interface RateLimitConfig {
  limit: number // Max allowed hits
  windowMs: number // Time window in milliseconds
}

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory sliding window cache with automatic cleanup
const rateLimitMap = new Map<string, RateLimitEntry>()

// Periodic garbage collection every 5 minutes to avoid memory leaks
const GC_INTERVAL_MS = 5 * 60 * 1000
let lastCleanup = Date.now()

function cleanupExpiredEntries() {
  const now = Date.now()
  if (now - lastCleanup > GC_INTERVAL_MS) {
    lastCleanup = now
    for (const [key, entry] of rateLimitMap.entries()) {
      if (now > entry.resetTime) {
        rateLimitMap.delete(key)
      }
    }
  }
}

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }
  const realIp = request.headers.get("x-real-ip")
  if (realIp) return realIp.trim()

  const cfIp = request.headers.get("cf-connecting-ip")
  if (cfIp) return cfIp.trim()

  return "127.0.0.1"
}

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = { limit: 60, windowMs: 60 * 1000 }
): {
  allowed: boolean
  limit: number
  remaining: number
  retryAfterSeconds: number
} {
  cleanupExpiredEntries()

  const now = Date.now()
  const key = identifier
  const entry = rateLimitMap.get(key)

  if (!entry || now > entry.resetTime) {
    // New window
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    })
    return {
      allowed: true,
      limit: config.limit,
      remaining: config.limit - 1,
      retryAfterSeconds: Math.ceil(config.windowMs / 1000),
    }
  }

  // Increment hit count
  entry.count++
  const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetTime - now) / 1000))
  const remaining = Math.max(0, config.limit - entry.count)
  const allowed = entry.count <= config.limit

  return {
    allowed,
    limit: config.limit,
    remaining,
    retryAfterSeconds,
  }
}

/**
 * Standard HTTP 429 response builder with rate limit headers
 */
export function buildRateLimitResponse(
  limit: number,
  remaining: number,
  retryAfterSeconds: number,
  message = "Too many requests. Please slow down and try again shortly."
): NextResponse {
  return NextResponse.json(
    { error: message, retryAfterSeconds },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": String(remaining),
      },
    }
  )
}

