"use client"

import * as React from "react"
import { 
  Settings2, 
  Save, 
  Loader2, 
  Check, 
  HelpCircle,
  Building,
  ArrowRight,
  TrendingUp
} from "lucide-react"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/utils"

export default function AdminPlansPage() {
  const [plans, setPlans] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [editingPlan, setEditingPlan] = React.useState<any>(null)
  const [saving, setSaving] = React.useState(false)

  const loadPlans = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/plans")
      if (!res.ok) throw new Error("Failed to load platform pricing models.")
      const json = await res.json()
      setPlans(json.plans || [])
    } catch (err: any) {
      toast.error(err.message || "An error occurred fetching plans list.")
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    loadPlans()
  }, [])

  const handleEditClick = (plan: any) => {
    setEditingPlan({ ...plan })
  }

  const handleSavePlan = async () => {
    if (!editingPlan) return

    try {
      setSaving(true)
      const res = await fetch(`/api/admin/plans/${editingPlan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingPlan)
      })

      if (!res.ok) throw new Error("Failed to save plan changes.")
      toast.success("Pricing plan updated.")
      setEditingPlan(null)
      loadPlans()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleFeature = (featKey: string) => {
    if (!editingPlan) return
    const featureName = `feature_${featKey}`
    setEditingPlan({
      ...editingPlan,
      [featureName]: !editingPlan[featureName]
    })
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="w-9 h-9 text-indigo-500 animate-spin mb-4" />
        <p className="text-xs text-slate-400 font-medium">Retrieving product pricing models and features...</p>
      </div>
    )
  }

  // Toggles inside plan editor
  const configurableFeatures = [
    { key: "whatsapp", label: "WhatsApp Alerts" },
    { key: "email", label: "Email Notifications" },
    { key: "sms", label: "SMS Channels" },
    { key: "payment_links", label: "Payment Links" },
    { key: "recurring", label: "Recurring Invoices" },
    { key: "pdf_invoice", label: "PDF Invoices" },
    { key: "custom_branding", label: "Custom Layouts" },
    { key: "remove_watermark", label: "Remove Watermarks" },
    { key: "reminder_auto", label: "Automation Engine" },
    { key: "reminder_custom", label: "Custom Reminders" },
    { key: "analytics_basic", label: "Basic Analytics" },
    { key: "analytics_advanced", label: "Advanced Analytics" },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Pricing Plans & Feature Limits
          </h1>
          <p className="text-xs text-slate-400 mt-1">Configure plan display settings, client limits, monthly totals, and feature flags.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Plans list */}
        <div className={editingPlan ? "lg:col-span-6 space-y-4" : "lg:col-span-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"}>
          {plans.map((plan) => (
            <div 
              key={plan.id} 
              className={`bg-[#1E293B]/30 border rounded-xl p-5 shadow-sm space-y-4 transition-all duration-200 ${
                editingPlan?.id === plan.id ? "border-indigo-500 bg-indigo-500/5 shadow-indigo-500/5" : "border-slate-800/80 hover:border-slate-700/60"
              }`}
            >
              {/* Plan name */}
              <div className="flex justify-between items-center border-b border-slate-800/60 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">{plan.display_name}</h3>
                  <span className="text-[9px] text-slate-500 font-mono uppercase font-bold tracking-wider">{plan.name} Tier</span>
                </div>
                <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wide border ${
                  plan.is_active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-slate-800/40 text-slate-400 border-slate-700/30"
                }`}>
                  {plan.is_active ? "Active" : "Disabled"}
                </span>
              </div>

              {/* Price details */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">Monthly Price</span>
                  <p className="text-white font-semibold mt-0.5">{formatCurrency(plan.price_monthly)}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">Yearly Price</span>
                  <p className="text-white font-semibold mt-0.5">{formatCurrency(plan.price_yearly)}</p>
                </div>
              </div>

              {/* Limit details */}
              <div className="bg-slate-900/40 border border-slate-850 p-3 rounded-lg text-xs space-y-1 text-slate-400 font-medium">
                <div className="flex justify-between">
                  <span>Max Invoices / mo:</span>
                  <span className="text-white font-semibold">{plan.max_invoices_per_month === -1 ? "Unlimited" : plan.max_invoices_per_month}</span>
                </div>
                <div className="flex justify-between">
                  <span>Max Clients:</span>
                  <span className="text-white font-semibold">{plan.max_clients === -1 ? "Unlimited" : plan.max_clients}</span>
                </div>
                <div className="flex justify-between">
                  <span>Max Team Members:</span>
                  <span className="text-white font-semibold">{plan.max_team_members === -1 ? "Unlimited" : plan.max_team_members}</span>
                </div>
              </div>

              {/* Manage btn */}
              <button
                onClick={() => handleEditClick(plan)}
                className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700/60 rounded-lg py-2 text-xs font-semibold text-white transition-all shadow-sm flex items-center justify-center gap-1.5"
              >
                <Settings2 className="w-3.5 h-3.5" />
                Manage Plan details
              </button>
            </div>
          ))}
        </div>

        {/* Edit Plan Panel */}
        {editingPlan && (
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-[#1E293B]/30 border border-indigo-500/20 rounded-xl p-5 shadow-sm space-y-5">
              
              {/* Title */}
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-semibold text-white tracking-tight">Modify {editingPlan.display_name} Settings</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Changes apply immediately to all clients on this plan tier.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingPlan(null)}
                    className="px-2.5 py-1.5 border border-slate-800 hover:bg-slate-800 text-[10px] font-bold text-slate-400 hover:text-white rounded transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSavePlan}
                    disabled={saving}
                    className="px-3 py-1.5 bg-indigo-650 hover:bg-indigo-500 text-white rounded text-[10px] font-bold shadow-sm transition-all flex items-center gap-1"
                  >
                    <Save className="w-3 h-3" />
                    {saving ? "Saving..." : "Save details"}
                  </button>
                </div>
              </div>

              {/* Fields */}
              <div className="space-y-4">
                
                {/* Display Name */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase font-bold block">Display Name</label>
                  <input
                    type="text"
                    value={editingPlan.display_name}
                    onChange={(e) => setEditingPlan({ ...editingPlan, display_name: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs font-medium text-slate-300 placeholder-slate-650 focus:outline-none focus:border-slate-700"
                  />
                </div>

                {/* Price Monthly / Yearly */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase font-bold block">Monthly Price (INR)</label>
                    <input
                      type="number"
                      value={editingPlan.price_monthly}
                      onChange={(e) => setEditingPlan({ ...editingPlan, price_monthly: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs font-medium text-slate-300 focus:outline-none focus:border-slate-700"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase font-bold block">Yearly Price (INR)</label>
                    <input
                      type="number"
                      value={editingPlan.price_yearly}
                      onChange={(e) => setEditingPlan({ ...editingPlan, price_yearly: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs font-medium text-slate-300 focus:outline-none focus:border-slate-700"
                    />
                  </div>
                </div>

                {/* Invoices limit */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 uppercase font-bold block">Max Invoices (-1=Unlim)</label>
                    <input
                      type="number"
                      value={editingPlan.max_invoices_per_month}
                      onChange={(e) => setEditingPlan({ ...editingPlan, max_invoices_per_month: parseInt(e.target.value) || -1 })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs font-medium text-slate-300 focus:outline-none focus:border-slate-700"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 uppercase font-bold block">Max Clients (-1=Unlim)</label>
                    <input
                      type="number"
                      value={editingPlan.max_clients}
                      onChange={(e) => setEditingPlan({ ...editingPlan, max_clients: parseInt(e.target.value) || -1 })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs font-medium text-slate-300 focus:outline-none focus:border-slate-700"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 uppercase font-bold block">Max Team members</label>
                    <input
                      type="number"
                      value={editingPlan.max_team_members}
                      onChange={(e) => setEditingPlan({ ...editingPlan, max_team_members: parseInt(e.target.value) || -1 })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs font-medium text-slate-300 focus:outline-none focus:border-slate-700"
                    />
                  </div>
                </div>

                {/* Features toggles */}
                <div className="space-y-2.5 border-t border-slate-800 pt-3">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Included Features flags</span>
                  <div className="grid grid-cols-2 gap-3">
                    {configurableFeatures.map((feat) => {
                      const enabled = Boolean(editingPlan[`feature_${feat.key}`])

                      return (
                        <div 
                          key={feat.key}
                          onClick={() => toggleFeature(feat.key)}
                          className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium cursor-pointer select-none transition-all ${
                            enabled ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400" : "bg-slate-900/30 border-slate-800 text-slate-500"
                          }`}
                        >
                          <span className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[9px] ${
                            enabled ? "bg-indigo-500 border-indigo-650 text-white" : "border-slate-700 bg-slate-900"
                          }`}>
                            {enabled && <Check className="w-2.5 h-2.5" />}
                          </span>
                          {feat.label}
                        </div>
                      )
                    })}
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  )
}
