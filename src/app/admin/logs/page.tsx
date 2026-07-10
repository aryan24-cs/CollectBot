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
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="w-9 h-9 text-indigo-500 animate-spin mb-4" />
        <p className="text-xs text-slate-400 font-medium">Loading platform audit logs and history entries...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            System Admin Audit Logs
          </h1>
          <p className="text-xs text-slate-400 mt-1">Audit log of override configurations, pricing plan changes, and workspace blockings.</p>
        </div>
      </div>

      {/* Filter panel */}
      <div className="flex flex-col sm:flex-row gap-4 bg-[#1E293B]/30 border border-slate-800/80 rounded-xl p-4 shadow-sm">
        {/* Action Filter */}
        <div className="flex-1 flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Action:</span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-medium text-slate-300 focus:outline-none"
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
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Target:</span>
          <select
            value={targetFilter}
            onChange={(e) => setTargetFilter(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-medium text-slate-300 focus:outline-none"
          >
            <option value="">All targets</option>
            <option value="business">Business</option>
            <option value="subscription">Subscription</option>
            <option value="plan">Plan</option>
          </select>
        </div>
      </div>

      {/* Audit list */}
      <div className="bg-[#1E293B]/30 border border-slate-800/80 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-900/40 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <th className="p-4">Timestamp</th>
                <th className="p-4">Admin user</th>
                <th className="p-4">Action</th>
                <th className="p-4">Description</th>
                <th className="p-4">IP address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-xs font-medium text-slate-300">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-20 text-slate-500 italic">
                    No actions logged matching the specified filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/20 transition-all">
                    {/* Timestamp */}
                    <td className="p-4 text-slate-400 font-mono">
                      {formatDate(log.created_at)}
                    </td>

                    {/* Admin Name */}
                    <td className="p-4 font-semibold text-white">
                      {log.admin_users?.name || "System Automated"}
                    </td>

                    {/* Action badge */}
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide border bg-slate-800/60 text-slate-300 border-slate-700/50">
                        {log.action}
                      </span>
                    </td>

                    {/* Description */}
                    <td className="p-4 text-slate-200">
                      {log.description}
                    </td>

                    {/* IP */}
                    <td className="p-4 text-slate-500 font-mono">
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
