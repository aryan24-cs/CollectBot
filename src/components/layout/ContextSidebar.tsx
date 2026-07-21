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
  ChevronRight,
  Briefcase, 
  Target, 
  LogOut,
  Building,
  Wallet,
  CheckSquare,
  UserPlus,
  GitBranch,
  Shield,
  Receipt,
  Megaphone,
  Ticket
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

  // Collapsible section state
  const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>({
    finance: true,
    sales: true,
    marketing: true,
    people: true,
    workspace: true,
  })

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Load actual numbers & permissions dynamically
  React.useEffect(() => {
    async function loadPermissions() {
      try {
        const res = await fetch("/api/settings/business")
        if (res.ok) {
          const data = await res.json()
          setIsOwner(data.isOwner !== false)
          setPermissions(data.permissions || ["all"])
          if (data.employee?.employee_type) {
            setEmployeeType(data.employee.employee_type)
          } else if (data.isOwner !== false) {
            setEmployeeType("OWNER")
          }
        }
      } catch (err) {
        console.error("Failed to load user permissions:", err)
      }
    }

    async function loadStats() {
      try {
        const [invRes, clientRes] = await Promise.all([
          fetch("/api/invoices?limit=1000"),
          fetch("/api/clients?limit=1000")
        ])

        if (invRes.ok && clientRes.ok) {
          const invData = await invRes.json()
          const clientData = await clientRes.json()

          const invoices = invData.invoices || []
          const clients = clientData.clients || []

          setStats(prev => ({
            ...prev,
            allInvoices: invoices.length,
            draftInvoices: invoices.filter((i: any) => i.status === "draft").length,
            sentInvoices: invoices.filter((i: any) => i.status === "sent").length,
            overdueInvoices: invoices.filter((i: any) => i.displayStatus === "overdue" || i.status === "overdue").length,
            allClients: clients.length,
            vipClients: clients.filter((c: any) => c.tags?.includes("VIP") || (c.total_invoiced || 0) > 100000).length,
            slowPayers: clients.filter((c: any) => c.outstanding_amount > 0).length,
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
      return ["dashboard", "sales", "clients", "tasks"].includes(section)
    }
    if (employeeType === "MARKETING") {
      return ["dashboard", "marketing", "clients", "tasks"].includes(section)
    }
    return false
  }

  const dashboardHref = 
    employeeType === "FINANCE" ? "/dashboard/finance" :
    employeeType === "SALES" ? "/dashboard/sales" :
    employeeType === "MARKETING" ? "/dashboard/marketing" :
    "/dashboard"

  // Helper component for a nav link
  const NavLink = ({ href, icon: Icon, label, badge, badgeVariant = "default" }: { 
    href: string; 
    icon: any; 
    label: string; 
    badge?: number | string;
    badgeVariant?: "default" | "danger"
  }) => (
    <Link
      href={href}
      className={cn(
        "flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-semibold transition-all duration-150",
        isTabActive(href)
          ? "bg-white text-ink-primary shadow-sm border border-[#EEE9E4]"
          : "text-ink-secondary hover:bg-white/50 hover:text-ink-primary"
      )}
    >
      <div className="flex items-center gap-2.5">
        <Icon className={cn("w-4 h-4 shrink-0", isTabActive(href) ? "text-[#E91E63]" : "text-ink-muted")} />
        <span>{label}</span>
      </div>
      {badge !== undefined && badge !== 0 && (
        <span className={cn(
          "px-1.5 py-0.5 rounded-full text-[9px] font-bold leading-none",
          badgeVariant === "danger"
            ? "bg-[#FFEBEE] text-[#C62828]"
            : "bg-cream-200 text-ink-secondary"
        )}>
          {badge}
        </span>
      )}
    </Link>
  )

  // Helper component for a section header
  const SectionHeader = ({ label, sectionKey }: { label: string; sectionKey: string }) => (
    <button
      onClick={() => toggleSection(sectionKey)}
      className="flex items-center justify-between w-full px-3 py-1.5 text-[9px] font-bold tracking-widest uppercase text-ink-muted hover:text-ink-secondary transition-colors cursor-pointer"
    >
      <span>{label}</span>
      <ChevronRight className={cn(
        "w-3 h-3 transition-transform duration-200",
        expandedSections[sectionKey] && "rotate-90"
      )} />
    </button>
  )

  // Helper: inline sub-link
  const SubLink = ({ href, label, badge, badgeVariant = "default" }: { 
    href: string; 
    label: string; 
    badge?: number | string;
    badgeVariant?: "default" | "danger"
  }) => (
    <Link
      href={href}
      className={cn(
        "flex items-center justify-between py-1.5 px-2 rounded-md text-[12px] transition-colors",
        pathname === href || (href.includes("?") && pathname === href.split("?")[0])
          ? "text-ink-primary font-semibold bg-white/40"
          : "text-ink-secondary hover:text-ink-primary hover:bg-white/30"
      )}
    >
      <span>{label}</span>
      {badge !== undefined && badge !== 0 && (
        <span className={cn(
          "px-1.5 py-0.5 rounded-full text-[9px] font-bold leading-none",
          badgeVariant === "danger"
            ? "bg-[#FFEBEE] text-[#C62828]"
            : "bg-cream-200/80 text-ink-muted"
        )}>
          {badge}
        </span>
      )}
    </Link>
  )

  // Compute section visibility
  const showSalesHub = employeeType === "OWNER" || employeeType === "SALES"
  const showMarketingHub = employeeType === "OWNER" || employeeType === "MARKETING"
  const showFinanceHub = employeeType === "OWNER" || employeeType === "FINANCE"
  const showWorkspaceSection = isOwner || employeeType === "OWNER"

  return (
    <div className="w-64 flex-shrink-0 flex flex-col h-screen sticky top-0 bg-[#F5F1EE] border-r border-[#EEE9E4] select-none py-5 px-3 justify-between">
      {/* Top Section */}
      <div className="space-y-4 overflow-y-auto pr-0.5 scrollbar-thin flex-1">
        
        {/* Brand Header */}
        <div className="flex items-center gap-2.5 px-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-[#1A1A1A] flex items-center justify-center text-sm font-extrabold text-white shadow-soft">
            C
          </div>
          <span className="text-sm font-extrabold text-[#0A0A0A] tracking-tight">CollectBot</span>
        </div>

        {/* Business Selector Dropdown */}
        <div className="px-0.5">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2.5 hover:bg-cream-200/50 p-2.5 rounded-lg transition-all cursor-pointer w-full text-left focus:outline-none border border-[#EEE9E4]/50 bg-white/40">
              <div className="w-7 h-7 rounded-lg bg-[#E91E63]/10 flex items-center justify-center border border-[#E91E63]/20 shrink-0 text-[#E91E63] font-extrabold text-xs">
                {business.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-ink-primary truncate">{business.name}</p>
                <p className="text-[9px] text-ink-secondary truncate">{isOwner ? "Owner" : `${employeeType} Dept`}</p>
              </div>
              <ChevronDown className="w-3 h-3 text-ink-secondary shrink-0" />
            </DropdownMenuTrigger>
            
            <DropdownMenuContent className="w-52 bg-white border border-surface-border rounded-xl shadow-floating z-50">
              {showWorkspaceSection && (
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

        {/* ─── OVERVIEW ─── */}
        <nav className="space-y-0.5">
          <NavLink href={dashboardHref} icon={LayoutDashboard} label="Dashboard" />
        </nav>

        {/* ─── SALES HUB (For OWNER & SALES Employees) ─── */}
        {showSalesHub && (
          <div className="space-y-1">
            <SectionHeader label="Sales Hub" sectionKey="sales" />
            {expandedSections.sales && (
              <div className="space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
                <NavLink href="/dashboard/sales" icon={Briefcase} label="Leads & Pipeline" />
                <NavLink href="/clients" icon={Users} label="Clients & Accounts" badge={stats.allClients || undefined} />
                <NavLink href="/tasks" icon={Target} label="Sales Tasks" />
              </div>
            )}
          </div>
        )}

        {/* ─── MARKETING HUB (For OWNER & MARKETING Employees) ─── */}
        {showMarketingHub && (
          <div className="space-y-1">
            <SectionHeader label="Marketing Hub" sectionKey="marketing" />
            {expandedSections.marketing && (
              <div className="space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
                <NavLink href="/dashboard/marketing" icon={Megaphone} label="Campaigns & Alerts" />
                <NavLink href="/dashboard/marketing?tab=coupons" icon={Ticket} label="Coupons & Promos" />
                <NavLink href="/clients" icon={Users} label="Audience Contacts" badge={stats.allClients || undefined} />
                <NavLink href="/tasks" icon={Target} label="Marketing Tasks" />
              </div>
            )}
          </div>
        )}

        {/* ─── FINANCE HUB (For OWNER & FINANCE Employees) ─── */}
        {showFinanceHub && (
          <div className="space-y-1">
            <SectionHeader label="Finance Hub" sectionKey="finance" />
            {expandedSections.finance && (
              <div className="space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
                <NavLink href="/invoices" icon={FileText} label="Invoices" badge={stats.allInvoices || undefined} />
                {isTabActive("/invoices") && (
                  <div className="ml-7 pl-3 border-l border-[#EEE9E4] mt-1 mb-1 space-y-0.5">
                    <SubLink href="/invoices?status=draft" label="Drafts" badge={stats.draftInvoices || undefined} />
                    <SubLink href="/invoices?status=sent" label="Sent" badge={stats.sentInvoices || undefined} />
                    <SubLink href="/invoices?status=overdue" label="Overdue" badge={stats.overdueInvoices || undefined} badgeVariant="danger" />
                  </div>
                )}
                <NavLink href="/expenses" icon={Wallet} label="Expenses" />
                <NavLink href="/approvals" icon={CheckSquare} label="Approvals" />
                <NavLink href="/reminders" icon={Bell} label="Reminders" />
                <NavLink href="/tasks" icon={Target} label="Tasks" />
              </div>
            )}
          </div>
        )}

        {/* ─── WORKSPACE (For OWNER) ─── */}
        {showWorkspaceSection && (
          <div className="space-y-1">
            <SectionHeader label="Workspace Settings" sectionKey="workspace" />
            {expandedSections.workspace && (
              <div className="space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
                <NavLink href="/settings/employees" icon={UserPlus} label="Teammates" />
                <NavLink href="/settings/departments" icon={Building} label="Departments" />
                <NavLink href="/settings/roles" icon={Shield} label="Roles & RBAC" />
                <NavLink href="/settings" icon={Settings} label="Settings" />
              </div>
            )}
          </div>
        )}

      </div>

      {/* Bottom: Quick help / keyboard shortcut hint */}
      <div className="pt-3 border-t border-[#EEE9E4]/60 mt-2 px-1">
        <div className="flex items-center gap-2 text-[10px] text-ink-muted px-2 py-1.5">
          <kbd className="px-1.5 py-0.5 bg-white rounded border border-[#EEE9E4] text-[9px] font-mono font-bold text-ink-secondary shadow-sm">N</kbd>
          <span>New Item</span>
          <span className="text-[#EEE9E4]">·</span>
          <kbd className="px-1.5 py-0.5 bg-white rounded border border-[#EEE9E4] text-[9px] font-mono font-bold text-ink-secondary shadow-sm">C</kbd>
          <span>New Client</span>
        </div>
      </div>
    </div>
  )
}
