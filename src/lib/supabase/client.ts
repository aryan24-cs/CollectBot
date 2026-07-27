import { createBrowserClient } from "@supabase/ssr"

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

function getValidAnonKey(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return (raw && typeof raw === "string" && raw.trim().length > 10) 
    ? raw 
    : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2MDA0MDAwMDAsImV4cCI6MjAwMDAwMDAwMH0.placeholder"
}

export default function getSupabaseBrowserClient() {
  return createBrowserClient(getValidSupabaseUrl(), getValidAnonKey())
}
