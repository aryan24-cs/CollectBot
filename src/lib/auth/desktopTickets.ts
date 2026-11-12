import crypto from "node:crypto"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"

interface TicketPayload {
  userId: string
  sessionData: Record<string, any>
  ipAddress?: string
}

// ─────────────────────────────────────────────────────────────
// AES-256-GCM Authenticated Encryption for Tokens at Rest
// ─────────────────────────────────────────────────────────────
export interface EncryptedSessionEnvelope {
  __encrypted: true
  alg: "aes-256-gcm"
  iv: string // 12-byte hex IV
  tag: string // 16-byte hex authentication tag
  ciphertext: string // hex ciphertext
}

/**
 * Decodes and validates that the supplied raw key string resolves to exactly 32 bytes (256 bits).
 * Supports:
 * - 64-character hexadecimal string
 * - Base64 encoded string decoding to exactly 32 bytes
 * - Raw UTF-8 string with byte length of exactly 32 bytes
 * 
 * Never logs or prints key material.
 */
export function parseAndValidate32ByteKey(rawKey: string | undefined): Buffer | null {
  if (!rawKey || typeof rawKey !== "string") return null
  const trimmed = rawKey.trim()

  // 1. 64-character hex string (32 bytes)
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, "hex")
  }

  // 2. Base64 string decoding to exactly 32 bytes
  if (/^[A-Za-z0-9+/]{42,43}={0,2}$/.test(trimmed)) {
    try {
      const buf = Buffer.from(trimmed, "base64")
      if (buf.length === 32) {
        return buf
      }
    } catch {
      // Invalid base64 sequence
    }
  }

  // 3. Raw 32-byte UTF-8 string
  const rawBuf = Buffer.from(trimmed, "utf8")
  if (rawBuf.length === 32) {
    return rawBuf
  }

  return null
}

/**
 * Resolves the AES-256-GCM encryption key.
 * 
 * In production (NODE_ENV === "production"):
 * - DESKTOP_TICKET_ENCRYPTION_KEY is STRICTLY required.
 * - Key must decode to exactly 32 bytes (256 bits).
 * - Fallbacks to SUPABASE_SERVICE_ROLE_KEY or NEXTAUTH_SECRET are completely removed.
 * 
 * In development / testing (NODE_ENV !== "production"):
 * - Uses DESKTOP_TICKET_ENCRYPTION_KEY if provided and valid.
 * - Otherwise falls back to an isolated development-only seed.
 */
export function getEncryptionKey(): Buffer {
  const isProduction = process.env.NODE_ENV === "production"
  const rawKey = process.env.DESKTOP_TICKET_ENCRYPTION_KEY

  if (isProduction) {
    const validatedKey = parseAndValidate32ByteKey(rawKey)
    if (!validatedKey) {
      throw new Error(
        "Security Misconfiguration: DESKTOP_TICKET_ENCRYPTION_KEY is required in production and must decode to exactly 32 bytes (64 hex characters or 44 base64 characters)."
      )
    }
    return validatedKey
  }

  // In non-production environments (development / testing):
  const explicitDevKey = parseAndValidate32ByteKey(rawKey)
  if (explicitDevKey) {
    return explicitDevKey
  }

  // Isolated development fallback key (strictly disabled in production)
  return crypto.createHash("sha256").update("collectbot-dev-isolated-encryption-seed").digest()
}

export function encryptSessionData(sessionData: Record<string, any>): EncryptedSessionEnvelope {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(12) // 96-bit standard GCM IV
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv)
  const plaintext = JSON.stringify(sessionData)
  let ciphertext = cipher.update(plaintext, "utf8", "hex")
  ciphertext += cipher.final("hex")
  const tag = cipher.getAuthTag().toString("hex")

  return {
    __encrypted: true,
    alg: "aes-256-gcm",
    iv: iv.toString("hex"),
    tag,
    ciphertext,
  }
}

export function decryptSessionData(envelope: any): Record<string, any> | null {
  if (!envelope || typeof envelope !== "object") return null

  // Backward-compatible if envelope is unencrypted legacy JSON
  if (!envelope.__encrypted) {
    return envelope
  }

  try {
    const key = getEncryptionKey()
    const iv = Buffer.from(envelope.iv, "hex")
    const tag = Buffer.from(envelope.tag, "hex")
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv)
    decipher.setAuthTag(tag)

    let decrypted = decipher.update(envelope.ciphertext, "hex", "utf8")
    decrypted += decipher.final("utf8")

    return JSON.parse(decrypted)
  } catch (err: any) {
    console.error("[DesktopAuth] Cryptographic decryption failed for ticket payload:", err?.message)
    return null
  }
}

// In-memory fallback cache with automatic GC for offline testability & resilience
interface MemoryTicketRecord {
  ticketHash: string
  userId: string
  sessionData: Record<string, any>
  expiresAt: number
  consumed: boolean
}

const memoryStore = new Map<string, MemoryTicketRecord>()

// Periodic garbage collection for in-memory records
function purgeExpiredMemoryTickets() {
  const now = Date.now()
  for (const [hash, record] of memoryStore.entries()) {
    if (record.expiresAt <= now || record.consumed) {
      memoryStore.delete(hash)
    }
  }
}

