"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, FileText, Users, Bell, Settings, IndianRupee } from "lucide-react"
import { cn } from "@/lib/utils"

export default function IconRail() {
  const pathname = usePathname()

  const items = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Invoices", href: "/invoices", icon: FileText },
    { name: "Clients", href: "/clients", icon: Users },
    { name: "Reminders", href: "/reminders", icon: Bell },
    { name: "Settings", href: "/settings", icon: Settings },
  ]

  return (
    <div className="w-18 flex-shrink-0 flex flex-col items-center py-6 h-screen sticky top-0 z-30 select-none bg-transparent gap-8 border-r border-surface-border/20">
      {/* Top Logo - Dark Circle with C */}
      <Link href="/dashboard" className="group relative">
        <div className="w-14 h-14 rounded-full bg-[#1A1A1A] flex items-center justify-center shadow-soft transition-transform group-hover:scale-105">
          <span className="text-white font-extrabold text-xl tracking-tight font-display">C</span>
        </div>
        <div className="absolute left-20 top-1/2 -translate-y-1/2 bg-[#1A1A1A] text-white text-[10px] uppercase tracking-wider font-bold px-2.5 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap shadow-md z-50">
          CollectBot Home
        </div>
      </Link>

      {/* Nav Rail Buttons */}
      <div className="flex-1 flex flex-col gap-3">
        {items.map((item) => {
          const isActive = pathname.startsWith(item.href)
          const Icon = item.icon
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className="group relative flex items-center justify-center"
            >
              <div
                className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 shadow-soft cursor-pointer",
                  isActive
                    ? "bg-brand-600 text-white scale-105"
                    : "bg-surface-white text-ink-primary hover:bg-cream-50 hover:text-ink-black"
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
              </div>

              {/* Minimal Premium Tooltip */}
              <div className="absolute left-20 bg-[#1A1A1A] text-white text-[10px] uppercase tracking-wider font-bold px-2.5 py-1.5 rounded-md opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 pointer-events-none whitespace-nowrap shadow-md z-50">
                {item.name}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
