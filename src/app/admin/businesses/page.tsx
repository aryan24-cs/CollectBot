"use client"

import * as React from "react"
import { 
  Building2, 
  Search, 
  ChevronRight, 
  ExternalLink,
  Ban,
  ShieldCheck,
  Building,
  DollarSign,
  FileSpreadsheet,
  FileText,
  Plus,
  Trash2,
  X,
  Loader2
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { formatCurrency, formatDate } from "@/lib/utils"

export default function AdminBusinessesPage() {
  const [businesses, setBusinesses] = React.useState<any[]>([])
  const [search, setSearch] = React.useState("")
  const [plan, setPlan] = React.useState("all")
  const [loading, setLoading] = React.useState(true)

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

  // Trigger search on debounce or Enter key
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

  const handleDeleteBusiness = async (bizId: string, name: string) => {
    if (!confirm(`Are you absolutely sure you want to permanently delete "${name}"? This will delete all their invoices, clients, payments, and their login account. This cannot be undone.`)) {
      return
    }
    try {
      const res = await fetch(`/api/admin/businesses/${bizId}`, {
        method: "DELETE",
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to delete business")
      toast.success("Business and user account deleted successfully.")
      loadBusinesses()
    } catch (err: any) {
      toast.error(err.message)
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            Registered Businesses Directory
          </h1>
          <p className="text-xs text-slate-500 mt-1">Audit profile registries, payment ledger volume, subscription tiers, and features.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-xs font-semibold text-white transition-all shadow-sm shadow-indigo-600/10"
          >
            <Plus className="w-4 h-4" />
            Create Business
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-xs font-semibold text-slate-600 hover:text-slate-950 transition-all shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Export Registry (CSV)
          </button>
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
        {/* Search */}
        <div className="flex-1 relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search by name, email, or telephone number..."
            className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-350 focus:ring-1 focus:ring-indigo-600/20 transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        {/* Plan Filter */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-slate-450 tracking-wider">Plan:</span>
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-slate-350"
          >
            <option value="all">All Plans</option>
            <option value="free">Free Tier</option>
            <option value="solo">Solo Tier</option>
            <option value="business">Business Tier</option>
            <option value="scale">Scale Tier</option>
          </select>
        </div>

        {/* Load btn */}
        <button
          onClick={loadBusinesses}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2 text-xs font-bold shadow-sm transition-all"
        >
          Apply Filters
        </button>
      </div>

      {/* Table grid */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <th className="p-4">Business / Owner</th>
                <th className="p-4">Plan Allocation</th>
                <th className="p-4 text-center">Invoices</th>
                <th className="p-4 text-right">Revenue Generated</th>
                <th className="p-4">Registered Date</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-650">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-20 text-slate-450 italic">
                    Querying records and aggregating ledger balances...
                  </td>
                </tr>
              ) : businesses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-20 text-slate-450 italic">
                    No active registrations found matching the applied search parameters.
                  </td>
                </tr>
              ) : (
                businesses.map((biz) => {
                  const planName = biz.subscription?.plan_name || "free"
                  const subStatus = biz.subscription?.status || "inactive"

                  return (
                    <tr key={biz.id} className="hover:bg-slate-50/60 transition-all">
                      {/* Name & Owner info */}
                      <td className="p-4">
                        <div>
                          <p className="font-bold text-slate-900 text-[13px]">{biz.name}</p>
                          <span className="text-[10px] text-slate-500 block mt-0.5">{biz.email || "No email address"} • {biz.phone || "No phone"}</span>
                        </div>
                      </td>

                      {/* Subscription badge */}
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide border ${
                            planName === "free" ? "bg-slate-55 border-slate-200 text-slate-600" :
                            planName === "solo" ? "bg-indigo-50 border-indigo-100 text-indigo-700" :
                            planName === "business" ? "bg-emerald-50 border-emerald-100 text-emerald-700" :
                            "bg-amber-50 border-amber-100 text-amber-700"
                          }`}>
                            {planName}
                          </span>
                          <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                            subStatus === "active" || subStatus === "trialing" ? "bg-emerald-500" : "bg-slate-350"
                          }`} />
                        </div>
                      </td>

                      {/* Invoices Count */}
                      <td className="p-4 text-center font-bold text-slate-800">
                        {biz.invoiceCount}
                      </td>

                      {/* Ledger Volume */}
                      <td className="p-4 text-right font-mono font-bold text-slate-800">
                        {formatCurrency(biz.totalRevenue)}
                      </td>

                      {/* Registered Date */}
                      <td className="p-4 text-slate-500">
                        {formatDate(biz.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            href={`/admin/businesses/${biz.id}`}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 transition-all shadow-sm"
                          >
                            Manage
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={() => handleDeleteBusiness(biz.id, biz.name)}
                            className="inline-flex items-center justify-center p-2 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-xl text-rose-600 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>      {/* Create Business Modal Overlay */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-[0_8px_32px_rgba(0,0,0,0.08)] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Create New Business Profile</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Register a workspace user and configure initial subscription details.</p>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-750 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateBusiness} className="p-5 space-y-4">
              {/* Business Name */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase font-bold block">Business/Owner Name *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Acme Agency"
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-350 focus:ring-1 focus:ring-indigo-600/20"
                />
              </div>

              {/* Owner Email */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase font-bold block">Login Email Address *</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g. owner@acme.com"
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-350 focus:ring-1 focus:ring-indigo-600/20"
                />
              </div>

              {/* Phone Number */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase font-bold block">Telephone Number *</label>
                <input
                  type="text"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-350 focus:ring-1 focus:ring-indigo-600/20"
                />
              </div>

              {/* Login Password */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase font-bold block">Login Password *</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-350 focus:ring-1 focus:ring-indigo-600/20"
                />
              </div>

              {/* Initial Plan */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase font-bold block">Assigned Plan Tier</label>
                <select
                  value={newPlan}
                  onChange={(e) => setNewPlan(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-slate-350"
                >
                  <option value="free">Free Tier</option>
                  <option value="solo">Solo Tier</option>
                  <option value="business">Business Tier</option>
                  <option value="scale">Scale Tier</option>
                </select>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="w-1/2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-650 hover:text-slate-900 rounded-xl py-2.5 text-xs font-semibold shadow-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="w-1/2 bg-indigo-650 hover:bg-indigo-750 text-white rounded-xl py-2.5 text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
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
