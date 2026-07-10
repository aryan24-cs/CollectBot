"use client"

import * as React from "react"
import { 
  Building2, 
  ArrowLeft, 
  ShieldAlert, 
  Save, 
  RefreshCw, 
  Loader2, 
  CheckCircle,
  HelpCircle,
  FileText,
  User,
  KeyRound,
  Info
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { useParams } from "next/navigation"
import { formatCurrency, formatDate } from "@/lib/utils"

export default function BusinessDetailPage() {
  const params = useParams()
  const businessId = params.businessId as string

  const [activeTab, setActiveTab] = React.useState("overview")
  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  
  // Note inputs
  const [adminNotes, setAdminNotes] = React.useState("")
  const [notesSaving, setNotesSaving] = React.useState(false)

  // Feature overrides states
  const [effectiveFeatures, setEffectiveFeatures] = React.useState<any>(null)
  const [overrides, setOverrides] = React.useState<any>({})
  const [isFullAccess, setIsFullAccess] = React.useState(false)
  const [isBlocked, setIsBlocked] = React.useState(false)
  const [featuresSaving, setFeaturesSaving] = React.useState(false)

  // Subscription states
  const [selectedPlan, setSelectedPlan] = React.useState("")
  const [trialEndsAt, setTrialEndsAt] = React.useState("")
  const [subStatus, setSubStatus] = React.useState("")
  const [subSaving, setSubSaving] = React.useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      // 1. Load detail stats
      const detailRes = await fetch(`/api/admin/businesses/${businessId}`)
      if (!detailRes.ok) throw new Error("Failed to load business profile.")
      const detailJson = await detailRes.json()
      
      setData(detailJson)
      setAdminNotes(detailJson.overrides?.admin_notes || "")
      setIsFullAccess(detailJson.overrides?.is_full_access || false)
      setIsBlocked(detailJson.overrides?.is_blocked || false)
      
      // 2. Load current overrides & effective features
      const featureRes = await fetch(`/api/admin/businesses/${businessId}/features`)
      if (featureRes.ok) {
        const featureJson = await featureRes.json()
        setEffectiveFeatures(featureJson.effective)
        setOverrides(featureJson.overrides || {})
      }

      // Initialize sub states
      if (detailJson.subscription) {
        setSelectedPlan(detailJson.subscription.plan_name || "free")
        setSubStatus(detailJson.subscription.status || "active")
        if (detailJson.subscription.trial_ends_at) {
          setTrialEndsAt(new Date(detailJson.subscription.trial_ends_at).toISOString().split("T")[0])
        }
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred fetching business metrics.")
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    if (businessId) loadData()
  }, [businessId])

  // Admin Notes Save
  const saveNotes = async () => {
    try {
      setNotesSaving(true)
      const res = await fetch(`/api/admin/businesses/${businessId}/features`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_notes: adminNotes })
      })
      if (!res.ok) throw new Error("Failed to update admin notes.")
      toast.success("Notes saved successfully.")
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setNotesSaving(false)
    }
  }

  // Override Toggle Set
  const setOverrideVal = (key: string, val: boolean | null) => {
    setOverrides((prev: any) => ({
      ...prev,
      [`override_${key}`]: val
    }))
  }

  // Save Overrides & Flags
  const saveOverrides = async () => {
    try {
      setFeaturesSaving(true)
      const res = await fetch(`/api/admin/businesses/${businessId}/features`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          overrides,
          is_full_access: isFullAccess,
          is_blocked: isBlocked
        })
      })
      if (!res.ok) throw new Error("Failed to apply feature overrides.")
      const json = await res.json()
      setOverrides(json.overrides || {})
      setEffectiveFeatures(json.effective)
      toast.success("Feature overrides updated.")
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setFeaturesSaving(false)
    }
  }

  // Reset Overrides
  const resetOverrides = async () => {
    try {
      setFeaturesSaving(true)
      const res = await fetch(`/api/admin/businesses/${businessId}/features`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" })
      })
      if (!res.ok) throw new Error("Failed to reset overrides.")
      const json = await res.json()
      setOverrides({})
      setEffectiveFeatures(json.effective)
      toast.success("Overrides reset to plan defaults.")
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setFeaturesSaving(false)
    }
  }

  // Save Subscription details
  const saveSubscription = async () => {
    try {
      setSubSaving(true)
      const res = await fetch(`/api/admin/businesses/${businessId}/subscription`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_name: selectedPlan,
          status: subStatus,
          trial_ends_at: trialEndsAt ? new Date(trialEndsAt).toISOString() : null
        })
      })
      if (!res.ok) throw new Error("Failed to update subscription profile.")
      toast.success("Subscription profile updated.")
      loadData()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSubSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="w-9 h-9 text-indigo-500 animate-spin mb-4" />
        <p className="text-xs text-slate-400 font-medium">Retrieving database state and overrides...</p>
      </div>
    )
  }

  const biz = data?.business || {}
  const stats = data?.stats || {}

  // List of configurable feature toggles
  const featuresList = [
    { key: "whatsapp", label: "WhatsApp Alerts", desc: "Automated WhatsApp payment alerts and reminder queues." },
    { key: "email", label: "Email Notifications", desc: "Nodemailer dispatch channels for invoices & updates." },
    { key: "sms", label: "SMS Channels", desc: "Twilio/SMS notifications backup option." },
    { key: "payment_links", label: "Payment Gateways", desc: "Razorpay payment link checkout buttons." },
    { key: "recurring", label: "Recurring Invoices", desc: "Subscriptions schedule template invoices generator." },
    { key: "pdf_invoice", label: "PDF Downloads", desc: "Clients PDF download and viewing portal links." },
    { key: "custom_branding", label: "Custom Layouts", desc: "Change invoice theme layout, fonts, and colors." },
    { key: "remove_watermark", label: "Remove Branding", desc: "Hide CollectBot branding taglines on invoices." },
    { key: "reminder_auto", label: "Automation Engine", desc: "Activate cron reminders scheduler runner." },
    { key: "reminder_custom", label: "Custom Reminders", desc: "Custom schedule timers (before/after due days)." },
    { key: "analytics_basic", label: "Dashboard Analytics", desc: "Basic dashboard tracking and payment graphs." },
    { key: "analytics_advanced", label: "Advanced Insights", desc: "Profit trends, overdue allocations, and forecasting charts." },
  ]

  return (
    <div className="space-y-6">
      {/* Back & Title */}
      <div className="flex flex-col gap-2">
        <Link href="/admin/businesses" className="text-slate-400 hover:text-white flex items-center gap-1 text-xs font-semibold">
          <ArrowLeft className="w-4 h-4" /> Back to registry directory
        </Link>
        <div className="flex justify-between items-start border-b border-slate-800/80 pb-4 mt-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">{biz.name}</h1>
            <p className="text-xs text-slate-400 mt-1">ID: <span className="font-mono">{biz.id}</span> • Registered: {formatDate(biz.created_at)}</p>
          </div>
          <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide border ${
            isBlocked ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
          }`}>
            {isBlocked ? "Blocked" : "Active status"}
          </span>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-slate-800/80 gap-6">
        {[
          { id: "overview", label: "Overview details" },
          { id: "features", label: "Access & Overrides" },
          { id: "subscription", label: "Subscription plan" },
          { id: "usage", label: "Usage stats" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 text-xs font-semibold transition-all relative ${
              activeTab === tab.id ? "text-indigo-400" : "text-slate-400 hover:text-white"
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content workspace */}
      <div className="mt-4">

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Quick Metrics */}
            <div className="md:col-span-8 space-y-6">
              
              {/* Profile Details */}
              <div className="bg-[#1E293B]/30 border border-slate-800/80 rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-semibold text-white tracking-tight border-b border-slate-800 pb-3">Owner Contact details</h3>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block uppercase">Owner Name</span>
                    <p className="text-white mt-0.5 font-medium">{biz.name}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block uppercase">Email Address</span>
                    <p className="text-white mt-0.5 font-medium">{biz.email || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block uppercase">Telephone</span>
                    <p className="text-white mt-0.5 font-medium">{biz.phone || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block uppercase">Location</span>
                    <p className="text-white mt-0.5 font-medium">{biz.city || "N/A"}, {biz.state || "N/A"}</p>
                  </div>
                </div>
              </div>

              {/* Operations Stats */}
              <div className="bg-[#1E293B]/30 border border-slate-800/80 rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-semibold text-white tracking-tight border-b border-slate-800 pb-3">Operational Stats</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-slate-900/40 p-4 rounded-lg border border-slate-800/50">
                    <span className="text-[10px] text-slate-500 font-bold block uppercase">Invoices Created</span>
                    <p className="text-xl font-extrabold text-white mt-1">{stats.totalInvoices}</p>
                  </div>
                  <div className="bg-slate-900/40 p-4 rounded-lg border border-slate-800/50">
                    <span className="text-[10px] text-slate-500 font-bold block uppercase">Active Clients</span>
                    <p className="text-xl font-extrabold text-white mt-1">{stats.totalClients}</p>
                  </div>
                  <div className="bg-slate-900/40 p-4 rounded-lg border border-slate-800/50">
                    <span className="text-[10px] text-slate-500 font-bold block uppercase">Collected Volume</span>
                    <p className="text-xl font-extrabold text-white mt-1">{formatCurrency(stats.totalRevenue)}</p>
                  </div>
                </div>
              </div>

            </div>

            {/* Private notes */}
            <div className="md:col-span-4 space-y-6">
              <div className="bg-[#1E293B]/30 border border-slate-800/80 rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-semibold text-white tracking-tight border-b border-slate-800 pb-3">Private Admin Notes</h3>
                <p className="text-[10px] text-slate-400">Notes entered here are restricted to admin access only and not visible to the client.</p>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Record onboarding logs, compliance statuses, custom requests..."
                  rows={6}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs font-medium text-slate-300 placeholder-slate-600 focus:outline-none focus:border-slate-700 transition-all resize-none"
                />
                <button
                  onClick={saveNotes}
                  disabled={notesSaving}
                  className="w-full bg-indigo-650 hover:bg-indigo-500 text-white rounded-lg py-2 text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {notesSaving ? "Saving Notes..." : "Save Admin Notes"}
                </button>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: FEATURES OVERRIDES */}
        {activeTab === "features" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Toggles panel */}
            <div className="lg:col-span-8 space-y-6">
              
              <div className="bg-[#1E293B]/30 border border-slate-800/80 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white tracking-tight">Access Gate Overrides</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">Force enable/disable specific SaaS module gates.</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={resetOverrides}
                      className="px-2.5 py-1.5 border border-slate-800 hover:bg-slate-800 text-[10px] font-bold text-slate-400 hover:text-white rounded transition-all"
                    >
                      Reset to defaults
                    </button>
                    <button
                      onClick={saveOverrides}
                      disabled={featuresSaving}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold shadow-sm transition-all flex items-center gap-1"
                    >
                      <Save className="w-3 h-3" />
                      Save configurations
                    </button>
                  </div>
                </div>

                {/* Features toggles list */}
                <div className="space-y-4 pt-1">
                  {featuresList.map((feat) => {
                    const overrideKey = `override_${feat.key}`
                    const overrideVal = overrides[overrideKey] // true, false, null/undefined
                    const effectiveVal = effectiveFeatures?.[feat.key] ?? false

                    return (
                      <div key={feat.key} className="flex justify-between items-center bg-slate-900/10 border border-slate-800/40 rounded-lg p-3 hover:border-slate-800 transition-all">
                        <div className="space-y-0.5">
                          <p className="text-xs font-semibold text-white flex items-center gap-1.5">
                            {feat.label}
                            {overrideVal !== null && overrideVal !== undefined && (
                              <span className="text-[8px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1 py-0.2 rounded">
                                Overridden
                              </span>
                            )}
                          </p>
                          <span className="text-[10px] text-slate-500 block max-w-md">{feat.desc}</span>
                        </div>

                        {/* Selection status */}
                        <div className="flex items-center gap-4">
                          {/* Visual Indicator of effective status */}
                          <span className={`inline-block w-2 h-2 rounded-full ${
                            effectiveVal ? "bg-emerald-500" : "bg-rose-500"
                          }`} />

                          <select
                            value={overrideVal === true ? "on" : overrideVal === false ? "off" : "default"}
                            onChange={(e) => {
                              const val = e.target.value
                              if (val === "on") setOverrideVal(feat.key, true)
                              else if (val === "off") setOverrideVal(feat.key, false)
                              else setOverrideVal(feat.key, null)
                            }}
                            className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-300 focus:outline-none"
                          >
                            <option value="default">Use plan defaults</option>
                            <option value="on">Force Enable</option>
                            <option value="off">Force Disable</option>
                          </select>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>

            {/* Special flags */}
            <div className="lg:col-span-4 space-y-6">
              
              <div className="bg-[#1E293B]/30 border border-slate-800/80 rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-semibold text-white tracking-tight border-b border-slate-800 pb-3 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                  Operational Flags
                </h3>
                
                <div className="space-y-4 pt-1">
                  
                  {/* Full Access */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-white block">Full Access Override</span>
                      <p className="text-[9px] text-slate-500">Unlocks all limits & features completely.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={isFullAccess}
                      onChange={(e) => setIsFullAccess(e.target.checked)}
                      className="rounded border-slate-800 text-indigo-600 focus:ring-indigo-650"
                    />
                  </div>

                  {/* Block Business */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-white block">Suspend Workspace</span>
                      <p className="text-[9px] text-slate-500">Block logins and restrict billing logs.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={isBlocked}
                      onChange={(e) => setIsBlocked(e.target.checked)}
                      className="rounded border-slate-800 text-rose-600 focus:ring-rose-500"
                    />
                  </div>

                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 3: SUBSCRIPTION */}
        {activeTab === "subscription" && (
          <div className="max-w-2xl bg-[#1E293B]/30 border border-slate-800/80 rounded-xl p-5 shadow-sm space-y-6">
            <h3 className="text-sm font-semibold text-white tracking-tight border-b border-slate-800 pb-3">Manage Plan & Trial terms</h3>

            <div className="space-y-4">
              
              {/* Select Plan */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase font-bold block">Assigned Tier</label>
                <select
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs font-medium text-slate-300 focus:outline-none focus:border-slate-700"
                >
                  <option value="free">Free Tier</option>
                  <option value="solo">Solo Tier</option>
                  <option value="business">Business Tier</option>
                  <option value="scale">Scale Tier</option>
                </select>
              </div>

              {/* Status */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase font-bold block">Status</label>
                <select
                  value={subStatus}
                  onChange={(e) => setSubStatus(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs font-medium text-slate-300 focus:outline-none focus:border-slate-700"
                >
                  <option value="trialing">Trialing</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="expired">Expired</option>
                </select>
              </div>

              {/* Trial Ends Date */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase font-bold block">Trial Expiration Date</label>
                <input
                  type="date"
                  value={trialEndsAt}
                  onChange={(e) => setTrialEndsAt(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs font-medium text-slate-300 focus:outline-none focus:border-slate-700"
                />
              </div>

              {/* Save */}
              <button
                onClick={saveSubscription}
                disabled={subSaving}
                className="w-full bg-indigo-650 hover:bg-indigo-500 text-white rounded-lg py-2 text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {subSaving ? "Updating..." : "Apply Plan modifications"}
              </button>

            </div>
          </div>
        )}

        {/* TAB 4: USAGE LIMITS */}
        {activeTab === "usage" && (
          <div className="max-w-xl bg-[#1E293B]/30 border border-slate-800/80 rounded-xl p-5 shadow-sm space-y-6">
            <h3 className="text-sm font-semibold text-white tracking-tight border-b border-slate-800 pb-3">Monthly Usage allocations</h3>

            <div className="space-y-4 pt-1">
              
              {/* Invoices */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-medium text-slate-400">
                  <span>Invoice creation limits</span>
                  <span className="text-white font-semibold">{stats.totalInvoices} / {effectiveFeatures?.max_invoices === -1 ? "Unlimited" : effectiveFeatures?.max_invoices}</span>
                </div>
                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                  <div 
                    className="h-full rounded-full bg-indigo-500" 
                    style={{ width: effectiveFeatures?.max_invoices === -1 ? "10%" : `${Math.min((stats.totalInvoices / (effectiveFeatures?.max_invoices || 1)) * 100, 100)}%` }}
                  />
                </div>
              </div>

              {/* Clients */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-medium text-slate-400">
                  <span>Client records limits</span>
                  <span className="text-white font-semibold">{stats.totalClients} / {effectiveFeatures?.max_clients === -1 ? "Unlimited" : effectiveFeatures?.max_clients}</span>
                </div>
                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                  <div 
                    className="h-full rounded-full bg-emerald-500" 
                    style={{ width: effectiveFeatures?.max_clients === -1 ? "10%" : `${Math.min((stats.totalClients / (effectiveFeatures?.max_clients || 1)) * 100, 100)}%` }}
                  />
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  )
}