// Opportunistic asynchronous cleanup of expired tickets older than 1 hour in database
async function triggerOpportunisticDatabaseCleanup(supabase: any) {
  // Run asynchronously without awaiting to avoid slowing down the response
  Promise.resolve().then(async () => {
    try {
      const oneHourAgoIso = new Date(Date.now() - 3600 * 1000).toISOString()
      await supabase
        .from("desktop_auth_tickets")
        .delete()
        .lt("expires_at", oneHourAgoIso)
    } catch (_) {
      // Ignored: non-blocking opportunistic background sweep
    }
  })
}

/**
 * Creates a cryptographically secure 256-bit one-time desktop authentication ticket.
 * Valid for 60 seconds.
 * 
 * Session tokens are encrypted using AES-256-GCM before being stored in PostgreSQL.
 * In production (NODE_ENV === "production"), uses PostgreSQL exclusively.
 * Database failures in production cause authentication to fail safely without fallback.
 */
export async function createDesktopAuthTicket(payload: TicketPayload): Promise<string> {
  const isProduction = process.env.NODE_ENV === "production"

  // Generate 256 bits (32 bytes) of secure cryptographic entropy
  const rawTicket = crypto.randomBytes(32).toString("hex")
  const ticketHash = crypto.createHash("sha256").update(rawTicket).digest("hex")
  const expiresAt = new Date(Date.now() + 60 * 1000)

  // Encrypt session tokens using AES-256-GCM envelope before database storage
  const encryptedPayload = encryptSessionData(payload.sessionData)

  // Store in database via service-role client
  const supabase = getSupabaseServiceRoleClient()
  const { error } = await supabase.from("desktop_auth_tickets").insert({
    ticket_hash: ticketHash,
    user_id: payload.userId,
    session_data: encryptedPayload,
    expires_at: expiresAt.toISOString(),
    ip_address: payload.ipAddress || null,
  })

  if (error) {
    if (isProduction) {
      console.error("[DesktopAuth] Production Security Error: Failed to persist ticket to PostgreSQL:", error.message)
      throw new Error(`Database ticket storage error: ${error.message}`)
    }
    console.warn("[DesktopAuth] Non-production database fallback active:", error.message)
  }

  // Trigger opportunistic background cleanup (1 in 5 chance)
  if (Math.random() < 0.2) {
    triggerOpportunisticDatabaseCleanup(supabase)
  }

  // Memory fallback is strictly restricted to development & test environments
  if (!isProduction) {
    purgeExpiredMemoryTickets()
    memoryStore.set(ticketHash, {
      ticketHash,
      userId: payload.userId,
      sessionData: payload.sessionData,
      expiresAt: expiresAt.getTime(),
      consumed: false,
    })
  }

  return rawTicket
}

/**
 * Atomically consumes a one-time desktop authentication ticket.
 * Enforces single-use consumption, replay protection, and AES-256-GCM decryption.
 * 
 * In production, queries PostgreSQL exclusively with RETURNING.
 */
export async function consumeDesktopAuthTicket(rawTicket: string): Promise<Record<string, any> | null> {
  if (!rawTicket || typeof rawTicket !== "string" || rawTicket.length < 32) {
    return null
  }

  const isProduction = process.env.NODE_ENV === "production"
  const ticketHash = crypto.createHash("sha256").update(rawTicket).digest("hex")
  const nowIso = new Date().toISOString()
  const nowMs = Date.now()

  // 1. Attempt atomic consumption in database (Single atomic query)
  try {
    const supabase = getSupabaseServiceRoleClient()
    const { data, error } = await (supabase as any)
      .from("desktop_auth_tickets")
      .update({ consumed_at: nowIso })
      .eq("ticket_hash", ticketHash)
      .is("consumed_at", null)
      .gt("expires_at", nowIso)
      .select("session_data, user_id")
      .maybeSingle()

    if (error) {
      console.error("[DesktopAuth] Database ticket consumption error:", error.message)
      if (isProduction) {
        // Fail safely in production; never allow in-memory fallback
        return null
      }
    } else if (data?.session_data) {
      // Successfully consumed in database: Decrypt AES-256-GCM envelope
      const decryptedSession = decryptSessionData(data.session_data)
      if (!isProduction) {
        memoryStore.delete(ticketHash)
      }
      return decryptedSession
    } else {
      // 0 rows updated: ticket is either non-existent, expired, or already consumed
      if (isProduction) {
        return null
      }
    }
  } catch (err: any) {
    console.error("[DesktopAuth] Exception during database ticket consumption:", err?.message)
    if (isProduction) {
      return null
    }
  }

  // 2. Check memory store fallback ONLY in non-production environments
  if (!isProduction) {
    purgeExpiredMemoryTickets()
    const memoryRecord = memoryStore.get(ticketHash)

    if (memoryRecord) {
      if (memoryRecord.consumed || memoryRecord.expiresAt <= nowMs) {
        memoryStore.delete(ticketHash)
        return null // Expired or replayed
      }

      // Atomic consumption: burn immediately
      memoryRecord.consumed = true
      memoryStore.delete(ticketHash)
      return memoryRecord.sessionData
    }
  }

  return null
}

