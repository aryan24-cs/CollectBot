import { NextRequest, NextResponse } from "next/server"
import getSupabaseServerClient from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 1. Get business profile
    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()

    if (!business) {
      return NextResponse.json({ error: "Business profile not found" }, { status: 400 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // 2. Validate file type & size (max 2MB)
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

    // 3. Prepare upload parameters
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const fileExt = file.name.split(".").pop() || "png"
    const filePath = `logos/${business.id}.${fileExt}`

    // 4. Upload to invoices bucket (under logos/ subdirectory)
    const { error: uploadError } = await supabase.storage
      .from("invoices")
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`)
    }

    // 5. Retrieve public URL
    const { data: { publicUrl } } = supabase.storage
      .from("invoices")
      .getPublicUrl(filePath)

    // 6. Update business logo URL in DB
    const { error: dbError } = await supabase
      .from("businesses")
      .update({ logo_url: publicUrl })
      .eq("id", business.id)

    if (dbError) throw dbError

    return NextResponse.json({ success: true, logoUrl: publicUrl })
  } catch (err: any) {
    console.error("Logo upload handler crashed:", err)
    return NextResponse.json({ error: err.message || "Failed to upload logo." }, { status: 500 })
  }
}
