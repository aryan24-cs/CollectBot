# COLLECTBOT DESKTOP — PRODUCTION DATABASE MIGRATION GUIDE

**Component:** Desktop Authentication Tickets  
**Migration File:** `supabase/migrations/20261111_desktop_auth_tickets.sql`  
**Target Environment:** Supabase PostgreSQL 15+ (Production: `https://collectbot.in`)  
**Status:** **PENDING DEPLOYMENT BY ADMINISTRATOR**  
**Execution Gate:** **MANDATORY PRODUCTION BLOCKER**

---

## 1. MIGRATION OVERVIEW & PURPOSE

CollectBot Desktop uses an enterprise deep-link authentication flow for Google OAuth. When a user clicks "Sign in with Google" inside CollectBot Desktop:
1. The desktop app launches the system default web browser to `https://collectbot.in/api/auth/desktop/login`.
2. The user authenticates against Google Accounts.
3. Next.js exchanges the OAuth code for a Supabase session.
4. Next.js creates a cryptographically secure, 256-bit one-time ticket, hashes it with SHA-256, and stores it in `desktop_auth_tickets` with a strict 60-second time-to-live (TTL).
5. The browser redirects to `collectbot://auth/callback?ticket=...&state=...`.
6. CollectBot Desktop captures the deep-link and atomically exchanges the one-time ticket via `POST /api/auth/desktop/exchange`.
7. Next.js burns the ticket in PostgreSQL in a single atomic SQL transaction and injects HTTP-only session cookies into Electron's persistent partition (`persist:collectbot`).

Without this migration, **desktop Google OAuth ticket persistence and redemption will fail with a 500 error** in production.

---

## 2. PRODUCTION DEPLOYMENT SCRIPT

Copy and execute the following SQL in your **Supabase Dashboard -> SQL Editor**:

```sql
-- ─────────────────────────────────────────────────────────────
-- CollectBot Database Migration: Desktop Authentication Tickets
-- Target: Supabase PostgreSQL 15+ (Production)
-- ─────────────────────────────────────────────────────────────

-- 1. Create table for storing short-lived (60s) desktop authentication tickets
CREATE TABLE IF NOT EXISTS public.desktop_auth_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_hash TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL,
    session_data JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create partial index for rapid lookup of active, unconsumed tickets
CREATE INDEX IF NOT EXISTS idx_desktop_auth_tickets_lookup 
    ON public.desktop_auth_tickets (ticket_hash, expires_at) 
    WHERE consumed_at IS NULL;

-- 3. Create index for background expiration cleanups
CREATE INDEX IF NOT EXISTS idx_desktop_auth_tickets_expiry
    ON public.desktop_auth_tickets (expires_at);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.desktop_auth_tickets ENABLE ROW LEVEL SECURITY;

-- 5. Revoke all public/anon/authenticated access (strictly service-role only)
REVOKE ALL ON TABLE public.desktop_auth_tickets FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.desktop_auth_tickets TO service_role;

-- 6. Maintenance function: Purge expired and consumed tickets older than 24 hours
CREATE OR REPLACE FUNCTION public.purge_expired_desktop_auth_tickets()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM public.desktop_auth_tickets
    WHERE expires_at < NOW() - INTERVAL '24 hours'
       OR consumed_at < NOW() - INTERVAL '24 hours';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- Grant execution of maintenance function to service_role only
REVOKE ALL ON FUNCTION public.purge_expired_desktop_auth_tickets() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_desktop_auth_tickets() TO service_role;

COMMENT ON TABLE public.desktop_auth_tickets IS 'Stores one-time 256-bit SHA-256 hashed authentication tickets for desktop deep-link handoff with 60-second TTL.';
```

---

## 3. POST-DEPLOYMENT VERIFICATION CHECKLIST

After executing the script in the Supabase SQL Editor, run these verification queries:

