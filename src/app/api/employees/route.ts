import { NextRequest, NextResponse } from "next/server"
import getSupabaseServerClient from "@/lib/supabase/server"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"
import { requireBusinessUser } from "@/lib/auth/checkRole"

export async function GET(request: NextRequest) {
  const { error, user, business } = await requireBusinessUser(request)
  if (error) return error

  try {
    // Use service role client to bypass the recursive RLS policy on employees.
    // Auth & business ownership are already validated by requireBusinessUser above.
    const supabase = getSupabaseServiceRoleClient()
    const { data: employees, error: empError } = await supabase
      .from("employees")
      .select("*, department:departments(id, name), custom_role:custom_roles(id, name), branch:branches(id, name)")
      .eq("business_id", business.id)

    if (empError) throw empError

    const { data: departments } = await supabase
      .from("departments")
      .select("*")
      .eq("business_id", business.id)

    const { data: customRoles } = await supabase
      .from("custom_roles")
      .select("*")
      .eq("business_id", business.id)

    const { data: branches } = await supabase
      .from("branches")
      .select("*")
      .eq("business_id", business.id)

    return NextResponse.json({ employees, departments, customRoles, branches })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load employees" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { error, user, business } = await requireBusinessUser(request)
  if (error) return error

  // Only the business owner can manage employees
  const supabase = await getSupabaseServerClient()
  const { data: ownerCheck } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", business.id)
    .eq("user_id", user.id)
    .maybeSingle()

  if (!ownerCheck) {
    return NextResponse.json({ error: "Only the business owner can invite or create employees" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { 
      email, 
      name, 
      phone, 
      password, 
      designation, 
      employee_type, 
      status, 
      profile_picture_url, 
      notes 
    } = body

    if (!email || !name) {
      return NextResponse.json({ error: "Email and Name are required fields" }, { status: 400 })
    }

    const adminDb = getSupabaseServiceRoleClient()

    let authUserId: string | null = null

    // If password is provided, create the user directly in Supabase auth
    if (password && password.trim().length >= 6) {
      const { data: authUser, error: authError } = await adminDb.auth.admin.createUser({
        email,
        password: password.trim(),
        email_confirm: true,
        user_metadata: { full_name: name }
      })

      if (authError) {
        return NextResponse.json({ error: authError.message }, { status: 400 })
      }

      authUserId = authUser.user.id
    }

    // 1. Insert employee record
    const { data: employee, error: insertError } = await adminDb
      .from("employees")
      .insert({
        business_id: business.id,
        user_id: authUserId,
        email,
        name,
        phone: phone || null,
        designation: designation || null,
        employee_type: employee_type || 'FINANCE',
        status: authUserId ? (status || 'active') : 'pending',
        profile_picture_url: profile_picture_url || null,
        notes: notes || null
      })
      .select()
      .single()

    if (insertError) {
      // Rollback user creation if DB insert fails
      if (authUserId) {
        await adminDb.auth.admin.deleteUser(authUserId)
      }
      if (insertError.code === "23505") {
        return NextResponse.json({ error: "An employee with this email is already invited or registered" }, { status: 400 })
      }
      throw insertError
    }

    // If no password provided, perform the standard invitation email flow
    if (!authUserId) {
      const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/join?email=${encodeURIComponent(email)}&biz_id=${business.id}`
      try {
        const { sendEmployeeInvitationEmail } = await import("@/lib/email/send")
        await sendEmployeeInvitationEmail({
          to: email,
          employeeName: name,
          businessName: business.name,
          inviteLink
        })
      } catch (emailErr) {
        console.error("Failed to send employee invite email:", emailErr)
      }
    }

    // 4. Log activity
    await adminDb.from("activity_logs").insert({
      business_id: business.id,
      type: authUserId ? "employee_created" : "employee_invited",
      description: authUserId 
        ? `Registered employee "${name}" (${email}) as ${employee_type || 'FINANCE'}.`
        : `Invited employee "${name}" (${email}) to join team.`,
      metadata: { employee_id: employee.id }
    })

    return NextResponse.json({ success: true, employee }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create employee" }, { status: 500 })
  }
}
