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
    <aside className="w-60 bg-white border-r border-slate-200 text-slate-800 flex flex-col justify-between h-screen fixed left-0 top-0 z-30 select-none">
      {/* Top Section */}
      <div>
        {/* Brand Logo */}
        <div className="p-6 flex items-center gap-2 border-b border-slate-100">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-600/10">
            <IndianRupee className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-slate-900 tracking-tight leading-none text-base">CollectBot</span>
            <span className="text-[10px] text-indigo-600 mt-1 font-bold tracking-wider uppercase">SaaS</span>
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
                  "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 group relative border border-transparent",
                  isActive
                    ? "bg-indigo-50/60 border-l-2 border-indigo-650 text-indigo-700 font-bold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <Icon className={cn("w-4 h-4 transition-transform duration-200", isActive ? "text-indigo-650 scale-110" : "text-slate-400 group-hover:scale-110")} />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Bottom Profile Section */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 bg-indigo-50 border border-indigo-100">
            <AvatarFallback className="bg-indigo-50 text-indigo-650 font-bold text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-bold text-slate-900 truncate leading-tight">{businessName}</span>
            <span className="text-[11px] text-slate-450 truncate leading-none mt-0.5">{userEmail}</span>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="w-full text-slate-500 hover:text-red-650 hover:bg-red-50 justify-start px-3 py-2 text-xs gap-2 border border-slate-200 hover:border-red-100"
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
