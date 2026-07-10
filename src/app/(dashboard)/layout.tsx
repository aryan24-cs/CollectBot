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

  // 1.5. Redirect active admin users to the admin dashboard instead of client area
  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle()

  if (adminUser) {
    redirect("/admin/overview")
  }

  // Fetch business profile to check if onboarded
  const { data: business, error } = await supabase
    .from("businesses")
    .select("name, email")
    .eq("user_id", user.id)
    .maybeSingle()

  if (error) {
    console.error("Dashboard layout database load error:", error)
  }

  // If user has not completed onboarding, redirect to /onboarding
  if (!business) {
    redirect("/onboarding")
  }

  const businessName = business.name || "My Business"
  const userEmail = business.email || user.email || ""
  const userName = user.user_metadata?.full_name || user.email?.split("@")[0] || "User"

  return (
    <DashboardLayoutClient
      businessName={businessName}
      userEmail={userEmail}
      userName={userName}
    >
      {children}
    </DashboardLayoutClient>
  )
}
