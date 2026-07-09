"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, UserPlus, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
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

  // List of tags available
  const availableTags = ["VIP", "Regular", "New", "Slow Payer"]

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

  return (
    <div className="space-y-6 select-none max-w-3xl mx-auto">
      {/* Back Button and Title */}
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
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Add New Client</h1>
        <p className="text-slate-400 text-sm">Register contact details, taxation info, and bank references.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl text-slate-100 shadow-2xl">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-xl text-white">Client Registration</CardTitle>
                  <CardDescription className="text-slate-400">Provide basic client coordinates for invoicing.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Row 1: Name and Company */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300">Client / Contact Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Jane Smith"
                          className="bg-slate-950 border-slate-800 text-white focus-visible:ring-indigo-500"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="company_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300">Company Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Smith Consulting Ltd"
                          className="bg-slate-950 border-slate-800 text-white focus-visible:ring-indigo-500"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              {/* Row 2: Phone and Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300">Indian Phone Number *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="9876543210"
                          className="bg-slate-950 border-slate-800 text-white focus-visible:ring-indigo-500 font-mono"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300">Email Address</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="jane@smithconsulting.com"
                          className="bg-slate-950 border-slate-800 text-white focus-visible:ring-indigo-500"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              {/* Row 3: Billing Address (Textarea) */}
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Billing Address</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Suite 402, Horizon Towers, Sector 62, Noida, UP"
                        className="bg-slate-950 border-slate-800 text-white focus-visible:ring-indigo-500 min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />

              {/* Row 4: GSTIN & Payment Terms */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="gstin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300">GSTIN Number (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="09AAAAA1111A1Z1"
                          className="bg-slate-950 border-slate-800 text-white focus-visible:ring-indigo-500 font-mono uppercase"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="payment_terms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300">Payment Terms</FormLabel>
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
                              <SelectTrigger className="bg-slate-950 border-slate-800 text-white focus:ring-indigo-500 w-full">
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
                            <div className="flex w-full items-center gap-2">
                              <Input
                                type="number"
                                className="bg-slate-950 border-slate-800 text-white focus-visible:ring-indigo-500 font-mono"
                                placeholder="Number of days"
                                value={field.value}
                                onChange={(e) => form.setValue("payment_terms", parseInt(e.target.value) || 0, { shouldValidate: true })}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                className="text-xs bg-slate-950/40 border-slate-800 hover:bg-slate-800 text-slate-300"
                                onClick={() => {
                                  setIsCustomTerms(false)
                                  form.setValue("payment_terms", 7)
                                }}
                              >
                                Defaults
                              </Button>
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              {/* Row 5: Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Internal Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="VIP corporate account, prefers paying via UPI links."
                        className="bg-slate-950 border-slate-800 text-white focus-visible:ring-indigo-500 min-h-[60px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />

              {/* Row 6: Tags (VIP, Regular, New, Slow Payer) */}
              <div className="space-y-2.5">
                <Label className="text-slate-300 text-sm">Client Categorization Tags</Label>
                <div className="flex flex-wrap gap-2.5">
                  {availableTags.map((tag) => {
                    const isSelected = form.watch("tags")?.includes(tag)
                    return (
                      <button
                        key={tag}
                        type="button"
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer",
                          isSelected
                            ? "bg-indigo-500/20 border-indigo-400 text-indigo-300 shadow-md shadow-indigo-500/5"
                            : "bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                        )}
                        onClick={() => toggleTag(tag)}
                      >
                        {tag}
                      </button>
                    )
                  })}
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex justify-end gap-3 border-t border-slate-800/60 pt-5 mt-4">
              <Button
                type="button"
                variant="outline"
                className="bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-800"
                onClick={() => router.push("/clients")}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white font-medium gap-2 shadow-lg shadow-indigo-500/20"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  "Save Client"
                )}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  )
}
