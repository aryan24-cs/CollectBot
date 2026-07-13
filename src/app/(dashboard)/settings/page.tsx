"use client"

import * as React from "react"
import { 
  Building2, 
  FileText, 
  CreditCard, 
  Bell, 
  Users, 
  Save, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  Upload, 
  Sparkles, 
  Loader2, 
  AlertTriangle,
  Mail,
  MessageSquare,
  CheckCircle2,
  Lock,
  Check
} from "lucide-react"
import { toast } from "sonner"
import { formatCurrency, formatDate, cn } from "@/lib/utils"
import StatCard from "@/components/shared/StatCard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
  const [activeTab, setActiveTab] = React.useState<"profile" | "invoice" | "payment" | "notifications" | "team" | "plans">("profile")
  
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
        const [bizRes, notifRes, teamRes] = await Promise.all([
          fetch("/api/settings/business"),
          fetch("/api/settings"),
          fetch("/api/settings/team"),
        ])

        if (!bizRes.ok || !notifRes.ok) throw new Error("Could not retrieve configurations.")

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
        if (bizData.subscription) {
          setSubscription(bizData.subscription)
        } else {
          setSubscription({
            plan: "free",
            billing_cycle: "monthly",
            status: "active",
            current_period_end: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString()
          })
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to load preferences.")
      } finally {
        setIsLoading(false)
      }
    }
    loadAllSettings()
  }, [])

  // Save profile and defaults
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

  const handleUpgradePlan = async (planName: string) => {
    setIsSaving(true)
    const toastId = toast.loading(`Initiating secure checkout for ${planName} Plan...`)
    try {
      const res = await fetch("/api/settings/subscription/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Upgrade failed")
      
      toast.success(`Success! Workspace plan upgraded to ${planName.toUpperCase()}.`)
      
      const bizRes = await fetch("/api/settings/business")
      if (bizRes.ok) {
        const bizData = await bizRes.json()
        setBusiness(bizData)
        if (bizData.subscription) {
          setSubscription(bizData.subscription)
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upgrade subscription plan.")
    } finally {
      toast.dismiss(toastId)
      setIsSaving(false)
    }
  }

  // Save notifications
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
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-ink-secondary animate-pulse max-w-6xl mx-auto">
        <Loader2 className="w-10 h-10 animate-spin text-brand-600 mb-4" />
        <p className="text-xs font-semibold">Loading system settings...</p>
      </div>
    )
  }

  if (!business || !notifications) return null

  const hasMissingUPI = !business.upi_id

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10 select-none text-ink-primary">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-border/50 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink-black leading-tight">Settings</h1>
          <p className="text-ink-secondary text-sm">Manage business profile metadata, invoices counter, and UPI payment options.</p>
        </div>
        {activeTab !== "notifications" && activeTab !== "team" && activeTab !== "plans" ? (
          <button
            onClick={saveBusinessProfile}
            disabled={isSaving}
            className="btn-primary px-4 py-2.5 rounded-button text-xs font-bold gap-2"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        ) : activeTab === "plans" ? (
          <div className="w-10 h-10 flex items-center justify-center bg-cream-100 rounded-full">
            <Sparkles className="w-5 h-5 text-[#E91E63]" />
          </div>
        ) : (
          <button
            onClick={saveNotifications}
            disabled={isSaving}
            className="btn-primary px-4 py-2.5 rounded-button text-xs font-bold gap-2"
          >
            <Save className="w-4 h-4" />
            Save Preferences
          </button>
        )}
      </div>

      {/* Onboarding Missing UPI Banner */}
      {hasMissingUPI && (
        <div className="p-4 rounded-card bg-danger-light border border-danger/20 text-danger-dark flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 text-danger" />
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider">No active UPI ID Configured</p>
            <p className="text-[11px] font-semibold mt-0.5 leading-relaxed">
              Your UPI ID is empty. Invoices will default to draft-only mode and sending actions will block until a destination UPI handle is saved.
            </p>
          </div>
        </div>
      )}

      {/* Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Navigation Sidebar */}
        <div className="lg:col-span-3 bg-surface-white border border-surface-border/50 rounded-card p-3 shadow-card space-y-1">
          {[
            { id: "profile", label: "Business Profile", icon: Building2 },
            { id: "invoice", label: "Invoice Settings", icon: FileText },
            { id: "payment", label: "Payment & Banking", icon: CreditCard },
            { id: "notifications", label: "Alert Schedules", icon: Bell },
            { id: "team", label: "Team Members", icon: Users },
            { id: "plans", label: "Pricing & Plans", icon: Sparkles },
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer border-none",
                  isActive
                    ? "bg-dark text-white shadow-soft"
                    : "text-ink-secondary hover:text-ink-primary hover:bg-cream-50"
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Form panel content */}
        <div className="lg:col-span-9 space-y-6">

          {/* TAB 1: BUSINESS PROFILE */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              <Card>
                <CardHeader className="border-b border-surface-border/50 pb-4">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-ink-black">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-bold text-ink-secondary">Business Name</Label>
                      <input
                        type="text"
                        value={business.name}
                        onChange={(e) => setBusiness({ ...business, name: e.target.value })}
                        className="w-full bg-cream-50 rounded-button px-4 py-3 text-xs font-semibold text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-soft border-none transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-bold text-ink-secondary">Business Email</Label>
                      <input
                        type="email"
                        value={business.email || ""}
                        onChange={(e) => setBusiness({ ...business, email: e.target.value })}
                        className="w-full bg-cream-50 rounded-button px-4 py-3 text-xs font-semibold text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-soft border-none transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-bold text-ink-secondary">Business Phone</Label>
                      <input
                        type="text"
                        value={business.phone || ""}
                        onChange={(e) => setBusiness({ ...business, phone: e.target.value })}
                        className="w-full bg-cream-50 rounded-button px-4 py-3 text-xs font-semibold text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-soft border-none transition-all font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-bold text-ink-secondary">VAT/GSTIN Identifier</Label>
                      <input
                        type="text"
                        value={business.gstin || ""}
                        placeholder="GSTIN Number (Optional)"
                        onChange={(e) => setBusiness({ ...business, gstin: e.target.value })}
                        className="w-full bg-cream-50 rounded-button px-4 py-3 text-xs font-semibold text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-soft border-none transition-all font-mono uppercase"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="border-b border-surface-border/50 pb-4">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-ink-black">Office Location</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-ink-secondary">Street Address</Label>
                    <input
                      type="text"
                      value={business.address || ""}
                      onChange={(e) => setBusiness({ ...business, address: e.target.value })}
                      className="w-full bg-cream-50 rounded-button px-4 py-3 text-xs font-semibold text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-soft border-none transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-bold text-ink-secondary">City</Label>
                      <input
                        type="text"
                        value={business.city || ""}
                        onChange={(e) => setBusiness({ ...business, city: e.target.value })}
                        className="w-full bg-cream-50 rounded-button px-4 py-3 text-xs font-semibold text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-soft border-none transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-bold text-ink-secondary">State</Label>
                      <Select
                        value={business.state || ""}
                        onValueChange={(val) => setBusiness({ ...business, state: val })}
                      >
                        <SelectTrigger className="w-full bg-cream-50 text-ink-primary h-11 border-none shadow-soft rounded-button px-4 py-2.5 text-xs font-semibold focus:ring-2 focus:ring-brand-500/20 transition-all justify-between">
                          <SelectValue placeholder="Select State" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-surface-border rounded-xl shadow-floating max-h-56 z-50">
                          {INDIAN_STATES.map((st) => (
                            <SelectItem key={st} value={st} className="cursor-pointer text-xs py-1.5">
                              {st}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-bold text-ink-secondary">Pincode</Label>
                      <input
                        type="text"
                        value={business.pincode || ""}
                        onChange={(e) => setBusiness({ ...business, pincode: e.target.value })}
                        className="w-full bg-cream-50 rounded-button px-4 py-3 text-xs font-semibold text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-soft border-none transition-all font-mono"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 2: INVOICE CONFIGURATION */}
          {activeTab === "invoice" && (
            <div className="space-y-6">
              <Card>
                <CardHeader className="border-b border-surface-border/50 pb-4">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-ink-black">Sequence Counters</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-bold text-ink-secondary">Invoice Number Prefix</Label>
                      <input
                        type="text"
                        value={business.invoice_prefix}
                        onChange={(e) => setBusiness({ ...business, invoice_prefix: e.target.value })}
                        className="w-full bg-cream-50 rounded-button px-4 py-3 text-xs font-semibold text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-soft border-none transition-all font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-bold text-ink-secondary">Next Sequence Number</Label>
                      <input
                        type="number"
                        value={business.invoice_counter}
                        onChange={(e) => setBusiness({ ...business, invoice_counter: parseInt(e.target.value) || 1 })}
                        className="w-full bg-cream-50 rounded-button px-4 py-3 text-xs font-semibold text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-soft border-none transition-all font-mono"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="border-b border-surface-border/50 pb-4">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-ink-black">Default Invoice Terms</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-bold text-ink-secondary">Default Terms (Days)</Label>
                      <input
                        type="number"
                        value={business.default_payment_terms}
                        onChange={(e) => setBusiness({ ...business, default_payment_terms: parseInt(e.target.value) || 7 })}
                        className="w-full bg-cream-50 rounded-button px-4 py-3 text-xs font-semibold text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-soft border-none transition-all font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-bold text-ink-secondary">Default GST Rate %</Label>
                      <input
                        type="number"
                        value={business.default_tax_rate}
                        onChange={(e) => setBusiness({ ...business, default_tax_rate: parseFloat(e.target.value) || 18 })}
                        className="w-full bg-cream-50 rounded-button px-4 py-3 text-xs font-semibold text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-soft border-none transition-all font-mono"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-ink-secondary">Default Terms visible on bills</Label>
                    <textarea
                      value={business.default_terms || ""}
                      onChange={(e) => setBusiness({ ...business, default_terms: e.target.value })}
                      className="w-full bg-cream-50 rounded-button px-4 py-3 text-xs font-semibold text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-soft border-none min-h-[80px]"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 3: PAYMENT & BANKING CONFIGURATION */}
          {activeTab === "payment" && (
            <div className="space-y-6">
              <Card>
                <CardHeader className="border-b border-surface-border/50 pb-4">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-ink-black">UPI Configuration</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-baseline">
                      <Label className="text-[10px] uppercase font-bold text-ink-secondary">UPI ID handle *</Label>
                      {hasMissingUPI && <span className="text-[9px] text-danger font-extrabold animate-pulse">Required</span>}
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. businessname@okaxis"
                      value={business.upi_id || ""}
                      onChange={(e) => setBusiness({ ...business, upi_id: e.target.value })}
                      className={cn(
                        "w-full rounded-button px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-soft border-none transition-all font-mono",
                        hasMissingUPI ? "bg-danger-light text-danger-dark placeholder:text-danger/40" : "bg-cream-50 text-ink-primary"
                      )}
                    />
                    <p className="text-[10px] text-ink-secondary italic leading-relaxed">
                      This UPI handle is used to generate QR codes and link checkouts directly to your bank account.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="border-b border-surface-border/50 pb-4">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-ink-black">Banking Details</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-ink-secondary">Bank Name</Label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC Bank"
                      value={business.bank_name || ""}
                      onChange={(e) => setBusiness({ ...business, bank_name: e.target.value })}
                      className="w-full bg-cream-50 rounded-button px-4 py-3 text-xs font-semibold text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-soft border-none transition-all"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-bold text-ink-secondary">Account Number</Label>
                      <input
                        type={showAccountNumber ? "text" : "password"}
                        placeholder="Bank Account Number"
                        value={business.account_number || ""}
                        onChange={(e) => setBusiness({ ...business, account_number: e.target.value })}
                        className="w-full bg-cream-50 rounded-button px-4 py-3 text-xs font-semibold text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-soft border-none transition-all font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-bold text-ink-secondary">IFSC Code</Label>
                      <input
                        type="text"
                        placeholder="HDFC0000240"
                        value={business.ifsc_code || ""}
                        onChange={(e) => setBusiness({ ...business, ifsc_code: e.target.value })}
                        className="w-full bg-cream-50 rounded-button px-4 py-3 text-xs font-semibold text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-soft border-none transition-all font-mono uppercase"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 4: ALERT SCHEDULES */}
          {activeTab === "notifications" && (
            <div className="space-y-6">
              <Card>
                <CardHeader className="border-b border-surface-border/50 pb-4">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-ink-black">Notification Channels</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center justify-between p-3.5 bg-cream-50 rounded-xl">
                    <div>
                      <p className="text-xs font-bold text-ink-black">WhatsApp Reminders</p>
                      <p className="text-[10px] text-ink-secondary">Send automated WhatsApp notifications directly.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifications.channel_whatsapp}
                      onChange={(e) => setNotifications({ ...notifications, channel_whatsapp: e.target.checked })}
                      className="rounded border-surface-border text-brand-600 focus:ring-brand-500 h-4 w-4 bg-white"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-cream-50 rounded-xl">
                    <div>
                      <p className="text-xs font-bold text-ink-black">Email Reminders</p>
                      <p className="text-[10px] text-ink-secondary">Dispatch automated email notifications to clients.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifications.channel_email}
                      onChange={(e) => setNotifications({ ...notifications, channel_email: e.target.checked })}
                      className="rounded border-surface-border text-brand-600 focus:ring-brand-500 h-4 w-4 bg-white"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 5: TEAM MEMBERS */}
          {activeTab === "team" && (
            <div className="space-y-6">
              <Card>
                <CardHeader className="border-b border-surface-border/50 pb-4">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-ink-black">Invite Member</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <form onSubmit={handleInviteTeamMember} className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="email"
                      placeholder="teammate@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full sm:flex-1 bg-cream-50 rounded-button px-4 py-2.5 text-xs font-semibold text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-soft border-none transition-all"
                    />
                    <button
                      type="submit"
                      className="btn-primary px-5 py-2.5 rounded-button text-xs font-bold shrink-0"
                    >
                      Send Invite
                    </button>
                  </form>
                </CardContent>
              </Card>

              {team.length > 0 && (
                <Card>
                  <CardHeader className="border-b border-surface-border/50 pb-4">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-ink-black">Current Members</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 p-0 divide-y divide-surface-border/50">
                    {team.map((m) => (
                      <div key={m.id} className="p-4 flex items-center justify-between hover:bg-cream-50/20 transition-colors">
                        <div>
                          <p className="text-xs font-bold text-ink-black">{m.email}</p>
                          <p className="text-[10px] text-ink-secondary capitalize">{m.role} • {m.status}</p>
                        </div>
                        {m.role !== "owner" && (
                          <button
                            onClick={() => handleRemoveTeamMember(m.id, m.email)}
                            className="p-2 rounded-full hover:bg-danger-light text-ink-secondary hover:text-danger-dark border-none bg-transparent cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* TAB 6: PRICING & PLANS */}
          {activeTab === "plans" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <Card>
                <CardHeader className="border-b border-[#EEE9E4] pb-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-sm font-bold uppercase tracking-wider text-ink-black flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-[#E91E63]" />
                        Billing Plan & Packages
                      </CardTitle>
                      <CardDescription className="text-xs text-ink-secondary mt-0.5">Choose a workspace subscription plan to unlock WhatsApp alerts, unlimited invoicing, and multi-user team portals.</CardDescription>
                    </div>
                    {subscription && (
                      <span className="px-3 py-1 rounded-pill bg-[#FAF8F5] border border-[#EEE9E4] text-[10px] font-bold text-ink-secondary uppercase tracking-wider">
                        Current: <strong className="text-[#E91E63]">{subscription.plan}</strong>
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  {/* Active Subscription Summary card */}
                  {subscription && (
                    <div className="bg-[#FAF8F5] border border-[#EEE9E4]/60 rounded-card p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <span className="text-[10px] text-ink-secondary font-bold uppercase block">Workspace Plan Details</span>
                        <p className="text-sm font-bold text-[#0A0A0A] mt-0.5 capitalize">{subscription.plan} Package ({subscription.billing_cycle})</p>
                        <p className="text-[10px] text-ink-secondary mt-0.5">
                          Status: <span className="text-green-600 font-extrabold capitalize">{subscription.status}</span> 
                          {subscription.current_period_end && ` • Renews/Expires: ${formatDate(subscription.current_period_end)}`}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-ink-secondary font-bold uppercase block">UPI Payment Destination</span>
                        <p className="text-xs font-mono font-bold text-ink-primary mt-0.5">{business?.upi_id || "None set — configure in Banking settings"}</p>
                      </div>
                    </div>
                  )}

                  {/* Pricing Comparison Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                      {
                        id: "solo",
                        name: "Solo Tier",
                        price: "₹799",
                        period: "/ month",
                        desc: "Perfect for freelancers and individual service providers.",
                        features: [
                          "Up to 30 invoices per month",
                          "Unlimited client registrations",
                          "WhatsApp automated reminders",
                          "Razorpay payment links checkout",
                          "Custom layouts & branding",
                          "Remove CollectBot watermark logo"
                        ]
                      },
                      {
                        id: "business",
                        name: "Business Tier",
                        price: "₹2,499",
                        period: "/ month",
                        desc: "Designed for small agencies and growing service teams.",
                        features: [
                          "Unlimited monthly invoices",
                          "Unlimited client registrations",
                          "WhatsApp & Email alert channels",
                          "SMS automated backup channels",
                          "Razorpay payment links checkout",
                          "Recurring subscription billing templates",
                          "Customizable reminder timing rules",
                          "Up to 3 multi-user team member accounts",
                          "Priority email & ticket support"
                        ],
                        popular: true
                      },
                      {
                        id: "scale",
                        name: "Scale Tier",
                        price: "₹3,999",
                        period: "/ month",
                        desc: "Corporate tier with advanced database API & whitelabeling.",
                        features: [
                          "All Business tier inclusions",
                          "Up to 5 multi-user team member accounts",
                          "Complete whitelabeling (your own domain)",
                          "Dedicated client portal links",
                          "Advanced profit/overdue insights reports",
                          "CSV/Bulk imports & API integration key",
                          "Tally Ledger exports",
                          "Dedicated Account Manager support"
                        ]
                      }
                    ].map((plan) => {
                      const isCurrent = subscription?.plan === plan.id
                      return (
                        <div 
                          key={plan.id} 
                          className={cn(
                            "border rounded-card p-6 flex flex-col justify-between transition-all duration-300 relative bg-white",
                            plan.popular 
                              ? "border-[#E91E63] shadow-card scale-100 md:scale-[1.02] z-10" 
                              : "border-[#EEE9E4] hover:shadow-floating hover:border-ink-secondary/25"
                          )}
                        >
                          {plan.popular && (
                            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#E91E63] text-white text-[9px] font-bold uppercase tracking-wider px-3 py-1 rounded-pill shadow-soft">
                              Most Popular
                            </span>
                          )}

                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-ink-black">{plan.name}</h4>
                            <div className="flex items-baseline mt-4">
                              <span className="text-3xl font-extrabold tracking-tight text-ink-black font-display">{plan.price}</span>
                              <span className="text-[10px] text-ink-secondary ml-1 font-semibold">{plan.period}</span>
                            </div>
                            <p className="text-[10px] text-ink-secondary mt-2.5 font-medium leading-relaxed">{plan.desc}</p>
                            
                            <ul className="mt-6 space-y-2.5">
                              {plan.features.map((feat, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-[10px] text-ink-secondary font-semibold">
                                  <Check className="w-3.5 h-3.5 text-[#E91E63] shrink-0 mt-0.5" />
                                  <span>{feat}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="mt-8">
                            <button
                              onClick={() => handleUpgradePlan(plan.id)}
                              disabled={isCurrent || isSaving}
                              className={cn(
                                "w-full py-2.5 rounded-pill text-xs font-bold shadow-soft transition-all cursor-pointer flex items-center justify-center gap-1.5",
                                isCurrent 
                                  ? "bg-cream-100 text-ink-secondary border border-[#EEE9E4] shadow-none cursor-default"
                                  : plan.popular
                                    ? "bg-[#E91E63] hover:bg-[#D81B60] text-white border-none"
                                    : "bg-white border border-[#EEE9E4] text-[#0A0A0A] hover:bg-cream-50"
                              )}
                            >
                              {isCurrent ? "Active Plan" : `Upgrade to ${plan.id.toUpperCase()}`}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

        </div>

      </div>

    </div>
  )
}
