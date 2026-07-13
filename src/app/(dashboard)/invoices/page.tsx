"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { 
  Plus, 
  Search, 
  Trash2, 
  Send, 
  CheckCircle, 
  Eye, 
  ChevronLeft, 
  ChevronRight,
  MoreVertical,
  Loader2,
  AlertTriangle,
  Edit3,
  FileText
} from "lucide-react"
import { toast } from "sonner"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

import { Button, buttonVariants } from "@/components/ui/button"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  formatCurrency, 
  formatDateShort, 
  getDaysOverdue, 
  cn 
} from "@/lib/utils"
import { Invoice } from "@/types"
import FilterPills from "@/components/shared/FilterPills"
import StatCard from "@/components/shared/StatCard"
import EmptyState from "@/components/shared/EmptyState"

export default function InvoicesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialStatus = searchParams.get("status") || "all"
  const initialSearch = searchParams.get("search") || ""

  const [invoices, setInvoices] = React.useState<Invoice[]>([])
  const [totalCount, setTotalCount] = React.useState(0)
  const [isLoading, setIsLoading] = React.useState(true)

  // Filtering & Search
  const [searchQuery, setSearchQuery] = React.useState(initialSearch)
  const [debouncedSearch, setDebouncedSearch] = React.useState(initialSearch)
  const [statusTab, setStatusTab] = React.useState(initialStatus)
  const [currentPage, setCurrentPage] = React.useState(1)
  const limit = 12

  // Dialog Actions
  const [invoiceToDelete, setInvoiceToDelete] = React.useState<Invoice | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  // Stats
  const [stats, setStats] = React.useState({
    totalInvoiced: 0,
    collected: 0,
    outstanding: 0,
    overdue: 0,
  })

  // Debounce search query
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setCurrentPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Sync state with URL params if they change
  React.useEffect(() => {
    const urlStatus = searchParams.get("status") || "all"
    const urlSearch = searchParams.get("search") || ""
    setStatusTab(urlStatus)
    setSearchQuery(urlSearch)
  }, [searchParams])

  // Fetch Invoices & recalculate summary stats from real data
  const fetchInvoices = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const urlParams = new URLSearchParams({
        search: debouncedSearch,
        status: statusTab,
        page: currentPage.toString(),
        limit: limit.toString(),
      })
      const res = await fetch(`/api/invoices?${urlParams.toString()}`)
      if (!res.ok) throw new Error("Failed to load invoices")
      const data = await res.json()
      setInvoices(data.invoices || [])
      setTotalCount(data.totalCount || 0)

      // Fetch all invoices to compute true stats totals
      const allRes = await fetch("/api/invoices?limit=1000")
      if (allRes.ok) {
        const allData = await allRes.json()
        const allInvs: Invoice[] = allData.invoices || []
        
        let totalInvoiced = 0
        let collected = 0
        let outstanding = 0
        let overdue = 0

        allInvs.forEach((inv) => {
          const totalVal = Number(inv.total) || 0
          const paidVal = Number(inv.amount_paid) || 0
          const dueVal = Number(inv.balance_due) || 0

          if (inv.status !== "cancelled") {
            totalInvoiced += totalVal
            collected += paidVal

            if (["sent", "viewed", "overdue", "partial"].includes(inv.status)) {
              outstanding += dueVal
            }

            const overdueDays = getDaysOverdue(inv.due_date)
            if (inv.status === "overdue" || (["sent", "viewed", "partial"].includes(inv.status) && overdueDays > 0)) {
              overdue += dueVal
            }
          }
        })

        setStats({
          totalInvoiced,
          collected,
          outstanding,
          overdue,
        })
      }
    } catch (err: any) {
      console.error(err)
      toast.error("Failed to load invoices.")
    } finally {
      setIsLoading(false)
    }
  }, [debouncedSearch, statusTab, currentPage])

  React.useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  const handleDeleteInvoice = async () => {
    if (!invoiceToDelete) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/invoices/${invoiceToDelete.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to delete invoice")
      
      toast.success(`Invoice "${invoiceToDelete.invoice_number}" deleted successfully.`)
      setInvoiceToDelete(null)
      fetchInvoices()
    } catch (err: any) {
      toast.error(err.message || "Could not delete invoice.")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleMarkPaid = async (id: string, amount: number) => {
    try {
      const res = await fetch(`/api/invoices/${id}/mark-paid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          payment_method: "manual",
          payment_date: new Date().toISOString(),
          notes: "Marked as paid from invoice registry console",
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to mark as paid")
      }

      toast.success("Invoice was successfully marked as paid.")
      fetchInvoices()
    } catch (err: any) {
      toast.error(err.message || "Could not update payment status.")
    }
  }

  const handleSendInvoice = async (id: string, invoiceNumber: string) => {
    try {
      const res = await fetch(`/api/invoices/${id}/send`, { method: "POST" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to dispatch invoice")
      }
      toast.success(`Invoice "${invoiceNumber}" was successfully sent to client.`)
      fetchInvoices()
    } catch (err: any) {
      toast.error(err.message || "Failed to send invoice.")
    }
  }

  const handleSendReminder = async (id: string, invoiceNumber: string) => {
    try {
      const res = await fetch(`/api/invoices/${id}/remind`, { method: "POST" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to trigger reminder")
      }
      toast.success(`WhatsApp reminder queued for Invoice "${invoiceNumber}"!`)
    } catch (err: any) {
      toast.error(err.message || "Could not dispatch reminder.")
    }
  }

  const totalPages = Math.ceil(totalCount / limit)

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "paid": return "success"
      case "sent": return "default"
      case "viewed": return "secondary"
      case "overdue": return "destructive"
      default: return "outline"
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      
      {/* Header section with Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-surface-border/50 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink-black leading-tight">Invoices</h1>
          <p className="text-ink-secondary text-sm">Issue itemized bills, capture client receipts, and run auto-reconciliation.</p>
        </div>
        <Link
          href="/invoices/new"
          className="btn-primary px-4 py-2.5 rounded-button text-xs font-bold gap-2"
        >
          <Plus className="w-4 h-4" />
          New Invoice
        </Link>
      </div>

      {/* Invoice Stats Summary Cards */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Billed"
          value={formatCurrency(stats.totalInvoiced)}
          subtext="Total lifetime billing volume"
        />
        <StatCard
          title="Total Collected"
          value={formatCurrency(stats.collected)}
          subtext="Cleared collections volume"
          trend={{ value: "Positive", isPositive: true }}
        />
        <StatCard
          title="Outstanding Balance"
          value={formatCurrency(stats.outstanding)}
          subtext="Unpaid invoice balances"
        />
        <StatCard
          title="Overdue Amount"
          value={formatCurrency(stats.overdue)}
          subtext="Expired invoice volumes"
          isDark={stats.overdue > 0}
        />
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface-white border border-surface-border/50 p-4 rounded-card shadow-card">
        {/* Filter Pills */}
        <FilterPills
          options={[
            { id: "all", label: "All Invoices" },
            { id: "draft", label: "Draft" },
            { id: "sent", label: "Sent" },
            { id: "paid", label: "Paid" },
            { id: "overdue", label: "Overdue" }
          ]}
          selectedId={statusTab}
          onSelect={(id) => { setStatusTab(id); setCurrentPage(1) }}
        />

        {/* Search */}
        <div className="relative w-full sm:max-w-xs shrink-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
          <input
            type="text"
            placeholder="Search invoice # or client name..."
            className="w-full bg-cream-50 rounded-button pl-10 pr-4 py-2.5 text-xs text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-soft border-none transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Invoices List Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-surface-white border border-surface-border/50 rounded-card p-6 h-56 animate-pulse space-y-4">
              <div className="flex justify-between items-center">
                <div className="w-10 h-10 rounded-full bg-cream-200" />
                <div className="w-16 h-5 bg-cream-200 rounded" />
              </div>
              <div className="h-4 bg-cream-200 rounded w-1/3" />
              <div className="h-6 bg-cream-200 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : invoices.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No Invoices Found"
          description={
            statusTab === "all"
              ? "Draft your first client invoice billing to track cashflow."
              : `You do not have any invoices matching status: "${statusTab}"`
          }
          actionLabel={statusTab === "all" ? "Create New Invoice" : undefined}
          onActionClick={statusTab === "all" ? () => router.push("/invoices/new") : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {invoices.map((inv) => {
            const daysOver = getDaysOverdue(inv.due_date)
            const isOver = (inv.status === "overdue" || (["sent", "viewed", "partial"].includes(inv.status) && daysOver > 0))
            const initials = inv.client?.name
              ? inv.client.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
              : "CL"
            
            return (
              <div 
                key={inv.id}
                className="bg-surface-white hover:bg-surface-soft border border-surface-border/50 hover:border-brand-300 rounded-card p-6 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all flex flex-col justify-between h-56 group relative"
              >
                {/* Header: Client info & actions trigger */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 bg-brand-50 border border-brand-100 text-brand-600 font-extrabold text-xs">
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-ink-black truncate">
                        {inv.client?.name || <span className="text-ink-muted italic">Deleted Client</span>}
                      </h4>
                      <p className="text-[10px] text-ink-secondary truncate">
                        {inv.client?.company_name || "Freelancer"}
                      </p>
                    </div>
                  </div>

                  {/* Dropdown Options */}
                  <DropdownMenu>
                    <DropdownMenuTrigger className="p-1 rounded-lg hover:bg-cream-200/50 text-ink-secondary hover:text-ink-primary cursor-pointer transition-colors border-none outline-none">
                      <MoreVertical className="w-4 h-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-white border border-surface-border text-ink-primary w-40 rounded-xl shadow-floating z-50">
                      <DropdownMenuItem onClick={() => router.push(`/invoices/${inv.id}`)} className="cursor-pointer text-xs py-2">
                        <Eye className="w-4 h-4 mr-2 text-ink-secondary" />
                        View Details
                      </DropdownMenuItem>
                      {inv.status === "draft" && (
                        <DropdownMenuItem onClick={() => router.push(`/invoices/new?editId=${inv.id}`)} className="cursor-pointer text-xs py-2">
                          <Edit3 className="w-4 h-4 mr-2 text-ink-secondary" />
                          Edit Invoice
                        </DropdownMenuItem>
                      )}
                      {["sent", "viewed", "overdue", "partial"].includes(inv.status) && (
                        <DropdownMenuItem onClick={() => handleMarkPaid(inv.id, Number(inv.total))} className="cursor-pointer text-xs py-2 text-success font-semibold">
                          <CheckCircle className="w-4 h-4 mr-2 text-success" />
                          Mark Paid
                        </DropdownMenuItem>
                      )}
                      {(inv.status === "draft" || inv.status === "cancelled") && (
                        <DropdownMenuItem onClick={() => setInvoiceToDelete(inv)} className="cursor-pointer text-xs py-2 text-danger font-semibold">
                          <Trash2 className="w-4 h-4 mr-2 text-danger" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Middle details: amount, status */}
                <div className="my-2 space-y-1">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[10px] font-bold text-brand-600 font-mono">
                      #{inv.invoice_number}
                    </span>
                    <span className="text-lg font-extrabold text-ink-black font-display">
                      {formatCurrency(Number(inv.total) || 0)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center text-[10px] text-ink-secondary">
                    <span>Due: {formatDateShort(inv.due_date)}</span>
                    <span className={cn(
                      "px-2 py-0.5 rounded-pill text-[9px] font-extrabold tracking-wider uppercase border border-transparent",
                      inv.status === "paid" && "bg-success-light text-success-dark",
                      inv.status === "sent" && "bg-info-light text-info-dark",
                      inv.status === "viewed" && "bg-info-light text-info-dark",
                      inv.status === "overdue" && "bg-danger-light text-danger-dark animate-pulse",
                      inv.status === "draft" && "bg-cream-200 text-ink-secondary",
                      inv.status === "cancelled" && "bg-cream-200 text-ink-muted",
                      inv.status === "partial" && "bg-warning-light text-warning-dark"
                    )}>
                      {inv.status}
                    </span>
                  </div>
                </div>

                {/* Footer options: inline action buttons */}
                <div className="border-t border-surface-border/50 pt-3 flex items-center justify-between gap-2 mt-auto">
                  <div className="flex gap-1.5 w-full">
                    {inv.status === "draft" && (
                      <button 
                        onClick={() => handleSendInvoice(inv.id, inv.invoice_number)}
                        className="w-1/2 bg-[#1A1A1A] hover:bg-[#0A0A0A] text-white text-[10px] py-2 rounded-pill font-bold shadow-soft transition-all cursor-pointer inline-flex items-center justify-center gap-1 border-none"
                      >
                        <Send className="w-3 h-3" />
                        Send Invoice
                      </button>
                    )}
                    {["sent", "viewed", "overdue", "partial"].includes(inv.status) && (
                      <button 
                        onClick={() => handleSendReminder(inv.id, inv.invoice_number)}
                        className="w-1/2 bg-[#1A1A1A] hover:bg-[#0A0A0A] text-white text-[10px] py-2 rounded-pill font-bold shadow-soft transition-all cursor-pointer inline-flex items-center justify-center gap-1 border-none"
                      >
                        <Send className="w-3 h-3 text-brand-400" />
                        Send Reminder
                      </button>
                    )}
                    {inv.status === "paid" && (
                      <div className="w-1/2 text-success font-bold text-[10px] flex items-center justify-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Paid & Cleared
                      </div>
                    )}
                    <button
                      onClick={() => router.push(`/invoices/${inv.id}`)}
                      className="w-1/2 bg-surface-white border border-surface-border hover:bg-cream-50 text-ink-primary text-[10px] py-2 rounded-pill font-bold shadow-soft transition-all cursor-pointer"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination Bar */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 bg-surface-white border border-surface-border/50 rounded-card shadow-card text-xs text-ink-secondary">
          <div>
            Showing page <span className="font-bold text-ink-primary">{currentPage}</span> of{" "}
            <span className="font-bold text-ink-primary">{totalPages}</span> ({totalCount} total invoices)
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!invoiceToDelete} onOpenChange={(open) => !open && setInvoiceToDelete(null)}>
        <DialogContent className="bg-white border-surface-border text-ink-primary max-w-sm rounded-card shadow-floating z-50">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-ink-black">Delete Invoice?</DialogTitle>
            <DialogDescription className="text-ink-secondary text-xs mt-2">
              Are you sure you want to delete invoice <strong>{invoiceToDelete?.invoice_number}</strong>?
              This action will remove all associated line items.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-2.5 pt-4">
            <Button
              variant="outline"
              onClick={() => setInvoiceToDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              className="bg-danger hover:bg-danger-dark text-white font-bold"
              onClick={handleDeleteInvoice}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
