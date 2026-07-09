"use client"

import * as React from "react"
import { 
  Bell, 
  Clock, 
  Mail, 
  MessageSquare, 
  Save, 
  Sparkles, 
  Loader2, 
  Check, 
  AlertTriangle,
  FileText
} from "lucide-react"
import { toast } from "sonner"

interface SettingsState {
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

export default function SettingsPage() {
  const [settings, setSettings] = React.useState<SettingsState | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const [activePreview, setActivePreview] = React.useState<"sent" | "friendly" | "nudge" | "due" | "overdue" | "final" | "thanks">("sent")

  React.useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings")
        if (!res.ok) throw new Error("Failed to load settings")
        const data = await res.json()
        
        // Strip seconds if time formats are retrieved as "09:00:00" from Postgres
        setSettings({
          ...data,
          quiet_hours_start: data.quiet_hours_start?.slice(0, 5) || "09:00",
          quiet_hours_end: data.quiet_hours_end?.slice(0, 5) || "20:00",
        })
      } catch (err: any) {
        toast.error(err.message || "Failed to load preferences.")
      } finally {
        setIsLoading(false)
      }
    }
    loadSettings()
  }, [])

  const handleToggle = (key: keyof SettingsState) => {
    if (!settings) return
    setSettings({
      ...settings,
      [key]: !settings[key],
    })
  }

  const handleTimeChange = (key: "quiet_hours_start" | "quiet_hours_end", value: string) => {
    if (!settings) return
    setSettings({
      ...settings,
      [key]: value,
    })
  }

  const handleSave = async () => {
    if (!settings) return
    setIsSaving(true)
    const toastId = toast.loading("Saving settings...")
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })
      if (!res.ok) throw new Error("Could not update settings")
      const updated = await res.json()
      
      setSettings({
        ...updated,
        quiet_hours_start: updated.quiet_hours_start?.slice(0, 5) || "09:00",
        quiet_hours_end: updated.quiet_hours_end?.slice(0, 5) || "20:00",
      })
      toast.success("Preferences updated successfully!")
    } catch (err: any) {
      toast.error(err.message || "Could not save preferences.")
    } finally {
      toast.dismiss(toastId)
      setIsSaving(false)
    }
  }

  // Previews mapping
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
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-white">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
        <p className="text-slate-400">Loading settings panel...</p>
      </div>
    )
  }

  if (!settings) return null

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10 select-none">
      <div className="flex justify-between items-center border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Notification Settings</h1>
          <p className="text-slate-400 text-xs mt-1">Configure scheduling variables, quiet hours constraints, and communication alerts.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors shadow-lg shadow-indigo-600/10"
        >
          <Save className="w-4 h-4" />
          Save Changes
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left column settings cards */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Channels Selection */}
          <div className="border border-slate-800 bg-slate-900/60 backdrop-blur-xl rounded-xl p-5 shadow-xl text-white space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2 border-b border-slate-800 pb-3 text-white">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              Notification Channels
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="flex items-center justify-between p-3 bg-slate-950/40 rounded-lg border border-slate-850">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold block">WhatsApp Notifications</span>
                  <span className="text-[10px] text-slate-500">Send templates via Interakt API</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.channel_whatsapp}
                    onChange={() => handleToggle("channel_whatsapp")}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-950 border border-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-950/40 rounded-lg border border-slate-850">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold block">Email Notifications</span>
                  <span className="text-[10px] text-slate-500">Send custom designs via Resend</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.channel_email}
                    onChange={() => handleToggle("channel_email")}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-950 border border-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Schedule Configuration */}
          <div className="border border-slate-800 bg-slate-900/60 backdrop-blur-xl rounded-xl p-5 shadow-xl text-white space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2 border-b border-slate-800 pb-3 text-white">
              <Bell className="w-4 h-4 text-indigo-400" />
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
                <div key={item.key} className="flex items-center justify-between p-2.5 bg-slate-950/20 rounded-lg hover:bg-slate-800/10 border border-slate-850/40">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold block">{item.label}</span>
                    <span className="text-[10px] text-slate-500">{item.desc}</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings[item.key as keyof SettingsState] as boolean}
                      onChange={() => handleToggle(item.key as keyof SettingsState)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-950 border border-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Quiet Hours */}
          <div className="border border-slate-800 bg-slate-900/60 backdrop-blur-xl rounded-xl p-5 shadow-xl text-white space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2 border-b border-slate-800 pb-3 text-white">
              <Clock className="w-4 h-4 text-indigo-400" />
              Time Constraints (Quiet Hours)
            </h3>
            <p className="text-[10px] text-slate-450 leading-relaxed">
              Auto-reminders are restricted to this window. If a cron trigger fires outside these hours, the notification is skipped.
            </p>
            <div className="flex items-center gap-4 pt-1">
              <div className="flex-1 space-y-1.5">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Start sending at</span>
                <input
                  type="time"
                  value={settings.quiet_hours_start}
                  onChange={(e) => handleTimeChange("quiet_hours_start", e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white text-xs h-9 px-3 rounded-lg focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Stop sending at</span>
                <input
                  type="time"
                  value={settings.quiet_hours_end}
                  onChange={(e) => handleTimeChange("quiet_hours_end", e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white text-xs h-9 px-3 rounded-lg focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Owner Notifications */}
          <div className="border border-slate-800 bg-slate-900/60 backdrop-blur-xl rounded-xl p-5 shadow-xl text-white space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2 border-b border-slate-800 pb-3 text-white">
              <Check className="w-4 h-4 text-indigo-400" />
              Owner Status Alerts
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="flex items-center justify-between p-3 bg-slate-950/40 rounded-lg border border-slate-850">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold block">Payment Alerts</span>
                  <span className="text-[10px] text-slate-500">Instant notification when paid</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.owner_payment_alert}
                    onChange={() => handleToggle("owner_payment_alert")}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-950 border border-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-950/40 rounded-lg border border-slate-850">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold block">Daily Collection Summary</span>
                  <span className="text-[10px] text-slate-500">Report sent at 7:00 PM IST</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.owner_daily_summary}
                    onChange={() => handleToggle("owner_daily_summary")}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-950 border border-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white"></div>
                </label>
              </div>
            </div>
          </div>

        </div>

        {/* Right column template previews */}
        <div className="lg:col-span-5 space-y-6">
          <div className="border border-slate-800 bg-slate-900/60 backdrop-blur-xl rounded-xl p-5 shadow-xl text-white space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                Message Template Previews
              </h3>
              <p className="text-[10px] text-slate-450 mt-0.5">Click a milestone type to review message formatting copy.</p>
            </div>

            <div className="flex flex-wrap gap-1.5 border-b border-slate-800/80 pb-3">
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
                  className={`text-[9px] font-bold px-2 py-1 rounded transition-colors ${
                    activePreview === tab.id
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-950/60 text-slate-450 hover:bg-slate-850 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Simulated Chat Interface for WhatsApp */}
            <div className="space-y-4">
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" /> WhatsApp Template Preview
                </span>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 font-sans text-xs text-slate-300 whitespace-pre-line leading-relaxed shadow-inner">
                  {previews[activePreview].wa}
                </div>
              </div>

              {/* Simulated Subject for Email */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-sky-400" /> Email Subject Line
                </span>
                <div className="bg-slate-950 px-3 py-2.5 rounded-lg border border-slate-850 font-mono text-[11px] text-slate-350 shadow-inner">
                  {previews[activePreview].emailSubject}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
