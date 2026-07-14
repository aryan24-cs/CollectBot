"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { 
  LayoutDashboard,
  FileText,
  Users,
  Bell,
  Settings,
  ChevronDown, 
  Sparkles, 
  Clock, 
  Briefcase, 
  Target, 
  FolderPlus,
  LogOut,
  Building,
  User
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

interface ContextSidebarProps {
  business: {
    id: string
    name: string
    logo_url?: string | null
  }
}

export default function ContextSidebar({ business }: ContextSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)
  const [stats, setStats] = React.useState({
    allInvoices: 0,
    draftInvoices: 0,
    sentInvoices: 0,
    overdueInvoices: 0,
    allClients: 0,
    vipClients: 0,
    slowPayers: 0,
  })

  const [permissions, setPermissions] = React.useState<string[]>(["all"])
  const [isOwner, setIsOwner] = React.useState(true)
  const [employeeType, setEmployeeType] = React.useState<string>("OWNER")

  // Load actual numbers & permissions dynamically
  React.useEffect(() => {
    async function loadPermissions() {
      try {
        const res = await fetch("/api/settings/business")
        if (res.ok) {
          const data = await res.json()
          setPermissions(data.permissions || ["all"])
          setIsOwner(data.isOwner !== false)
          setEmployeeType(data.employee?.employee_type || "OWNER")
        }
      } catch (err) {
        console.error("Failed to load permissions:", err)
      }
    }

    async function loadStats() {
      try {
        // Fetch invoices
        const resInvoices = await fetch("/api/invoices?limit=1000")
        if (resInvoices.ok) {
          const data = await resInvoices.json()
          const list = data.invoices || []
          const draft = list.filter((inv: any) => inv.status === "draft").length
          const sent = list.filter((inv: any) => ["sent", "viewed"].includes(inv.status)).length
          const overdue = list.filter((inv: any) => {
            if (inv.status === "overdue") return true
            if (["sent", "viewed", "partial"].includes(inv.status)) {
              return new Date(inv.due_date) < new Date()
            }
            return false
          }).length
          
          setStats(prev => ({
            ...prev,
            allInvoices: list.length,
            draftInvoices: draft,
            sentInvoices: sent,
            overdueInvoices: overdue,
          }))
        }

        // Fetch clients
        const resClients = await fetch("/api/clients?limit=1000")
        if (resClients.ok) {
          const data = await resClients.json()
          const list = data.clients || []
          const vip = list.filter((c: any) => 
            (c.tags && c.tags.includes("VIP")) || Number(c.total_invoiced) > 100000
          ).length
          const slow = list.filter((c: any) => Number(c.outstanding_amount || 0) > 0).length

          setStats(prev => ({
            ...prev,
            allClients: list.length,
            vipClients: vip,
            slowPayers: slow,
          }))
        }
      } catch (err) {
        console.error("Failed to load sidebar stats:", err)
      }
    }
    
    loadPermissions()
    loadStats()
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
  
  const hasAccess = (category: string, action: string = "view") => {
    if (permissions.includes("all") || isOwner) return true
    return permissions.includes(`${category}:${action}`)
  }

  const isSectionVisible = (section: string) => {
    if (employeeType === "OWNER") return true
    if (employeeType === "FINANCE") {
      return ["dashboard", "invoices", "expenses", "tasks", "reminders", "approvals"].includes(section)
    }
    if (employeeType === "SALES") {
      return ["dashboard", "clients"].includes(section)
    }
    if (employeeType === "MARKETING") {
      return ["dashboard"].includes(section)
    }
    return false
  }

  const dashboardHref = 
    employeeType === "FINANCE" ? "/dashboard/finance" :
    employeeType === "SALES" ? "/dashboard/sales" :
    employeeType === "MARKETING" ? "/dashboard/marketing" :
    "/dashboard"

  return (
    <div className="w-64 flex-shrink-0 flex flex-col h-screen sticky top-0 bg-[#F5F1EE] border-r border-[#EEE9E4] select-none py-6 pl-4 pr-4 justify-between">
      {/* Top Section */}
      <div className="space-y-6 overflow-y-auto pr-1 scrollbar-thin">
        
        {/* Brand Header with C Logo */}
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-[#1A1A1A] flex items-center justify-center text-sm font-extrabold text-white shadow-soft">
            C
          </div>
          <span className="text-sm font-extrabold text-[#0A0A0A] font-display tracking-tight">CollectBot</span>
        </div>

        {/* Business Selector Dropdown */}
        <div className="px-1">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2.5 hover:bg-cream-200/50 p-2 rounded-xl transition-all cursor-pointer w-full text-left focus:outline-none border border-transparent hover:border-[#EEE9E4]/40 bg-[#FAF8F5]/30">
              <div className="w-7 h-7 rounded-lg bg-[#E91E63]/10 flex items-center justify-center border border-[#E91E63]/20 shrink-0 text-[#E91E63] font-extrabold text-xs">
                {business.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-ink-primary truncate">{business.name}</p>
                <p className="text-[9px] text-ink-secondary truncate">{isOwner ? "Owner Account" : "Employee Portal"}</p>
              </div>
              <ChevronDown className="w-3 h-3 text-ink-secondary shrink-0" />
            </DropdownMenuTrigger>
            
            <DropdownMenuContent className="w-52 bg-white border border-surface-border rounded-xl shadow-floating z-50">
              {hasAccess("settings", "view") && isSectionVisible("settings") && (
                <DropdownMenuItem onClick={() => router.push("/settings")} className="cursor-pointer text-xs font-semibold py-2">
                  <Building className="w-4 h-4 mr-2 text-ink-secondary" />
                  Business Settings
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="bg-surface-border/50" />
              <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut} className="cursor-pointer text-xs font-semibold py-2 text-danger">
                <LogOut className="w-4 h-4 mr-2" />
                {isLoggingOut ? "Signing out..." : "Sign Out"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Primary Sections Tree */}
        <nav className="space-y-1">
          
          {/* Dashboard Link */}
          {isSectionVisible("dashboard") && (
            <div className="space-y-0.5">
              <Link
                href={dashboardHref}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border border-transparent",
                  isTabActive(dashboardHref)
                    ? "bg-white text-ink-primary shadow-soft border-[#EEE9E4]"
                    : "text-ink-secondary hover:bg-cream-200/30 hover:text-ink-primary"
                )}
              >
                <LayoutDashboard className="w-4 h-4 shrink-0 text-ink-secondary" />
                <span className="flex-1">Dashboard</span>
              </Link>
            </div>
          )}

          {/* Invoices Link */}
          {isSectionVisible("invoices") && hasAccess("invoices", "view") && (
            <div className="space-y-0.5">
              <Link
                href="/invoices"
                className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all border border-transparent",
                  isTabActive("/invoices")
                    ? "bg-white text-ink-primary shadow-soft border-[#EEE9E4]"
                    : "text-ink-secondary hover:bg-cream-200/30 hover:text-ink-primary"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 shrink-0 text-ink-secondary" />
                  <span>Invoices</span>
                </div>
                <span className="bg-cream-200 text-ink-secondary px-1.5 py-0.5 rounded-pill text-[9px] font-bold">
                  {stats.allInvoices}
                </span>
              </Link>
              
              {/* Indented Subroutes for Invoices */}
              {isTabActive("/invoices") && (
                <div className="pl-8 border-l border-[#EEE9E4] ml-5 space-y-1 mt-1 mb-2 animate-in fade-in duration-200">
                  <Link
                    href="/invoices?status=all"
                    className="flex items-center justify-between py-1 text-xs text-ink-secondary hover:text-ink-primary"
                  >
                    <span>All Invoices</span>
                  </Link>
                  <Link
                    href="/invoices?status=draft"
                    className="flex items-center justify-between py-1 text-xs text-ink-secondary hover:text-ink-primary"
                  >
                    <span>Draft</span>
                    <span className="bg-cream-200 text-ink-secondary px-1.5 py-0.2 rounded-pill text-[9px]">
                      {stats.draftInvoices}
                    </span>
                  </Link>
                  <Link
                    href="/invoices?status=sent"
                    className="flex items-center justify-between py-1 text-xs text-ink-secondary hover:text-ink-primary"
                  >
                    <span>Sent</span>
                    <span className="bg-cream-200 text-ink-secondary px-1.5 py-0.2 rounded-pill text-[9px]">
                      {stats.sentInvoices}
                    </span>
                  </Link>
                  <Link
                    href="/invoices?status=overdue"
                    className="flex items-center justify-between py-1 text-xs text-ink-secondary hover:text-ink-primary"
                  >
                    <span>Overdue</span>
                    {stats.overdueInvoices > 0 && (
                      <span className="bg-[#FFEBEE] text-[#C62828] font-bold px-1.5 py-0.2 rounded-pill text-[9px]">
                        {stats.overdueInvoices}
                      </span>
                    )}
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Expenses Module */}
          {isSectionVisible("expenses") && hasAccess("expenses", "view") && (
            <div className="space-y-0.5">
              <Link
                href="/expenses"
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border border-transparent",
                  isTabActive("/expenses")
                    ? "bg-white text-ink-primary shadow-soft border-[#EEE9E4]"
                    : "text-ink-secondary hover:bg-cream-200/30 hover:text-ink-primary"
                )}
              >
                <Briefcase className="w-4 h-4 shrink-0 text-ink-secondary" />
                <span className="flex-1">Expenses</span>
              </Link>
            </div>
          )}

          {/* Tasks Module */}
          {isSectionVisible("tasks") && hasAccess("invoices", "view") && (
            <div className="space-y-0.5">
              <Link
                href="/tasks"
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border border-transparent",
                  isTabActive("/tasks")
                    ? "bg-white text-ink-primary shadow-soft border-[#EEE9E4]"
                    : "text-ink-secondary hover:bg-cream-200/30 hover:text-ink-primary"
                )}
              >
                <Target className="w-4 h-4 shrink-0 text-ink-secondary" />
                <span className="flex-1">Tasks</span>
              </Link>
            </div>
          )}

          {/* Clients Link */}
          {isSectionVisible("clients") && hasAccess("clients", "view") && (
            <div className="space-y-0.5">
              <Link
                href="/clients"
                className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all border border-transparent",
                  isTabActive("/clients")
                    ? "bg-white text-ink-primary shadow-soft border-[#EEE9E4]"
                    : "text-ink-secondary hover:bg-cream-200/30 hover:text-ink-primary"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 shrink-0 text-ink-secondary" />
                  <span>Clients</span>
                </div>
                <span className="bg-cream-200 text-ink-secondary px-1.5 py-0.5 rounded-pill text-[9px] font-bold">
                  {stats.allClients}
                </span>
              </Link>
              
              {/* Indented Subroutes for Clients */}
              {isTabActive("/clients") && (
                <div className="pl-8 border-l border-[#EEE9E4] ml-5 space-y-1 mt-1 mb-2 animate-in fade-in duration-200">
                  <Link
                    href="/clients"
                    className="flex items-center justify-between py-1 text-xs text-ink-secondary hover:text-ink-primary"
                  >
                    <span>All Clients</span>
                  </Link>
                  <Link
                    href="/clients?filter=vip"
                    className="flex items-center justify-between py-1 text-xs text-ink-secondary hover:text-ink-primary"
                  >
                    <span>VIP Contacts</span>
                    {stats.vipClients > 0 && (
                      <span className="bg-cream-200 text-ink-secondary px-1.5 py-0.2 rounded-pill text-[9px]">
                        {stats.vipClients}
                      </span>
                    )}
                  </Link>
                  <Link
                    href="/clients?filter=outstanding"
                    className="flex items-center justify-between py-1 text-xs text-ink-secondary hover:text-ink-primary"
                  >
                    <span>Slow Payers</span>
                    {stats.slowPayers > 0 && (
                      <span className="bg-[#FDF2F7] text-[#E91E63] font-bold px-1.5 py-0.2 rounded-pill text-[9px]">
                        {stats.slowPayers}
                      </span>
                    )}
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Reminders Link */}
          {isSectionVisible("reminders") && hasAccess("payments", "view") && (
            <div className="space-y-0.5">
              <Link
                href="/reminders"
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border border-transparent",
                  isTabActive("/reminders")
                    ? "bg-white text-ink-primary shadow-soft border-[#EEE9E4]"
                    : "text-ink-secondary hover:bg-cream-200/30 hover:text-ink-primary"
                )}
              >
                <Bell className="w-4 h-4 shrink-0 text-ink-secondary" />
                <span className="flex-1">Reminders</span>
              </Link>
            </div>
          )}

          {/* Approvals Module */}
          {isSectionVisible("approvals") && hasAccess("approvals", "view") && (
            <div className="space-y-0.5">
              <Link
                href="/approvals"
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border border-transparent",
                  isTabActive("/approvals")
                    ? "bg-white text-ink-primary shadow-soft border-[#EEE9E4]"
                    : "text-ink-secondary hover:bg-cream-200/30 hover:text-ink-primary"
                )}
              >
                <Briefcase className="w-4 h-4 shrink-0 text-ink-secondary" />
                <span className="flex-1">Approvals</span>
              </Link>
            </div>
          )}

          {/* Settings Link */}
          {isSectionVisible("settings") && hasAccess("settings", "view") && (
            <div className="space-y-0.5">
              <Link
                href="/settings"
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border border-transparent",
                  isTabActive("/settings")
                    ? "bg-white text-ink-primary shadow-soft border-[#EEE9E4]"
                    : "text-ink-secondary hover:bg-cream-200/30 hover:text-ink-primary"
                )}
              >
                <Settings className="w-4 h-4 shrink-0 text-ink-secondary" />
                <span className="flex-1">Settings</span>
              </Link>
              
              {/* Indented Subroutes for Settings */}
              {isTabActive("/settings") && (
                <div className="pl-8 border-l border-[#EEE9E4] ml-5 space-y-1 mt-1 mb-2 animate-in fade-in duration-200">
                  <Link
                    href="/settings/employees"
                    className="flex items-center py-1 text-xs text-ink-secondary hover:text-ink-primary"
                  >
                    <span>Teammates Directory</span>
                  </Link>
                  <Link
                    href="/settings/departments"
                    className="flex items-center py-1 text-xs text-ink-secondary hover:text-ink-primary"
                  >
                    <span>Departments</span>
                  </Link>
                  <Link
                    href="/settings/roles"
                    className="flex items-center py-1 text-xs text-ink-secondary hover:text-ink-primary"
                  >
                    <span>Roles & RBAC</span>
                  </Link>
                </div>
              )}
            </div>
          )}

        </nav>

        {/* Grouped Folders / Shortcuts */}
        {employeeType === "OWNER" && (
          <div className="space-y-1.5 px-2 pt-4 border-t border-[#EEE9E4]/60">
            <div className="flex items-center justify-between text-[9px] font-bold tracking-wider uppercase text-ink-muted px-2">
              <span>Starred</span>
            </div>
            
            <div className="space-y-0.5">
              {[
                { name: "Recent activity", href: "/dashboard", icon: Clock },
                { name: "Sales list", href: "/invoices", icon: Briefcase },
                { name: "Goals", href: "/settings", icon: Target },
              ].map((shortcut) => {
                const Icon = shortcut.icon
                return (
                  <Link
                    key={shortcut.name}
                    href={shortcut.href}
                    className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#6B6B6B] hover:text-[#0A0A0A] hover:bg-cream-200/40 transition-colors"
                  >
                    <Icon className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                    {shortcut.name}
                  </Link>
                )
              })}
            </div>
          </div>
        )}

      </div>

      {/* Bottom Folder Manager Action */}
      {employeeType === "OWNER" && (
        <div className="px-2">
          <button
            onClick={() => router.push("/settings")}
            className="w-full flex items-center justify-center gap-2 border border-dashed border-[#EEE9E4] hover:bg-cream-200/30 text-ink-secondary hover:text-ink-primary rounded-xl py-2.5 text-xs font-semibold transition-all cursor-pointer bg-white/40 shadow-soft"
          >
            <FolderPlus className="w-3.5 h-3.5 text-ink-muted shrink-0" />
            Manage folders
          </button>
        </div>
      )}
    </div>
  )
}
