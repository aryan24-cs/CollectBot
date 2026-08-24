"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { 
  Building2, 
  Search, 
  ArrowRight, 
  ShieldCheck, 
  TrendingUp, 
  Megaphone, 
  Wallet, 
  Plus, 
  LogOut, 
  Loader2, 
  Check, 
  Sparkles,
  MapPin
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import getSupabaseBrowserClient from "@/lib/supabase/client"
import { cn, formatDate } from "@/lib/utils"

interface Workspace {
  businessId: string
  businessName: string
  businessLogo?: string | null
  role: "OWNER" | "FINANCE" | "SALES" | "MARKETING"
  designation?: string | null
  isOwner: boolean
  city?: string | null
  currency?: string | null
  targetDashboard: string
  createdAt: string
}

export default function SelectWorkspacePage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [workspaces, setWorkspaces] = React.useState<Workspace[]>([])
  const [activeWorkspaceId, setActiveWorkspaceId] = React.useState<string | null>(null)
  const [userProfile, setUserProfile] = React.useState<{ name: string; email: string } | null>(null)
  const [search, setSearch] = React.useState("")
  const [loading, setLoading] = React.useState(true)
  const [selectingId, setSelectingId] = React.useState<string | null>(null)

  const loadWorkspaces = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/auth/workspaces")
      const contentType = res.headers.get("content-type") || ""
      if (!res.ok || !contentType.includes("application/json")) {
        if (res.status === 401) {
          router.push("/login")
          return
        }
        throw new Error("Failed to load your workspaces")
      }
      const data = await res.json()
      setWorkspaces(data.workspaces || [])
      setActiveWorkspaceId(data.activeWorkspace?.businessId || null)
      setUserProfile(data.user || null)

      // If user has 0 workspaces, redirect to onboarding
      if (!data.workspaces || data.workspaces.length === 0) {
        router.push("/onboarding")
        return
      }

      // If user has exactly 1 workspace, automatically select and enter
      if (data.workspaces.length === 1) {
        handleSelectWorkspace(data.workspaces[0].businessId, data.workspaces[0].targetDashboard)
        return
      }
    } catch (err: any) {
      toast.error(err.message || "Could not retrieve workspaces list")
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    loadWorkspaces()
  }, [])

  const handleSelectWorkspace = async (businessId: string, fallbackDestination?: string) => {
    try {
      setSelectingId(businessId)
      const res = await fetch("/api/auth/switch-workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to switch workspace")

      toast.success(`Entering ${data.businessName || "Workspace"}`)
      router.push(data.destination || fallbackDestination || "/dashboard")
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Failed to select workspace")
      setSelectingId(null)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const filtered = workspaces.filter((w) =>
    w.businessName.toLowerCase().includes(search.toLowerCase()) ||
    w.role.toLowerCase().includes(search.toLowerCase()) ||
    (w.city && w.city.toLowerCase().includes(search.toLowerCase())) ||
    (w.designation && w.designation.toLowerCase().includes(search.toLowerCase()))
  )

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "OWNER":
        return {
          label: "Business Owner",
          icon: ShieldCheck,
          className: "bg-emerald-50 text-emerald-700 border-emerald-200",
        }
      case "MARKETING":
        return {
          label: "Marketing Team",
          icon: Megaphone,
          className: "bg-pink-50 text-pink-700 border-pink-200",
        }
      case "SALES":
        return {
          label: "Sales CRM",
          icon: TrendingUp,
          className: "bg-amber-50 text-amber-700 border-amber-200",
        }
      case "FINANCE":
      default:
        return {
          label: "Finance & Billing",
          icon: Wallet,
          className: "bg-blue-50 text-blue-700 border-blue-200",
        }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col justify-center items-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-white shadow-card border border-[#EEE9E4] flex items-center justify-center mb-4">
          <Loader2 className="w-6 h-6 text-[#E91E63] animate-spin" />
        </div>
        <p className="text-xs font-bold text-ink-primary">Loading your workspaces...</p>
        <p className="text-[11px] text-ink-secondary mt-1">Retrieving multi-tenant memberships</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-ink-primary flex flex-col justify-between p-4 sm:p-8 select-none">
      {/* Top Header */}
      <div className="max-w-4xl w-full mx-auto flex items-center justify-between pt-2 pb-6 border-b border-[#EEE9E4]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#1A1A1A] flex items-center justify-center text-white font-extrabold text-sm shadow-soft">
            C
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-ink-primary tracking-tight font-display">CollectBot OS</h1>
            <p className="text-[10px] text-ink-secondary font-semibold">Multi-Tenant Workspaces</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs font-bold text-ink-secondary hover:text-danger px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-[#EEE9E4] hover:bg-white cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Main Selection Area */}
      <div className="max-w-4xl w-full mx-auto my-auto py-8 space-y-6">
        <div className="text-center space-y-2 max-w-lg mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#EEE9E4] text-[11px] font-bold text-ink-primary shadow-soft mb-1">
            <Sparkles className="w-3.5 h-3.5 text-[#E91E63]" />
            <span>Welcome back, {userProfile?.name || "Member"}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-ink-primary tracking-tight font-display">
            Select a Workspace
          </h2>
          <p className="text-xs text-ink-secondary font-medium">
            You belong to multiple business organizations. Choose where you would like to work today.
          </p>
        </div>

        {/* Search Filter */}
        {workspaces.length > 3 && (
          <div className="max-w-md mx-auto relative">
            <Search className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by business name, role, city..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#EEE9E4] rounded-xl text-xs font-semibold text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-[#E91E63]/20 shadow-soft"
            />
          </div>
        )}

        {/* Workspaces Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
          {filtered.map((ws) => {
            const badge = getRoleBadge(ws.role)
            const BadgeIcon = badge.icon
            const isSelecting = selectingId === ws.businessId

            return (
              <div
                key={ws.businessId}
                onClick={() => !isSelecting && handleSelectWorkspace(ws.businessId, ws.targetDashboard)}
                className={cn(
                  "bg-white border border-[#EEE9E4] rounded-2xl p-5 shadow-card hover:shadow-floating transition-all duration-300 flex flex-col justify-between cursor-pointer group hover:border-[#1A1A1A]/30 relative overflow-hidden",
                  isSelecting && "pointer-events-none opacity-80"
                )}
              >
                {/* Top Row: Business Logo & Role Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#FAF8F5] to-cream-100 border border-[#EEE9E4] flex items-center justify-center text-ink-primary font-black text-base shadow-soft shrink-0 group-hover:scale-105 transition-transform">
                      {ws.businessLogo ? (
                        <img
                          src={ws.businessLogo}
                          alt={ws.businessName}
                          className="w-full h-full object-cover rounded-xl"
                        />
                      ) : (
                        ws.businessName.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-ink-primary tracking-tight font-display group-hover:text-[#E91E63] transition-colors line-clamp-1">
                        {ws.businessName}
                      </h3>
                      {ws.city ? (
                        <p className="text-[10px] text-ink-secondary font-semibold flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-ink-muted" />
                          <span>{ws.city}</span>
                        </p>
                      ) : (
                        <p className="text-[10px] text-ink-muted font-semibold mt-0.5">Enterprise Member</p>
                      )}
                    </div>
                  </div>

                  <div className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1 shrink-0", badge.className)}>
                    <BadgeIcon className="w-3 h-3" />
                    <span>{badge.label}</span>
                  </div>
                </div>

                {/* Middle Info: Designation & Details */}
                <div className="my-4 pt-3 border-t border-[#EEE9E4]/60 flex items-center justify-between text-xs text-ink-secondary">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider font-bold text-ink-muted block">Position</span>
                    <span className="font-bold text-ink-primary text-[11px]">{ws.designation || "Team Member"}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] uppercase tracking-wider font-bold text-ink-muted block">Currency</span>
                    <span className="font-mono font-bold text-ink-primary text-[11px]">{ws.currency || "INR"}</span>
                  </div>
                </div>

                {/* Bottom Action Button */}
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-[10px] text-ink-muted font-medium">
                    Added {formatDate(ws.createdAt)}
                  </span>
                  
                  <button
                    disabled={isSelecting}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1A1A1A] group-hover:bg-[#E91E63] text-white text-xs font-bold transition-all shadow-soft cursor-pointer"
                  >
                    {isSelecting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Entering...</span>
                      </>
                    ) : (
                      <>
                        <span>Enter</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Empty Search Result */}
        {filtered.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-[#EEE9E4] max-w-md mx-auto p-6 space-y-2">
            <Building2 className="w-8 h-8 text-ink-muted mx-auto" />
            <p className="text-xs font-bold text-ink-primary">No matching workspaces found</p>
            <p className="text-[11px] text-ink-secondary">Try searching with a different keyword.</p>
          </div>
        )}

        {/* Create New Business Option */}
        <div className="text-center pt-4">
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-[#EEE9E4] hover:border-[#1A1A1A] bg-white hover:bg-cream-50 text-xs font-bold text-ink-primary transition-all shadow-soft cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#E91E63]" />
            <span>Register Another Business</span>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-4xl w-full mx-auto text-center pt-6 pb-2 border-t border-[#EEE9E4]">
        <p className="text-[10px] uppercase font-bold tracking-wider text-ink-muted">
          © {new Date().getFullYear()} CollectBot Platform • Multi-Tenant Enterprise Security
        </p>
      </div>
    </div>
  )
}
