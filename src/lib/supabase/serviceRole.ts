import { createClient } from "@supabase/supabase-js"

function getValidSupabaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (raw && typeof raw === "string" && raw.startsWith("http")) {
    try {
      new URL(raw)
      return raw
    } catch (_) {
      // Fallback below
    }
  }
  return "https://placeholder-project.supabase.co"
}

function getValidServiceRoleKey(): string {
  const raw = process.env.SUPABASE_SERVICE_ROLE_KEY
  return (raw && typeof raw === "string" && raw.trim().length > 10) 
    ? raw 
    : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTYwMDQwMDAwMCwiZXhwIjoyMDAwMDAwMDAwfQ.placeholder"
}

export function getSupabaseServiceRoleClient() {
  return createClient(getValidSupabaseUrl(), getValidServiceRoleKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
