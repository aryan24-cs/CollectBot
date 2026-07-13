"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { 
  ArrowLeft, 
  UserPlus, 
  Loader2, 
  Building2, 
  Phone, 
  Mail, 
  MapPin,
  FileText,
  CreditCard,
  Tag,
  StickyNote,
  Sparkles,
  Check,
  AlertCircle,
  Clock
} from "lucide-react"
import { toast } from "sonner"

import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { clientSchema, type ClientFormValues } from "@/lib/validations/client"
import { cn } from "@/lib/utils"

export default function NewClientPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = React.useState(false)
  const [isCustomTerms, setIsCustomTerms] = React.useState(false)

  const form = useForm<ClientFormValues>({
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

  const availableTags = [
    { label: "VIP", color: "bg-amber-50 border-amber-200 text-amber-700", activeColor: "bg-amber-100 border-amber-400 text-amber-800 shadow-sm" },
    { label: "Regular", color: "bg-blue-50 border-blue-200 text-blue-600", activeColor: "bg-blue-100 border-blue-400 text-blue-800 shadow-sm" },
    { label: "New", color: "bg-emerald-50 border-emerald-200 text-emerald-600", activeColor: "bg-emerald-100 border-emerald-400 text-emerald-800 shadow-sm" },
    { label: "Slow Payer", color: "bg-red-50 border-red-200 text-red-500", activeColor: "bg-red-100 border-red-400 text-red-700 shadow-sm" },
  ]

  const onSubmit = async (values: ClientFormValues) => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to create client")
      }

      toast.success(`Client "${values.name}" was successfully registered.`)
      router.push("/clients")
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "An error occurred while creating client.")
    } finally {
      setIsLoading(false)
    }
  }

  const toggleTag = (tag: string) => {
    const currentTags = form.getValues("tags") || []
    if (currentTags.includes(tag)) {
      form.setValue("tags", currentTags.filter((t) => t !== tag), { shouldValidate: true })
    } else {
      form.setValue("tags", [...currentTags, tag], { shouldValidate: true })
    }
  }

  // Watch fields for the live preview card
  const watchedName = form.watch("name")
  const watchedEmail = form.watch("email")
  const watchedPhone = form.watch("phone")
  const watchedCompany = form.watch("company_name")
  const watchedTags = form.watch("tags") || []

  return (
    <div className="select-none">
      {/* Page Header */}
      <div className="mb-8">
        <Link
          href="/clients"
          className="inline-flex items-center gap-1.5 text-ink-secondary hover:text-ink-primary text-xs font-semibold mb-4 transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Back to Clients
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-ink-black leading-tight">Register New Client</h1>
            <p className="text-ink-secondary text-sm mt-1">Add a new billing contact to your workspace directory.</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-cream-100 border border-[#EEE9E4] rounded-pill px-4 py-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-bold text-ink-secondary uppercase tracking-wider">Secure Workspace</span>
          </div>
        </div>
      </div>

      {/* Two-Column Layout: Form + Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* Main Form Column */}
        <div className="lg:col-span-8 space-y-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

              {/* Section 1: Identity */}
              <div className="bg-surface-white border border-surface-border/50 rounded-card shadow-card overflow-hidden">
                <div className="px-6 py-4 border-b border-[#EEE9E4] flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#FAF8F5] border border-[#EEE9E4] flex items-center justify-center">
                    <UserPlus className="w-4 h-4 text-ink-secondary" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-ink-black">Contact Identity</h3>
                    <p className="text-[10px] text-ink-secondary font-medium">Primary client information and company details.</p>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-[10px] uppercase font-bold text-ink-secondary flex items-center gap-1.5">
                            <UserPlus className="w-3 h-3" />
                            Client / Contact Name <span className="text-[#E91E63]">*</span>
                          </FormLabel>
                          <FormControl>
                            <input
                              placeholder="Jane Smith"
                              className="w-full bg-cream-50 rounded-button px-4 py-3 text-xs font-semibold text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-soft border-none transition-all placeholder:text-ink-secondary/40"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-[10px] text-[#E91E63] font-semibold" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="company_name"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-[10px] uppercase font-bold text-ink-secondary flex items-center gap-1.5">
                            <Building2 className="w-3 h-3" />
                            Company Name
                          </FormLabel>
                          <FormControl>
                            <input
                              placeholder="Smith Consulting Ltd"
                              className="w-full bg-cream-50 rounded-button px-4 py-3 text-xs font-semibold text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-soft border-none transition-all placeholder:text-ink-secondary/40"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-[10px] text-[#E91E63] font-semibold" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-[10px] uppercase font-bold text-ink-secondary flex items-center gap-1.5">
                            <Phone className="w-3 h-3" />
                            Indian Phone Number <span className="text-[#E91E63]">*</span>
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-ink-secondary">+91</span>
                              <input
                                placeholder="9876543210"
                                className="w-full bg-cream-50 rounded-button pl-12 pr-4 py-3 text-xs font-semibold text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-soft border-none transition-all font-mono placeholder:text-ink-secondary/40"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage className="text-[10px] text-[#E91E63] font-semibold" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-[10px] uppercase font-bold text-ink-secondary flex items-center gap-1.5">
                            <Mail className="w-3 h-3" />
                            Email Address
                          </FormLabel>
                          <FormControl>
                            <input
                              type="email"
                              placeholder="jane@smithconsulting.com"
                              className="w-full bg-cream-50 rounded-button px-4 py-3 text-xs font-semibold text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-soft border-none transition-all placeholder:text-ink-secondary/40"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-[10px] text-[#E91E63] font-semibold" />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Address & Compliance */}
              <div className="bg-surface-white border border-surface-border/50 rounded-card shadow-card overflow-hidden">
                <div className="px-6 py-4 border-b border-[#EEE9E4] flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#FAF8F5] border border-[#EEE9E4] flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-ink-secondary" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-ink-black">Address & Compliance</h3>
                    <p className="text-[10px] text-ink-secondary font-medium">Billing address and GST identification for tax invoices.</p>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-[10px] uppercase font-bold text-ink-secondary flex items-center gap-1.5">
                          <MapPin className="w-3 h-3" />
                          Billing Address
                        </FormLabel>
                        <FormControl>
                          <textarea
                            placeholder="Suite 402, Horizon Towers, Sector 62, Noida, UP 201301"
                            rows={3}
                            className="w-full bg-cream-50 rounded-button px-4 py-3 text-xs font-semibold text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-soft border-none transition-all resize-none placeholder:text-ink-secondary/40"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-[10px] text-[#E91E63] font-semibold" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="gstin"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-[10px] uppercase font-bold text-ink-secondary flex items-center gap-1.5">
                          <FileText className="w-3 h-3" />
                          GSTIN Number <span className="text-ink-secondary/50 font-medium normal-case">(Optional)</span>
                        </FormLabel>
                        <FormControl>
                          <input
                            placeholder="09AAAAA1111A1Z1"
                            className="w-full bg-cream-50 rounded-button px-4 py-3 text-xs font-semibold text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-soft border-none transition-all font-mono uppercase tracking-wide placeholder:text-ink-secondary/40 placeholder:normal-case"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-[10px] text-[#E91E63] font-semibold" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Section 3: Payment & Classification */}
              <div className="bg-surface-white border border-surface-border/50 rounded-card shadow-card overflow-hidden">
                <div className="px-6 py-4 border-b border-[#EEE9E4] flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#FAF8F5] border border-[#EEE9E4] flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-ink-secondary" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-ink-black">Payment Terms & Classification</h3>
                    <p className="text-[10px] text-ink-secondary font-medium">Configure default payment cycle and categorize the client.</p>
                  </div>
                </div>

                <div className="p-6 space-y-5">
                  <FormField
                    control={form.control}
                    name="payment_terms"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-[10px] uppercase font-bold text-ink-secondary flex items-center gap-1.5">
                          <Clock className="w-3 h-3" />
                          Payment Terms
                        </FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            {!isCustomTerms ? (
                              <Select
                                onValueChange={(val) => {
                                  if (val === "custom") {
                                    setIsCustomTerms(true)
                                  } else {
                                    form.setValue("payment_terms", parseInt(val || "7"), { shouldValidate: true })
                                  }
                                }}
                                defaultValue={field.value?.toString() || "7"}
                              >
                                <SelectTrigger className="bg-cream-50 border-none text-ink-primary text-xs font-semibold shadow-soft focus:ring-2 focus:ring-brand-500/20 w-full rounded-button py-3 h-auto">
                                  <SelectValue placeholder="Select terms" />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-[#EEE9E4] text-ink-primary shadow-floating rounded-card">
                                  <SelectItem value="7" className="text-xs font-semibold">Net 7 Days</SelectItem>
                                  <SelectItem value="15" className="text-xs font-semibold">Net 15 Days</SelectItem>
                                  <SelectItem value="30" className="text-xs font-semibold">Net 30 Days</SelectItem>
                                  <SelectItem value="45" className="text-xs font-semibold">Net 45 Days</SelectItem>
                                  <SelectItem value="60" className="text-xs font-semibold">Net 60 Days</SelectItem>
                                  <SelectItem value="custom" className="text-xs font-semibold">Custom Days…</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <div className="flex w-full items-center gap-2">
                                <input
                                  type="number"
                                  className="flex-1 bg-cream-50 rounded-button px-4 py-3 text-xs font-semibold text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-soft border-none transition-all font-mono placeholder:text-ink-secondary/40"
                                  placeholder="Number of days"
                                  value={field.value}
                                  onChange={(e) => form.setValue("payment_terms", parseInt(e.target.value) || 0, { shouldValidate: true })}
                                />
                                <button
                                  type="button"
                                  className="px-3 py-2.5 rounded-button text-[10px] font-bold uppercase tracking-wider bg-cream-100 text-ink-secondary hover:bg-cream-50 border border-[#EEE9E4] transition-colors cursor-pointer"
                                  onClick={() => {
                                    setIsCustomTerms(false)
                                    form.setValue("payment_terms", 7)
                                  }}
                                >
                                  Reset
                                </button>
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage className="text-[10px] text-[#E91E63] font-semibold" />
                      </FormItem>
                    )}
                  />

                  {/* Notes */}
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-[10px] uppercase font-bold text-ink-secondary flex items-center gap-1.5">
                          <StickyNote className="w-3 h-3" />
                          Internal Notes
                        </FormLabel>
                        <FormControl>
                          <textarea
                            placeholder="VIP corporate account, prefers paying via UPI links. Always CC their accountant."
                            rows={2}
                            className="w-full bg-cream-50 rounded-button px-4 py-3 text-xs font-semibold text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-soft border-none transition-all resize-none placeholder:text-ink-secondary/40"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-[10px] text-[#E91E63] font-semibold" />
                      </FormItem>
                    )}
                  />

                  {/* Tags */}
                  <div className="space-y-2.5">
                    <Label className="text-[10px] uppercase font-bold text-ink-secondary flex items-center gap-1.5">
                      <Tag className="w-3 h-3" />
                      Client Categorization Tags
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {availableTags.map((tag) => {
                        const isSelected = form.watch("tags")?.includes(tag.label)
                        return (
                          <button
                            key={tag.label}
                            type="button"
                            className={cn(
                              "px-3.5 py-1.5 rounded-pill text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                              isSelected ? tag.activeColor : tag.color + " hover:shadow-sm"
                            )}
                            onClick={() => toggleTag(tag.label)}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                            {tag.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  className="px-5 py-2.5 rounded-button text-xs font-bold text-ink-secondary bg-cream-100 hover:bg-cream-50 border border-[#EEE9E4] transition-all cursor-pointer"
                  onClick={() => router.push("/clients")}
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary px-6 py-2.5 rounded-button text-xs font-bold gap-2 shadow-soft disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Registering…
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Save Client
                    </>
                  )}
                </button>
              </div>
            </form>
          </Form>
        </div>

        {/* Right Sidebar: Live Preview + Tips */}
        <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-6">

          {/* Live Contact Preview Card */}
          <div className="bg-surface-white border border-surface-border/50 rounded-card shadow-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#EEE9E4] flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-secondary">Live Preview</span>
            </div>
            <div className="p-5">
              <div className="flex items-start gap-3.5">
                {/* Avatar */}
                <div className="w-11 h-11 rounded-full bg-dark flex items-center justify-center text-white text-sm font-extrabold shrink-0 shadow-soft">
                  {watchedName ? watchedName.charAt(0).toUpperCase() : "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-ink-black truncate">
                    {watchedName || "Client Name"}
                  </p>
                  {watchedCompany && (
                    <p className="text-[10px] text-ink-secondary font-semibold truncate flex items-center gap-1 mt-0.5">
                      <Building2 className="w-2.5 h-2.5" />
                      {watchedCompany}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 space-y-2.5">
                {watchedPhone && (
                  <div className="flex items-center gap-2.5 text-[10px] text-ink-secondary font-semibold">
                    <Phone className="w-3 h-3 text-ink-secondary/50" />
                    <span className="font-mono">+91 {watchedPhone}</span>
                  </div>
                )}
                {watchedEmail && (
                  <div className="flex items-center gap-2.5 text-[10px] text-ink-secondary font-semibold">
                    <Mail className="w-3 h-3 text-ink-secondary/50" />
                    <span className="truncate">{watchedEmail}</span>
                  </div>
                )}
              </div>

              {watchedTags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {watchedTags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-pill bg-cream-100 border border-[#EEE9E4] text-[9px] font-bold text-ink-secondary uppercase tracking-wider"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {!watchedName && !watchedPhone && !watchedEmail && (
                <div className="mt-4 p-3 bg-cream-50 rounded-lg border border-[#EEE9E4]/50">
                  <p className="text-[10px] text-ink-secondary font-medium text-center leading-relaxed">
                    Start filling the form to see a live preview of how this client card will appear in your workspace.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Tips Card */}
          <div className="bg-surface-white border border-surface-border/50 rounded-card shadow-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#EEE9E4] flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#E91E63]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-secondary">Quick Tips</span>
            </div>
            <div className="p-5 space-y-3.5">
              {[
                { icon: Mail, text: "Adding an email will automatically notify the client when invoices are generated." },
                { icon: Phone, text: "Phone numbers enable WhatsApp automated reminders for overdue invoices." },
                { icon: FileText, text: "GSTIN is required only for B2B tax-compliant invoicing under Indian GST rules." },
                { icon: Tag, text: "Tags help you filter and categorize clients in the directory for faster lookups." },
              ].map((tip, idx) => {
                const TipIcon = tip.icon
                return (
                  <div key={idx} className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-md bg-cream-100 border border-[#EEE9E4] flex items-center justify-center shrink-0 mt-0.5">
                      <TipIcon className="w-2.5 h-2.5 text-ink-secondary" />
                    </div>
                    <p className="text-[10px] text-ink-secondary font-medium leading-relaxed">{tip.text}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Data Handling Notice */}
          <div className="px-4 py-3 bg-cream-50 border border-[#EEE9E4]/50 rounded-card">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-ink-secondary/50 mt-0.5 shrink-0" />
              <p className="text-[9px] text-ink-secondary/60 font-medium leading-relaxed">
                All client data is stored securely with AES-256 encryption at rest. Information is never shared with third parties outside of payment processing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
