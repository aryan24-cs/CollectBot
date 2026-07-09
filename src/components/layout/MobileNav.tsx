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
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-900 border-t border-slate-800 flex items-center justify-around px-2 z-20 shadow-lg">
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href)
        const Icon = item.icon
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center flex-grow h-full py-1 text-xs gap-1.5 font-medium transition-all duration-200",
              isActive ? "text-indigo-400 font-semibold" : "text-slate-400 hover:text-slate-200"
            )}
          >
            <Icon className={cn("w-5 h-5", isActive ? "scale-110" : "scale-100")} />
            <span className="text-[10px] tracking-wide">{item.name}</span>
          </Link>
        )
      })}
    </nav>
  )
}
