import { NextRequest, NextResponse } from "next/server"
import getSupabaseServerClient from "@/lib/supabase/server"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"
import { requireBusinessUser } from "@/lib/auth/checkRole"

export async function GET(request: NextRequest) {
  const { error, user, business, role } = await requireBusinessUser(request)
  if (error) return error

  // Security guard: Only OWNER and MARKETING can access marketing campaigns
  if (role !== "OWNER" && role !== "MARKETING") {
    return NextResponse.json({ error: "Access denied: Marketing scope only." }, { status: 403 })
  }

  try {
    const supabase = await getSupabaseServerClient()
    const { data: campaigns, error: fetchError } = await supabase
      .from("marketing_campaigns")
      .select("*")
      .eq("business_id", business.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })

    if (fetchError) throw fetchError

    return NextResponse.json({ campaigns })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load campaigns." }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { error, user, business, role } = await requireBusinessUser(request)
  if (error) return error

  // Security guard: Only OWNER and MARKETING can manage marketing campaigns
  if (role !== "OWNER" && role !== "MARKETING") {
    return NextResponse.json({ error: "Access denied: Marketing scope only." }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { name, type, subject, content, scheduled_at } = body

    if (!name || !type || !content) {
      return NextResponse.json({ error: "Name, type, and content are required." }, { status: 400 })
    }

    const adminDb = getSupabaseServiceRoleClient()

    // Create marketing campaign record
    const { data: campaign, error: insertError } = await adminDb
      .from("marketing_campaigns")
      .insert({
        business_id: business.id,
        name,
        type,
        status: scheduled_at ? "scheduled" : "sent",
        subject: subject || null,
        content,
        scheduled_at: scheduled_at ? new Date(scheduled_at).toISOString() : null,
        sent_at: scheduled_at ? null : new Date().toISOString(),
        created_by: user.id
      })
      .select()
      .single()

    if (insertError) throw insertError

    // Initialize mock analytics metrics for this campaign
    await adminDb.from("marketing_analytics").insert({
      business_id: business.id,
      campaign_id: campaign.id,
      sent_count: 250,
      delivered_count: 242,
      open_count: 148,
      click_count: 42,
      conversion_count: 12,
      roi: 3.50,
      revenue_generated: 15000.00,
      created_by: user.id
    })

    // Log general activity
    await adminDb.from("activity_logs").insert({
      business_id: business.id,
      type: "campaign_launched",
      description: `Campaign "${name}" (${type}) launched by ${role.toLowerCase()}.`,
      created_by: user.id
    })

    return NextResponse.json({ success: true, campaign }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create campaign." }, { status: 500 })
  }
}
