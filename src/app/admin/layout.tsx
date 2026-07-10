import { redirect } from "next/navigation"
import getSupabaseServerClient from "@/lib/supabase/server"
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole"
import AdminSidebar from "@/components/admin/AdminSidebar"

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

  if (error || !adminUser) {
    console.warn(`Unauthorized admin portal access attempt by user ${user.id} (${user.email})`)
    redirect("/dashboard")
  }

  // 3. Update last login timestamp asynchronously
  await serviceRoleClient
    .from("admin_users")
    .update({ last_login: new Date().toISOString() })
    .eq("id", adminUser.id)

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 font-sans antialiased">
      {/* Sidebar */}
      <AdminSidebar adminUser={adminUser} />

      {/* Main Content Workspace */}
      <div className="pl-64 min-h-screen flex flex-col">
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
