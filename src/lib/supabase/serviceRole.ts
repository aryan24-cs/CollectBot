import { createClient } from "@supabase/supabase-js"

function getValidSupabaseUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/^["']|["']$/g, "")
  if (raw && raw.startsWith("http")) {
    try {
      new URL(raw)
      return raw
    } catch (_) {
      // Fallback below
    }
  }
  return "https://faoetyzqzqqtwatflefk.supabase.co"
}

function getValidServiceRoleKey(): string {
  const raw = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim().replace(/^["']|["']$/g, "")
  return (raw && raw.length > 10) 
    ? raw 
    : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhb2V0eXpxenFxdHdhdGZsZWZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzU2NTExNiwiZXhwIjoyMDk5MTQxMTE2fQ.f3TJWUqP1HNNjvd_-xG51LawC6UVC1poiHMjgaiL-QQ"
}

export function getSupabaseServiceRoleClient() {
  return createClient(getValidSupabaseUrl(), getValidServiceRoleKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
