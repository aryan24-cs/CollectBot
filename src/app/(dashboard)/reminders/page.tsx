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
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-white">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
        <p className="text-slate-400">Loading reminders logs...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10 select-none text-white">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Reminders Panel</h1>
        <p className="text-slate-400 text-xs mt-1">Monitor scheduled queues, review log history, and handle notification retries.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border border-slate-800 bg-slate-900/60 p-4 rounded-xl shadow-xl flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg">
            <BellRing className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Sent This Month</span>
            <span className="text-xl font-extrabold mt-0.5">{stats?.totalSentThisMonth || 0}</span>
          </div>
        </div>

        <div className="border border-slate-800 bg-slate-900/60 p-4 rounded-xl shadow-xl flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold block">WhatsApp Reminders</span>
            <span className="text-xl font-extrabold mt-0.5">{stats?.whatsappCount || 0}</span>
          </div>
        </div>

        <div className="border border-slate-800 bg-slate-900/60 p-4 rounded-xl shadow-xl flex items-center gap-4">
          <div className="p-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-lg">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Email Reminders</span>
            <span className="text-xl font-extrabold mt-0.5">{stats?.emailCount || 0}</span>
          </div>
        </div>

        <div className="border border-slate-800 bg-slate-900/60 p-4 rounded-xl shadow-xl flex items-center gap-4">
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Failed Reminders</span>
            <span className="text-xl font-extrabold mt-0.5 text-rose-455">{stats?.failedCount || 0}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left column: Upcoming list */}
        <div className="lg:col-span-4 space-y-6">
          <div className="border border-slate-800 bg-slate-900/60 backdrop-blur-xl rounded-xl p-5 shadow-xl space-y-4">
            <div>
              <h3 className="text-sm font-bold flex items-center gap-1.5 text-white">
                <Clock className="w-4 h-4 text-indigo-400" />
                Upcoming Reminders (7 Days)
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Schedules automatically matched against invoice aging.</p>
            </div>

            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {upcoming.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs italic">
                  No automated reminders scheduled for the next 7 days.
                </div>
              ) : (
                upcoming.map((up, idx) => (
                  <div key={idx} className="p-3 bg-slate-950/40 border border-slate-850 rounded-lg space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold block">{up.client_name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">Invoice #{up.invoice_number}</span>
                      </div>
                      <span className="text-[10px] bg-slate-950 border border-slate-800 px-2 py-0.5 rounded font-mono font-bold text-indigo-400">
                        {formatReminderType(up.reminder_type)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] border-t border-slate-800/40 pt-2 text-slate-500">
                      <span>Expected: {formatDate(up.expected_date)}</span>
                      <span className="font-bold text-slate-400">{formatCurrency(up.amount)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right column: history list */}
        <div className="lg:col-span-8 space-y-6">
          <div className="border border-slate-800 bg-slate-900/60 backdrop-blur-xl rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-1.5 text-white">
                  <Send className="w-4 h-4 text-indigo-400" />
                  Transmission History Logs
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Audit trail of email and WhatsApp notifications dispatched.</p>
              </div>
              <button
                onClick={loadRemindersData}
                className="self-end sm:self-center p-1.5 bg-slate-950 border border-slate-850 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                title="Refresh logs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Filter controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/40 border border-slate-850 rounded-lg p-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search client / invoice..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white text-xs h-8 pl-8 pr-3 rounded focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={channelFilter}
                  onChange={(e) => setChannelFilter(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 text-white text-xs h-8 px-2 rounded focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">All Channels</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Email</option>
                </select>
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white text-xs h-8 px-2 rounded focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Statuses</option>
                <option value="sent">Success</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            {/* History Table */}
            <div className="overflow-x-auto border border-slate-850 rounded-lg">
              <table className="w-full text-left border-collapse text-xs select-none">
                <thead>
                  <tr className="bg-slate-950 text-[10px] text-slate-400 font-semibold border-b border-slate-850">
                    <th className="p-3">Date</th>
                    <th className="p-3">Invoice</th>
                    <th className="p-3">Client</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Channel</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-slate-300">
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-500 text-xs italic">
                        No transmission history logs found matching these filters.
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/5 transition-colors">
                        <td className="p-3 font-mono text-[10px]">{new Date(log.date).toLocaleString("en-IN", { hour: "numeric", minute: "numeric", month: "short", day: "numeric" })}</td>
                        <td className="p-3 font-mono font-semibold">{log.invoice_number}</td>
                        <td className="p-3 max-w-[100px] truncate" title={log.client_name}>{log.client_name}</td>
                        <td className="p-3 text-[10px] font-medium text-slate-400">{formatReminderType(log.reminder_type)}</td>
                        <td className="p-3">
                          {log.channel === "whatsapp" ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded font-medium">
                              <MessageSquare className="w-2.5 h-2.5" /> WhatsApp
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-sky-400 bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.5 rounded font-medium">
                              <Mail className="w-2.5 h-2.5" /> Email
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          {log.status === "sent" ? (
                            <span className="text-[10px] text-emerald-400 font-bold">Sent</span>
                          ) : (
                            <span className="text-[10px] text-rose-455 font-bold hover:underline cursor-pointer" title={log.error_message}>
                              Failed
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {log.status === "failed" ? (
                            <button
                              onClick={() => handleRetrySend(log)}
                              disabled={isRetrying === log.id}
                              className="inline-flex items-center gap-1 bg-slate-950 hover:bg-slate-800 text-[10px] text-indigo-400 hover:text-white px-2 py-1 rounded border border-slate-800 transition-colors"
                            >
                              <RefreshCw className={cn("w-2.5 h-2.5", isRetrying === log.id && "animate-spin")} />
                              Retry
                            </button>
                          ) : (
                            <span className="text-slate-600 text-[10px]">-</span>
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
