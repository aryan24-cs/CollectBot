"use client"

import * as React from "react"
import { 
  ScrollText, 
  Search, 
  Loader2, 
  Clock, 
  User, 
  Info,
  ShieldAlert
} from "lucide-react"
import { toast } from "sonner"
import { formatDate } from "@/lib/utils"

export default function AdminLogsPage() {
  const [logs, setLogs] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [actionFilter, setActionFilter] = React.useState("")
  const [targetFilter, setTargetFilter] = React.useState("")

  const loadLogs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (actionFilter) params.append("action", actionFilter)
      if (targetFilter) params.append("target_type", targetFilter)

      const res = await fetch(`/api/admin/logs?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to load audit logs.")
      const json = await res.json()
      setLogs(json.logs || [])
    } catch (err: any) {
      toast.error(err.message || "An error occurred fetching admin logs.")
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    loadLogs()
  }, [actionFilter, targetFilter])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-ink-secondary">
        <Loader2 className="w-9 h-9 text-[#E91E63] animate-spin mb-4" />
        <p className="text-xs font-semibold">Loading platform audit logs and history entries...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 text-ink-primary max-w-6xl mx-auto pb-10">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-[#EEE9E4] pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0A0A0A] font-display flex items-center gap-2">
            System Admin Audit Logs
          </h1>
          <p className="text-xs text-ink-secondary mt-1 font-semibold">Audit log of override configurations, pricing plan changes, and workspace blockings.</p>
        </div>
      </div>

      {/* Filter panel */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white border border-[#EEE9E4] rounded-card p-4 shadow-card">
        {/* Action Filter */}
        <div className="flex-1 flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-ink-secondary tracking-wider">Action:</span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full bg-white border border-[#EEE9E4] rounded-pill px-4 py-2 text-xs font-bold text-ink-primary focus:outline-none cursor-pointer"
          >
            <option value="">All actions</option>
            <option value="update_feature_overrides">Update Feature Overrides</option>
            <option value="reset_overrides">Reset Overrides</option>
            <option value="update_subscription">Update Subscription</option>
            <option value="update_plan">Update Pricing Plan</option>
            <option value="update_business">Update Business Profile</option>
          </select>
        </div>

        {/* Target Filter */}
        <div className="flex-1 flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-ink-secondary tracking-wider">Target:</span>
          <select
            value={targetFilter}
            onChange={(e) => setTargetFilter(e.target.value)}
            className="w-full bg-white border border-[#EEE9E4] rounded-pill px-4 py-2 text-xs font-bold text-ink-primary focus:outline-none cursor-pointer"
          >
            <option value="">All targets</option>
            <option value="business">Business</option>
            <option value="subscription">Subscription</option>
            <option value="plan">Plan</option>
          </select>
        </div>
      </div>

      {/* Audit list */}
      <div className="bg-white border border-[#EEE9E4] rounded-card overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[#EEE9E4] bg-cream-50/50 text-[10px] font-bold text-ink-secondary uppercase tracking-widest">
                <th className="p-4">Timestamp</th>
                <th className="p-4">Admin user</th>
                <th className="p-4">Action</th>
                <th className="p-4">Description</th>
                <th className="p-4">IP address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEE9E4]/60 text-xs font-semibold text-ink-primary">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-20 text-ink-secondary italic">
                    No actions logged matching the specified filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-cream-50/30 transition-all">
                    {/* Timestamp */}
                    <td className="p-4 text-ink-secondary font-mono">
                      {formatDate(log.created_at)}
                    </td>

                    {/* Admin Name */}
                    <td className="p-4 font-bold text-[#0A0A0A]">
                      {log.admin_users?.name || "System Automated"}
                    </td>

                    {/* Action badge */}
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-pill text-[9px] font-bold uppercase tracking-wider border bg-cream-100 text-ink-secondary border-[#EEE9E4]">
                        {log.action}
                      </span>
                    </td>

                    {/* Description */}
                    <td className="p-4 text-[#0A0A0A]">
                      {log.description}
                    </td>

                    {/* IP */}
                    <td className="p-4 text-ink-secondary font-mono">
                      {log.ip_address || "N/A"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
