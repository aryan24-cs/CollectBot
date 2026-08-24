import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"
import { requireBusinessUser } from "@/lib/auth/checkRole"

export async function POST(request: NextRequest) {
  const { error: authError, business, role } = await requireBusinessUser(request)
  if (authError) return authError

  if (role !== "OWNER") {
    return NextResponse.json({ error: "Only the business owner can upload a workspace logo" }, { status: 403 })
  }

  try {
    const adminDb = getSupabaseServiceRoleClient()
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type & size (max 2MB)
    const allowedTypes = ["image/jpeg", "image/png", "image/svg+xml"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPG, PNG, and SVG are accepted." },
        { status: 400 }
      )
    }

    const maxSize = 2 * 1024 * 1024 // 2MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum accepted size is 2MB." },
        { status: 400 }
      )
    }

    // Upload parameters
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const fileExt = file.name.split(".").pop() || "png"
    const filePath = `logos/${business.id}.${fileExt}`

    // Upload to invoices bucket (under logos/ subdirectory)
    const { error: uploadError } = await adminDb.storage
      .from("invoices")
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.error("Storage logo upload error:", uploadError)
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = adminDb.storage
      .from("invoices")
      .getPublicUrl(filePath)

    // Save publicUrl to businesses table
    const { error: updateError } = await adminDb
      .from("businesses")
      .update({
        logo_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", business.id)

    if (updateError) throw updateError

    return NextResponse.json({
      success: true,
      logo_url: publicUrl,
    })
  } catch (err: any) {
    console.error("POST /api/settings/logo error:", err)
    return NextResponse.json({ error: err.message || "Failed to process logo upload." }, { status: 500 })
  }
}