### Verification Query 1: Verify Table Existence and Structure
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'desktop_auth_tickets'
ORDER BY ordinal_position;
```
**Expected Result:** 8 rows returned (`id`, `ticket_hash`, `user_id`, `session_data`, `expires_at`, `consumed_at`, `ip_address`, `created_at`).

---

### Verification Query 2: Verify Indexes
```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'desktop_auth_tickets';
```
**Expected Result:** 3 indexes listed:
1. `desktop_auth_tickets_pkey`
2. `desktop_auth_tickets_ticket_hash_key`
3. `idx_desktop_auth_tickets_lookup`
4. `idx_desktop_auth_tickets_expiry`

---

### Verification Query 3: Verify RLS is Enabled
```sql
SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class
WHERE relname = 'desktop_auth_tickets';
```
**Expected Result:** `relrowsecurity` must be `true`.

---

### Verification Query 4: Verify Anonymous/Public Access is Denied
```sql
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'desktop_auth_tickets';
```
**Expected Result:** Grants should only be present for `postgres`, `service_role`, or administrative superusers. No permissions should exist for `anon` or `authenticated`.

---

### Verification Query 5: Test Atomic Consumption Functionality
Run this test transaction block (it automatically rolls back to prevent leaving test data):
```sql
BEGIN;

-- 1. Insert simulated ticket
INSERT INTO public.desktop_auth_tickets (
    ticket_hash,
    user_id,
    session_data,
    expires_at
) VALUES (
    'test_hash_verification_only',
    gen_random_uuid(),
    '{"test": true}'::jsonb,
    NOW() + INTERVAL '60 seconds'
);

-- 2. Atomically consume ticket (same query as Next.js backend)
UPDATE public.desktop_auth_tickets
SET consumed_at = NOW()
WHERE ticket_hash = 'test_hash_verification_only'
  AND consumed_at IS NULL
  AND expires_at > NOW()
RETURNING id, session_data;

-- 3. Attempt replay (must return 0 rows)
UPDATE public.desktop_auth_tickets
SET consumed_at = NOW()
WHERE ticket_hash = 'test_hash_verification_only'
  AND consumed_at IS NULL
  AND expires_at > NOW()
RETURNING id;

ROLLBACK;
```
**Expected Result:** Step 2 returns 1 row with session data; Step 3 returns 0 rows (replay prevented).

---

## 4. SERVER ENVIRONMENT CONFIGURATION (`DESKTOP_TICKET_ENCRYPTION_KEY`)

Tokens stored in `desktop_auth_tickets.session_data` are envelope-encrypted using **AES-256-GCM** before database insertion and decrypted strictly upon single-use redemption.

In production (`NODE_ENV === "production"`), the backend strictly requires `DESKTOP_TICKET_ENCRYPTION_KEY` to be set in the Vercel production environment variables.

### Key Generation Instructions
Generate a cryptographically secure 32-byte (256-bit) key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Or as base64:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Deployment Requirement
1. Open the **Vercel Project Settings -> Environment Variables**.
2. Add `DESKTOP_TICKET_ENCRYPTION_KEY` for **Production** and **Preview** environments.
3. Paste the generated 64-character hex string (or 44-character base64 string).
4. Save and trigger a production deployment.

> **Security Note:** If this environment variable is missing or does not decode to exactly 32 bytes in production, ticket generation fails immediately with a descriptive configuration error, preventing unencrypted or misconfigured credentials from being stored.

### Key Rotation Mechanics
- Tickets have a strict 60-second time-to-live.
- Rotating `DESKTOP_TICKET_ENCRYPTION_KEY` only invalidates in-flight authentication attempts during that 60-second window.
- Key rotation has **zero impact** on active user sessions because authenticated desktop users hold persistent Supabase session cookies inside the isolated Electron session partition (`persist:collectbot`).

---

## 5. ROLLBACK SCRIPT

If emergency rollback is ever required:

```sql
DROP FUNCTION IF EXISTS public.purge_expired_desktop_auth_tickets();
DROP TABLE IF EXISTS public.desktop_auth_tickets CASCADE;
```

---

## 6. MIGRATION STATUS SUMMARY

| Gate | Status | Required Action |
| :--- | :--- | :--- |
| **Local SQL Migration File** | **PASS** | Created at `supabase/migrations/20261111_desktop_auth_tickets.sql` |
| **Unit & Integration Tests** | **PASS** | Tests verify atomic consumption, expiry, and replay defense |
| **Supabase Production Execution** | **PENDING** | **Requires Administrator to run the SQL in Supabase Dashboard** |
| **Vercel Environment Variable** | **PENDING** | **Add `DESKTOP_TICKET_ENCRYPTION_KEY` to Vercel Environment Variables** |

