import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"

/**
 * Creates a secure, time-limited signed URL for private storage assets.
 * Default expiration is 3600 seconds (1 hour).
 */
export async function createSignedDocumentUrl(
  bucket: string,
  filePath: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  try {
    const supabase = getSupabaseServiceRoleClient()
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresInSeconds)

    if (error || !data?.signedUrl) {
      console.warn(`Failed to create signed URL for ${bucket}/${filePath}:`, error?.message)
      return null
    }

    return data.signedUrl
  } catch (err) {
    console.error("Error creating signed document URL:", err)
    return null
  }
}

