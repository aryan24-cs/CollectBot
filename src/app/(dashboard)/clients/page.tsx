"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { 
  Users, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Eye, 
  FilePlus, 
  ChevronDown, 
  ArrowUpDown, 
  ChevronLeft, 
  ChevronRight,
  MoreVertical,
  Loader2,
  HelpCircle
} from "lucide-react"
import { toast } from "sonner"

import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  const limit = 20

  // Delete Confirmation State
  const [clientToDelete, setClientToDelete] = React.useState<Client | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  // Debounce search query
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setCurrentPage(1) // Reset to page 1 on new search
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
    } catch (err: any) {
      console.error(err)
      toast.error("Failed to load clients. Please refresh.")
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
    <div className="space-y-6 select-none">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Clients</h1>
          <p className="text-slate-400 text-sm">Manage contacts, billing addresses, and payment tracking.</p>
        </div>
        <Link
          href="/clients/new"
          className={cn(
            buttonVariants({ variant: "default" }),
            "bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white gap-2 shadow-lg shadow-indigo-500/10"
          )}
        >
          <Plus className="w-4 h-4" />
          Add Client
        </Link>
      </div>

      {/* Filter and Search Bar Card */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-900/60 backdrop-blur-md p-4 rounded-xl border border-slate-800/80">
        {/* Search */}
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            placeholder="Search by name, phone, or company..."
            className="pl-10 bg-slate-950/80 border-slate-800 text-white focus-visible:ring-indigo-500 focus-visible:border-slate-800 placeholder:text-slate-600 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Dropdown filters */}
        <div className="flex w-full sm:w-auto gap-3 items-center">
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full sm:w-44 bg-slate-950/40 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white justify-between text-xs font-medium px-3.5 py-1.5 rounded-md flex items-center cursor-pointer">
              <span>
                {filterStatus === "all" ? "All Clients" : "Has Outstanding"}
              </span>
              <ChevronDown className="w-3.5 h-3.5 ml-2 opacity-50" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-slate-900 border-slate-800 text-slate-100 w-44">
              <DropdownMenuItem onClick={() => { setFilterStatus("all"); setCurrentPage(1) }}>
                All Clients
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setFilterStatus("has_outstanding"); setCurrentPage(1) }}>
                Has Outstanding
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger className="w-full sm:w-44 bg-slate-950/40 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white justify-between text-xs font-medium px-3.5 py-1.5 rounded-md flex items-center cursor-pointer">
              <span>
                Sort by: {sortBy === "name" ? "Name" : sortBy === "outstanding_amount" ? "Outstanding" : "Date Added"}
              </span>
              <ChevronDown className="w-3.5 h-3.5 ml-2 opacity-50" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-slate-900 border-slate-800 text-slate-100 w-44">
              <DropdownMenuItem onClick={() => handleSort("name")}>Name</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort("outstanding_amount")}>Outstanding</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort("created_at")}>Date Added</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Clients Table Card */}
      <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl text-slate-100 overflow-hidden shadow-2xl">
        <CardContent className="p-0">
          {isLoading ? (
            /* Loading Skeleton */
            <div className="p-8 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="w-10 h-10 bg-slate-800 rounded-full" />
                  <div className="flex-grow space-y-2">
                    <div className="h-4 bg-slate-800 rounded w-1/4" />
                    <div className="h-3 bg-slate-800 rounded w-1/3" />
                  </div>
                  <div className="w-20 h-4 bg-slate-800 rounded" />
                </div>
              ))}
            </div>
          ) : clients.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-800/55 border border-slate-800 flex items-center justify-center text-slate-600 mb-4 animate-bounce">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">No clients found</h3>
              <p className="text-slate-500 text-sm max-w-sm mb-6">
                Add clients to easily draft invoices, send reminders, and track your cashflow.
              </p>
              <Link
                href="/clients/new"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300 font-semibold gap-2"
                )}
              >
                <Plus className="w-4 h-4" />
                Add Your First Client
              </Link>
            </div>
          ) : (
            /* Data Grid Table */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 bg-slate-900/40 text-xs font-semibold text-slate-400 tracking-wider">
                    <th className="px-6 py-4">Client Details</th>
                    <th className="px-6 py-4">Phone Number</th>
                    <th className="px-6 py-4">Payment Terms</th>
                    <th className="px-6 py-4 text-right">Outstanding Amount</th>
                    <th className="px-6 py-4 text-right">Total Paid</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm text-slate-300">
                  {clients.map((client) => {
                    const initials = client.name
                      ? client.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)
                      : "CL"
                    
                    const outstanding = (client as any).outstanding_amount || 0
                    const totalPaid = Number(client.total_paid) || 0

                    return (
                      <tr key={client.id} className="hover:bg-slate-800/20 transition-colors">
                        {/* Client details with avatar */}
                        <td className="px-6 py-4.5 flex items-center gap-3">
                          <Avatar className="h-9 w-9 bg-indigo-500/10 border border-indigo-500/20">
                            <AvatarFallback className="text-indigo-400 font-bold text-xs">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-white truncate max-w-[180px]">{client.name}</span>
                            <span className="text-xs text-slate-500 truncate max-w-[180px]">{client.company_name || "Personal"}</span>
                          </div>
                        </td>

                        {/* Phone */}
                        <td className="px-6 py-4.5 font-mono text-xs">{client.phone}</td>

                        {/* Payment terms */}
                        <td className="px-6 py-4.5">
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                            Net {client.payment_terms}
                          </span>
                        </td>

                        {/* Outstanding Amount */}
                        <td className="px-6 py-4.5 text-right font-mono font-semibold">
                          <span className={cn(outstanding > 0 ? "text-rose-400" : "text-slate-400")}>
                            {formatCurrency(outstanding)}
                          </span>
                        </td>

                        {/* Total paid */}
                        <td className="px-6 py-4.5 text-right font-mono text-emerald-400">
                          {formatCurrency(totalPaid)}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Quick action: New invoice */}
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Create Invoice"
                              className="h-8 w-8 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/30"
                              onClick={() => router.push(`/invoices/new?clientId=${client.id}`)}
                            >
                              <FilePlus className="w-4 h-4" />
                            </Button>

                            {/* View details */}
                            <Button
                              variant="ghost"
                              size="icon"
                              title="View Details"
                              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800"
                              onClick={() => router.push(`/clients/${client.id}`)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>

                            {/* Action menu */}
                            <DropdownMenu>
                              <DropdownMenuTrigger className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center justify-center rounded-md cursor-pointer">
                                <MoreVertical className="w-4 h-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="bg-slate-900 border-slate-800 text-slate-100 w-32">
                                <DropdownMenuItem onClick={() => router.push(`/clients/${client.id}`)}>
                                  <Eye className="w-3.5 h-3.5 mr-2" />
                                  View
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setClientToDelete(client)} className="text-red-400 focus:text-red-300 focus:bg-red-950/20">
                                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>

        {/* Pagination Panel */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800/80 bg-slate-900/30 text-xs text-slate-400">
            <div>
              Showing page <span className="font-semibold text-white">{currentPage}</span> of{" "}
              <span className="font-semibold text-white">{totalPages}</span> ({totalCount} total clients)
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-800 h-8"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-800 h-8"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!clientToDelete} onOpenChange={(open) => !open && setClientToDelete(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white">Delete Client?</DialogTitle>
            <DialogDescription className="text-slate-400 text-sm">
              Are you sure you want to delete <strong>{clientToDelete?.name}</strong>? 
              This action cannot be undone. Any existing invoices will persist but will no longer be linked to this client profile.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-2.5 pt-4">
            <Button
              variant="outline"
              className="bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-800"
              onClick={() => setClientToDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white font-medium gap-2"
              onClick={handleDeleteClient}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Delete Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
