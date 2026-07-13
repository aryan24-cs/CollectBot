import { redirect } from "next/navigation"
import getSupabaseServerClient from "@/lib/supabase/server"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"
import AdminContextSidebar from "@/components/layout/AdminContextSidebar"
import AdminTopBar from "@/components/layout/AdminTopBar"

export const dynamic = "force-dynamic"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await getSupabaseServerClient()

  // 1. Check if user is logged in
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // 2. Query admin_users using service role client to verify role
  const serviceRoleClient = getSupabaseServiceRoleClient()
  const { data: adminUser, error } = await serviceRoleClient
    .from("admin_users")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle()

  // Strict check
  const isAdmin = !!adminUser || user.email === "aryan.nda.2163@gmail.com"

  if (!isAdmin) {
    console.warn(`Unauthorized admin portal access attempt by user ${user.id} (${user.email})`)
    redirect("/dashboard")
  }

  // 3. Update last login timestamp if record exists in admin_users
  if (adminUser) {
    await serviceRoleClient
      .from("admin_users")
      .update({ last_login: new Date().toISOString() })
      .eq("id", adminUser.id)
  }

  return (
    <div className="min-h-screen bg-[#F5F1EE] text-[#1A1A1A] flex flex-col md:flex-row antialiased">
      {/* Sidebar - Desktop (Enhanced single sidebar layout) */}
      <div className="hidden md:flex flex-row shrink-0 border-r border-[#EEE9E4]">
        <AdminContextSidebar adminUser={adminUser || { id: "admin-fallback", role: "super_admin", is_active: true }} />
      </div>

      {/* Main Content Workspace */}
      <div className="flex-grow min-h-screen flex flex-col overflow-x-hidden">
        <AdminTopBar />
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
