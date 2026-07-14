import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name, business_id } = body

    if (!email || !password || !name || !business_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const adminDb = getSupabaseServiceRoleClient()

    // 1. Verify invitation exists
    const { data: invite, error: inviteErr } = await adminDb
      .from("employees")
      .select("id, status")
      .eq("business_id", business_id)
      .eq("email", email)
      .maybeSingle()

    if (inviteErr || !invite) {
      return NextResponse.json({ error: "No invitation found for this email address" }, { status: 404 })
    }

    if (invite.status === "active") {
      return NextResponse.json({ error: "Account has already been activated. Try logging in instead" }, { status: 400 })
    }

    // 2. Create the auth user in Supabase auth
    const { data: authUser, error: authError } = await adminDb.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name }
    })

    if (authError) {
      return NextResponse.json({ error: authError.message || "Failed to register credentials" }, { status: 400 })
    }

    const userId = authUser.user?.id

    if (!userId) {
      throw new Error("Auth user ID generation failed")
    }

    // 3. Update employee record
    const { error: updateError } = await adminDb
      .from("employees")
      .update({
        user_id: userId,
        name,
        status: "active",
        joined_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", invite.id)

    if (updateError) throw updateError

    // 4. Log activity
    await adminDb.from("activity_logs").insert({
      business_id: business_id,
      type: "employee_joined",
      description: `Employee "${name}" (${email}) completed onboarding and joined workspace.`,
      metadata: { employee_id: invite.id }
    })

    return NextResponse.json({ success: true, message: "Workspace registration successful" })
  } catch (err: any) {
    console.error("Employee join error:", err)
    return NextResponse.json({ error: err.message || "Something went wrong" }, { status: 500 })
  }
}
