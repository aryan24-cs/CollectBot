"use client"

import * as React from "react"
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2, 
  User, 
  MessageSquare, 
  FileText, 
  TrendingDown, 
  AlertCircle 
} from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { formatCurrency, formatDate, cn } from "@/lib/utils"

interface ApprovalRequest {
  id: string
  type: string
  target_id: string
  status: "pending" | "approved" | "rejected" | "expired"
  created_at: string
  requester?: { id: string; name: string } | null
  targetDetails?: {
    category: string
    amount: number
    description: string | null
    date: string
  } | null
}

export default function ApprovalsPage() {
  const [requests, setRequests] = React.useState<ApprovalRequest[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState<"pending" | "history">("pending")

  // Action Dialog States
  const [selectedReq, setSelectedReq] = React.useState<ApprovalRequest | null>(null)
  const [actionType, setActionType] = React.useState<"approve" | "reject" | null>(null)
  const [comment, setComment] = React.useState("")

  const loadData = async () => {
    try {
      setIsLoading(true)
      const res = await fetch("/api/approvals")
      if (!res.ok) throw new Error("Failed to load approvals.")
      const data = await res.json()
      setRequests(data || [])
    } catch (err: any) {
      toast.error(err.message || "Failed to load approval requests.")
    } finally {
      setIsLoading(false)
    }
  }

  React.useEffect(() => {
    loadData()
  }, [])

  const handleActionOpen = (req: ApprovalRequest, type: "approve" | "reject") => {
    setSelectedReq(req)
    setActionType(type)
    setComment("")
  }

  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedReq || !actionType) return

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approval_request_id: selectedReq.id,
          action: actionType,
          comment
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to submit decision.")

      toast.success(`Request successfully ${actionType === "approve" ? "approved" : "rejected"}.`)
      setSelectedReq(null)
      setActionType(null)
      loadData()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const pendingRequests = requests.filter(r => r.status === "pending")
  const resolvedRequests = requests.filter(r => r.status !== "pending")

  return (
    <div className="space-y-6 select-none max-w-5xl mx-auto pb-12">
      {/* Header section */}
      <div className="border-b border-surface-border/50 pb-5">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink-black leading-tight">Approvals Console</h1>
        <p className="text-ink-secondary text-sm mt-1">Review operational requests, expense validations, and sign-offs for your company.</p>
      </div>

      {/* Tabs Switcher */}
      <div className="flex gap-2 border-b border-cream-200 pb-2">
        <button
          onClick={() => setActiveTab("pending")}
          className={cn(
            "px-4 py-2 text-xs font-bold rounded-t-lg transition-colors cursor-pointer border-none bg-transparent",
            activeTab === "pending"
              ? "text-[#E91E63] border-b-2 border-[#E91E63]"
              : "text-ink-secondary hover:text-ink-primary"
          )}
        >
          Pending Requests ({pendingRequests.length})
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={cn(
            "px-4 py-2 text-xs font-bold rounded-t-lg transition-colors cursor-pointer border-none bg-transparent",
            activeTab === "history"
              ? "text-[#E91E63] border-b-2 border-[#E91E63]"
              : "text-ink-secondary hover:text-ink-primary"
          )}
        >
          Resolved History ({resolvedRequests.length})
        </button>
      </div>

      {/* Content Area */}
      <div>
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2 bg-surface-white border border-[#EEE9E4] rounded-card shadow-card">
            <Loader2 className="w-8 h-8 animate-spin text-[#E91E63]" />
            <p className="text-xs text-ink-secondary font-bold uppercase tracking-wider">Loading approvals workspace…</p>
          </div>
        ) : (activeTab === "pending" ? pendingRequests : resolvedRequests).length === 0 ? (
          <div className="py-16 text-center bg-surface-white border border-[#EEE9E4] rounded-card shadow-card">
            <CheckCircle className="w-10 h-10 text-emerald-600/30 mx-auto mb-3" />
            <p className="text-sm font-bold text-ink-black">
              {activeTab === "pending" ? "All Caught Up!" : "No History Records"}
            </p>
            <p className="text-xs text-ink-secondary mt-1">
              {activeTab === "pending" 
                ? "No pending approvals require your review." 
                : "Historical decisions resolved on this workspace will display here."
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {(activeTab === "pending" ? pendingRequests : resolvedRequests).map((req) => (
              <div 
                key={req.id}
                className="bg-surface-white border border-[#EEE9E4] rounded-card shadow-card p-5 hover:shadow-floating transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 rounded bg-cream-200 text-ink-primary text-[9px] font-bold uppercase tracking-wide">
                        {req.type} Approval
                      </span>
                      <span className="text-[10px] text-ink-secondary">({formatDate(req.created_at)})</span>
                    </div>

                    <p className="text-xs text-ink-secondary leading-relaxed">
                      Requester: <strong className="text-ink-black">{req.requester?.name || "Teammate"}</strong>
                    </p>

                    {req.type === "expense" && req.targetDetails && (
                      <div className="mt-3 p-3 bg-cream-50/50 rounded-lg border border-[#EEE9E4]/60 max-w-lg space-y-1">
                        <p className="text-xs font-bold text-ink-black">{req.targetDetails.category}</p>
                        <p className="text-[10px] text-ink-secondary">{req.targetDetails.description || "No description set."}</p>
                        <p className="text-[10px] text-emerald-700 font-extrabold">Amount: {formatCurrency(req.targetDetails.amount)}</p>
                      </div>
                    )}
                  </div>

                  {req.status === "pending" ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleActionOpen(req, "approve")}
                        className="px-3.5 py-2 rounded-button bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold border-none transition-colors cursor-pointer shadow-soft flex items-center gap-1"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleActionOpen(req, "reject")}
                        className="px-3.5 py-2 rounded-button bg-red-600 text-white hover:bg-red-700 text-xs font-bold border-none transition-colors cursor-pointer shadow-soft flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    </div>
                  ) : (
                    <div className="text-right shrink-0">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border",
                        req.status === "approved"
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                          : "bg-red-50 border-red-200 text-red-700"
                      )}>
                        {req.status === "approved" ? "Approved" : "Rejected"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Dialog Modal */}
      <Dialog open={!!selectedReq} onOpenChange={(open) => !open && setSelectedReq(null)}>
        <DialogContent className="bg-white border-surface-border text-ink-primary max-w-md rounded-card shadow-floating z-50">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-ink-black capitalize">
              {actionType === "approve" ? "Approve" : "Reject"} Request
            </DialogTitle>
            <DialogDescription className="text-ink-secondary text-xs mt-1.5">
              Confirm your decision. Add review notes or guidelines for the team.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleActionSubmit} className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-ink-secondary flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                Review Comments (Optional)
              </label>
              <textarea
                placeholder="Add notes for this decision..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full bg-cream-50 rounded-button px-4 py-2.5 text-xs font-semibold text-ink-primary border-none shadow-soft h-24 focus:outline-none placeholder:text-ink-secondary/40 resize-none"
              />
            </div>

            <DialogFooter className="pt-2 gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedReq(null)}
                className="px-4 py-2.5 rounded-button text-xs font-bold text-ink-secondary bg-cream-100 hover:bg-cream-50 border border-[#EEE9E4] transition-all cursor-pointer"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={cn(
                  "px-5 py-2.5 rounded-button text-xs font-bold flex items-center justify-center cursor-pointer border-none shadow-soft text-white",
                  actionType === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
                )}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  actionType === "approve" ? "Confirm Approval" : "Confirm Rejection"
                )}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
