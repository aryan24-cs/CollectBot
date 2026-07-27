"use client"

import * as React from "react"
import { 
  CreditCard, 
  Key, 
  ShieldCheck, 
  Check, 
  Zap, 
  AlertCircle, 
  Loader2, 
  Sparkles,
  Lock,
  Globe
} from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function GatewaysSettingsPage() {
  const [gateways, setGateways] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)

  // Razorpay Form
  const [razorpayKeyId, setRazorpayKeyId] = React.useState("")
  const [razorpayKeySecret, setRazorpayKeySecret] = React.useState("")
  const [razorpayWebhookSecret, setRazorpayWebhookSecret] = React.useState("")
  const [razorpayEnabled, setRazorpayEnabled] = React.useState(true)
  const [razorpayTestMode, setRazorpayTestMode] = React.useState(false)

  const loadGateways = async () => {
    try {
      setIsLoading(true)
      const res = await fetch("/api/settings/gateways")
      if (res.ok) {
        const data = await res.json()
        const gList = data.gateways || []
        setGateways(gList)

        const rzp = gList.find((g: any) => g.provider === "razorpay")
        if (rzp) {
          setRazorpayKeyId(rzp.key_id || "")
          setRazorpayEnabled(rzp.is_enabled !== false)
          setRazorpayTestMode(!!rzp.is_test_mode)
        }
      }
    } catch (err: any) {
      toast.error("Failed to load gateway settings.")
    } finally {
      setIsLoading(false)
    }
  }

  React.useEffect(() => {
    loadGateways()
  }, [])

  const handleSaveRazorpay = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!razorpayKeyId || !razorpayKeySecret) {
      toast.error("Razorpay Key ID and Key Secret are required.")
      return
    }

    try {
      setIsSaving(true)
      const res = await fetch("/api/settings/gateways", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "razorpay",
          key_id: razorpayKeyId,
          key_secret: razorpayKeySecret,
          webhook_secret: razorpayWebhookSecret,
          is_enabled: razorpayEnabled,
          is_test_mode: razorpayTestMode
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to save settings.")

      toast.success("Razorpay credentials saved successfully!")
      setRazorpayKeySecret("")
      loadGateways()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-[#EEE9E4]">
        <Loader2 className="w-7 h-7 text-[#E91E63] animate-spin" />
        <span className="text-xs font-bold text-ink-secondary">Loading payment gateways...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 select-none">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-ink-black">Payment Gateway Configuration</h1>
        <p className="text-ink-secondary text-xs mt-1">Connect your Razorpay or Cashfree accounts to enable auto-settlement & instant client checkouts.</p>
      </div>

      {/* Webhook Endpoint Banner */}
      <div className="bg-[#FAF8F5] border border-[#EEE9E4] rounded-2xl p-5 shadow-sm space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-ink-primary">
          <Zap className="w-4 h-4 text-[#E91E63]" />
          <span>Your Instant Webhook URL</span>
        </div>
        <p className="text-[11px] text-ink-secondary">Configure this URL in your Razorpay dashboard under Settings → Webhooks to enable automatic invoice settlement:</p>
        <div className="bg-white border border-[#EEE9E4] px-3 py-2 rounded-xl text-xs font-mono text-ink-black flex items-center justify-between shadow-inner">
          <span className="truncate">{process.env.NEXT_PUBLIC_APP_URL || "https://app.collectbot.in"}/api/webhooks/razorpay</span>
          <button 
            onClick={() => {
              navigator.clipboard.writeText(`${process.env.NEXT_PUBLIC_APP_URL || "https://app.collectbot.in"}/api/webhooks/razorpay`)
              toast.success("Webhook URL copied to clipboard!")
            }}
            className="text-[10px] font-bold text-[#E91E63] hover:underline shrink-0 ml-2"
          >
            Copy URL
          </button>
        </div>
      </div>

      {/* Razorpay Gateway Card */}
      <Card className="bg-white border-[#EEE9E4] shadow-card rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-[#EEE9E4]/60 bg-[#FAF8F5]/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-extrabold text-sm">
                RZP
              </div>
              <div>
                <CardTitle className="text-base font-extrabold text-ink-black">Razorpay Checkout & UPI</CardTitle>
                <CardDescription className="text-xs text-ink-secondary">Accept UPI, Credit/Debit Cards, Net Banking, and Wallets.</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${razorpayEnabled ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-gray-100 text-gray-600"}`}>
                {razorpayEnabled ? "Active" : "Disabled"}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSaveRazorpay} className="space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink-primary">Razorpay Key ID</label>
                <input
                  type="text"
                  placeholder="rzp_live_xxxxxxxxxxxx"
                  value={razorpayKeyId}
                  onChange={(e) => setRazorpayKeyId(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#EEE9E4] rounded-xl px-3.5 py-2.5 text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-[#E91E63]/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink-primary">Razorpay Key Secret</label>
                <input
                  type="password"
                  placeholder="••••••••••••••••••••"
                  value={razorpayKeySecret}
                  onChange={(e) => setRazorpayKeySecret(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#EEE9E4] rounded-xl px-3.5 py-2.5 text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-[#E91E63]/20"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink-primary">Webhook Secret (Optional)</label>
              <input
                type="password"
                placeholder="Secret key set in Razorpay dashboard webhook settings"
                value={razorpayWebhookSecret}
                onChange={(e) => setRazorpayWebhookSecret(e.target.value)}
                className="w-full bg-[#FAF8F5] border border-[#EEE9E4] rounded-xl px-3.5 py-2.5 text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-[#E91E63]/20"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between pt-2 border-t border-[#EEE9E4]/60 gap-4">
              <div className="flex items-center gap-4 text-xs font-semibold text-ink-secondary">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={razorpayEnabled}
                    onChange={(e) => setRazorpayEnabled(e.target.checked)}
                    className="rounded text-[#E91E63] focus:ring-[#E91E63]"
                  />
                  <span>Enable Razorpay Gateway</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={razorpayTestMode}
                    onChange={(e) => setRazorpayTestMode(e.target.checked)}
                    className="rounded text-[#E91E63] focus:ring-[#E91E63]"
                  />
                  <span>Sandbox / Test Mode</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="bg-[#1A1A1A] hover:bg-[#0A0A0A] text-white text-xs font-bold px-6 py-2.5 rounded-full transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 text-emerald-400" />}
                <span>Save Credentials</span>
              </button>
            </div>

          </form>
        </CardContent>
      </Card>
    </div>
  )
}
