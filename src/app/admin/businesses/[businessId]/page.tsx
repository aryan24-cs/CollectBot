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
  Info,
  Sliders,
  Calendar,
  Layers,
  Activity,
  Check
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { useParams } from "next/navigation"
import { formatCurrency, formatDate, cn } from "@/lib/utils"

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
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-ink-secondary">
        <Loader2 className="w-9 h-9 text-[#E91E63] animate-spin mb-4" />
        <p className="text-xs font-semibold">Retrieving database state and overrides...</p>
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

  // Calculate usage percentages
  const maxInvs = effectiveFeatures?.max_invoices || 1
  const invsPct = maxInvs === -1 ? 10 : Math.min((stats.totalInvoices / maxInvs) * 100, 100)
  
  const maxClis = effectiveFeatures?.max_clients || 1
  const clisPct = maxClis === -1 ? 10 : Math.min((stats.totalClients / maxClis) * 100, 100)

  return (
    <div className="space-y-6 text-ink-primary select-none max-w-6xl mx-auto pb-10">
      {/* Back & Title */}
      <div className="flex flex-col gap-2">
        <Link href="/admin/businesses" className="text-ink-secondary hover:text-[#0A0A0A] flex items-center gap-1 text-xs font-bold transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to registry directory
        </Link>
        <div className="flex justify-between items-start border-b border-[#EEE9E4] pb-4 mt-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0A0A0A] font-display">{biz.name}</h1>
            <p className="text-xs text-ink-secondary mt-1">ID: <span className="font-mono">{biz.id}</span> • Registered: {formatDate(biz.created_at)}</p>
          </div>
          <span className={cn(
            "px-3 py-1 rounded-pill text-[10px] font-bold uppercase tracking-wider border shadow-sm transition-all",
            isBlocked 
              ? "bg-[#FFEBEE] text-[#C62828] border-[#EF9A9A]/30" 
              : "bg-[#E8F5E9] text-[#2E7D32] border-[#A5D6A7]/30"
          )}>
            {isBlocked ? "Suspended" : "Active workspace"}
          </span>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-[#EEE9E4] gap-6">
        {[
          { id: "overview", label: "Overview details" },
          { id: "features", label: "Access & Overrides" },
          { id: "subscription", label: "Subscription plan" },
          { id: "usage", label: "Usage stats" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "pb-3 text-xs font-bold transition-all relative cursor-pointer",
              activeTab === tab.id ? "text-[#E91E63]" : "text-ink-secondary hover:text-[#0A0A0A]"
            )}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E91E63] rounded-full" />
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
              <div className="bg-white border border-[#EEE9E4] rounded-card p-6 shadow-card space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-cream-100/40 to-transparent rounded-bl-full pointer-events-none" />
                <h3 className="text-sm font-bold text-[#0A0A0A] tracking-tight border-b border-[#EEE9E4] pb-3">Owner Contact details</h3>
                <div className="grid grid-cols-2 gap-4 text-xs relative z-10">
                  <div>
                    <span className="text-[10px] text-ink-secondary font-bold block uppercase">Owner Name</span>
                    <p className="text-[#0A0A0A] mt-0.5 font-bold">{biz.name}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-ink-secondary font-bold block uppercase">Email Address</span>
                    <p className="text-[#0A0A0A] mt-0.5 font-bold">{biz.email || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-ink-secondary font-bold block uppercase">Telephone</span>
                    <p className="text-[#0A0A0A] mt-0.5 font-bold">{biz.phone || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-ink-secondary font-bold block uppercase">Location</span>
                    <p className="text-[#0A0A0A] mt-0.5 font-bold">{biz.city || "N/A"}, {biz.state || "N/A"}</p>
                  </div>
                </div>
              </div>

              {/* Operations Stats */}
              <div className="bg-white border border-[#EEE9E4] rounded-card p-6 shadow-card space-y-4">
                <h3 className="text-sm font-bold text-[#0A0A0A] tracking-tight border-b border-[#EEE9E4] pb-3">Operational Stats</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-cream-50 p-4 rounded-card border border-[#EEE9E4]/65 shadow-soft hover:shadow-floating transition-all duration-300">
                    <span className="text-[10px] text-ink-secondary font-bold block uppercase">Invoices Created</span>
                    <p className="text-xl font-extrabold text-[#0A0A0A] mt-1">{stats.totalInvoices}</p>
                  </div>
                  <div className="bg-cream-50 p-4 rounded-card border border-[#EEE9E4]/65 shadow-soft hover:shadow-floating transition-all duration-300">
                    <span className="text-[10px] text-ink-secondary font-bold block uppercase">Active Clients</span>
                    <p className="text-xl font-extrabold text-[#0A0A0A] mt-1">{stats.totalClients}</p>
                  </div>
                  <div className="bg-cream-50 p-4 rounded-card border border-[#EEE9E4]/65 shadow-soft hover:shadow-floating transition-all duration-300">
                    <span className="text-[10px] text-ink-secondary font-bold block uppercase">Collected Volume</span>
                    <p className="text-xl font-extrabold text-[#0A0A0A] mt-1">{formatCurrency(stats.totalRevenue)}</p>
                  </div>
                </div>
              </div>

            </div>

            {/* Private notes */}
            <div className="md:col-span-4 space-y-6">
              <div className="bg-white border border-[#EEE9E4] rounded-card p-6 shadow-card space-y-4">
                <h3 className="text-sm font-bold text-[#0A0A0A] tracking-tight border-b border-[#EEE9E4] pb-3">Private Admin Notes</h3>
                <p className="text-[10px] text-ink-secondary">Notes entered here are restricted to admin access only and not visible to the client.</p>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Record onboarding logs, compliance statuses, custom requests..."
                  rows={6}
                  className="w-full bg-cream-50 border border-[#EEE9E4] rounded-card p-3 text-xs font-semibold text-ink-primary placeholder:text-ink-secondary/50 focus:outline-none focus:ring-1 focus:ring-[#E91E63]/25 transition-all resize-none"
                />
                <button
                  onClick={saveNotes}
                  disabled={notesSaving}
                  className="w-full bg-[#E91E63] hover:bg-[#D81B60] text-white rounded-pill py-2.5 text-xs font-bold shadow-soft transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 border-none cursor-pointer"
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
              
              <div className="bg-white border border-[#EEE9E4] rounded-card p-6 shadow-card space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#EEE9E4] pb-3.5 gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-[#0A0A0A] tracking-tight">Access Gate Overrides</h3>
                    <p className="text-[10px] text-ink-secondary mt-0.5">Force enable/disable specific SaaS module gates.</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={resetOverrides}
                      className="px-3.5 py-1.5 border border-[#EEE9E4] hover:bg-cream-50 text-[10px] font-bold text-ink-secondary hover:text-[#0A0A0A] rounded-pill transition-all cursor-pointer bg-white"
                    >
                      Reset Defaults
                    </button>
                    <button
                      onClick={saveOverrides}
                      disabled={featuresSaving}
                      className="px-4 py-1.5 bg-[#E91E63] hover:bg-[#D81B60] text-white rounded-pill text-[10px] font-bold shadow-soft hover:shadow-floating transition-all flex items-center gap-1.5 border-none cursor-pointer"
                    >
                      <Save className="w-3 h-3" />
                      Save overrides
                    </button>
                  </div>
                </div>

                {/* Features segmented toggles list */}
                <div className="space-y-3 pt-1">
                  {featuresList.map((feat) => {
                    const overrideKey = `override_${feat.key}`
                    const overrideVal = overrides[overrideKey]
                    const effectiveVal = effectiveFeatures?.[feat.key] ?? false

                    return (
                      <div key={feat.key} className="flex flex-col sm:flex-row sm:items-center justify-between bg-[#FAF8F5] border border-[#EEE9E4]/40 rounded-card p-4 hover:border-[#EEE9E4]/80 transition-all gap-4">
                        <div className="space-y-0.5 min-w-0">
                          <p className="text-xs font-bold text-[#0A0A0A] flex items-center gap-1.5 flex-wrap">
                            {feat.label}
                            {overrideVal !== null && overrideVal !== undefined && (
                              <span className="text-[8px] font-bold uppercase tracking-wider bg-[#FFF8E1] text-[#F57F17] border border-[#FFC107]/20 px-2 py-0.5 rounded-pill shrink-0">
                                Overridden
                              </span>
                            )}
                          </p>
                          <span className="text-[10px] text-ink-secondary block max-w-md truncate sm:whitespace-normal">{feat.desc}</span>
                        </div>

                        {/* Segmented Selector pills */}
                        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                          {/* Live Indicator of effective status */}
                          <span className={cn(
                            "inline-block w-2.5 h-2.5 rounded-full shadow-soft",
                            effectiveVal ? "bg-[#4CAF50]" : "bg-[#F44336]"
                          )} />

                          <div className="inline-flex rounded-pill p-0.5 bg-cream-100 border border-[#EEE9E4]/60">
                            {[
                              { val: "default", label: "Default" },
                              { val: "on", label: "Enable" },
                              { val: "off", label: "Disable" }
                            ].map((opt) => {
                              const isSelected = 
                                opt.val === "default" && (overrideVal === null || overrideVal === undefined) ||
                                opt.val === "on" && overrideVal === true ||
                                opt.val === "off" && overrideVal === false

                              return (
                                <button
                                  type="button"
                                  key={opt.val}
                                  onClick={() => {
                                    if (opt.val === "on") setOverrideVal(feat.key, true)
                                    else if (opt.val === "off") setOverrideVal(feat.key, false)
                                    else setOverrideVal(feat.key, null)
                                  }}
                                  className={cn(
                                    "px-2.5 py-1 text-[9px] font-bold rounded-pill transition-all cursor-pointer border border-transparent",
                                    isSelected 
                                      ? "bg-white text-ink-primary shadow-soft border-[#EEE9E4]" 
                                      : "text-ink-secondary hover:text-ink-primary bg-transparent"
                                  )}
                                >
                                  {opt.label}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>

            {/* Special flags */}
            <div className="lg:col-span-4 space-y-6">
              
              <div className="bg-white border border-[#EEE9E4] rounded-card p-6 shadow-card space-y-4">
                <h3 className="text-sm font-bold text-[#0A0A0A] tracking-tight border-b border-[#EEE9E4] pb-3 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                  Operational Flags
                </h3>
                
                <div className="space-y-5 pt-1">
                  
                  {/* Full Access - Styled Slide Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <span className="text-xs font-bold text-[#0A0A0A] block">Full Access Override</span>
                      <p className="text-[9px] text-ink-secondary leading-normal">Unlocks all limits & features completely.</p>
                    </div>
                    
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input 
                        type="checkbox" 
                        checked={isFullAccess}
                        onChange={(e) => setIsFullAccess(e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-9 h-5 bg-cream-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#EEE9E4] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#E91E63]" />
                    </label>
                  </div>

                  {/* Block Business - Styled Slide Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <span className="text-xs font-bold text-[#0A0A0A] block">Suspend Workspace</span>
                      <p className="text-[9px] text-ink-secondary leading-normal">Block logins and restrict billing logs.</p>
                    </div>
                    
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input 
                        type="checkbox" 
                        checked={isBlocked}
                        onChange={(e) => setIsBlocked(e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-9 h-5 bg-cream-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#EEE9E4] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#F44336]" />
                    </label>
                  </div>

                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 3: SUBSCRIPTION */}
        {activeTab === "subscription" && (
          <div className="max-w-2xl bg-white border border-[#EEE9E4] rounded-card p-6 shadow-card space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-cream-100/40 to-transparent rounded-bl-full pointer-events-none" />
            <h3 className="text-sm font-bold text-[#0A0A0A] tracking-tight border-b border-[#EEE9E4] pb-3">Manage Plan & Trial terms</h3>

            <div className="space-y-4 relative z-10">
              
              {/* Select Plan */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-ink-secondary uppercase font-bold block">Assigned Tier</label>
                <select
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value)}
                  className="w-full bg-cream-50 border border-[#EEE9E4] rounded-pill px-4 py-2.5 text-xs font-bold text-ink-primary focus:outline-none cursor-pointer"
                >
                  <option value="free">Free Tier</option>
                  <option value="solo">Solo Tier</option>
                  <option value="business">Business Tier</option>
                  <option value="scale">Scale Tier</option>
                </select>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-ink-secondary uppercase font-bold block">Status</label>
                <select
                  value={subStatus}
                  onChange={(e) => setSubStatus(e.target.value)}
                  className="w-full bg-cream-50 border border-[#EEE9E4] rounded-pill px-4 py-2.5 text-xs font-bold text-ink-primary focus:outline-none cursor-pointer"
                >
                  <option value="trialing">Trialing</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="expired">Expired</option>
                </select>
              </div>

              {/* Trial Ends Date */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-ink-secondary uppercase font-bold block">Trial Expiration Date</label>
                <input
                  type="date"
                  value={trialEndsAt}
                  onChange={(e) => setTrialEndsAt(e.target.value)}
                  className="w-full bg-cream-50 border border-[#EEE9E4] rounded-pill px-4 py-2.5 text-xs font-semibold text-ink-primary focus:outline-none"
                />
              </div>

              {/* Save */}
              <button
                onClick={saveSubscription}
                disabled={subSaving}
                className="w-full bg-[#E91E63] hover:bg-[#D81B60] text-white rounded-pill py-2.5 text-xs font-bold shadow-soft hover:shadow-floating transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 border-none cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                {subSaving ? "Updating..." : "Apply Plan modifications"}
              </button>

            </div>
          </div>
        )}

        {/* TAB 4: USAGE LIMITS */}
        {activeTab === "usage" && (
          <div className="max-w-xl bg-white border border-[#EEE9E4] rounded-card p-6 shadow-card space-y-6">
            <h3 className="text-sm font-bold text-[#0A0A0A] tracking-tight border-b border-[#EEE9E4] pb-3">Monthly Usage allocations</h3>

            <div className="space-y-5 pt-1">
              
              {/* Invoices */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-semibold text-ink-secondary">
                  <span>Invoice creation limits</span>
                  <span className="text-[#0A0A0A] font-bold">{stats.totalInvoices} / {effectiveFeatures?.max_invoices === -1 ? "Unlimited" : effectiveFeatures?.max_invoices}</span>
                </div>
                <div className="w-full bg-cream-100 h-2 rounded-full overflow-hidden border border-[#EEE9E4]/60">
                  <div 
                    className="h-full rounded-full bg-[#E91E63]" 
                    style={{ width: `${invsPct}%` }}
                  />
                </div>
              </div>

              {/* Clients */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-semibold text-ink-secondary">
                  <span>Client records limits</span>
                  <span className="text-[#0A0A0A] font-bold">{stats.totalClients} / {effectiveFeatures?.max_clients === -1 ? "Unlimited" : effectiveFeatures?.max_clients}</span>
                </div>
                <div className="w-full bg-cream-100 h-2 rounded-full overflow-hidden border border-[#EEE9E4]/60">
                  <div 
                    className="h-full rounded-full bg-[#4CAF50]" 
                    style={{ width: `${clisPct}%` }}
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
