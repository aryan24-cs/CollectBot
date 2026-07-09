"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { 
  ArrowLeft, 
  Trash2, 
  Edit3, 
  IndianRupee, 
  TrendingUp, 
  Clock, 
  CheckCircle,
  FilePlus, 
  Loader2, 
  Mail, 
  Phone, 
  Building,
  Bell,
  Calendar,
  AlertCircle
} from "lucide-react"
import { toast } from "sonner"

import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency, formatDate, formatDateShort, getInvoiceStatusColor, cn } from "@/lib/utils"
import { clientSchema, type ClientFormValues } from "@/lib/validations/client"
import { Client, Invoice } from "@/types"

interface ClientDetailsResponse {
  client: Client & { outstanding_amount: number }
  stats: {
    totalInvoiced: number
    totalPaid: number
    outstandingBalance: number
    averagePaymentDays: number
    onTimePaymentRate: number
  }
  invoices: Invoice[]
  reminders: any[]
}

export default function ClientDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const clientId = params.id as string

  const [data, setData] = React.useState<ClientDetailsResponse | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [isDeletingDialogOpen, setIsDeletingDialogOpen] = React.useState(false)
  
  // Edit form state
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [isSavingEdit, setIsSavingEdit] = React.useState(false)
  const [isCustomTerms, setIsCustomTerms] = React.useState(false)

  const editForm = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema) as any,
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      company_name: "",
      address: "",
      gstin: "",
      payment_terms: 7,
      notes: "",
      tags: [],
    },
  })

  const fetchClientDetails = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/clients/${clientId}`)
      if (!res.ok) {
        throw new Error("Failed to load client details")
      }
      const json = await res.json()
      setData(json)
      
      // Sync edit form default values
      if (json.client) {
        editForm.reset({
          name: json.client.name || "",
          email: json.client.email || "",
          phone: json.client.phone || "",
          company_name: json.client.company_name || "",
          address: json.client.address || "",
          gstin: json.client.gstin || "",
          payment_terms: json.client.payment_terms || 7,
          notes: json.client.notes || "",
          tags: json.client.tags || [],
        })
        setIsCustomTerms(![7, 15, 30, 45, 60].includes(json.client.payment_terms))
      }
    } catch (err: any) {
      toast.error(err.message || "Could not fetch client.")
    } finally {
      setIsLoading(false)
    }
  }, [clientId, editForm])

  React.useEffect(() => {
    fetchClientDetails()
  }, [fetchClientDetails])

  const handleDeleteClient = async () => {
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: "DELETE",
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || "Failed to delete client")
      }
      toast.success("Client deleted successfully.")
      router.push("/clients")
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Could not delete client.")
    } finally {
      setIsDeleting(false)
      setIsDeletingDialogOpen(false)
    }
  }

  const onEditSubmit = async (values: ClientFormValues) => {
    setIsSavingEdit(true)
    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || "Failed to update client details")
      }
      toast.success("Client details updated.")
      setIsEditDialogOpen(false)
      fetchClientDetails()
    } catch (err: any) {
      toast.error(err.message || "Could not save client details.")
    } finally {
      setIsSavingEdit(false)
    }
  }

  const toggleTag = (tag: string) => {
    const currentTags = editForm.getValues("tags") || []
    if (currentTags.includes(tag)) {
      editForm.setValue("tags", currentTags.filter((t) => t !== tag))
    } else {
      editForm.setValue("tags", [...currentTags, tag])
    }
  }

  const availableTags = ["VIP", "Regular", "New", "Slow Payer"]

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-white">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
        <p className="text-slate-400">Loading client profile...</p>
      </div>
    )
  }

  if (!data || !data.client) {
    return (
      <div className="text-center py-20 bg-slate-900 border border-slate-800 rounded-xl max-w-lg mx-auto">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Client Not Found</h2>
        <p className="text-slate-400 text-sm mb-6">This client record may have been removed or does not exist.</p>
        <Link href="/clients" className={buttonVariants({ variant: "default" })}>
          Back to Clients
        </Link>
      </div>
    )
  }

  const { client, stats, invoices, reminders } = data
  const initials = client.name
    ? client.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "CL"

  return (
    <div className="space-y-6 select-none max-w-5xl mx-auto">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/clients"
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "text-slate-400 hover:text-white hover:bg-slate-800 -ml-3 mb-2 gap-2 text-xs"
            )}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Clients
          </Link>
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 bg-indigo-500/10 border border-indigo-500/20">
              <AvatarFallback className="text-indigo-400 font-extrabold text-base">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white">{client.name}</h1>
              <p className="text-slate-400 text-sm">{client.company_name || "Independent Account"}</p>
            </div>
          </div>
        </div>

        {/* Edit and delete controls */}
        <div className="flex gap-2.5 items-center">
          <Link
            href={`/invoices/new?clientId=${client.id}`}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 hover:text-indigo-300 border-indigo-500/20 text-xs flex items-center"
            )}
          >
            <FilePlus className="w-4 h-4 mr-2" />
            New Invoice
          </Link>

          {/* Edit Dialog Trigger */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogTrigger className={cn(buttonVariants({ variant: "outline" }), "border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white text-xs cursor-pointer")}>
              <Edit3 className="w-4 h-4 mr-2" />
              Edit Profile
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold text-white">Edit Client Profile</DialogTitle>
                <DialogDescription className="text-slate-400 text-xs">
                  Update contact settings and invoice terms for this client.
                </DialogDescription>
              </DialogHeader>

              <Form {...editForm}>
                <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-300 text-xs">Client Name *</FormLabel>
                          <FormControl>
                            <Input className="bg-slate-950 border-slate-800 text-white" {...field} />
                          </FormControl>
                          <FormMessage className="text-red-400 text-xs" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="company_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-300 text-xs">Company Name</FormLabel>
                          <FormControl>
                            <Input className="bg-slate-950 border-slate-800 text-white" {...field} />
                          </FormControl>
                          <FormMessage className="text-red-400 text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-300 text-xs">Phone *</FormLabel>
                          <FormControl>
                            <Input className="bg-slate-950 border-slate-800 text-white font-mono" {...field} />
                          </FormControl>
                          <FormMessage className="text-red-400 text-xs" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-300 text-xs">Email Address</FormLabel>
                          <FormControl>
                            <Input type="email" className="bg-slate-950 border-slate-800 text-white" {...field} />
                          </FormControl>
                          <FormMessage className="text-red-400 text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={editForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-300 text-xs">Address</FormLabel>
                        <FormControl>
                          <Textarea className="bg-slate-950 border-slate-800 text-white min-h-[60px]" {...field} />
                        </FormControl>
                        <FormMessage className="text-red-400 text-xs" />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="gstin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-300 text-xs">GSTIN</FormLabel>
                          <FormControl>
                            <Input className="bg-slate-950 border-slate-800 text-white uppercase font-mono" {...field} />
                          </FormControl>
                          <FormMessage className="text-red-400 text-xs" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="payment_terms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-300 text-xs">Payment Terms</FormLabel>
                          <FormControl>
                            {!isCustomTerms ? (
                              <Select
                                onValueChange={(val) => {
                                  if (val === "custom") {
                                    setIsCustomTerms(true)
                                  } else {
                                    editForm.setValue("payment_terms", parseInt(val || "7"))
                                  }
                                }}
                                defaultValue={field.value?.toString() || "7"}
                              >
                                <SelectTrigger className="bg-slate-950 border-slate-800 text-white focus:ring-indigo-500">
                                  <SelectValue placeholder="Select terms" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                  <SelectItem value="7">Net 7 Days</SelectItem>
                                  <SelectItem value="15">Net 15 Days</SelectItem>
                                  <SelectItem value="30">Net 30 Days</SelectItem>
                                  <SelectItem value="45">Net 45 Days</SelectItem>
                                  <SelectItem value="60">Net 60 Days</SelectItem>
                                  <SelectItem value="custom">Custom Days</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  className="bg-slate-950 border-slate-800 text-white font-mono"
                                  value={field.value}
                                  onChange={(e) => editForm.setValue("payment_terms", parseInt(e.target.value) || 0)}
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="text-xs bg-slate-950/40 border-slate-800"
                                  onClick={() => {
                                    setIsCustomTerms(false)
                                    editForm.setValue("payment_terms", 7)
                                  }}
                                >
                                  Reset
                                </Button>
                              </div>
                            )}
                          </FormControl>
                          <FormMessage className="text-red-400 text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={editForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-300 text-xs">Internal Notes</FormLabel>
                        <FormControl>
                          <Textarea className="bg-slate-950 border-slate-800 text-white min-h-[60px]" {...field} />
                        </FormControl>
                        <FormMessage className="text-red-400 text-xs" />
                      </FormItem>
                    )}
                  />

                  {/* Tags */}
                  <div className="space-y-2">
                    <Label className="text-slate-300 text-xs">Tags</Label>
                    <div className="flex gap-2">
                      {availableTags.map((tag) => {
                        const isSelected = editForm.watch("tags")?.includes(tag)
                        return (
                          <button
                            key={tag}
                            type="button"
                            className={cn(
                              "px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all cursor-pointer",
                              isSelected
                                ? "bg-indigo-500/20 border-indigo-400 text-indigo-300"
                                : "bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200"
                            )}
                            onClick={() => toggleTag(tag)}
                          >
                            {tag}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <DialogFooter className="pt-4 border-t border-slate-800/60 mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-800"
                      onClick={() => setIsEditDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white"
                      disabled={isSavingEdit}
                    >
                      {isSavingEdit ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Save Changes
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Delete Dialog Trigger */}
          <Dialog open={isDeletingDialogOpen} onOpenChange={setIsDeletingDialogOpen}>
            <Button
              variant="outline"
              className="border-red-950/30 text-red-400 hover:text-white hover:bg-red-950/10 text-xs"
              onClick={() => setIsDeletingDialogOpen(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Client
            </Button>
            <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold text-white">Delete Client?</DialogTitle>
                <DialogDescription className="text-slate-400 text-sm">
                  Are you sure you want to delete <strong>{client.name}</strong>?
                  This action cannot be undone. Any existing invoices will persist but will no longer be linked to this client.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex justify-end gap-2.5 pt-4">
                <Button
                  variant="outline"
                  className="bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-800"
                  onClick={() => setIsDeletingDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white font-medium"
                  onClick={handleDeleteClient}
                  disabled={isDeleting}
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete Client"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Meta details and badges row */}
      <div className="flex flex-wrap gap-4 items-center bg-slate-900/60 backdrop-blur-md p-4 rounded-xl border border-slate-800/80 text-xs">
        <div className="flex items-center gap-1.5 text-slate-400">
          <Building className="w-3.5 h-3.5" />
          <span>{client.company_name || "N/A"}</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <Phone className="w-3.5 h-3.5" />
          <span className="font-mono">{client.phone}</span>
        </div>
        {client.email && (
          <div className="flex items-center gap-1.5 text-slate-400">
            <Mail className="w-3.5 h-3.5" />
            <span>{client.email}</span>
          </div>
        )}
        <div className="h-4 w-px bg-slate-800 hidden sm:block" />
        <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
          Payment Terms: Net {client.payment_terms} days
        </span>
        {client.tags && client.tags.map((tag: string) => (
          <span key={tag} className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold">
            {tag}
          </span>
        ))}
      </div>

      {/* Stats Cards Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="bg-slate-900 border-slate-800 text-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 text-xs font-semibold">Total Invoiced</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-extrabold font-mono text-white">{formatCurrency(stats.totalInvoiced)}</div>
            <p className="text-[10px] text-slate-500 mt-1">Lifetime total billed</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 text-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 text-xs font-semibold">Total Paid</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-extrabold font-mono text-emerald-400">{formatCurrency(stats.totalPaid)}</div>
            <p className="text-[10px] text-slate-500 mt-1">Total revenue cleared</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 text-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 text-xs font-semibold">Outstanding Balance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={cn("text-xl font-extrabold font-mono", stats.outstandingBalance > 0 ? "text-rose-400 animate-pulse" : "text-slate-400")}>
              {formatCurrency(stats.outstandingBalance)}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Pending collections</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 text-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 text-xs font-semibold">Average Payment Delay</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-extrabold font-mono text-indigo-400">{stats.averagePaymentDays} Days</div>
            <p className="text-[10px] text-slate-500 mt-1">Days from issue to payment</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 text-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 text-xs font-semibold">On-Time Pay Rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-extrabold font-mono text-amber-400">{stats.onTimePaymentRate}%</div>
            <p className="text-[10px] text-slate-500 mt-1">Cleared before due date</p>
          </CardContent>
        </Card>
      </div>

      {/* Tables layout splitting invoices and reminders */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Invoice History */}
        <Card className="col-span-2 bg-slate-900 border-slate-800 text-white overflow-hidden shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800/60 pb-4">
            <div>
              <CardTitle className="text-lg">Invoice History</CardTitle>
              <CardDescription className="text-slate-400 text-xs">Records of all bills issued to this client.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {invoices.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-sm">
                No invoices found for this client.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/80 bg-slate-900/40 text-xs font-semibold text-slate-400 tracking-wider">
                      <th className="px-5 py-3">Invoice #</th>
                      <th className="px-5 py-3">Issue Date</th>
                      <th className="px-5 py-3">Due Date</th>
                      <th className="px-5 py-3 text-right">Amount</th>
                      <th className="px-5 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="px-5 py-3.5 font-mono text-indigo-400 font-semibold">
                          <Link href={`/invoices/${inv.id}`} className="hover:underline">
                            {inv.invoice_number}
                          </Link>
                        </td>
                        <td className="px-5 py-3.5">{formatDateShort(inv.issue_date)}</td>
                        <td className="px-5 py-3.5">{formatDateShort(inv.due_date)}</td>
                        <td className="px-5 py-3.5 text-right font-mono font-semibold">
                          {formatCurrency(Number(inv.total) || 0)}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className={cn("px-2 py-0.5 rounded text-[10px] font-semibold border", getInvoiceStatusColor(inv.status))}>
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reminder Logs */}
        <Card className="col-span-1 bg-slate-900 border-slate-800 text-white overflow-hidden shadow-xl">
          <CardHeader className="border-b border-slate-800/60 pb-4">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-400" />
              <CardTitle className="text-lg">Reminder History</CardTitle>
            </div>
            <CardDescription className="text-slate-400 text-xs">WhatsApp & Email alerts sent.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {reminders.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs">
                No reminders sent to this client.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60 overflow-y-auto max-h-[350px]">
                {reminders.map((log) => (
                  <div key={log.id} className="p-4 hover:bg-slate-800/10 transition-colors space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white capitalize">{log.reminder_type.replace("_", " ")}</span>
                      <span className="text-[10px] text-slate-500">{formatDate(log.sent_at)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 uppercase font-medium">{log.channel}</span>
                      <span className={cn(
                        "px-1.5 py-0.5 rounded-[3px] text-[9px] font-bold uppercase",
                        log.status === "sent" || log.status === "delivered" 
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                          : "bg-red-500/10 text-red-400 border border-red-500/20"
                      )}>
                        {log.status}
                      </span>
                    </div>
                    {log.message_content && (
                      <p className="text-[10px] text-slate-500 italic bg-slate-950/40 p-2 rounded border border-slate-800/60 truncate max-w-full">
                        "{log.message_content}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
