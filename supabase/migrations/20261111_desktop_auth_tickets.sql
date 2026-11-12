-- ─────────────────────────────────────────────────────────────
-- CollectBot Database Migration: Desktop Authentication Tickets
-- File: supabase/migrations/20261111_desktop_auth_tickets.sql
-- Description: Creates persistent desktop_auth_tickets table and atomic
--              consumption controls for CollectBot Desktop Google OAuth handoff.
-- Date: 2026-11-11
-- Target: Supabase PostgreSQL 15+
-- Status: PENDING DEPLOYMENT BY ADMINISTRATOR
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

