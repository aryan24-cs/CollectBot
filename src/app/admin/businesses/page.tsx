"use client"

import * as React from "react"
import { 
  Building2, 
  Search, 
  ChevronRight, 
  Plus, 
  Trash2, 
  X, 
  Loader2,
  FileSpreadsheet,
  Mail,
  Phone,
  Lock,
  User,
  Filter,
  Layers,
  ChevronDown
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { formatCurrency, formatDate, cn } from "@/lib/utils"

export default function AdminBusinessesPage() {
  const [businesses, setBusinesses] = React.useState<any[]>([])
  const [search, setSearch] = React.useState("")
  const [plan, setPlan] = React.useState("all")
  const [loading, setLoading] = React.useState(true)
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null)

  // Creation modal states
  const [showCreateModal, setShowCreateModal] = React.useState(false)
  const [newName, setNewName] = React.useState("")
  const [newEmail, setNewEmail] = React.useState("")
  const [newPhone, setNewPhone] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [newPlan, setNewPlan] = React.useState("free")
  const [creating, setCreating] = React.useState(false)

  const loadBusinesses = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.append("search", search)
      if (plan && plan !== "all") params.append("plan", plan)

      const res = await fetch(`/api/admin/businesses?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to load business registry.")
      const json = await res.json()
      setBusinesses(json.businesses || [])
    } catch (err: any) {
      toast.error(err.message || "An error occurred fetching business registry.")
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    loadBusinesses()
  }, [plan])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      loadBusinesses()
    }
  }

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName || !newEmail || !newPhone || !newPassword) {
      toast.error("Please fill in all fields.")
      return
    }
    try {
      setCreating(true)
      const res = await fetch("/api/admin/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          email: newEmail,
          phone: newPhone,
          password: newPassword,
          plan: newPlan,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to create business")
      toast.success("Business workspace created successfully!")
      setShowCreateModal(false)
      // Reset form
      setNewName("")
      setNewEmail("")
      setNewPhone("")
      setNewPassword("")
      setNewPlan("free")
      loadBusinesses()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteBusinessDirectly = async (bizId: string, name: string) => {
    console.log("Delete trigger: Starting direct deletion for", bizId, `(${name})`);
    console.log("Delete trigger: Fetching DELETE /api/admin/businesses/" + bizId);
    try {
      const res = await fetch(`/api/admin/businesses/${bizId}`, {
        method: "DELETE",
      })
      
      console.log("Delete trigger: Response status =", res.status);
      const json = await res.json()
      console.log("Delete trigger: Response JSON =", json);
      
      if (!res.ok) {
        throw new Error(json.error || `Failed to delete business (Status ${res.status})`)
      }
      
      toast.success("Business and user account deleted successfully.")
      console.log("Delete trigger: Deletion successful. Querying fresh business list...");
      loadBusinesses()
    } catch (err: any) {
      console.error("Delete trigger: Operation encountered error:", err);
      toast.error(err.message || "An unexpected deletion error occurred.")
    }
  }

  const exportCSV = () => {
    if (businesses.length === 0) {
      toast.error("No record to export.")
      return
    }
    const headers = ["Business Name", "Owner Email", "Phone", "Plan", "Status", "Invoices", "Revenue", "Registered"]
    const rows = businesses.map(b => [
      b.name,
      b.email || "",
      b.phone || "",
      b.subscription?.plan_name || "free",
      b.subscription?.status || "inactive",
      b.invoiceCount || 0,
      b.totalRevenue || 0,
      b.created_at
    ])
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n")
    
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `collectbot_businesses_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("CSV export initiated.")
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10 select-none text-ink-primary">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#EEE9E4] pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0A0A0A] leading-none font-display">Businesses Directory</h1>
          <p className="text-ink-secondary text-xs mt-2 font-semibold">Audit profile registries, payment ledger volume, subscription tiers, and features.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-[#E91E63] hover:bg-[#D81B60] text-white text-xs font-bold px-4 py-2.5 rounded-pill shadow-soft hover:shadow-floating transition-all flex items-center gap-1.5 cursor-pointer border-none"
          >
            <Plus className="w-4 h-4" />
            Create Business
          </button>
          
          <button
            onClick={exportCSV}
            className="bg-white border border-[#EEE9E4] hover:bg-cream-50 text-ink-secondary hover:text-[#0A0A0A] text-xs font-bold px-4 py-2.5 rounded-pill shadow-soft transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#10B981]" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col md:flex-row gap-4 bg-white border border-[#EEE9E4] rounded-card p-4 shadow-card">
        {/* Search */}
        <div className="flex-grow relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search by name, email, or telephone..."
            className="w-full bg-cream-50 border border-[#EEE9E4] text-ink-primary placeholder:text-ink-secondary/70 shadow-soft rounded-pill pl-10 pr-4 py-2.5 text-xs font-semibold focus:outline-none"
          />
          <Search className="w-4 h-4 text-[#9B9B9B] absolute left-3.5 top-3" />
        </div>

        {/* Plan Filters Segmented Control */}
        <div className="flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-none py-1">
          {[
            { value: "all", label: "All Plans" },
            { value: "free", label: "Free" },
            { value: "solo", label: "Solo" },
            { value: "business", label: "Business" },
            { value: "scale", label: "Scale" }
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => setPlan(item.value)}
              className={cn(
                "px-3.5 py-1.5 text-xs font-bold rounded-pill transition-all cursor-pointer border",
                plan === item.value
                  ? "bg-[#1A1A1A] border-[#1A1A1A] text-white shadow-soft"
                  : "bg-white border-[#EEE9E4] text-ink-secondary hover:bg-cream-50 hover:text-ink-primary"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <button
          onClick={loadBusinesses}
          className="bg-[#E91E63] hover:bg-[#D81B60] text-white text-xs font-bold px-6 py-2.5 rounded-pill shadow-soft transition-all cursor-pointer border-none shrink-0"
        >
          Query Search
        </button>
      </div>

      {/* Table grid */}
      <div className="bg-white border border-[#EEE9E4] rounded-card overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[#EEE9E4] bg-cream-50/50 text-[10px] font-bold text-ink-secondary uppercase tracking-widest select-none">
                <th className="p-4">Business / Owner</th>
                <th className="p-4">Plan Allocation</th>
                <th className="p-4 text-center">Invoices</th>
                <th className="p-4 text-right">Revenue Generated</th>
                <th className="p-4">Registered Date</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEE9E4]/60 text-ink-primary font-sans text-xs font-semibold">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-24 text-ink-secondary italic">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-[#E91E63]" />
                      <span>Aggregating ledger balances and user records...</span>
                    </div>
                  </td>
                </tr>
              ) : businesses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-20 text-ink-secondary italic">
                    <div className="flex flex-col items-center justify-center p-6 space-y-3">
                      <Building2 className="w-10 h-10 text-cream-200" />
                      <p className="text-xs text-ink-secondary">No active registrations found matching the applied filter parameters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                businesses.map((biz) => {
                  const planName = biz.subscription?.plan_name || "free"
                  const subStatus = biz.subscription?.status || "inactive"

                  return (
                    <tr key={biz.id} className="hover:bg-cream-50/30 transition-all duration-200 hover:translate-x-0.5">
                      {/* Name & Owner info */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-cream-100 flex items-center justify-center text-[#E91E63] font-bold text-xs shrink-0 border border-[#EEE9E4]/50">
                            {biz.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-[#0A0A0A] text-[13px] truncate">{biz.name}</p>
                            <span className="text-[10px] text-ink-secondary block mt-0.5 truncate">{biz.email || "No email address"} • {biz.phone || "No phone"}</span>
                          </div>
                        </div>
                      </td>

                      {/* Subscription badge */}
                      <td className="p-4 select-none">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "px-2.5 py-0.5 rounded-pill text-[9px] font-bold uppercase tracking-wider border",
                            planName === "free" && "bg-cream-100 border-[#EEE9E4] text-[#6B6B6B]",
                            planName === "solo" && "bg-[#E8F5E9] border-[#4CAF50]/20 text-[#2E7D32]",
                            planName === "business" && "bg-[#FFF8E1] border-[#FFC107]/20 text-[#F57F17]",
                            planName === "scale" && "bg-[#FDF2F7] border-[#E91E63]/20 text-[#E91E63]"
                          )}>
                            {planName}
                          </span>
                          <span className={cn(
                            "inline-block w-1.5 h-1.5 rounded-full shadow-soft",
                            subStatus === "active" || subStatus === "trialing" ? "bg-[#4CAF50]" : "bg-[#9B9B9B]"
                          )} />
                        </div>
                      </td>

                      {/* Invoices Count */}
                      <td className="p-4 text-center font-bold font-mono text-ink-secondary">
                        {biz.invoiceCount}
                      </td>

                      {/* Ledger Volume */}
                      <td className="p-4 text-right font-mono font-bold text-[#0A0A0A]">
                        {formatCurrency(biz.totalRevenue)}
                      </td>

                      {/* Registered Date */}
                      <td className="p-4 text-ink-secondary font-mono text-[11px]">
                        {formatDate(biz.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-center">
                        {confirmDeleteId === biz.id ? (
                          <div className="flex items-center justify-center gap-2 animate-in fade-in duration-200">
                            <button
                              onClick={() => {
                                setConfirmDeleteId(null)
                                handleDeleteBusinessDirectly(biz.id, biz.name)
                              }}
                              className="bg-[#C62828] hover:bg-[#B71C1C] text-white text-[10px] px-3 py-1.5 rounded-pill font-bold shadow-soft transition-all cursor-pointer border-none"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="bg-white border border-[#EEE9E4] hover:bg-cream-50 text-ink-secondary text-[10px] px-3 py-1.5 rounded-pill font-bold shadow-soft transition-all cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <Link
                              href={`/admin/businesses/${biz.id}`}
                              className="bg-white border border-[#EEE9E4] hover:bg-cream-50 text-ink-primary text-[10px] px-3.5 py-1.5 rounded-pill font-bold shadow-soft transition-all cursor-pointer inline-flex items-center gap-0.5"
                            >
                              Manage
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                            
                            <button
                              onClick={() => setConfirmDeleteId(biz.id)}
                              className="p-2 bg-[#FFEBEE] hover:bg-[#FFCDD2] text-[#C62828] border border-[#F44336]/10 rounded-pill transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Business Modal Overlay */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-[#EEE9E4] rounded-card w-full max-w-md shadow-floating overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#EEE9E4] flex justify-between items-center bg-cream-50/50">
              <div>
                <h3 className="text-sm font-bold text-[#0A0A0A] uppercase tracking-wider">Create Business</h3>
                <p className="text-[10px] text-ink-secondary mt-0.5">Register a workspace user and configure initial subscription details.</p>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-[#9B9B9B] hover:text-[#0A0A0A] p-1 rounded-lg hover:bg-cream-50 transition-colors border-none bg-transparent cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateBusiness} className="p-5 space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-ink-secondary uppercase font-bold block">Business/Owner Name *</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Acme Agency"
                    className="w-full bg-cream-50 border border-[#EEE9E4] text-ink-primary shadow-soft rounded-pill pl-10 pr-4 py-2.5 text-xs font-semibold focus:outline-none"
                  />
                  <User className="w-4 h-4 text-[#9B9B9B] absolute left-3.5 top-3" />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-ink-secondary uppercase font-bold block">Login Email Address *</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="e.g. owner@acme.com"
                    className="w-full bg-cream-50 border border-[#EEE9E4] text-ink-primary shadow-soft rounded-pill pl-10 pr-4 py-2.5 text-xs font-semibold focus:outline-none"
                  />
                  <Mail className="w-4 h-4 text-[#9B9B9B] absolute left-3.5 top-3" />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-ink-secondary uppercase font-bold block">Telephone Number *</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full bg-cream-50 border border-[#EEE9E4] text-ink-primary shadow-soft rounded-pill pl-10 pr-4 py-2.5 text-xs font-semibold focus:outline-none"
                  />
                  <Phone className="w-4 h-4 text-[#9B9B9B] absolute left-3.5 top-3" />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-ink-secondary uppercase font-bold block">Login Password *</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-cream-50 border border-[#EEE9E4] text-ink-primary shadow-soft rounded-pill pl-10 pr-4 py-2.5 text-xs font-semibold focus:outline-none"
                  />
                  <Lock className="w-4 h-4 text-[#9B9B9B] absolute left-3.5 top-3" />
                </div>
              </div>

              {/* Plan Select */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-ink-secondary uppercase font-bold block">Assigned Plan Tier</label>
                <div className="relative">
                  <select
                    value={newPlan}
                    onChange={(e) => setNewPlan(e.target.value)}
                    className="w-full bg-white border border-[#EEE9E4] text-ink-primary shadow-soft rounded-pill pl-10 pr-4 py-2.5 text-xs font-bold focus:outline-none cursor-pointer appearance-none"
                  >
                    <option value="free">Free Tier</option>
                    <option value="solo">Solo Tier</option>
                    <option value="business">Business Tier</option>
                    <option value="scale">Scale Tier</option>
                  </select>
                  <Layers className="w-4 h-4 text-[#9B9B9B] absolute left-3.5 top-3.5 pointer-events-none" />
                  <ChevronDown className="w-4 h-4 text-[#9B9B9B] absolute right-3.5 top-3.5 pointer-events-none" />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="w-1/2 bg-white border border-[#EEE9E4] hover:bg-cream-50 text-ink-secondary rounded-pill py-3 text-xs font-bold shadow-soft transition-colors border-none cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="w-1/2 bg-[#E91E63] hover:bg-[#D81B60] text-white rounded-pill py-3 text-xs font-bold shadow-soft transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 border-none cursor-pointer"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Business"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
