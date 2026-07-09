"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, FileText, Users, Bell, Settings, LogOut, IndianRupee, User } from "lucide-react"

import getSupabaseBrowserClient from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface SidebarProps {
  businessName: string
  userEmail: string
  userName: string
}

export default function Sidebar({ businessName, userEmail, userName }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Invoices", href: "/invoices", icon: FileText },
    { name: "Clients", href: "/clients", icon: Users },
    { name: "Reminders", href: "/reminders", icon: Bell },
    { name: "Settings", href: "/settings", icon: Settings },
  ]

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

  // Helper to get initials
  const initials = userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "CB"

  return (
    <aside className="w-60 bg-slate-900 border-r border-slate-800 text-slate-100 flex flex-col justify-between h-screen fixed left-0 top-0 z-30 select-none">
      {/* Top Section */}
      <div>
        {/* Brand Logo */}
        <div className="p-6 flex items-center gap-2 border-b border-slate-800/60">
          <div className="w-9 h-9 rounded-lg bg-indigo-500 flex items-center justify-center shadow-md shadow-indigo-500/10">
            <IndianRupee className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-white tracking-tight leading-none text-base">CollectBot</span>
            <span className="text-[10px] text-indigo-400 mt-1 font-medium tracking-wider uppercase">SaaS</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-1.5 mt-4">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative",
                  isActive
                    ? "bg-indigo-600/10 border-l-2 border-indigo-500 text-indigo-400 font-semibold"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                )}
              >
                <Icon className={cn("w-4 h-4 transition-transform duration-200", isActive ? "text-indigo-400 scale-110" : "text-slate-400 group-hover:scale-110")} />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Bottom Profile Section */}
      <div className="p-4 border-t border-slate-800 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 bg-slate-800 border border-slate-700">
            <AvatarFallback className="bg-slate-800 text-indigo-400 font-bold text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-medium text-white truncate leading-tight">{businessName}</span>
            <span className="text-[11px] text-slate-500 truncate leading-none mt-0.5">{userEmail}</span>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="w-full text-slate-400 hover:text-red-400 hover:bg-red-950/10 justify-start px-3 py-2 text-xs gap-2 border border-slate-800 hover:border-red-950/20"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          <LogOut className="w-3.5 h-3.5" />
          {isLoggingOut ? "Signing Out..." : "Sign Out"}
        </Button>
      </div>
    </aside>
  )
}
