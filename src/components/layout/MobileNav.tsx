"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, FileText, Users, Bell, Settings } from "lucide-react"

import { cn } from "@/lib/utils"

export default function MobileNav() {
  const pathname = usePathname()

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Invoices", href: "/invoices", icon: FileText },
    { name: "Clients", href: "/clients", icon: Users },
    { name: "Reminders", href: "/reminders", icon: Bell },
    { name: "Settings", href: "/settings", icon: Settings },
  ]

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 flex items-center justify-around px-2 z-20 shadow-sm">
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href)
        const Icon = item.icon
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center flex-grow h-full py-1 text-xs gap-1.5 font-semibold transition-all duration-200",
              isActive ? "text-indigo-650 font-bold" : "text-slate-550 hover:text-slate-900"
            )}
          >
            <Icon className={cn("w-5 h-5", isActive ? "scale-110 text-indigo-650" : "scale-100 text-slate-400")} />
            <span className="text-[10px] tracking-wide">{item.name}</span>
          </Link>
        )
      })}
    </nav>
  )
}
