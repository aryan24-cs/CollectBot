"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { 
  ChevronDown, 
  Settings, 
  LogOut, 
  Building, 
  User, 
  LayoutDashboard, 
  CreditCard, 
  ShieldCheck, 
  ClipboardList,
  Sparkles,
  TrendingUp
} from "lucide-react"
import { cn } from "@/lib/utils"
import getSupabaseBrowserClient from "@/lib/supabase/client"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"

interface AdminContextSidebarProps {
  adminUser: {
    id: string
    role: string
    is_active: boolean
  }
}

export default function AdminContextSidebar({ adminUser }: AdminContextSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)
  const [totalBusinesses, setTotalBusinesses] = React.useState(0)
  const [adminName, setAdminName] = React.useState("Admin Owner")

  React.useEffect(() => {
    async function loadAdminStats() {
      try {
        const res = await fetch("/api/admin/stats")
        if (res.ok) {
          const data = await res.json()
          setTotalBusinesses(data.totalBusinesses || 0)
        }

        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setAdminName(user.user_metadata?.full_name || user.email?.split("@")[0] || "Admin User")
        }
      } catch (err) {
        console.error("Failed to load admin stats:", err)
      }
    }
    loadAdminStats()
  }, [pathname])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await supabase.auth.signOut()
      router.push("/login")
      router.refresh()
    } catch (error) {
      console.error("Logout failed:", error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  const isTabActive = (href: string) => pathname === href || pathname.startsWith(href + "/")

  return (
    <div className="w-64 flex-shrink-0 flex flex-col h-screen sticky top-0 bg-[#F5F1EE] border-r border-[#EEE9E4] select-none py-6 pl-4 pr-4 justify-between text-ink-primary">
      {/* Top Section */}
      <div className="space-y-6">
        
        {/* Brand Header with C Logo */}
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-[#1A1A1A] flex items-center justify-center text-sm font-extrabold text-white shadow-soft">
            A
          </div>
          <span className="text-sm font-extrabold text-[#0A0A0A] font-display tracking-tight">CollectBot Admin</span>
        </div>

        {/* Admin Profile Dropdown */}
        <div className="px-1">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2.5 hover:bg-cream-200/50 p-2 rounded-xl transition-all cursor-pointer w-full text-left focus:outline-none border border-transparent hover:border-[#EEE9E4]/40 bg-[#FAF8F5]/30">
              <div className="w-7 h-7 rounded-lg bg-[#E91E63]/10 flex items-center justify-center border border-[#E91E63]/20 shrink-0 text-[#E91E63] font-extrabold text-xs">
                A
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-ink-primary truncate">{adminName}</p>
                <p className="text-[9px] text-[#6B7280] truncate">Super Admin</p>
              </div>
              <ChevronDown className="w-3 h-3 text-[#6B7280] shrink-0" />
            </DropdownMenuTrigger>
            
            <DropdownMenuContent className="w-52 bg-white border border-surface-border text-[#1A1A1A] rounded-xl shadow-floating z-50">
              <DropdownMenuItem onClick={() => router.push("/admin/overview")} className="cursor-pointer text-xs font-semibold py-2 hover:bg-cream-50">
                <ShieldCheck className="w-4 h-4 mr-2 text-ink-secondary" />
                Admin Console
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-surface-border/50" />
              <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut} className="cursor-pointer text-xs font-semibold py-2 text-danger hover:bg-cream-50">
                <LogOut className="w-4 h-4 mr-2" />
                {isLoggingOut ? "Signing out..." : "Sign Out"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Primary Sections Tree */}
        <nav className="space-y-1">
          
          {/* Overview */}
          <div className="space-y-0.5">
            <Link
              href="/admin/overview"
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border border-transparent",
                isTabActive("/admin/overview")
                  ? "bg-white text-ink-primary shadow-soft border-[#EEE9E4]"
                  : "text-ink-secondary hover:bg-cream-200/30 hover:text-ink-primary"
              )}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0 text-ink-secondary" />
              <span className="flex-1">Overview</span>
            </Link>
          </div>

          {/* Businesses */}
          <div className="space-y-0.5">
            <Link
              href="/admin/businesses"
              className={cn(
                "flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all border border-transparent",
                isTabActive("/admin/businesses")
                  ? "bg-white text-ink-primary shadow-soft border-[#EEE9E4]"
                  : "text-ink-secondary hover:bg-cream-200/30 hover:text-ink-primary"
              )}
            >
              <div className="flex items-center gap-2.5">
                <Building className="w-4 h-4 shrink-0 text-ink-secondary" />
                <span>Businesses</span>
              </div>
              <span className={cn(
                "px-1.5 py-0.5 rounded-pill text-[9px] font-bold",
                isTabActive("/admin/businesses") ? "bg-[#1A1A1A] text-white" : "bg-cream-200 text-ink-secondary"
              )}>
                {totalBusinesses}
              </span>
            </Link>
          </div>

          {/* Plans */}
          <div className="space-y-0.5">
            <Link
              href="/admin/plans"
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border border-transparent",
                isTabActive("/admin/plans")
                  ? "bg-white text-ink-primary shadow-soft border-[#EEE9E4]"
                  : "text-ink-secondary hover:bg-cream-200/30 hover:text-ink-primary"
              )}
            >
              <CreditCard className="w-4 h-4 shrink-0 text-ink-secondary" />
              <span className="flex-1">Pricing Plans</span>
            </Link>
          </div>

          {/* Subscriptions */}
          <div className="space-y-0.5">
            <Link
              href="/admin/subscriptions"
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border border-transparent",
                isTabActive("/admin/subscriptions")
                  ? "bg-white text-ink-primary shadow-soft border-[#EEE9E4]"
                  : "text-ink-secondary hover:bg-cream-200/30 hover:text-ink-primary"
              )}
            >
              <TrendingUp className="w-4 h-4 shrink-0 text-ink-secondary" />
              <span className="flex-1">Subscriptions</span>
            </Link>
          </div>

          {/* Logs */}
          <div className="space-y-0.5">
            <Link
              href="/admin/logs"
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border border-transparent",
                isTabActive("/admin/logs")
                  ? "bg-white text-ink-primary shadow-soft border-[#EEE9E4]"
                  : "text-ink-secondary hover:bg-cream-200/30 hover:text-ink-primary"
              )}
            >
              <ClipboardList className="w-4 h-4 shrink-0 text-ink-secondary" />
              <span className="flex-1">Activity Logs</span>
            </Link>
          </div>

        </nav>
      </div>

      {/* Footer Branding */}
      <div className="px-3 text-center">
        <p className="text-[9px] font-bold text-ink-muted uppercase tracking-wider">CollectBot Admin v1.0</p>
      </div>
    </div>
  )
}
