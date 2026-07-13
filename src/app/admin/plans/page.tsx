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
import { formatCurrency, cn } from "@/lib/utils"

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
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-ink-secondary">
        <Loader2 className="w-9 h-9 text-[#E91E63] animate-spin mb-4" />
        <p className="text-xs font-semibold">Retrieving product pricing models and features...</p>
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
    <div className="space-y-6 text-ink-primary max-w-6xl mx-auto pb-10">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-[#EEE9E4] pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0A0A0A] font-display flex items-center gap-2">
            Pricing Plans & Feature Limits
          </h1>
          <p className="text-xs text-ink-secondary mt-1 font-semibold">Configure plan display settings, client limits, monthly totals, and feature flags.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Plans list */}
        <div className={editingPlan ? "lg:col-span-6 space-y-4" : "lg:col-span-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"}>
          {plans.map((plan) => (
            <div 
              key={plan.id} 
              className={cn(
                "bg-white border rounded-card p-5 shadow-card space-y-4 transition-all duration-200",
                editingPlan?.id === plan.id ? "border-[#E91E63] bg-[#FDF2F7]/10" : "border-[#EEE9E4] hover:border-ink-secondary/35"
              )}
            >
              {/* Plan name */}
              <div className="flex justify-between items-center border-b border-[#EEE9E4]/65 pb-3">
                <div>
                  <h3 className="text-base font-bold text-[#0A0A0A] tracking-tight">{plan.display_name}</h3>
                  <span className="text-[9px] text-ink-secondary font-mono uppercase font-bold tracking-wider">{plan.name} Tier</span>
                </div>
                <span className={cn(
                  "px-2 py-0.5 rounded-pill text-[8px] font-bold uppercase tracking-wider border",
                  plan.is_active ? "bg-[#E8F5E9] text-[#2E7D32] border-[#A5D6A7]/30" : "bg-cream-100 text-ink-secondary border-[#EEE9E4]"
                )}>
                  {plan.is_active ? "Active" : "Disabled"}
                </span>
              </div>

              {/* Price details */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-ink-secondary font-bold block uppercase">Monthly Price</span>
                  <p className="text-[#0A0A0A] font-bold mt-0.5">{formatCurrency(plan.price_monthly)}</p>
                </div>
                <div>
                  <span className="text-[10px] text-ink-secondary font-bold block uppercase">Yearly Price</span>
                  <p className="text-[#0A0A0A] font-bold mt-0.5">{formatCurrency(plan.price_yearly)}</p>
                </div>
              </div>

              {/* Limit details */}
              <div className="bg-[#FAF8F5] border border-[#EEE9E4]/60 p-3 rounded-card text-xs space-y-1 text-ink-secondary font-semibold">
                <div className="flex justify-between">
                  <span>Max Invoices / mo:</span>
                  <span className="text-[#0A0A0A] font-bold">{plan.max_invoices_per_month === -1 ? "Unlimited" : plan.max_invoices_per_month}</span>
                </div>
                <div className="flex justify-between">
                  <span>Max Clients:</span>
                  <span className="text-[#0A0A0A] font-bold">{plan.max_clients === -1 ? "Unlimited" : plan.max_clients}</span>
                </div>
                <div className="flex justify-between">
                  <span>Max Team Members:</span>
                  <span className="text-[#0A0A0A] font-bold">{plan.max_team_members === -1 ? "Unlimited" : plan.max_team_members}</span>
                </div>
              </div>

              {/* Manage btn */}
              <button
                onClick={() => handleEditClick(plan)}
                className="w-full bg-[#1A1A1A] hover:bg-[#0A0A0A] border-none rounded-pill py-2.5 text-xs font-bold text-white transition-all shadow-soft flex items-center justify-center gap-1.5 cursor-pointer"
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
            <div className="bg-white border border-[#EEE9E4] rounded-card p-6 shadow-card space-y-5">
              
              {/* Title */}
              <div className="flex justify-between items-center border-b border-[#EEE9E4] pb-3">
                <div>
                  <h3 className="text-sm font-bold text-[#0A0A0A] tracking-tight font-display">Modify {editingPlan.display_name} Settings</h3>
                  <p className="text-[10px] text-ink-secondary mt-0.5">Changes apply immediately to all clients on this plan tier.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingPlan(null)}
                    className="px-3.5 py-1.5 border border-[#EEE9E4] hover:bg-cream-50 text-[10px] font-bold text-ink-secondary hover:text-[#0A0A0A] rounded-pill transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSavePlan}
                    disabled={saving}
                    className="px-4 py-1.5 bg-[#E91E63] hover:bg-[#D81B60] text-white rounded-pill text-[10px] font-bold shadow-soft transition-all flex items-center gap-1.5 border-none cursor-pointer"
                  >
                    <Save className="w-3 h-3" />
                    {saving ? "Saving..." : "Save details"}
                  </button>
                </div>
              </div>

              {/* Fields */}
              <div className="space-y-4">
                
                {/* Display Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-ink-secondary uppercase font-bold block">Display Name</label>
                  <input
                    type="text"
                    value={editingPlan.display_name}
                    onChange={(e) => setEditingPlan({ ...editingPlan, display_name: e.target.value })}
                    className="w-full bg-cream-50 border border-[#EEE9E4] rounded-pill px-4 py-2.5 text-xs font-semibold text-ink-primary placeholder:text-ink-secondary/50 focus:outline-none"
                  />
                </div>

                {/* Price Monthly / Yearly */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-ink-secondary uppercase font-bold block">Monthly Price (INR)</label>
                    <input
                      type="number"
                      value={editingPlan.price_monthly}
                      onChange={(e) => setEditingPlan({ ...editingPlan, price_monthly: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-cream-50 border border-[#EEE9E4] rounded-pill px-4 py-2.5 text-xs font-semibold text-ink-primary focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-ink-secondary uppercase font-bold block">Yearly Price (INR)</label>
                    <input
                      type="number"
                      value={editingPlan.price_yearly}
                      onChange={(e) => setEditingPlan({ ...editingPlan, price_yearly: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-cream-50 border border-[#EEE9E4] rounded-pill px-4 py-2.5 text-xs font-semibold text-ink-primary focus:outline-none"
                    />
                  </div>
                </div>

                {/* Invoices limit */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-ink-secondary uppercase font-bold block">Max Invoices (-1=Unlim)</label>
                    <input
                      type="number"
                      value={editingPlan.max_invoices_per_month}
                      onChange={(e) => setEditingPlan({ ...editingPlan, max_invoices_per_month: parseInt(e.target.value) || -1 })}
                      className="w-full bg-cream-50 border border-[#EEE9E4] rounded-pill px-4 py-2.5 text-xs font-semibold text-ink-primary focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-ink-secondary uppercase font-bold block">Max Clients (-1=Unlim)</label>
                    <input
                      type="number"
                      value={editingPlan.max_clients}
                      onChange={(e) => setEditingPlan({ ...editingPlan, max_clients: parseInt(e.target.value) || -1 })}
                      className="w-full bg-cream-50 border border-[#EEE9E4] rounded-pill px-4 py-2.5 text-xs font-semibold text-ink-primary focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-ink-secondary uppercase font-bold block">Max Team members</label>
                    <input
                      type="number"
                      value={editingPlan.max_team_members}
                      onChange={(e) => setEditingPlan({ ...editingPlan, max_team_members: parseInt(e.target.value) || -1 })}
                      className="w-full bg-cream-50 border border-[#EEE9E4] rounded-pill px-4 py-2.5 text-xs font-semibold text-ink-primary focus:outline-none"
                    />
                  </div>
                </div>

                {/* Features toggles */}
                <div className="space-y-2.5 border-t border-[#EEE9E4] pt-3">
                  <span className="text-[10px] text-ink-secondary uppercase font-bold block">Included Features flags</span>
                  <div className="grid grid-cols-2 gap-3">
                    {configurableFeatures.map((feat) => {
                      const enabled = Boolean(editingPlan[`feature_${feat.key}`])

                      return (
                        <div 
                          key={feat.key}
                          onClick={() => toggleFeature(feat.key)}
                          className={cn(
                            "flex items-center gap-2 p-2.5 rounded-card border text-xs font-semibold cursor-pointer select-none transition-all",
                            enabled ? "bg-[#FDF2F7] border-[#E91E63]/25 text-[#E91E63]" : "bg-white border-[#EEE9E4] text-ink-secondary hover:bg-cream-50/50"
                          )}
                        >
                          <span className={cn(
                            "w-4 h-4 rounded flex items-center justify-center border text-[9px]",
                            enabled ? "bg-[#E91E63] border-[#E91E63] text-white" : "border-[#EEE9E4] bg-cream-50"
                          )}>
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
