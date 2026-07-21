import { redirect } from "next/navigation"
import getSupabaseServerClient from "@/lib/supabase/server"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"
import DashboardLayoutClient from "./layout-client"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const adminDb = getSupabaseServiceRoleClient()

  // CRITICAL: Check if admin — admins NEVER see this layout
  const { data: adminUser } = await adminDb
    .from("admin_users")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle()

  if (adminUser) {
    redirect("/admin/overview")
  }

  // Fetch business profile (supports direct owners and employees)
  let business = null
  let employee = null

  // 1. Check if direct business owner
  const { data: directBusiness } = await adminDb
    .from("businesses")
    .select("id, name, logo_url, email")
    .eq("user_id", user.id)
    .maybeSingle()

  if (directBusiness) {
    business = directBusiness
  } else {
    // 2. Check if employee linked by user_id or email
    let empRecord: any = null
    const { data: empById } = await adminDb
      .from("employees")
      .select("id, user_id, status, employee_type, business:businesses(id, name, logo_url, email)")
      .eq("user_id", user.id)
      .maybeSingle()
    empRecord = empById

    if (!empRecord && user.email) {
      const { data: empByEmail } = await adminDb
        .from("employees")
        .select("id, user_id, status, employee_type, business:businesses(id, name, logo_url, email)")
        .ilike("email", user.email)
        .maybeSingle()
      empRecord = empByEmail
    }

    if (empRecord && empRecord.business) {
      if (empRecord.status === "suspended") {
        redirect("/login?error=suspended")
      }

      business = empRecord.business as any
      employee = empRecord

      // Auto link user_id and set status active if first time login
      if (!empRecord.user_id || empRecord.status !== "active") {
        await adminDb
          .from("employees")
          .update({ user_id: user.id, status: "active" })
          .eq("id", empRecord.id)
      }
    }
  }

  // If user is neither a business owner nor an employee, redirect to /onboarding
  if (!business) {
    redirect("/onboarding")
  }

  const userEmail = business.email || user.email || ""
  const userName = user.user_metadata?.full_name || user.email?.split("@")[0] || "User"

  return (
    <DashboardLayoutClient
      business={business}
      userEmail={userEmail}
      userName={userName}
    >
      {children}
    </DashboardLayoutClient>
  )
}
