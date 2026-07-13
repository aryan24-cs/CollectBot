"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, FileText, Plus, Users, Settings, FilePlus, UserPlus, X } from "lucide-react"
import { cn } from "@/lib/utils"

export default function MobileBottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [showMenu, setShowMenu] = React.useState(false)

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Invoices", href: "/invoices", icon: FileText },
    { name: "Clients", href: "/clients", icon: Users },
    { name: "Settings", href: "/settings", icon: Settings },
  ]

  const handleQuickAction = (href: string) => {
    setShowMenu(false)
    router.push(href)
  }

  // Do not render bottom nav on public or login/signup screens
  const isAuth = pathname.startsWith("/login") || pathname.startsWith("/signup") || pathname.startsWith("/onboarding") || pathname.startsWith("/pay/")
  const isAdmin = pathname.startsWith("/admin")
  if (isAuth || isAdmin) return null

  return (
    <div className="md:hidden select-none">
      {/* Quick Action Floating Menu Overlay */}
      {showMenu && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 animate-in fade-in duration-200">
          <div 
            className="absolute inset-0" 
            onClick={() => setShowMenu(false)} 
          />
          <div className="absolute bottom-20 left-4 right-4 bg-white border border-surface-border rounded-card p-4 shadow-floating space-y-2 animate-in slide-in-from-bottom duration-250">
            <h4 className="text-[10px] font-bold tracking-wider text-ink-muted uppercase mb-1 px-1">Quick Actions</h4>
            
            <button
              onClick={() => handleQuickAction("/invoices/new")}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-cream-50 text-left text-xs font-semibold text-ink-primary transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center text-brand-600">
                <FilePlus className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold">Create Invoice</p>
                <p className="text-[10px] text-ink-secondary">Draft new client invoice billing</p>
              </div>
            </button>

            <button
              onClick={() => handleQuickAction("/clients/new")}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-cream-50 text-left text-xs font-semibold text-ink-primary transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-success-light flex items-center justify-center text-success-dark">
                <UserPlus className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold">Register Client</p>
                <p className="text-[10px] text-ink-secondary">Save new contact details</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Fixed Bottom Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-surface-white border-t border-surface-border flex items-center justify-around px-2 z-40 shadow-floating">
        {/* Left 2 items */}
        {navItems.slice(0, 2).map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-colors cursor-pointer",
                isActive ? "text-brand-600" : "text-ink-secondary hover:text-ink-primary"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[9px] font-semibold mt-0.5">{item.name}</span>
            </Link>
          )
        })}

        {/* Middle Elevated Action Circle */}
        <button
          onClick={() => setShowMenu(!showMenu)}
          className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center text-white shadow-soft transition-all duration-200 cursor-pointer -translate-y-2.5 outline-none scale-110 shrink-0",
            showMenu ? "bg-[#1A1A1A] rotate-45" : "bg-brand-600 hover:bg-brand-700"
          )}
        >
          {showMenu ? <X className="w-5 h-5" /> : <Plus className="w-6 h-6" />}
        </button>

        {/* Right 2 items */}
        {navItems.slice(2, 4).map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-colors cursor-pointer",
                isActive ? "text-brand-600" : "text-ink-secondary hover:text-ink-primary"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[9px] font-semibold mt-0.5">{item.name}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
