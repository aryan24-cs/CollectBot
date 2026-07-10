"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  Building2,
  CreditCard,
  LayoutDashboard,
  ScrollText,
  Settings2,
  Shield,
  LogOut,
  ChevronLeft,
  Bell,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface AdminSidebarProps {
  adminUser: {
    name: string
    email: string
    role: string
  }
}

const navItems = [
  { label: "Overview", href: "/admin/overview", icon: LayoutDashboard },
  { label: "Businesses", href: "/admin/businesses", icon: Building2 },
  { label: "Plans", href: "/admin/plans", icon: Settings2 },
  { label: "Subscriptions", href: "/admin/subscriptions", icon: CreditCard },
  { label: "Activity Logs", href: "/admin/logs", icon: ScrollText },
]

export default function AdminSidebar({ adminUser }: AdminSidebarProps) {
  const pathname = usePathname()

  const roleBadge: Record<string, { label: string; color: string }> = {
    super_admin: { label: "SUPER ADMIN", color: "bg-rose-500/20 text-rose-400 border-rose-500/30" },
    admin: { label: "ADMIN", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
    support: { label: "SUPPORT", color: "bg-sky-500/20 text-sky-400 border-sky-500/30" },
  }

  const badge = roleBadge[adminUser.role] || roleBadge.admin

  return (
    <aside className="fixed top-0 left-0 z-40 h-screen w-64 flex flex-col bg-[#0B1120] border-r border-slate-800/60">
      {/* Header */}
      <div className="p-5 border-b border-slate-800/60">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight">CollectBot</h1>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/admin/overview" && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150",
                isActive
                  ? "bg-indigo-500/15 text-indigo-400 shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              )}
            >
              <item.icon className={cn("w-4 h-4", isActive ? "text-indigo-400" : "text-slate-500")} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-slate-800/60 p-4 space-y-3">
        {/* Admin info */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white uppercase">
            {adminUser.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{adminUser.name}</p>
            <span className={cn("inline-block mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border", badge.color)}>
              {badge.label}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] text-slate-500 hover:text-white hover:bg-slate-800/50 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            My Dashboard
          </Link>
        </div>
      </div>
    </aside>
  )
}
