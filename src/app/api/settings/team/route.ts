import { NextRequest, NextResponse } from "next/server"
import getSupabaseServerClient from "@/lib/supabase/server"
import { checkPlanLimit } from "@/lib/billing/planLimits"
import { resend } from "@/lib/email/client"

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()

    if (!business) {
      return NextResponse.json({ error: "Business profile not found" }, { status: 400 })
    }

    const { data: members, error } = await supabase
      .from("team_members")
      .select("*")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json(members || [])
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load team roster." }, { status: 500 })
  }
}

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
      .select("id, name")
      .eq("user_id", user.id)
      .maybeSingle()

    if (!business) {
      return NextResponse.json({ error: "Business profile not found" }, { status: 400 })
    }

    // 2. Enforce subscription plan limits
    const limitCheck = await checkPlanLimit(business.id, "add_team_member")
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: limitCheck.message || "Plan limit reached. Please upgrade your subscription." },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { email, role } = body

    if (!email || !role || !["owner", "manager", "viewer"].includes(role)) {
      return NextResponse.json({ error: "Email and valid role are required." }, { status: 400 })
    }

    // Check if team member is already invited
    const { data: existing } = await supabase
      .from("team_members")
      .select("id")
      .eq("business_id", business.id)
      .eq("email", email.toLowerCase())
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: "User is already invited or a member of the team." }, { status: 400 })
    }

    // 3. Create pending team member log
    const { data: newMember, error: insertErr } = await supabase
      .from("team_members")
      .insert({
        business_id: business.id,
        email: email.toLowerCase(),
        role: role,
        status: "pending",
      })
      .select()
      .single()

    if (insertErr) throw insertErr

    // 4. Send Invite Email via Resend
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/register?invite=${newMember.id}`
    const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "CollectBot <onboarding@resend.dev>"
    
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `✉️ Invitation to join ${business.name} on CollectBot`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; line-height: 1.5; color: #1e293b;">
          <h2 style="color: #6366f1; margin-top: 0;">✉️ Team Invitation</h2>
          <p>Hello,</p>
          <p>You have been invited to join the team for <strong>${business.name}</strong> on CollectBot as a <strong>${role.toUpperCase()}</strong>.</p>
          
          <div style="margin: 20px 0;">
            <a href="${inviteLink}" style="background-color: #6366f1; color: white; padding: 10px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
              Accept Invitation
            </a>
          </div>
          
          <p style="font-size: 12px; color: #64748b;">If you do not accept this invitation, you can ignore this email. The link will expire in 7 days.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <span style="font-size: 11px; color: #94a3b8;">Sent automatically via CollectBot.</span>
        </div>
      `,
    })

    return NextResponse.json(newMember)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to process invitation." }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()

    if (!business) {
      return NextResponse.json({ error: "Business profile not found" }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get("id")

    if (!memberId) {
      return NextResponse.json({ error: "Member ID is required." }, { status: 400 })
    }

    const { error: deleteErr } = await supabase
      .from("team_members")
      .delete()
      .eq("id", memberId)
      .eq("business_id", business.id)

    if (deleteErr) throw deleteErr

    return NextResponse.json({ success: true, message: "Member removed successfully." })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete team member." }, { status: 500 })
  }
}
