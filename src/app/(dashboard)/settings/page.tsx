"use client"

import * as React from "react"
import { 
  Building2, 
  FileText, 
  CreditCard, 
  Bell, 
  Users, 
  ShieldCheck, 
  Save, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  Upload, 
  Sparkles, 
  Loader2, 
  AlertTriangle,
  Play,
  Pause,
  Clock,
  Mail,
  MessageSquare,
  CheckCircle2,
  Lock
} from "lucide-react"
import { toast } from "sonner"
import { formatCurrency, formatDate, cn } from "@/lib/utils"

interface BusinessProfile {
  id: string
  name: string
  logo_url: string | null
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  pincode: string | null
  gstin: string | null
  pan: string | null
  bank_name: string | null
  account_number: string | null
  ifsc_code: string | null
  upi_id: string | null
  currency: string
  timezone: string
  whatsapp_number: string | null
  invoice_prefix: string
  invoice_counter: number
  default_payment_terms: number
  default_tax_rate: number
  default_notes: string | null
  default_terms: string | null
  invoice_template: string
  primary_color: string
  font_family: string
}

interface NotificationSettings {
  reminder_7_before: boolean
  reminder_3_before: boolean
  reminder_1_before: boolean
  reminder_due_day: boolean
  reminder_1_after: boolean
  reminder_3_after: boolean
  reminder_7_after: boolean
  reminder_14_after: boolean
  channel_whatsapp: boolean
  channel_email: boolean
  quiet_hours_start: string
  quiet_hours_end: string
  owner_payment_alert: boolean
  owner_daily_summary: boolean
}

interface TeamMember {
  id: string
  email: string
  role: "owner" | "manager" | "viewer"
  status: "pending" | "active"
  invited_at: string
}

