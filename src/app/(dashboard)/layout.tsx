import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import getSupabaseServerClient from "@/lib/supabase/server"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"
import { getUserWorkspaces } from "@/lib/auth/workspaces"
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

  // Check if active admin user -> redirect to admin overview
  const { data: adminUser } = await adminDb
    .from("admin_users")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle()

  if (adminUser || user.email === "aryan.nda.2163@gmail.com") {
    // If explicitly accessing tenant dashboard as super admin, allow or let admin route
  }

  // 1. Resolve all workspaces for this user (both Owned and Employee memberships)
  const workspaces = await getUserWorkspaces(user.id, user.email || undefined)

  if (workspaces.length === 0) {
    if (adminUser) {
      redirect("/admin/overview")
    }
    redirect("/onboarding")
  }

  // 2. Resolve Active Workspace from cookie
  const cookieStore = await cookies()
  const activeBusinessId = cookieStore.get("cb_active_business_id")?.value
  let activeWorkspace = workspaces.find((w) => w.businessId === activeBusinessId)

  if (!activeWorkspace) {
    activeWorkspace = workspaces.find((w) => w.isOwner) || workspaces[0]
  }

  // 3. Fetch full business record
  const { data: business } = await adminDb
    .from("businesses")
    .select("id, name, logo_url, email, currency")
    .eq("id", activeWorkspace.businessId)
    .maybeSingle()

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
