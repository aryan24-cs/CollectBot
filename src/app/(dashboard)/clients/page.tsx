"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Eye, 
  FilePlus, 
  ChevronLeft, 
  ChevronRight,
  MoreVertical,
  Loader2,
  Users,
  Building,
  Phone
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
import { formatCurrency, cn } from "@/lib/utils"
import { Client } from "@/types"
import FilterPills from "@/components/shared/FilterPills"
import StatCard from "@/components/shared/StatCard"
import EmptyState from "@/components/shared/EmptyState"

export default function ClientsPage() {
  const router = useRouter()
  const [clients, setClients] = React.useState<Client[]>([])
  const [totalCount, setTotalCount] = React.useState(0)
  const [isLoading, setIsLoading] = React.useState(true)
  
  // Search & Filtering State
  const [searchQuery, setSearchQuery] = React.useState("")
  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  const [filterStatus, setFilterStatus] = React.useState("all") // all, has_outstanding
  const [sortBy, setSortBy] = React.useState("name") // name, outstanding_amount, created_at
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc")
  const [currentPage, setCurrentPage] = React.useState(1)
  const limit = 12

  // Delete Confirmation State
  const [clientToDelete, setClientToDelete] = React.useState<Client | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  // Stats sums
  const [stats, setStats] = React.useState({
    totalClients: 0,
    outstandingSum: 0,
    paidSum: 0,
  })

  // Debounce search query
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setCurrentPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch clients from API
  const fetchClients = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const urlParams = new URLSearchParams({
        search: debouncedSearch,
        filter: filterStatus,
        page: currentPage.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder,
      })
      const res = await fetch(`/api/clients?${urlParams.toString()}`)
      if (!res.ok) throw new Error("Failed to fetch clients")
      
      const data = await res.json()
      setClients(data.clients || [])
      setTotalCount(data.totalCount || 0)

      // Fetch summary sums across all clients
      const allRes = await fetch("/api/clients?limit=1000")
      if (allRes.ok) {
        const allData = await allRes.json()
        const allClis: Client[] = allData.clients || []
        
        let outstandingSum = 0
        let paidSum = 0

        allClis.forEach((c) => {
          outstandingSum += (c as any).outstanding_amount || 0
          paidSum += Number(c.total_paid) || 0
        })

        setStats({
          totalClients: allClis.length,
          outstandingSum,
          paidSum,
        })
      }
    } catch (err: any) {
      console.error(err)
      toast.error("Failed to load clients.")
    } finally {
      setIsLoading(false)
    }
  }, [debouncedSearch, filterStatus, currentPage, sortBy, sortOrder])

  React.useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const handleDeleteClient = async () => {
    if (!clientToDelete) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/clients/${clientToDelete.id}`, {
        method: "DELETE",
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete client")
      }

      toast.success(`Client "${clientToDelete.name}" was successfully deleted.`)
      setClientToDelete(null)
      fetchClients()
    } catch (err: any) {
      toast.error(err.message || "Could not delete client.")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(field)
      setSortOrder("asc")
    }
    setCurrentPage(1)
  }

  const totalPages = Math.ceil(totalCount / limit)

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-surface-border/50 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink-black leading-tight">Clients</h1>
          <p className="text-ink-secondary text-sm">Manage contacts, billing addresses, and payment tracking.</p>
        </div>
        <Link
          href="/clients/new"
          className="btn-primary px-4 py-2.5 rounded-button text-xs font-bold gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Client
        </Link>
      </div>

      {/* Stats summaries */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
        <StatCard
          title="Total Clients"
          value={stats.totalClients}
          subtext="Total registered billing profiles"
        />
        <StatCard
          title="Total Payments Received"
          value={formatCurrency(stats.paidSum)}
          subtext="Lifetime paid collections sum"
          trend={{ value: "Positive", isPositive: true }}
        />
        <StatCard
          title="Outstanding Receivable"
          value={formatCurrency(stats.outstandingSum)}
          subtext="Accumulated unpaid balances"
          isDark={stats.outstandingSum > 0}
        />
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-surface-white border border-surface-border/50 p-4 rounded-card shadow-card">
        {/* Filter Pills */}
        <FilterPills
          options={[
            { id: "all", label: "All Contacts" },
            { id: "has_outstanding", label: "Has Outstanding Balances" }
          ]}
          selectedId={filterStatus}
          onSelect={(id) => { setFilterStatus(id); setCurrentPage(1) }}
        />

        {/* Search */}
        <div className="relative w-full sm:max-w-xs shrink-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
          <input
            type="text"
            placeholder="Search by name, phone, or company..."
            className="w-full bg-cream-50 rounded-button pl-10 pr-4 py-2.5 text-xs text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-soft border-none transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Sort Buttons Bar */}
      <div className="flex gap-2 flex-wrap items-center text-xs font-semibold text-ink-secondary px-1">
        <span>Sort by:</span>
        <button 
          onClick={() => handleSort("name")}
          className={cn(
            "px-2.5 py-1 rounded-pill hover:bg-cream-100/50 transition-colors cursor-pointer",
            sortBy === "name" && "text-brand-600 bg-cream-100 font-extrabold"
          )}
        >
          Name {sortBy === "name" && (sortOrder === "asc" ? "↑" : "↓")}
        </button>
        <button 
          onClick={() => handleSort("outstanding_amount")}
          className={cn(
            "px-2.5 py-1 rounded-pill hover:bg-cream-100/50 transition-colors cursor-pointer",
            sortBy === "outstanding_amount" && "text-brand-600 bg-cream-100 font-extrabold"
          )}
        >
          Outstanding {sortBy === "outstanding_amount" && (sortOrder === "asc" ? "↑" : "↓")}
        </button>
        <button 
          onClick={() => handleSort("created_at")}
          className={cn(
            "px-2.5 py-1 rounded-pill hover:bg-cream-100/50 transition-colors cursor-pointer",
            sortBy === "created_at" && "text-brand-600 bg-cream-100 font-extrabold"
          )}
        >
          Date Added {sortBy === "created_at" && (sortOrder === "asc" ? "↑" : "↓")}
        </button>
      </div>

      {/* Clients Card Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-surface-white border border-surface-border/50 rounded-card p-6 h-48 animate-pulse space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-cream-200" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 bg-cream-200 rounded w-1/2" />
                  <div className="h-3 bg-cream-200 rounded w-1/3" />
                </div>
              </div>
              <div className="h-5 bg-cream-200 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Clients Found"
          description={
            filterStatus === "all"
              ? "Register your client contacts to easily track outstanding invoice sums."
              : "No clients found with positive outstanding receivable balances."
          }
          actionLabel={filterStatus === "all" ? "Add Client" : undefined}
          onActionClick={filterStatus === "all" ? () => router.push("/clients/new") : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map((client) => {
            const initials = client.name
              ? client.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
              : "CL"
            const outstanding = (client as any).outstanding_amount || 0
            const totalPaid = Number(client.total_paid) || 0

            return (
              <div 
                key={client.id}
                className="bg-surface-white hover:bg-surface-soft border border-surface-border/50 hover:border-brand-300 rounded-card p-6 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all flex flex-col justify-between h-48 group relative"
              >
                {/* Header: Name, Company, Avatar */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 bg-brand-50 border border-brand-100 text-brand-600 font-extrabold text-xs">
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-ink-black truncate group-hover:text-brand-650 transition-colors">
                        {client.name}
                      </h4>
                      <p className="text-[10px] text-ink-secondary truncate flex items-center gap-1 mt-0.5">
                        <Building className="w-3 h-3 text-ink-muted shrink-0" />
                        {client.company_name || "Freelancer"}
                      </p>
                    </div>
                  </div>

                  {/* Dropdown Options */}
                  <DropdownMenu>
                    <DropdownMenuTrigger className="p-1 rounded-lg hover:bg-cream-200/50 text-ink-secondary hover:text-ink-primary cursor-pointer transition-colors border-none outline-none">
                      <MoreVertical className="w-4 h-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-white border border-surface-border text-ink-primary w-40 rounded-xl shadow-floating z-50">
                      <DropdownMenuItem onClick={() => router.push(`/clients/${client.id}`)} className="cursor-pointer text-xs py-2">
                        <Eye className="w-4 h-4 mr-2 text-ink-secondary" />
                        View Ledger
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push(`/clients/new?editId=${client.id}`)} className="cursor-pointer text-xs py-2">
                        <Edit3 className="w-4 h-4 mr-2 text-ink-secondary" />
                        Edit Contact
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setClientToDelete(client)} className="cursor-pointer text-xs py-2 text-danger font-semibold">
                        <Trash2 className="w-4 h-4 mr-2 text-danger" />
                        Delete Client
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Body Details: outstanding balance */}
                <div className="grid grid-cols-2 gap-2 border-t border-b border-surface-border/50 py-2.5 my-2">
                  <div className="space-y-0.5">
                    <span className="text-[9px] uppercase font-bold text-ink-secondary">Receivable</span>
                    <p className={cn("text-xs font-extrabold font-mono", outstanding > 0 ? "text-danger" : "text-ink-secondary")}>
                      {formatCurrency(outstanding)}
                    </p>
                  </div>
                  <div className="space-y-0.5 text-right">
                    <span className="text-[9px] uppercase font-bold text-ink-secondary">Total Cleared</span>
                    <p className="text-xs font-extrabold font-mono text-success-dark">
                      {formatCurrency(totalPaid)}
                    </p>
                  </div>
                </div>

                {/* Footer options: quick actions */}
                <div className="flex gap-2 w-full mt-auto">
                  <button
                    onClick={() => router.push(`/invoices/new?clientId=${client.id}`)}
                    className="w-1/2 bg-[#1A1A1A] hover:bg-[#0A0A0A] text-white text-[10px] py-1.5 rounded-pill font-bold shadow-soft transition-all cursor-pointer border-none flex items-center justify-center gap-1"
                  >
                    <FilePlus className="w-3 h-3" />
                    Draft Bill
                  </button>
                  
                  <button
                    onClick={() => router.push(`/clients/${client.id}`)}
                    className="w-1/2 bg-surface-white border border-surface-border hover:bg-cream-50 text-ink-primary text-[10px] py-1.5 rounded-pill font-bold shadow-soft transition-all cursor-pointer"
                  >
                    View History
                  </button>
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
            <span className="font-bold text-ink-primary">{totalPages}</span> ({totalCount} total contacts)
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
      <Dialog open={!!clientToDelete} onOpenChange={(open) => !open && setClientToDelete(null)}>
        <DialogContent className="bg-white border-surface-border text-ink-primary max-w-sm rounded-card shadow-floating z-50">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-ink-black">Delete Client?</DialogTitle>
            <DialogDescription className="text-ink-secondary text-xs mt-2 leading-relaxed">
              Are you sure you want to permanently delete <strong>{clientToDelete?.name}</strong>?
              This will erase <strong>all associated data</strong> including invoices, payments, reminders, and billing history. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-2.5 pt-4">
            <Button
              variant="outline"
              onClick={() => setClientToDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              className="bg-danger hover:bg-danger-dark text-white font-bold"
              onClick={handleDeleteClient}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete Contact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
