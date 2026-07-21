"use client"

import * as React from "react"
import { 
  BellRing, 
  Send, 
  MessageSquare, 
  Mail, 
  AlertCircle, 
  RefreshCw, 
  Clock, 
  Loader2, 
  Pause, 
  Play, 
  Zap, 
  Search,
  Filter
} from "lucide-react"
import { toast } from "sonner"
import { formatCurrency, formatDate, cn } from "@/lib/utils"

interface RemindersStats {
  totalSentThisMonth: number
  whatsappCount: number
  emailCount: number
  failedCount: number
}

interface UpcomingReminder {
  invoice_id: string
  invoice_number: string
  client_name: string
  amount: number
  reminder_type: string
  expected_date: string
}

interface ReminderLog {
  id: string
  date: string
  invoice_id: string
  invoice_number: string
  client_name: string
  amount: number
  reminder_type: string
  channel: "whatsapp" | "email" | "sms"
  status: "sent" | "failed"
  message_content?: string
  error_message?: string
}

export default function RemindersPage() {
  const [stats, setStats] = React.useState<RemindersStats | null>(null)
  const [upcoming, setUpcoming] = React.useState<UpcomingReminder[]>([])
  const [history, setHistory] = React.useState<ReminderLog[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isRetrying, setIsRetrying] = React.useState<string | null>(null)

  // Filters state
  const [searchTerm, setSearchTerm] = React.useState("")
  const [channelFilter, setChannelFilter] = React.useState("all")
  const [statusFilter, setStatusFilter] = React.useState("all")

  const loadRemindersData = async () => {
    try {
      const res = await fetch("/api/reminders")
      if (!res.ok) throw new Error("Failed to load reminders dashboard details")
      const data = await res.json()
      
      setStats(data.stats)
      setUpcoming(data.upcoming)
      setHistory(data.history)
    } catch (err: any) {
      toast.error(err.message || "Could not fetch reminder records.")
    } finally {
      setIsLoading(false)
    }
  }

  React.useEffect(() => {
    loadRemindersData()
  }, [])

  const handleRetrySend = async (log: ReminderLog) => {
    setIsRetrying(log.id)
    const toastId = toast.loading(`Retrying reminder via ${log.channel}...`)
    try {
      const res = await fetch(`/api/invoices/${log.invoice_id}/remind`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: log.channel }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Manual retry dispatch failed")
      
      toast.success("Reminder resent successfully!")
      loadRemindersData()
    } catch (err: any) {
      toast.error(err.message || "Failed to trigger retry.")
    } finally {
      toast.dismiss(toastId)
      setIsRetrying(null)
    }
  }

  const handlePauseToggle = async (invoiceId: string, currentPaused: boolean) => {
    const toastId = toast.loading("Updating reminder automation state...")
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reminder_paused: !currentPaused }),
      })
      if (!res.ok) throw new Error("Failed to toggle reminder state")
      toast.success(!currentPaused ? "Reminders paused for invoice." : "Reminders active for invoice.")
      loadRemindersData()
    } catch (err: any) {
      toast.error(err.message || "Could not toggle reminders.")
    } finally {
      toast.dismiss(toastId)
    }
  }

  const handleSendNow = async (invoiceId: string) => {
    const toastId = toast.loading("Dispatching manual reminder alerts...")
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/remind`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "both" }),
      })
      if (!res.ok) throw new Error("Manual reminder dispatch failed")
      toast.success("Reminder sent successfully via WhatsApp & Email!")
      loadRemindersData()
    } catch (err: any) {
      toast.error(err.message || "Could not dispatch reminders.")
    } finally {
      toast.dismiss(toastId)
    }
  }

  // Filter history list
  const filteredHistory = history.filter((log) => {
    const matchesSearch =
      log.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesChannel = channelFilter === "all" || log.channel === channelFilter
    const matchesStatus = statusFilter === "all" || log.status === statusFilter
    
    return matchesSearch && matchesChannel && matchesStatus
  })

  const formatReminderType = (type: string) => {
    switch (type) {
      case "7_before": return "7 Days Before"
      case "3_before": return "3 Days Before"
      case "1_before": return "1 Day Nudge"
      case "due_day": return "Due Today"
      case "1_after": return "1 Day Overdue"
      case "3_after": return "3 Days Overdue"
      case "7_after": return "7 Days Overdue"
      case "14_after": return "Final Notice"
      case "invoice_sent": return "Invoice Sent"
      case "manual": return "Manual Remind"
      default: return type
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-ink-primary">
        <Loader2 className="w-10 h-10 animate-spin text-[#E91E63] mb-4" />
        <p className="text-xs font-bold uppercase tracking-wider text-ink-secondary">Syncing reminders log...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 select-none">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-surface-border/50 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink-black leading-tight">Reminders Hub</h1>
          <p className="text-ink-secondary text-sm mt-1">Monitor scheduled queues, review log history, and handle notification retries.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#EEE9E4] p-4 rounded-xl shadow-card flex items-center gap-4">
          <div className="p-3 bg-blue-50 border border-blue-200 text-blue-600 rounded-lg">
            <BellRing className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-ink-secondary uppercase font-bold block">Sent This Month</span>
            <span className="text-2xl font-black text-ink-black tracking-tight">{stats?.totalSentThisMonth || 0}</span>
          </div>
        </div>

        <div className="bg-white border border-[#EEE9E4] p-4 rounded-xl shadow-card flex items-center gap-4">
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-lg">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-ink-secondary uppercase font-bold block">WhatsApp Reminders</span>
            <span className="text-2xl font-black text-ink-black tracking-tight">{stats?.whatsappCount || 0}</span>
          </div>
        </div>

        <div className="bg-white border border-[#EEE9E4] p-4 rounded-xl shadow-card flex items-center gap-4">
          <div className="p-3 bg-sky-50 border border-sky-200 text-sky-600 rounded-lg">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-ink-secondary uppercase font-bold block">Email Reminders</span>
            <span className="text-2xl font-black text-ink-black tracking-tight">{stats?.emailCount || 0}</span>
          </div>
        </div>

        <div className="bg-white border border-[#EEE9E4] p-4 rounded-xl shadow-card flex items-center gap-4">
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-ink-secondary uppercase font-bold block">Failed Reminders</span>
            <span className="text-2xl font-black text-red-600 tracking-tight">{stats?.failedCount || 0}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left column: Upcoming list */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-[#EEE9E4] rounded-xl p-5 shadow-card space-y-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-black flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#E91E63]" />
                Upcoming Reminders (7 Days)
              </h3>
              <p className="text-[9px] text-ink-secondary font-bold uppercase mt-1">Schedules matched against invoice aging.</p>
            </div>

            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {upcoming.length === 0 ? (
                <div className="text-center py-12 text-ink-secondary/60 text-[10px] uppercase font-bold bg-[#FAF8F5]/30 border border-[#EEE9E4]/40 rounded-lg">
                  No scheduled reminders.
                </div>
              ) : (
                upcoming.map((up, idx) => (
                  <div key={idx} className="p-3 bg-[#FAF8F5]/30 border border-[#EEE9E4] rounded-lg space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold block text-ink-black">{up.client_name}</span>
                        <span className="text-[10px] text-ink-secondary font-mono">Invoice #{up.invoice_number}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-[8px] font-mono font-bold text-blue-700 uppercase tracking-wider">
                        {formatReminderType(up.reminder_type)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] border-t border-[#EEE9E4]/40 pt-2 text-ink-secondary font-semibold">
                      <span>Expected: {formatDate(up.expected_date)}</span>
                      <span className="font-black text-ink-primary">{formatCurrency(up.amount)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right column: history list */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-[#EEE9E4] rounded-xl p-5 shadow-card space-y-4">
            <div className="flex items-center justify-between gap-4 border-b border-[#EEE9E4] pb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink-black flex items-center gap-1.5">
                  <Send className="w-4 h-4 text-[#E91E63]" />
                  Transmission History Logs
                </h3>
                <p className="text-[9px] text-ink-secondary font-bold uppercase mt-1">Audit trail of email and WhatsApp notifications dispatched.</p>
              </div>
              <button
                onClick={loadRemindersData}
                className="p-2 bg-cream-50 hover:bg-cream-100 border border-[#EEE9E4] rounded-lg text-ink-secondary hover:text-ink-primary transition-colors cursor-pointer"
                title="Refresh logs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Filter controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#FAF8F5]/30 border border-[#EEE9E4] rounded-lg p-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-ink-secondary/40 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search client / invoice..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-cream-50 rounded-button px-8 py-1.5 text-xs font-semibold text-ink-primary border-none shadow-soft focus:outline-none placeholder:text-ink-secondary/40"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={channelFilter}
                  onChange={(e) => setChannelFilter(e.target.value)}
                  className="w-full bg-cream-50 rounded-button px-3 py-1.5 text-xs font-semibold text-ink-primary border-none shadow-soft focus:outline-none cursor-pointer"
                >
                  <option value="all">All Channels</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Email</option>
                </select>
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-cream-50 rounded-button px-3 py-1.5 text-xs font-semibold text-ink-primary border-none shadow-soft focus:outline-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="sent">Success</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            {/* History Table */}
            <div className="overflow-x-auto border border-[#EEE9E4] rounded-lg">
              <table className="w-full text-left border-collapse text-xs select-none">
                <thead>
                  <tr className="bg-cream-100 text-[10px] text-ink-secondary font-bold border-b border-[#EEE9E4] uppercase tracking-wider">
                    <th className="p-3">Date</th>
                    <th className="p-3">Invoice</th>
                    <th className="p-3">Client</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Channel</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEE9E4]/60 text-ink-primary">
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-ink-secondary/60 text-xs italic font-bold">
                        No transmission history logs found.
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((log) => (
                      <tr key={log.id} className="hover:bg-cream-50/20 transition-colors">
                        <td className="p-3 font-mono text-[10px] text-ink-secondary">{new Date(log.date).toLocaleString("en-IN", { hour: "numeric", minute: "numeric", month: "short", day: "numeric" })}</td>
                        <td className="p-3 font-mono font-bold text-ink-black">{log.invoice_number}</td>
                        <td className="p-3 max-w-[100px] truncate font-semibold" title={log.client_name}>{log.client_name}</td>
                        <td className="p-3 text-[10px] font-bold text-ink-secondary uppercase">{formatReminderType(log.reminder_type)}</td>
                        <td className="p-3">
                          {log.channel === "whatsapp" ? (
                            <span className="inline-flex items-center gap-1 text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                              <MessageSquare className="w-2.5 h-2.5" /> WhatsApp
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[9px] text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                              <Mail className="w-2.5 h-2.5" /> Email
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          {log.status === "sent" ? (
                            <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Sent</span>
                          ) : (
                            <span className="text-[10px] text-red-600 font-bold hover:underline cursor-pointer uppercase tracking-wider" title={log.error_message}>
                              Failed
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {log.status === "failed" ? (
                            <button
                              onClick={() => handleRetrySend(log)}
                              disabled={isRetrying === log.id}
                              className="inline-flex items-center gap-1 bg-white hover:bg-cream-50 text-[10px] text-[#E91E63] font-bold px-2 py-1 rounded border border-[#EEE9E4] transition-colors cursor-pointer shadow-soft"
                            >
                              <RefreshCw className={cn("w-2.5 h-2.5", isRetrying === log.id && "animate-spin")} />
                              Retry
                            </button>
                          ) : (
                            <span className="text-ink-secondary/30 text-[10px]">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
