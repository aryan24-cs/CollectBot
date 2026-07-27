import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

const SUPABASE_URL = "https://faoetyzqzqqtwatflefk.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhb2V0eXpxenFxdHdhdGZsZWZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NjUxMTYsImV4cCI6MjA5OTE0MTExNn0.iXGvbxN7wz0UgkkBU48uPxRmskJ6QpKBjsH_7YcUA18"

function getValidSupabaseUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/^["']|["']$/g, "")
  if (raw && raw.startsWith("http")) {
    try {
      new URL(raw)
      return raw
    } catch (_) {
      // Fallback
    }
  }
  return SUPABASE_URL
}

function getValidAnonKey(): string {
  const raw = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim().replace(/^["']|["']$/g, "")
  return (raw && raw.length > 20 && !raw.includes("placeholder")) 
    ? raw 
    : SUPABASE_ANON_KEY
}

export default async function getSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(
    getValidSupabaseUrl(),
    getValidAnonKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignored in Server Components
          }
        },
      },
    }
  )
}
