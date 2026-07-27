import { createBrowserClient } from "@supabase/ssr"

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

function getValidAnonKey(): string {
  const raw = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim().replace(/^["']|["']$/g, "")
  return (raw && raw.length > 10) 
    ? raw 
    : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhb2V0eXpxenFxdHdhdGZsZWZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NjUxMTYsImV4cCI6MjA5OTE0MTExNn0.iXGvbxN7wz0UgkkBU48uPxRmskJ6QpKBjsH_7YcUA18"
}

export default function getSupabaseBrowserClient() {
  return createBrowserClient(getValidSupabaseUrl(), getValidAnonKey())
}
