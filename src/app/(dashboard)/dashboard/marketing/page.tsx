"use client"

import * as React from "react"
import { 
  Bell, 
  Send, 
  Tag, 
  Mail, 
  MessageSquare, 
  Percent, 
  Calendar, 
  TrendingUp, 
  BarChart2, 
  Plus, 
  Loader2, 
  Activity, 
  Users, 
  Sparkles 
} from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface Campaign {
  id: string
  name: string
  type: "email" | "whatsapp" | "sms" | "social"
  status: "draft" | "scheduled" | "sending" | "sent" | "failed"
  subject: string | null
  content: string
  scheduled_at: string | null
  sent_at: string | null
  created_at: string
}

interface Coupon {
  id: string
  code: string
  discount_type: "percentage" | "fixed_amount"
  discount_value: number
  expires_at: string | null
  max_uses: number
  uses_count: number
}

export default function MarketingWorkspacePage() {
  const [campaigns, setCampaigns] = React.useState<Campaign[]>([])
  const [coupons, setCoupons] = React.useState<Coupon[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState<"campaigns" | "coupons">("campaigns")

  // Add Campaign Dialog State
  const [isCampaignOpen, setIsCampaignOpen] = React.useState(false)
  const [campaignForm, setCampaignForm] = React.useState({
    name: "",
    type: "email",
    subject: "",
    content: "",
    scheduled_at: ""
  })

  // Add Coupon Dialog State
  const [isCouponOpen, setIsCouponOpen] = React.useState(false)
  const [couponForm, setCouponForm] = React.useState({
    code: "",
    discount_type: "percentage",
    discount_value: "",
    expires_at: "",
    max_uses: ""
  })

  const loadCampaigns = async () => {
    try {
      const res = await fetch("/api/marketing/campaigns")
      if (res.ok) {
        const data = await res.json()
        setCampaigns(data.campaigns || [])
      }
    } catch (_) {}
  }

  const loadCoupons = async () => {
    try {
      const res = await fetch("/api/marketing/coupons")
      if (res.ok) {
        const data = await res.json()
        setCoupons(data.coupons || [])
      }
    } catch (_) {}
  }

  const loadAllData = async () => {
    setIsLoading(true)
    await Promise.all([loadCampaigns(), loadCoupons()])
    setIsLoading(false)
  }

  React.useEffect(() => {
    loadAllData()
  }, [])

  const handleCampaignSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!campaignForm.name || !campaignForm.content) {
      toast.error("Campaign Name and Content body are required.")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/marketing/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(campaignForm)
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to launch campaign.")

      toast.success(`Campaign "${campaignForm.name}" registered successfully!`)
      setIsCampaignOpen(false)
      setCampaignForm({
        name: "",
        type: "email",
        subject: "",
        content: "",
        scheduled_at: ""
      })
      loadCampaigns()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCouponSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!couponForm.code || !couponForm.discount_value) {
      toast.error("Coupon Code and Value are required.")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/marketing/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(couponForm)
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to create coupon.")

      toast.success(`Promo Coupon "${couponForm.code.toUpperCase()}" generated!`)
      setIsCouponOpen(false)
      setCouponForm({
        code: "",
        discount_type: "percentage",
        discount_value: "",
        expires_at: "",
        max_uses: ""
      })
      loadCoupons()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 select-none max-w-6xl mx-auto pb-12">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-surface-border/50 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink-black leading-tight">Marketing Automation</h1>
          <p className="text-ink-secondary text-sm mt-1">Design target audience campaigns, configure referral coupon rewards, and monitor campaign ROI performance.</p>
        </div>
        <div className="flex gap-2">
          {activeTab === "campaigns" ? (
            <button
              onClick={() => setIsCampaignOpen(true)}
              className="btn-primary px-5 py-2.5 rounded-button text-xs font-bold gap-2 shadow-soft flex items-center shrink-0 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              Launch Campaign
            </button>
          ) : (
            <button
              onClick={() => setIsCouponOpen(true)}
              className="btn-primary px-5 py-2.5 rounded-button text-xs font-bold gap-2 shadow-soft flex items-center shrink-0 cursor-pointer"
            >
              <Tag className="w-4 h-4" />
              Add Coupon
            </button>
          )}
        </div>
      </div>

      {/* KPI Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-[#EEE9E4] shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-ink-secondary tracking-wider">Campaign Reach</span>
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3.5">
              <span className="text-2xl font-black text-ink-black tracking-tight">4,850</span>
              <p className="text-[9px] text-ink-secondary font-bold uppercase mt-1">Total Audience Reach</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#EEE9E4] shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-ink-secondary tracking-wider">Campaign CTR</span>
              <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3.5">
              <span className="text-2xl font-black text-ink-black tracking-tight">18.4%</span>
              <p className="text-[9px] text-ink-secondary font-bold uppercase mt-1">Average click-through rates</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#EEE9E4] shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-ink-secondary tracking-wider">Revenue Generated</span>
              <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                <BarChart2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3.5">
              <span className="text-2xl font-black text-ink-black tracking-tight">₹42,500</span>
              <p className="text-[9px] text-ink-secondary font-bold uppercase mt-1">Marketing attribution sales</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#EEE9E4] shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-ink-secondary tracking-wider">Active Campaigns</span>
              <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3.5">
              <span className="text-2xl font-black text-ink-black tracking-tight">{campaigns.filter(c => c.status === "scheduled").length}</span>
              <p className="text-[9px] text-ink-secondary font-bold uppercase mt-1">Scheduled template dispatches</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#EEE9E4] gap-6">
        <button
          onClick={() => setActiveTab("campaigns")}
          className={cn(
            "pb-3 text-xs font-bold uppercase tracking-wider bg-transparent border-none cursor-pointer relative",
            activeTab === "campaigns" ? "text-brand-500 border-b-2 border-brand-500" : "text-ink-secondary"
          )}
        >
          Campaign Registry
        </button>
        <button
          onClick={() => setActiveTab("coupons")}
          className={cn(
            "pb-3 text-xs font-bold uppercase tracking-wider bg-transparent border-none cursor-pointer relative",
            activeTab === "coupons" ? "text-brand-500 border-b-2 border-brand-500" : "text-ink-secondary"
          )}
        >
          Promo & Discount Coupons
        </button>
      </div>

      {/* Directory Content */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-2 bg-white rounded-card border border-[#EEE9E4]">
          <Loader2 className="w-8 h-8 animate-spin text-[#E91E63]" />
          <p className="text-xs text-ink-secondary font-bold uppercase tracking-wider">Syncing marketing logs…</p>
        </div>
      ) : activeTab === "campaigns" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map(camp => (
            <Card key={camp.id} className="bg-white border-[#EEE9E4] shadow-card flex flex-col justify-between">
              <CardHeader className="pb-3 flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-xs font-bold text-ink-black">{camp.name}</CardTitle>
                  <CardDescription className="text-[9px] font-mono mt-1">
                    Sent at: {camp.sent_at ? new Date(camp.sent_at).toLocaleDateString() : "Scheduled"}
                  </CardDescription>
                </div>
                <span className={cn(
                  "px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase border tracking-wider",
                  camp.type === "email" && "bg-blue-50 border-blue-200 text-blue-700",
                  camp.type === "whatsapp" && "bg-emerald-50 border-emerald-200 text-emerald-700",
                  camp.type === "sms" && "bg-amber-50 border-amber-200 text-amber-700",
                  camp.type === "social" && "bg-purple-50 border-purple-200 text-purple-700"
                )}>
                  {camp.type}
                </span>
              </CardHeader>
              <CardContent className="space-y-4">
                {camp.subject && (
                  <p className="text-[10px] text-ink-black font-extrabold border-b border-cream-200 pb-2">
                    Subj: {camp.subject}
                  </p>
                )}
                <p className="text-[10px] text-ink-secondary line-clamp-3 italic">
                  "{camp.content}"
                </p>
                <div className="pt-2 border-t border-cream-200 flex justify-between items-center text-[9px] text-ink-secondary font-bold">
                  <span>Status:</span>
                  <span className={cn(
                    "uppercase",
                    camp.status === "sent" && "text-emerald-600",
                    camp.status === "scheduled" && "text-blue-600",
                    camp.status === "draft" && "text-ink-secondary"
                  )}>
                    {camp.status}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}

          {campaigns.length === 0 && (
            <div className="col-span-full py-16 text-center bg-white border border-[#EEE9E4] rounded-card">
              <Activity className="w-10 h-10 text-ink-secondary/35 mx-auto mb-3" />
              <p className="text-xs font-bold text-ink-black uppercase tracking-wider">No campaigns launched yet</p>
              <p className="text-[10px] text-ink-secondary mt-1">Design and broadcast campaign templates to engage contacts.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {coupons.map(cop => (
            <Card key={cop.id} className="bg-white border-[#EEE9E4] shadow-card">
              <CardHeader className="pb-3 flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-xs font-bold text-brand-600 tracking-wider font-mono">{cop.code}</CardTitle>
                  <CardDescription className="text-[9px] font-mono mt-1">
                    Expires: {cop.expires_at ? new Date(cop.expires_at).toLocaleDateString() : "Never"}
                  </CardDescription>
                </div>
                <span className="px-2 py-0.5 rounded bg-cream-100 border border-cream-200 text-[8px] font-bold text-ink-secondary uppercase">
                  {cop.discount_type === "percentage" ? "Percent" : "Fixed Cash"}
                </span>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center text-[10px] text-ink-secondary font-bold">
                  <span>Value Reward:</span>
                  <span className="text-ink-primary font-black">
                    {cop.discount_type === "percentage" ? `${cop.discount_value}%` : `₹${cop.discount_value}`}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-ink-secondary font-bold">
                  <span>Usage Limits:</span>
                  <span className="text-ink-primary font-bold">
                    {cop.uses_count} / {cop.max_uses || "∞"} used
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}

          {coupons.length === 0 && (
            <div className="col-span-full py-16 text-center bg-white border border-[#EEE9E4] rounded-card">
              <Percent className="w-10 h-10 text-ink-secondary/35 mx-auto mb-3" />
              <p className="text-xs font-bold text-ink-black uppercase tracking-wider">No coupons active</p>
              <p className="text-[10px] text-ink-secondary mt-1">Create codes to reward high-volume client repeat checkouts.</p>
            </div>
          )}
        </div>
      )}

      {/* Add Campaign Modal */}
      <Dialog open={isCampaignOpen} onOpenChange={setIsCampaignOpen}>
        <DialogContent className="bg-white border-surface-border text-ink-primary max-w-md rounded-card shadow-floating z-50">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-ink-black flex items-center gap-1">
              <Sparkles className="w-5 h-5 text-[#E91E63]" />
              Launch Automation Campaign
            </DialogTitle>
            <DialogDescription className="text-ink-secondary text-xs mt-1.5">
              Select details to broadcast campaign messages.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCampaignSubmit} className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-ink-secondary">Campaign Name *</label>
              <input
                type="text"
                placeholder="e.g. July Summer Referral Blitz"
                value={campaignForm.name}
                onChange={(e) => setCampaignForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-cream-50 rounded-button px-4 py-2.5 text-xs font-semibold text-ink-primary border-none shadow-soft focus:outline-none placeholder:text-ink-secondary/40"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-ink-secondary">Broadcast Method</label>
                <select
                  value={campaignForm.type}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full bg-cream-50 rounded-button px-4 py-2.5 text-xs font-semibold text-ink-primary border-none shadow-soft focus:outline-none cursor-pointer"
                >
                  <option value="email">Email Template</option>
                  <option value="whatsapp">WhatsApp Text</option>
                  <option value="sms">SMS Text</option>
                  <option value="social">Social Post</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-ink-secondary">Scheduled Date/Time</label>
                <input
                  type="datetime-local"
                  value={campaignForm.scheduled_at}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, scheduled_at: e.target.value }))}
                  className="w-full bg-cream-50 rounded-button px-4 py-2.5 text-xs font-semibold text-ink-primary border-none shadow-soft focus:outline-none cursor-pointer"
                />
              </div>
            </div>

            {campaignForm.type === "email" && (
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-ink-secondary">Subject Line *</label>
                <input
                  type="text"
                  placeholder="Subject of the email broadcast"
                  value={campaignForm.subject}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full bg-cream-50 rounded-button px-4 py-2.5 text-xs font-semibold text-ink-primary border-none shadow-soft focus:outline-none placeholder:text-ink-secondary/40"
                  required
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-ink-secondary">Message Content *</label>
              <textarea
                placeholder="Enter campaign template context body..."
                value={campaignForm.content}
                onChange={(e) => setCampaignForm(prev => ({ ...prev, content: e.target.value }))}
                className="w-full bg-cream-50 rounded-button px-4 py-2.5 text-xs font-semibold text-ink-primary border-none shadow-soft focus:outline-none placeholder:text-ink-secondary/40 min-h-[90px]"
                required
              />
            </div>

            <DialogFooter className="pt-4 gap-2.5">
              <button
                type="button"
                onClick={() => setIsCampaignOpen(false)}
                className="px-4 py-2.5 rounded-button text-xs font-bold text-ink-secondary bg-cream-100 hover:bg-cream-50 border border-[#EEE9E4] transition-all cursor-pointer"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary px-5 py-2.5 rounded-button text-xs font-bold gap-1.5 flex items-center cursor-pointer"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Launching...
                  </>
                ) : (
                  "Broadcast Campaign"
                )}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Coupon Modal */}
      <Dialog open={isCouponOpen} onOpenChange={setIsCouponOpen}>
        <DialogContent className="bg-white border-surface-border text-ink-primary max-w-sm rounded-card shadow-floating z-50">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-ink-black flex items-center gap-1">
              <Tag className="w-5 h-5 text-[#E91E63]" />
              Generate Reward Coupon
            </DialogTitle>
            <DialogDescription className="text-ink-secondary text-xs mt-1.5">
              Configure promo discount rates for customer checkouts.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCouponSubmit} className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-ink-secondary">Promo Code *</label>
              <input
                type="text"
                placeholder="e.g. WELCOME50"
                value={couponForm.code}
                onChange={(e) => setCouponForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                className="w-full bg-cream-50 rounded-button px-4 py-2.5 text-xs font-semibold text-ink-primary border-none shadow-soft focus:outline-none placeholder:text-ink-secondary/40 font-mono"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-ink-secondary">Discount Type</label>
                <select
                  value={couponForm.discount_type}
                  onChange={(e) => setCouponForm(prev => ({ ...prev, discount_type: e.target.value as any }))}
                  className="w-full bg-cream-50 rounded-button px-4 py-2.5 text-xs font-semibold text-ink-primary border-none shadow-soft focus:outline-none cursor-pointer"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed_amount">Fixed Amount (₹)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-ink-secondary">Discount Value *</label>
                <input
                  type="number"
                  placeholder="e.g. 15"
                  value={couponForm.discount_value}
                  onChange={(e) => setCouponForm(prev => ({ ...prev, discount_value: e.target.value }))}
                  className="w-full bg-cream-50 rounded-button px-4 py-2.5 text-xs font-semibold text-ink-primary border-none shadow-soft focus:outline-none placeholder:text-ink-secondary/40"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-ink-secondary">Max Allowed Uses</label>
                <input
                  type="number"
                  placeholder="e.g. 100 (0 for unlimited)"
                  value={couponForm.max_uses}
                  onChange={(e) => setCouponForm(prev => ({ ...prev, max_uses: e.target.value }))}
                  className="w-full bg-cream-50 rounded-button px-4 py-2.5 text-xs font-semibold text-ink-primary border-none shadow-soft focus:outline-none placeholder:text-ink-secondary/40"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-ink-secondary">Expiry Date</label>
                <input
                  type="date"
                  value={couponForm.expires_at}
                  onChange={(e) => setCouponForm(prev => ({ ...prev, expires_at: e.target.value }))}
                  className="w-full bg-cream-50 rounded-button px-4 py-2.5 text-xs font-semibold text-ink-primary border-none shadow-soft focus:outline-none cursor-pointer"
                />
              </div>
            </div>

            <DialogFooter className="pt-2 gap-2">
              <button
                type="button"
                onClick={() => setIsCouponOpen(false)}
                className="px-4 py-2.5 rounded-button text-xs font-bold text-ink-secondary bg-cream-100 hover:bg-cream-50 border border-[#EEE9E4] transition-all cursor-pointer"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary px-5 py-2.5 rounded-button text-xs font-bold gap-1.5 flex items-center cursor-pointer"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Generate Coupon"
                )}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