interface SubscriptionDetails {
  plan: "free" | "solo" | "business" | "scale"
  billing_cycle: "monthly" | "yearly"
  status: "active" | "cancelled" | "expired" | "trial"
  current_period_end: string
}

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", 
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", 
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", 
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", 
  "Uttarakhand", "West Bengal", "Delhi", "Chandigarh", "Jammu & Kashmir", "Ladakh"
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = React.useState<"profile" | "invoice" | "payment" | "notifications" | "team">("profile")
  
  // Data States
  const [business, setBusiness] = React.useState<BusinessProfile | null>(null)
  const [notifications, setNotifications] = React.useState<NotificationSettings | null>(null)
  const [team, setTeam] = React.useState<TeamMember[]>([])
  const [subscription, setSubscription] = React.useState<SubscriptionDetails | null>(null)
  
  // UI states
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const [isUploadingLogo, setIsUploadingLogo] = React.useState(false)
  const [showAccountNumber, setShowAccountNumber] = React.useState(false)
  
  // Notifications tab states
  const [activePreview, setActivePreview] = React.useState<"sent" | "friendly" | "nudge" | "due" | "overdue" | "final" | "thanks">("sent")

  // Invite states
  const [inviteEmail, setInviteEmail] = React.useState("")
  const [inviteRole, setInviteRole] = React.useState<"manager" | "viewer">("viewer")

  React.useEffect(() => {
    async function loadAllSettings() {
      try {
        setIsLoading(true)
        const [bizRes, notifRes, teamRes, subRes] = await Promise.all([
          fetch("/api/settings/business"),
          fetch("/api/settings"),
          fetch("/api/settings/team"),
          // Fetch subscription mock or actual status
          fetch("/api/settings/business").then(async (r) => {
            const biz = await r.json()
            // We retrieve subscription or return fallback
            const res = await fetch(`/api/settings`) // Fetch subscription
            return {
              plan: "free",
              billing_cycle: "monthly",
              status: "active",
              current_period_end: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString()
            } as SubscriptionDetails
          })
        ])

        if (!bizRes.ok || !notifRes.ok) throw new Error("Could not retrieve some configurations.")

        const bizData = await bizRes.json()
        const notifData = await notifRes.json()
        
        let teamData: TeamMember[] = []
        if (teamRes.ok) {
          try {
            const resBody = await teamRes.json()
            if (Array.isArray(resBody)) {
              teamData = resBody
            }
          } catch (e) {
            console.error("Error parsing team data:", e)
          }
        }

        setBusiness(bizData)
        setNotifications({
          ...notifData,
          quiet_hours_start: notifData.quiet_hours_start?.slice(0, 5) || "09:00",
          quiet_hours_end: notifData.quiet_hours_end?.slice(0, 5) || "20:00",
        })
        setTeam(teamData)
        setSubscription({
          plan: "free",
          billing_cycle: "monthly",
          status: "active",
          current_period_end: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString()
        })
      } catch (err: any) {
        toast.error(err.message || "Failed to load preferences.")
      } finally {
        setIsLoading(false)
      }
    }
    loadAllSettings()
  }, [])

  // Save profile and defaults (Tabs 1, 2, 3)
  const saveBusinessProfile = async () => {
    if (!business) return
    setIsSaving(true)
    const toastId = toast.loading("Updating configurations...")
    try {
      const res = await fetch("/api/settings/business", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(business),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Profile update failed")
      
      setBusiness(data)
      toast.success("Settings saved successfully!")
    } catch (err: any) {
      toast.error(err.message || "Could not save settings.")
    } finally {
      toast.dismiss(toastId)
      setIsSaving(false)
    }
  }

  // Save notifications (Tab 4)
  const saveNotifications = async () => {
    if (!notifications) return
    setIsSaving(true)
    const toastId = toast.loading("Saving notification preferences...")
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notifications),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Notifications update failed")
      
      setNotifications({
        ...data,
        quiet_hours_start: data.quiet_hours_start?.slice(0, 5) || "09:00",
        quiet_hours_end: data.quiet_hours_end?.slice(0, 5) || "20:00",
      })
      toast.success("Notification preferences updated successfully!")
    } catch (err: any) {
      toast.error(err.message || "Failed to save preferences.")
    } finally {
      toast.dismiss(toastId)
      setIsSaving(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append("file", file)

    setIsUploadingLogo(true)
    const toastId = toast.loading("Uploading business logo...")

    try {
      const res = await fetch("/api/settings/logo", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Logo upload failed")

      setBusiness(prev => prev ? { ...prev, logo_url: data.logoUrl } : null)
      toast.success("Logo uploaded successfully! Preview updated.")
    } catch (err: any) {
      toast.error(err.message || "Failed to upload logo.")
    } finally {
      toast.dismiss(toastId)
      setIsUploadingLogo(false)
    }
  }

  // Invite Team Member
  const handleInviteTeamMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail) return
    setIsSaving(true)
    const toastId = toast.loading(`Inviting ${inviteEmail}...`)
    try {
      const res = await fetch("/api/settings/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to send invitation.")

      toast.success("Team invitation sent successfully!")
      setTeam(prev => [data, ...prev])
      setInviteEmail("")
    } catch (err: any) {
      toast.error(err.message || "Failed to invite member.")
    } finally {
      toast.dismiss(toastId)
      setIsSaving(false)
    }
  }

  // Remove Team Member
  const handleRemoveTeamMember = async (id: string, email: string) => {
    if (!confirm(`Are you sure you want to remove ${email} from the team?`)) return
    const toastId = toast.loading("Removing team member...")
    try {
      const res = await fetch(`/api/settings/team?id=${id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to remove member")
      }
      toast.success("Team member removed successfully.")
      setTeam(prev => prev.filter(m => m.id !== id))
    } catch (err: any) {
      toast.error(err.message || "Failed to remove member.")
    } finally {
      toast.dismiss(toastId)
    }
  }

  // Previews mapping for Tab 4
  const previews = {
    sent: {
      wa: "Hi Client,\n\nYou have a new invoice from My Business.\n\n📄 Invoice: INV-001\n💰 Amount: ₹10,000\n📅 Due Date: 2026-07-20\n\nPay securely here:\nhttps://collectbot.in/pay/inv_id\n\nThank you!",
      emailSubject: "Invoice INV-001 from My Business — ₹10,000 due 2026-07-20",
    },
    friendly: {
      wa: "Hi Client,\n\nFriendly reminder that your payment of ₹10,000 to My Business is due on 2026-07-20.\n\nPay here: https://collectbot.in/pay/inv_id\n\nThank you! 🙏",
      emailSubject: "Friendly reminder: Invoice INV-001 due 2026-07-20",
    },
    nudge: {
      wa: "Hi Client,\n\nYour payment of ₹10,000 to My Business is due TOMORROW (2026-07-20).\n\nPlease complete payment to avoid any issues.\n\nPay now: https://collectbot.in/pay/inv_id",
      emailSubject: "Payment due tomorrow: ₹10,000 — INV-001",
    },
    due: {
      wa: "Hi Client,\n\nYour payment of ₹10,000 to My Business is DUE TODAY.\n\nPlease make the payment at your earliest convenience.\n\nPay now: https://collectbot.in/pay/inv_id",
      emailSubject: "Today is the last day: Invoice INV-001",
    },
    overdue: {
      wa: "Hi Client,\n\nYour payment of ₹10,000 to My Business is now 3 days overdue.\n\nPlease clear the payment immediately to avoid service disruption.\n\nPay now: https://collectbot.in/pay/inv_id",
      emailSubject: "Invoice INV-001 is 3 days overdue",
    },
    final: {
      wa: "Hi Client,\n\nIMPORTANT: Your payment of ₹10,000 to My Business is significantly overdue.\n\nPlease pay immediately or contact us to discuss arrangements.\n\nPay now: https://collectbot.in/pay/inv_id\n\nNon-payment may result in work being paused.",
      emailSubject: "URGENT: Invoice INV-001 requires immediate payment",
    },
    thanks: {
      wa: "Hi Client,\n\n✅ Payment Confirmed!\n\nAmount: ₹10,000\nBusiness: My Business\nInvoice: INV-001\nDate: 2026-07-09\n\nYour receipt has been sent to your email.\n\nThank you for your business! 🙏",
      emailSubject: "Payment confirmed: ₹10,000 received for INV-001",
    },
  }

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-slate-850 animate-pulse">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
        <p className="text-slate-500 text-sm">Loading your settings dashboard...</p>
      </div>
    )
  }

  if (!business || !notifications) return null

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10 select-none text-slate-800">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">System Settings</h1>
          <p className="text-slate-500 text-xs mt-1">Manage business metadata, custom invoice layouts, payments settings, and system billing.</p>
        </div>
        {activeTab !== "notifications" && activeTab !== "team" && (
          <button
            onClick={saveBusinessProfile}
            disabled={isSaving}
            className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
          >
            <Save className="w-4 h-4" />
            Save tab changes
          </button>
        )}
        {activeTab === "notifications" && (
          <button
            onClick={saveNotifications}
            disabled={isSaving}
            className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
          >
            <Save className="w-4 h-4" />
            Save Alerts
          </button>
        )}
      </div>

      {/* Tabs Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-3 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-1">
          {[
            { id: "profile", label: "Business Profile", icon: Building2 },
            { id: "invoice", label: "Invoice Settings", icon: FileText },
            { id: "payment", label: "Payment Settings", icon: CreditCard },
            { id: "notifications", label: "Notifications", icon: Bell },
            { id: "team", label: "Team Members", icon: Users },
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer",
                  activeTab === tab.id
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Dynamic Panels */}
        <div className="lg:col-span-9 space-y-6">

          {/* TAB 1: BUSINESS PROFILE */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-4">
                <h3 className="text-sm font-bold border-b border-slate-100 pb-3 text-slate-900">Basic Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Business Name</label>
                    <input
                      type="text"
                      value={business.name}
                      onChange={(e) => setBusiness({ ...business, name: e.target.value })}
                      className="w-full bg-white border border-slate-205 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-slate-350"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Business Email</label>
                    <input
                      type="email"
                      value={business.email || ""}
                      onChange={(e) => setBusiness({ ...business, email: e.target.value })}
                      className="w-full bg-white border border-slate-205 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-slate-350"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Business Phone</label>
                    <input
                      type="text"
                      value={business.phone || ""}
                      onChange={(e) => setBusiness({ ...business, phone: e.target.value })}
                      className="w-full bg-white border border-slate-205 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-slate-350"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-500">WhatsApp Dispatch Phone</label>
                    <input
                      type="text"
                      placeholder="e.g. +91XXXXXXXXXX"
                      value={business.whatsapp_number || ""}
                      onChange={(e) => setBusiness({ ...business, whatsapp_number: e.target.value })}
                      className="w-full bg-white border border-slate-205 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-slate-350"
                    />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-4">
                <h3 className="text-sm font-bold border-b border-slate-100 pb-3 text-slate-900">Address details</h3>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Full Address</label>
                    <input
                      type="text"
                      value={business.address || ""}
                      onChange={(e) => setBusiness({ ...business, address: e.target.value })}
                      className="w-full bg-white border border-slate-205 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-slate-350"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-slate-500">City</label>
                      <input
                        type="text"
                        value={business.city || ""}
                        onChange={(e) => setBusiness({ ...business, city: e.target.value })}
                        className="w-full bg-white border border-slate-205 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-slate-350"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-slate-500">State</label>
                      <select
                        value={business.state || ""}
                        onChange={(e) => setBusiness({ ...business, state: e.target.value })}
                        className="w-full bg-white border border-slate-205 rounded-xl h-9 px-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-slate-350"
                      >
                        <option value="">Select State</option>
                        {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-slate-500">Pincode</label>
                      <input
                        type="text"
                        value={business.pincode || ""}
                        onChange={(e) => setBusiness({ ...business, pincode: e.target.value })}
                        className="w-full bg-white border border-slate-205 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-slate-350"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Legal info & GSTIN */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-4">
                <h3 className="text-sm font-bold border-b border-slate-100 pb-3 text-slate-900">Legal & Tax info</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-500">GSTIN (15 characters)</label>
                    <input
                      type="text"
                      maxLength={15}
                      placeholder="e.g. 27AAAAA1111A1Z1"
                      value={business.gstin || ""}
                      onChange={(e) => setBusiness({ ...business, gstin: e.target.value })}
                      className="w-full bg-white border border-slate-205 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-slate-350 font-mono"
                    />
                    {business.gstin && business.gstin.length !== 15 && (
                      <span className="text-[10px] text-rose-600 block font-semibold">Must be exactly 15 characters.</span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-500">PAN Number</label>
                    <input
                      type="text"
                      placeholder="e.g. ABCDE1234F"
                      value={business.pan || ""}
                      onChange={(e) => setBusiness({ ...business, pan: e.target.value })}
                      className="w-full bg-white border border-slate-205 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-slate-350 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Business logo upload */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-4">
                <h3 className="text-sm font-bold border-b border-slate-100 pb-3 text-slate-900">Invoice Logo</h3>
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="w-24 h-24 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center overflow-hidden">
                    {business.logo_url ? (
                      <img src={business.logo_url} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <Building2 className="w-8 h-8 text-slate-400" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <span className="text-xs font-bold block text-slate-700">Upload business logo</span>
                    <span className="text-[10px] text-slate-450 block">PNG, JPG, SVG allowed. Maximum size: 2MB.</span>
                    <label className="inline-flex items-center gap-1.5 bg-slate-150 hover:bg-slate-200 text-slate-750 text-xs font-bold px-3.5 py-1.5 rounded-xl cursor-pointer transition-all border border-slate-200 shadow-sm">
                      <Upload className="w-3.5 h-3.5 text-slate-600" />
                      Upload File
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/svg+xml"
                        className="hidden"
                        onChange={handleLogoUpload}
                        disabled={isUploadingLogo}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INVOICE SETTINGS */}
          {activeTab === "invoice" && (
            <div className="space-y-6">
              {/* Numbering Prefix */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-4">
                <h3 className="text-sm font-bold border-b border-slate-100 pb-3 text-slate-900">Invoice Numbering</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Invoice Prefix (Max 5 chars)</label>
                    <input
                      type="text"
                      maxLength={5}
                      value={business.invoice_prefix}
                      onChange={(e) => setBusiness({ ...business, invoice_prefix: e.target.value })}
                      className="w-full bg-white border border-slate-205 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-slate-350 font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Next Invoice Serial Number</label>
                    <input
                      type="number"
                      value={business.invoice_counter}
                      onChange={(e) => setBusiness({ ...business, invoice_counter: Number(e.target.value) })}
                      className="w-full bg-white border border-slate-205 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-slate-350 font-mono"
                    />
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-col justify-center text-center">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Preview Serial</span>
                    <span className="text-xs font-mono font-bold text-indigo-700 mt-1">
                      {business.invoice_prefix}-{new Date().getFullYear()}-{String(business.invoice_counter).padStart(3, "0")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Invoice Layout & Styling */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-5">
                <h3 className="text-sm font-bold border-b border-slate-100 pb-3 text-slate-900">Invoice Layout & Customization</h3>
                
                <div className="space-y-4">
                  {/* Select template design */}
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-slate-500 block">Template Design</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { id: "modern", title: "Modern Design", desc: "Clean blue accent header and shaded totals." },
                        { id: "classic", title: "Classic Traditional", desc: "Traditional dark header outline table borders." },
                        { id: "minimal", title: "Minimalist Clean", desc: "Zero background grids with spacing styles." },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setBusiness({ ...business, invoice_template: t.id })}
                          className={cn(
                            "p-3 rounded-xl border text-left space-y-1.5 transition-all bg-slate-50/50 cursor-pointer",
                            business.invoice_template === t.id
                              ? "border-indigo-600 ring-2 ring-indigo-50 bg-indigo-50/30 text-indigo-900"
                              : "border-slate-200 hover:border-slate-350 hover:bg-slate-50"
                          )}
                        >
                          <span className="text-xs font-bold block">{t.title}</span>
                          <span className="text-[10px] text-slate-500 leading-normal block font-medium">{t.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Preset Colors */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-slate-500 block">Primary Accent Color</label>
                      <div className="flex gap-2.5">
                        {[
                          { id: "blue", hex: "bg-blue-600" },
                          { id: "green", hex: "bg-emerald-600" },
                          { id: "purple", hex: "bg-indigo-600" },
                          { id: "orange", hex: "bg-amber-600" },
                          { id: "black", hex: "bg-slate-900 border border-slate-700" },
                        ].map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setBusiness({ ...business, primary_color: c.id })}
                            className={cn(
                              "w-6 h-6 rounded-full transition-all flex items-center justify-center cursor-pointer",
                              c.hex,
                              business.primary_color === c.id ? "ring-2 ring-indigo-600 ring-offset-2 ring-offset-white" : "hover:scale-110"
                            )}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Font Type */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-slate-500 block">Font Family</label>
                      <div className="flex gap-2">
                        {["Inter", "Roboto"].map((f) => (
                          <button
                            key={f}
                            type="button"
                            onClick={() => setBusiness({ ...business, font_family: f })}
                            className={cn(
                              "px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer",
                              business.font_family === f
                                ? "border-indigo-600 bg-indigo-50 text-indigo-700 font-bold"
                                : "border-slate-205 text-slate-500 hover:border-slate-350"
                            )}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Default Terms, Terms & Conditions textareas */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-4">
                <h3 className="text-sm font-bold border-b border-slate-100 pb-3 text-slate-900">Default Note templates</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Default Notes (every invoice)</label>
                    <textarea
                      rows={4}
                      value={business.default_notes || ""}
                      onChange={(e) => setBusiness({ ...business, default_notes: e.target.value })}
                      placeholder="e.g. Thanks for your business!"
                      className="w-full bg-white border border-slate-205 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-slate-350"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Default Terms (invoice bottom)</label>
                    <textarea
                      rows={4}
                      value={business.default_terms || ""}
                      onChange={(e) => setBusiness({ ...business, default_terms: e.target.value })}
                      placeholder="e.g. Late fee interest rate: 18% per annum."
                      className="w-full bg-white border border-slate-205 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-slate-350"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PAYMENT SETTINGS */}
          {activeTab === "payment" && (
            <div className="space-y-6">
              {/* UPI */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-4">
                <h3 className="text-sm font-bold border-b border-slate-100 pb-3 text-slate-900">UPI ID (Instants in India)</h3>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-500">UPI ID</label>
                    <input
                      type="text"
                      placeholder="e.g. business@ybl, name@okhdfcbank"
                      value={business.upi_id || ""}
                      onChange={(e) => setBusiness({ ...business, upi_id: e.target.value })}
                      className="w-full bg-white border border-slate-205 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-slate-350 font-mono"
                    />
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center justify-between gap-4">
                    <span className="text-[10px] text-slate-500 font-bold">Auto-compatible Apps:</span>
                    <span className="text-xs font-bold text-indigo-700">BHIM, Google Pay, PhonePe, Paytm</span>
                  </div>
                </div>
              </div>

              {/* Bank Transfer Details */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-4">
                <h3 className="text-sm font-bold border-b border-slate-100 pb-3 text-slate-900">Direct Bank Transfer</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Bank Name</label>
                    <input
                      type="text"
                      value={business.bank_name || ""}
                      onChange={(e) => setBusiness({ ...business, bank_name: e.target.value })}
                      className="w-full bg-white border border-slate-205 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-slate-350"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-500">IFSC Code</label>
                    <input
                      type="text"
                      value={business.ifsc_code || ""}
                      onChange={(e) => setBusiness({ ...business, ifsc_code: e.target.value })}
                      className="w-full bg-white border border-slate-205 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-slate-350 font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center justify-between">
                      <span>Account Number</span>
                      <button
                        type="button"
                        onClick={() => setShowAccountNumber(!showAccountNumber)}
                        className="text-[9px] text-indigo-600 hover:text-indigo-800 border-0 bg-transparent font-bold capitalize flex items-center gap-0.5 cursor-pointer"
                      >
                        {showAccountNumber ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        {showAccountNumber ? "Hide" : "Show"}
                      </button>
                    </label>
                    <input
                      type={showAccountNumber ? "text" : "password"}
                      value={business.account_number || ""}
                      onChange={(e) => setBusiness({ ...business, account_number: e.target.value })}
                      className="w-full bg-white border border-slate-205 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-slate-350 font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Currency</label>
                    <select
                      value={business.currency}
                      onChange={(e) => setBusiness({ ...business, currency: e.target.value })}
                      className="w-full bg-white border border-slate-205 rounded-xl h-9 px-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-slate-350"
                    >
                      <option value="INR">INR (₹)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Razorpay Setup */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-4">
                <h3 className="text-sm font-bold border-b border-slate-100 pb-3 flex items-center justify-between text-slate-900">
                  <span>Razorpay Integration Gateway</span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-xl border bg-emerald-50 text-emerald-700 border-emerald-250">
                    Connected
                  </span>
                </h3>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-center space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Credential Key ID (Active)</span>
                  <span className="text-xs font-mono font-bold text-slate-700">rzp_test_...XXXX</span>
                  <span className="text-[9px] text-slate-450 mt-2 block font-medium">To reconnect or change credentials, check your `.env.local` config files.</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: NOTIFICATIONS */}
          {activeTab === "notifications" && (
            <div className="space-y-6">
              {/* Channels Selection */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-4 text-slate-800">
                <h3 className="text-sm font-bold flex items-center gap-2 border-b border-slate-100 pb-3 text-slate-900">
                  <MessageSquare className="w-4 h-4 text-indigo-650" />
                  Notification Channels
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="flex items-center justify-between p-3 bg-slate-50/80 rounded-xl border border-slate-200">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold block text-slate-400 line-through">WhatsApp Notifications</span>
                      <span className="text-[10px] text-amber-700 font-bold flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> Deactivated (Email Only Mode)
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-not-allowed opacity-50">
                      <input
                        type="checkbox"
                        checked={false}
                        disabled
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 border border-slate-300 peer-focus:outline-none rounded-full peer after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50/80 rounded-xl border border-slate-200">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold block text-slate-700">Email Notifications</span>
                      <span className="text-[10px] text-slate-500 font-medium">Send custom designs via Resend</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifications.channel_email}
                        onChange={() => setNotifications({ ...notifications, channel_email: !notifications.channel_email })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 border border-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Schedule Configuration */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-4 text-slate-800">
                <h3 className="text-sm font-bold flex items-center gap-2 border-b border-slate-100 pb-3 text-slate-900">
                  <Bell className="w-4 h-4 text-indigo-650" />
                  Automated Reminders Schedule
                </h3>
                <div className="space-y-3 pt-1">
                  {[
                    { key: "reminder_7_before", label: "7 Days Before Due Date", desc: "First soft reminder to prepare client." },
                    { key: "reminder_3_before", label: "3 Days Before Due Date", desc: "Follow up notification as the due date gets closer." },
                    { key: "reminder_1_before", label: "1 Day Before Due Date", desc: "High-priority nudge indicating payment is due tomorrow." },
                    { key: "reminder_due_day", label: "On Due Date", desc: "Alert dispatched on morning of the exact due date." },
                    { key: "reminder_1_after", label: "1 Day After Due Date", desc: "First overdue notification and status color shifts." },
                    { key: "reminder_3_after", label: "3 Days After Due Date", desc: "Mild warning indicating payment latency." },
                    { key: "reminder_7_after", label: "7 Days After Due Date", desc: "Escalated warning prompting direct action." },
                    { key: "reminder_14_after", label: "14 Days After Due Date", desc: "Final notice with automated owner follow-up alert." },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-2.5 bg-slate-50/30 rounded-xl hover:bg-slate-50 border border-slate-100">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold block text-slate-800">{item.label}</span>
                        <span className="text-[10px] text-slate-500 font-medium">{item.desc}</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notifications[item.key as keyof NotificationSettings] as boolean}
                          onChange={() => setNotifications({ ...notifications, [item.key]: !notifications[item.key as keyof NotificationSettings] })}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 border border-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quiet Hours */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-4 text-slate-800">
                <h3 className="text-sm font-bold flex items-center gap-2 border-b border-slate-100 pb-3 text-slate-900">
                  <Clock className="w-4 h-4 text-indigo-650" />
                  Time Constraints (Quiet Hours)
                </h3>
                <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                  Auto-reminders are restricted to this window. If a cron trigger fires outside these hours, the notification is skipped.
                </p>
                <div className="flex items-center gap-4 pt-1">
                  <div className="flex-1 space-y-1.5">
                    <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Start sending at</span>
                    <input
                      type="time"
                      value={notifications.quiet_hours_start}
                      onChange={(e) => setNotifications({ ...notifications, quiet_hours_start: e.target.value })}
                      className="w-full bg-white border border-slate-200 text-slate-900 text-xs h-9 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-slate-350 font-mono"
                    />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Stop sending at</span>
                    <input
                      type="time"
                      value={notifications.quiet_hours_end}
                      onChange={(e) => setNotifications({ ...notifications, quiet_hours_end: e.target.value })}
                      className="w-full bg-white border border-slate-200 text-slate-900 text-xs h-9 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-slate-350 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Owner Alerts */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-4 text-slate-800">
                <h3 className="text-sm font-bold flex items-center gap-2 border-b border-slate-100 pb-3 text-slate-900">
                  <CheckCircle2 className="w-4 h-4 text-indigo-650" />
                  Owner Status Alerts
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="flex items-center justify-between p-3 bg-slate-50/80 rounded-xl border border-slate-200">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold block text-slate-800">Payment Alerts</span>
                      <span className="text-[10px] text-slate-505 font-medium">Instant notification when paid</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifications.owner_payment_alert}
                        onChange={() => setNotifications({ ...notifications, owner_payment_alert: !notifications.owner_payment_alert })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 border border-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50/80 rounded-xl border border-slate-200">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold block text-slate-800">Daily Collection Summary</span>
                      <span className="text-[10px] text-slate-505 font-medium">Report sent at 7:00 PM IST</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifications.owner_daily_summary}
                        onChange={() => setNotifications({ ...notifications, owner_daily_summary: !notifications.owner_daily_summary })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 border border-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Previews */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-4 text-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-650" />
                    Message Template Previews
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Click a milestone type to review email message formatting.</p>
                </div>

                <div className="flex flex-wrap gap-1.5 border-b border-slate-100 pb-3">
                  {[
                    { id: "sent", label: "Invoice Sent" },
                    { id: "friendly", label: "Friendly Rem." },
                    { id: "nudge", label: "1 Day Nudge" },
                    { id: "due", label: "Due Today" },
                    { id: "overdue", label: "Overdue 3d" },
                    { id: "final", label: "Final Alert" },
                    { id: "thanks", label: "Thank You" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActivePreview(tab.id as any)}
                      className={`text-[9px] font-bold px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                        activePreview === tab.id
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-800"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-sky-500" /> Email Subject Line Preview
                  </span>
                  <div className="bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-700">
                    {previews[activePreview].emailSubject}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: TEAM MEMBERS */}
          {activeTab === "team" && (
            <div className="space-y-6">
              {/* Roster Listing */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-4">
                <h3 className="text-sm font-bold border-b border-slate-100 pb-3 text-slate-900">Current Team Members</h3>
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] text-slate-500 font-bold border-b border-slate-100">
                        <th className="p-3">Email Address</th>
                        <th className="p-3">Role</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      <tr className="hover:bg-slate-50/50">
                        <td className="p-3 font-semibold text-slate-900">owner@collectbot.in (You)</td>
                        <td className="p-3 font-mono text-[10px] uppercase text-indigo-700 font-bold">Owner</td>
                        <td className="p-3">
                          <span className="text-[10px] text-emerald-700 font-bold">Active</span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="text-slate-400 text-[10px]">-</span>
                        </td>
                      </tr>
                      {team.map((member) => (
                        <tr key={member.id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-medium">{member.email}</td>
                          <td className="p-3 font-mono text-[10px] uppercase text-slate-500">{member.role}</td>
                          <td className="p-3">
                            <span className={cn(
                              "text-[10px] font-bold",
                              member.status === "active" ? "text-emerald-700" : "text-amber-700"
                            )}>
                              {member.status === "active" ? "Active" : "Pending Invite"}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveTeamMember(member.id, member.email)}
                              className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Invite Member form */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-4">
                <h3 className="text-sm font-bold border-b border-slate-100 pb-3 text-slate-900">Invite Team Member</h3>
                <form onSubmit={handleInviteTeamMember} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="colleague@yourcompany.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full bg-white border border-slate-205 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-slate-350"
                    />
                  </div>
                  <div className="flex gap-2">
                    <div className="space-y-1.5 flex-1">
                      <label className="text-[10px] uppercase font-bold text-slate-500">Role</label>
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value as any)}
                        className="w-full bg-white border border-slate-205 rounded-xl h-9 px-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-slate-350"
                      >
                        <option value="manager">Manager</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-xs h-9 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all self-end cursor-pointer shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Invite
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
