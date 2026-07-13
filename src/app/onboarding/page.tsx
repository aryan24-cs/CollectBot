"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { 
  Building2, 
  Percent, 
  CreditCard, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles,
  Loader2,
  AlertCircle
} from "lucide-react"

import getSupabaseBrowserClient from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

// Validation schemas
const step1Schema = z.object({
  name: z.string().min(2, "Business name must be at least 2 characters"),
  businessType: z.enum(["Agency", "Freelancer", "Gym & Fitness", "Coaching Center", "School", "Retail", "Other"]),
  email: z.string().email("Please enter a valid business email"),
  phone: z.string().regex(/^(?:\+91|0)?[6-9]\d{9}$/, "Please enter a valid 10-digit Indian phone number"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  pincode: z.string().regex(/^\d{6}$/, "Pincode must be exactly 6 digits"),
})

const step2Schema = z.object({
  gstin: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GSTIN format (15 characters)")
    .optional()
    .or(z.literal("")),
  pan: z
    .string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format (e.g. ABCDE1234F)")
    .optional()
    .or(z.literal("")),
  invoice_prefix: z.string().min(1, "Prefix is required").max(6, "Prefix must be 6 characters or less"),
})

const step3Schema = z.object({
  upi_id: z
    .string()
    .optional()
    .refine((val) => !val || /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(val), {
      message: "Please enter a valid UPI ID (e.g. name@upi)",
    })
    .or(z.literal("")),
  bank_name: z.string().optional().or(z.literal("")),
  account_number: z.string().optional().or(z.literal("")),
  ifsc_code: z
    .string()
    .optional()
    .refine((val) => !val || /^[A-Z]{4}0[A-Z0-9]{6}$/.test(val), {
      message: "Invalid IFSC format (e.g. SBIN0001234)",
    })
    .or(z.literal("")),
})

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", 
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", 
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", 
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", 
  "Uttarakhand", "West Bengal", "Delhi", "Chandigarh", "Jammu & Kashmir", "Ladakh"
]

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  
  const [currentStep, setCurrentStep] = React.useState(1)
  const [businessId, setBusinessId] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [dbError, setDbError] = React.useState<string | null>(null)

  // React Hook Form setups
  const form1 = useForm({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      name: "",
      businessType: "Other" as any,
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
    },
  })

  const form2 = useForm({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      gstin: "",
      pan: "",
      invoice_prefix: "INV",
    },
  })

  const form3 = useForm({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      upi_id: "",
      bank_name: "",
      account_number: "",
      ifsc_code: "",
    },
  })

  // Load user business and pre-fill forms on mount
  React.useEffect(() => {
    async function loadBusiness() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push("/login")
          return
        }

        // Redirect active admin users to the admin overview
        const { data: adminUser } = await supabase
          .from("admin_users")
          .select("role")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .maybeSingle()

        if (adminUser) {
          router.push("/admin/overview")
          return
        }

        // Fetch user's business
        const { data: business, error } = await supabase
          .from("businesses")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle()

        if (error) throw error

        if (business) {
          setBusinessId(business.id)
          
          form1.reset({
            name: business.name || "",
            businessType: "Other",
            email: business.email || user.email || "",
            phone: business.phone || "",
            address: business.address || "",
            city: business.city || "",
            state: business.state || "",
            pincode: business.pincode || "",
          })

          form2.reset({
            gstin: business.gstin || "",
            pan: business.pan || "",
            invoice_prefix: business.invoice_prefix || "INV",
          })

          form3.reset({
            upi_id: business.upi_id || "",
            bank_name: business.bank_name || "",
            account_number: business.account_number || "",
            ifsc_code: business.ifsc_code || "",
          })

          // Set default step based on filled fields
          if (business.upi_id && business.bank_name) {
            setCurrentStep(4)
          } else if (business.invoice_prefix) {
            setCurrentStep(3)
          } else if (business.phone) {
            setCurrentStep(2)
          }
        }
      } catch (err: any) {
        console.error("Error loading onboarding details:", err)
        setDbError("Failed to load business profile.")
      } finally {
        setLoading(false)
      }
    }

    loadBusiness()
  }, [supabase, router, form1, form2, form3])

  const onStep1Submit = async (values: z.infer<typeof step1Schema>) => {
    if (!businessId) return
    setSaving(true)
    setDbError(null)
    try {
      const { error } = await supabase
        .from("businesses")
        .update({
          name: values.name,
          logo_url: values.businessType,
          email: values.email,
          phone: values.phone,
          address: values.address,
          city: values.city,
          state: values.state,
          pincode: values.pincode,
        })
        .eq("id", businessId)

      if (error) throw error
      setCurrentStep(2)
    } catch (err: any) {
      setDbError(err.message || "Failed to save details.")
    } finally {
      setSaving(false)
    }
  }

  const onStep2Submit = async (values: z.infer<typeof step2Schema>) => {
    if (!businessId) return
    setSaving(true)
    setDbError(null)
    try {
      const { error } = await supabase
        .from("businesses")
        .update({
          gstin: values.gstin || null,
          pan: values.pan || null,
          invoice_prefix: values.invoice_prefix,
        })
        .eq("id", businessId)

      if (error) throw error
      setCurrentStep(3)
    } catch (err: any) {
      setDbError(err.message || "Failed to save tax details.")
    } finally {
      setSaving(false)
    }
  }

  const onStep3Submit = async (values: z.infer<typeof step3Schema>) => {
    if (!businessId) return
    setSaving(true)
    setDbError(null)
    try {
      const { error } = await supabase
        .from("businesses")
        .update({
          upi_id: values.upi_id || null,
          bank_name: values.bank_name || null,
          account_number: values.account_number || null,
          ifsc_code: values.ifsc_code || null,
        })
        .eq("id", businessId)

      if (error) throw error
      setCurrentStep(4)
    } catch (err: any) {
      setDbError(err.message || "Failed to save bank details.")
    } finally {
      setSaving(false)
    }
  }

  const completeOnboarding = () => {
    router.push("/dashboard")
    router.refresh()
  }

  const progressPercentage = (currentStep / 4) * 100

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-50 flex flex-col items-center justify-center text-ink-primary select-none">
        <Loader2 className="w-10 h-10 animate-spin text-brand-600 mb-4" />
        <p className="text-xs font-semibold">Loading onboarding profile...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8 select-none text-ink-primary">
      
      {/* Top Header */}
      <div className="w-full max-w-xl mx-auto flex items-center justify-between mb-8 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-dark flex items-center justify-center shadow-soft">
            <span className="text-white font-extrabold text-sm">C</span>
          </div>
          <span className="font-bold text-ink-black text-lg">Onboarding</span>
        </div>
        <div className="text-xs text-ink-secondary font-semibold uppercase tracking-wider">
          Step <span className="text-ink-black font-extrabold">{currentStep}</span> of 4
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full max-w-xl mx-auto mb-10 z-10">
        <Progress value={progressPercentage} className="h-2 bg-cream-200 [&>div]:bg-brand-600 rounded-full" />
      </div>

      {/* Main Card */}
      <div className="w-full max-w-xl mx-auto z-10 flex-grow flex items-center">
        <Card className="w-full bg-surface-white border border-surface-border/50 rounded-card shadow-card">
          
          {dbError && (
            <div className="m-6 p-4 rounded-button bg-danger-light border border-danger/25 text-danger-dark text-xs font-semibold flex gap-2 items-center">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{dbError}</span>
            </div>
          )}

          {/* STEP 1: BUSINESS DETAILS */}
          {currentStep === 1 && (
            <form onSubmit={form1.handleSubmit(onStep1Submit)}>
              <CardHeader className="border-b border-surface-border/50 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-brand-50 text-brand-600">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-ink-black font-bold uppercase tracking-wider">Business Details</CardTitle>
                    <CardDescription className="text-ink-secondary text-[10px]">Configure your workspace profile name and settings.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="name" className="text-[10px] uppercase font-bold text-ink-secondary">Business / Agency Name</Label>
                    <input 
                      id="name" 
                      className="w-full bg-cream-50 rounded-button px-4 py-3 text-xs font-semibold text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-soft border-none transition-all"
                      placeholder="My Agency" 
                      {...form1.register("name")} 
                    />
                    {form1.formState.errors.name && <p className="text-xs text-danger mt-1">{form1.formState.errors.name.message as string}</p>}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="businessType" className="text-[10px] uppercase font-bold text-ink-secondary">Business Category</Label>
                    <Select 
                       onValueChange={(val) => form1.setValue("businessType", val as any)} 
                       defaultValue={form1.getValues("businessType")}
                    >
                      <SelectTrigger className="w-full bg-cream-50 text-ink-primary h-11 border-none shadow-soft rounded-button px-4 py-2.5 text-xs font-semibold focus:ring-2 focus:ring-brand-500/20 transition-all justify-between">
                        <SelectValue placeholder="Select business type" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-surface-border rounded-xl shadow-floating z-50">
                        <SelectItem value="Agency" className="cursor-pointer text-xs py-1.5">Agency</SelectItem>
                        <SelectItem value="Freelancer" className="cursor-pointer text-xs py-1.5">Freelancer</SelectItem>
                        <SelectItem value="Gym & Fitness" className="cursor-pointer text-xs py-1.5">Gym & Fitness</SelectItem>
                        <SelectItem value="Coaching Center" className="cursor-pointer text-xs py-1.5">Coaching Center</SelectItem>
                        <SelectItem value="School" className="cursor-pointer text-xs py-1.5">School</SelectItem>
                        <SelectItem value="Retail" className="cursor-pointer text-xs py-1.5">Retail</SelectItem>
                        <SelectItem value="Other" className="cursor-pointer text-xs py-1.5">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="email" className="text-[10px] uppercase font-bold text-ink-secondary">Business Email</Label>
                    <input 
                      id="email" 
                      type="email"
                      className="w-full bg-cream-50 rounded-button px-4 py-3 text-xs font-semibold text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-soft border-none transition-all"
                      placeholder="contact@myagency.com" 
                      {...form1.register("email")} 
                    />
                    {form1.formState.errors.email && <p className="text-xs text-danger mt-1">{form1.formState.errors.email.message as string}</p>}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="phone" className="text-[10px] uppercase font-bold text-ink-secondary">Business Phone</Label>
                    <input 
                      id="phone" 
                      className="w-full bg-cream-50 rounded-button px-4 py-3 text-xs font-semibold text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-soft border-none transition-all font-mono"
                      placeholder="9876543210" 
                      {...form1.register("phone")} 
                    />
                    {form1.formState.errors.phone && <p className="text-xs text-danger mt-1">{form1.formState.errors.phone.message as string}</p>}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="address" className="text-[10px] uppercase font-bold text-ink-secondary">Full Office Address</Label>
                  <input 
                    id="address" 
                    className="w-full bg-cream-50 rounded-button px-4 py-3 text-xs font-semibold text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-soft border-none transition-all"
                    placeholder="Floor 2, Central Business Hub" 
                    {...form1.register("address")} 
                  />
                  {form1.formState.errors.address && <p className="text-xs text-danger mt-1">{form1.formState.errors.address.message as string}</p>}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="city" className="text-[10px] uppercase font-bold text-ink-secondary">City</Label>
                    <input 
                      id="city" 
                      className="w-full bg-cream-50 rounded-button px-3.5 py-3 text-xs font-semibold text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-soft border-none transition-all"
                      placeholder="Mumbai" 
                      {...form1.register("city")} 
                    />
                    {form1.formState.errors.city && <p className="text-xs text-danger mt-1">{form1.formState.errors.city.message as string}</p>}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="state" className="text-[10px] uppercase font-bold text-ink-secondary">State</Label>
                    <Select
                      value={form1.watch("state") || ""}
                      onValueChange={(val) => form1.setValue("state", val || "", { shouldValidate: true })}
                    >
                      <SelectTrigger className="w-full bg-cream-50 text-ink-primary h-11 border-none shadow-soft rounded-button px-3.5 py-2.5 text-xs font-semibold focus:ring-2 focus:ring-brand-500/20 transition-all justify-between">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-surface-border rounded-xl shadow-floating max-h-56 z-50">
                        {INDIAN_STATES.map((st) => (
                          <SelectItem key={st} value={st} className="cursor-pointer text-xs py-1.5">
                            {st}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form1.formState.errors.state && <p className="text-xs text-danger mt-1">{form1.formState.errors.state.message as string}</p>}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="pincode" className="text-[10px] uppercase font-bold text-ink-secondary">Pincode</Label>
                    <input 
                      id="pincode" 
                      className="w-full bg-cream-50 rounded-button px-3.5 py-3 text-xs font-semibold text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-soft border-none transition-all font-mono"
                      placeholder="400001" 
                      {...form1.register("pincode")} 
                    />
                    {form1.formState.errors.pincode && <p className="text-xs text-danger mt-1">{form1.formState.errors.pincode.message as string}</p>}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end border-t border-surface-border/50 mt-6 pt-6">
                <Button 
                  type="submit" 
                  disabled={saving}
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save & Continue"}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </CardFooter>
            </form>
          )}

          {/* STEP 2: TAX & LEGAL */}
          {currentStep === 2 && (
            <form onSubmit={form2.handleSubmit(onStep2Submit)}>
              <CardHeader className="border-b border-surface-border/50 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-brand-50 text-brand-600">
                    <Percent className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-ink-black font-bold uppercase tracking-wider">Tax & Legal Info</CardTitle>
                    <CardDescription className="text-ink-secondary text-[10px]">These fields will print on client invoices. (Optional)</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-1">
                  <Label htmlFor="gstin" className="text-[10px] uppercase font-bold text-ink-secondary">GSTIN Number (Optional)</Label>
                  <input 
                    id="gstin" 
                    className="w-full bg-cream-50 rounded-button px-4 py-3 text-xs font-semibold text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-soft border-none transition-all font-mono uppercase"
                    placeholder="27AAAAA1111A1Z1" 
                    {...form2.register("gstin")} 
                  />
                  {form2.formState.errors.gstin && <p className="text-xs text-danger mt-1">{form2.formState.errors.gstin.message as string}</p>}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="pan" className="text-[10px] uppercase font-bold text-ink-secondary">PAN Number (Optional)</Label>
                  <input 
                    id="pan" 
                    className="w-full bg-cream-50 rounded-button px-4 py-3 text-xs font-semibold text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-soft border-none transition-all font-mono uppercase"
                    placeholder="ABCDE1234F" 
                    {...form2.register("pan")} 
                  />
                  {form2.formState.errors.pan && <p className="text-xs text-danger mt-1">{form2.formState.errors.pan.message as string}</p>}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="invoice_prefix" className="text-[10px] uppercase font-bold text-ink-secondary">Invoice Number Prefix</Label>
                  <input 
                    id="invoice_prefix" 
                    className="w-full bg-cream-50 rounded-button px-4 py-3 text-xs font-semibold text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-soft border-none transition-all font-mono uppercase"
                    placeholder="INV" 
                    {...form2.register("invoice_prefix")} 
                  />
                  {form2.formState.errors.invoice_prefix && <p className="text-xs text-danger mt-1">{form2.formState.errors.invoice_prefix.message as string}</p>}
                  <p className="text-[10px] text-ink-secondary italic mt-1">E.g., INV, AG, TR. Maximum 6 characters.</p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between border-t border-surface-border/50 mt-6 pt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setCurrentStep(1)}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                
                <Button 
                  type="submit" 
                  disabled={saving}
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save & Continue"}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </CardFooter>
            </form>
          )}

          {/* STEP 3: PAYMENT DETAILS */}
          {currentStep === 3 && (
            <form onSubmit={form3.handleSubmit(onStep3Submit)}>
              <CardHeader className="border-b border-surface-border/50 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-brand-50 text-brand-600">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-ink-black font-bold uppercase tracking-wider">Payment Settings</CardTitle>
                    <CardDescription className="text-ink-secondary text-[10px]">
                      Configure gateway routes. (Fully optional during onboarding, can be skipped)
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-1">
                  <Label htmlFor="upi_id" className="text-[10px] uppercase font-bold text-ink-secondary">UPI ID handle (Optional)</Label>
                  <input 
                    id="upi_id" 
                    className="w-full bg-cream-50 rounded-button px-4 py-3 text-xs font-semibold text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-soft border-none transition-all font-mono"
                    placeholder="mybusiness@okaxis" 
                    {...form3.register("upi_id")} 
                  />
                  {form3.formState.errors.upi_id && <p className="text-xs text-danger mt-1">{form3.formState.errors.upi_id.message as string}</p>}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="bank_name" className="text-[10px] uppercase font-bold text-ink-secondary">Bank Name (Optional)</Label>
                  <input 
                    id="bank_name" 
                    className="w-full bg-cream-50 rounded-button px-4 py-3 text-xs font-semibold text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-soft border-none transition-all"
                    placeholder="e.g. ICICI Bank" 
                    {...form3.register("bank_name")} 
                  />
                  {form3.formState.errors.bank_name && <p className="text-xs text-danger mt-1">{form3.formState.errors.bank_name.message as string}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="account_number" className="text-[10px] uppercase font-bold text-ink-secondary">Account Number (Optional)</Label>
                    <input 
                      id="account_number" 
                      className="w-full bg-cream-50 rounded-button px-4 py-3 text-xs font-semibold text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-soft border-none transition-all font-mono"
                      placeholder="Account number" 
                      {...form3.register("account_number")} 
                    />
                    {form3.formState.errors.account_number && <p className="text-xs text-danger mt-1">{form3.formState.errors.account_number.message as string}</p>}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="ifsc_code" className="text-[10px] uppercase font-bold text-ink-secondary">IFSC Code (Optional)</Label>
                    <input 
                      id="ifsc_code" 
                      className="w-full bg-cream-50 rounded-button px-4 py-3 text-xs font-semibold text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-soft border-none transition-all font-mono uppercase"
                      placeholder="e.g. ICIC0000001" 
                      {...form3.register("ifsc_code")} 
                    />
                    {form3.formState.errors.ifsc_code && <p className="text-xs text-danger mt-1">{form3.formState.errors.ifsc_code.message as string}</p>}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between border-t border-surface-border/50 mt-6 pt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setCurrentStep(2)}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                
                <Button 
                  type="submit" 
                  disabled={saving}
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save & Finish"}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </CardFooter>
            </form>
          )}

          {/* STEP 4: SUCCESS */}
          {currentStep === 4 && (
            <div className="text-center p-8 space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-success-light border border-success/20 flex items-center justify-center text-success-dark animate-pulse">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-ink-black flex items-center justify-center gap-2">
                  You're all set! <Sparkles className="w-5 h-5 text-brand-600" />
                </h2>
                <p className="text-ink-secondary max-w-sm mx-auto text-xs font-semibold leading-relaxed">
                  Your business onboarding has completed. Now you're ready to automate invoice billing and clearing!
                </p>
              </div>

              <div className="flex flex-col gap-3 max-w-xs mx-auto pt-4">
                <button 
                  onClick={() => router.push("/invoices/new")} 
                  className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 rounded-button text-xs transition-all shadow-soft border-none cursor-pointer flex items-center justify-center gap-1.5"
                >
                  Create Your First Invoice
                </button>
                <Button 
                  onClick={completeOnboarding} 
                  className="w-full"
                >
                  Go to Dashboard
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Footer */}
      <div className="w-full max-w-xl mx-auto text-center mt-8 text-[10px] text-ink-muted uppercase tracking-wider font-bold z-10">
        © {new Date().getFullYear()} CollectBot Secure Workspace Onboarding.
      </div>
    </div>
  )
}
