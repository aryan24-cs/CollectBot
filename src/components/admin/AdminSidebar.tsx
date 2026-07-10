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
    super_admin: { label: "SUPER ADMIN", color: "bg-rose-50 text-rose-600 border-rose-100" },
    admin: { label: "ADMIN", color: "bg-amber-50 text-amber-600 border-amber-100" },
    support: { label: "SUPPORT", color: "bg-sky-50 text-sky-600 border-sky-100" },
  }

  const badge = roleBadge[adminUser.role] || roleBadge.admin

  return (
    <aside className="fixed top-0 left-0 z-40 h-screen w-64 flex flex-col bg-white border-r border-slate-200">
      {/* Header */}
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-600/10">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 tracking-tight">CollectBot</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Admin Panel</p>
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
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-150 border border-transparent",
                isActive
                  ? "bg-indigo-50/60 text-indigo-700 border-indigo-100/30"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              )}
            >
              <item.icon className={cn("w-4 h-4", isActive ? "text-indigo-600" : "text-slate-400")} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-slate-100 p-4 space-y-3 bg-slate-50/50">
        {/* Admin info */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-xs font-bold text-white uppercase">
            {adminUser.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-800 truncate">{adminUser.name}</p>
            <span className={cn("inline-block mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border", badge.color)}>
              {badge.label}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            My Dashboard
          </Link>
        </div>
      </div>
    </aside>
  )
}
