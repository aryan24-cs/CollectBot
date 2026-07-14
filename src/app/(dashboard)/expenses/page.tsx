"use client"

import * as React from "react"
import { 
  Briefcase, 
  Plus, 
  Search, 
  ChevronRight, 
  Loader2, 
  Calendar, 
  Coins, 
  Tag, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import StatCard from "@/components/shared/StatCard"
import { formatCurrency, formatDate, cn } from "@/lib/utils"

interface Expense {
  id: string
  category: string
  amount: number
  date: string
  description: string | null
  status: "pending" | "approved" | "rejected"
  employee?: { id: string; name: string } | null
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = React.useState<Expense[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Stats states
  const [totalApproved, setTotalApproved] = React.useState(0)
  const [totalPending, setTotalPending] = React.useState(0)

  // Creation form states
  const [category, setCategory] = React.useState("")
  const [amount, setAmount] = React.useState("")
  const [date, setDate] = React.useState(new Date().toISOString().split("T")[0])
  const [description, setDescription] = React.useState("")

  const [isOwner, setIsOwner] = React.useState(true)

  const loadData = async () => {
    try {
      setIsLoading(true)
      const res = await fetch("/api/expenses")
      if (!res.ok) throw new Error("Failed to load expenses list.")
      const data = await res.json()
      setExpenses(data || [])

      // Calculate totals
      const approved = (data || [])
        .filter((e: Expense) => e.status === "approved")
        .reduce((sum: number, e: Expense) => sum + Number(e.amount), 0)
      const pending = (data || [])
        .filter((e: Expense) => e.status === "pending")
        .reduce((sum: number, e: Expense) => sum + Number(e.amount), 0)

      setTotalApproved(approved)
      setTotalPending(pending)

      // Fetch business profile to check if user is owner
      const profileRes = await fetch("/api/settings/business")
      if (profileRes.ok) {
        const pData = await profileRes.json()
        setIsOwner(pData.isOwner !== false)
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load expenses.")
    } finally {
      setIsLoading(false)
    }
  }

  React.useEffect(() => {
    loadData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!category || !amount || !date) {
      toast.error("Please fill in Category, Amount, and Date.")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, amount, date, description })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to log expense.")
      }

      toast.success(
        isOwner 
          ? "Expense successfully registered." 
          : "Expense submitted! Waiting for owner approval."
      )
      setCategory("")
      setAmount("")
      setDescription("")
      loadData()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 select-none max-w-5xl mx-auto pb-12">
      {/* Header section */}
      <div className="border-b border-surface-border/50 pb-5">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink-black leading-tight">Expense Ledger</h1>
        <p className="text-ink-secondary text-sm mt-1">Log operations expenses, travel checks, inventory logs, and sync approvals status.</p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Total Approved Expenses"
          value={formatCurrency(totalApproved)}
          subtext="Registered company expenditures"
          trend={{ value: "4.2%", isPositive: true }}
        />
        <StatCard
          title="Pending Approval Requests"
          value={formatCurrency(totalPending)}
          subtext="Awaiting workspace owner verification"
        />
        <StatCard
          title="Active Budget Status"
          value="Healthy"
          subtext="Workspace financial operations index"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Left column: Create Form */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader className="border-b border-surface-border/50 pb-4">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-ink-black flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-[#E91E63]" />
                Log Expense
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {!isOwner && (
                  <div className="bg-[#FFF8E1] border border-amber-200 text-amber-900 rounded-lg p-3 text-[10px] leading-relaxed font-semibold flex gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-700" />
                    <span>Teammate logging: This expense will require owner approval before ledger balance validation.</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-ink-secondary flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-ink-muted" />
                    Category
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Travel, Software tools, Hardware"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-cream-50 rounded-button px-4 py-2.5 text-xs font-semibold text-ink-primary border-none shadow-soft focus:outline-none placeholder:text-ink-secondary/40"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-ink-secondary flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-ink-muted" />
                    Amount (INR)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 1500"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-cream-50 rounded-button px-4 py-2.5 text-xs font-semibold text-ink-primary border-none shadow-soft focus:outline-none placeholder:text-ink-secondary/40"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-ink-secondary flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-ink-muted" />
                    Expense Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-cream-50 rounded-button px-4 py-2.5 text-xs font-semibold text-ink-primary border-none shadow-soft focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-ink-secondary">Description</label>
                  <textarea
                    placeholder="Details about this payment..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-cream-50 rounded-button px-4 py-2.5 text-xs font-semibold text-ink-primary border-none shadow-soft focus:outline-none h-20 resize-none placeholder:text-ink-secondary/40"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full btn-primary py-2.5 rounded-button text-xs font-bold gap-1.5 flex items-center justify-center cursor-pointer shadow-soft"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Save Expense
                </button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right column: Ledger listing */}
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardHeader className="border-b border-surface-border/50 pb-4">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-ink-black flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-emerald-600" />
                Ledger Log Entries
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-surface-border/50">
              {isLoading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-[#E91E63]" />
                  <p className="text-xs text-ink-secondary font-bold uppercase tracking-wider">Loading ledger logs…</p>
                </div>
              ) : expenses.length === 0 ? (
                <div className="py-16 text-center">
                  <Coins className="w-10 h-10 text-ink-secondary/30 mx-auto mb-3" />
                  <p className="text-sm font-bold text-ink-black">No Expenses Logged</p>
                  <p className="text-xs text-ink-secondary mt-1">Expenses logged inside your company workspace will sync here.</p>
                </div>
              ) : (
                expenses.map((exp) => (
                  <div key={exp.id} className="p-4 flex items-center justify-between hover:bg-cream-50/20 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-ink-black">{exp.category}</h4>
                        <span className="text-[10px] text-ink-secondary font-semibold">({formatDate(exp.date)})</span>
                      </div>
                      <p className="text-[10px] text-ink-secondary leading-relaxed max-w-md">{exp.description || "No description set."}</p>
                      <p className="text-[9px] text-ink-muted">Logged by: <strong className="text-ink-secondary">{exp.employee?.name || "Workspace Owner"}</strong></p>
                    </div>

                    <div className="text-right flex items-center gap-4">
                      <div>
                        <p className="text-xs font-black text-ink-black">{formatCurrency(exp.amount)}</p>
                        <span className="inline-flex items-center gap-1 mt-1 text-[9px] font-bold uppercase tracking-wider">
                          {exp.status === "approved" && (
                            <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Approved
                            </span>
                          )}
                          {exp.status === "rejected" && (
                            <span className="text-red-700 bg-red-50 px-1.5 py-0.5 rounded border border-red-200 flex items-center gap-1">
                              <XCircle className="w-3 h-3" />
                              Rejected
                            </span>
                          )}
                          {exp.status === "pending" && (
                            <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                              <Clock className="w-3 h-3 animate-pulse" />
                              Pending
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
