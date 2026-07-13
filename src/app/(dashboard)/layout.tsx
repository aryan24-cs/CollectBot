import { redirect } from "next/navigation"
import getSupabaseServerClient from "@/lib/supabase/server"
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

  // CRITICAL: Check if admin — admins NEVER see this layout
  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle()

  if (adminUser) {
    redirect("/admin/overview")
  }

  // Fetch business profile to check if onboarded
  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, logo_url, email")
    .eq("user_id", user.id)
    .maybeSingle()

  // If user has not completed onboarding, redirect to /onboarding
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
