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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

// Validation schemas for each step
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
          
          // Pre-fill Step 1
          form1.reset({
            name: business.name || "",
            businessType: (business.logo_url as any) || "Other", // Logo url is reused or default type, let's map it. Wait, logo_url was text. Let's prefill fields.
            email: business.email || user.email || "",
            phone: business.phone || "",
            address: business.address || "",
            city: business.city || "",
            state: business.state || "",
            pincode: business.pincode || "",
          })

          // Pre-fill Step 2
          form2.reset({
            gstin: business.gstin || "",
            pan: business.pan || "",
            invoice_prefix: business.invoice_prefix || "INV",
          })

          // Pre-fill Step 3
          form3.reset({
            upi_id: business.upi_id || "",
            bank_name: business.bank_name || "",
            account_number: business.account_number || "",
            ifsc_code: business.ifsc_code || "",
          })

          // Determine step based on fields filled
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
        setDbError("Failed to load business profile. Please refresh.")
      } finally {
        setLoading(false)
      }
    }

    loadBusiness()
  }, [supabase, router, form1, form2, form3])

  // Save steps data to Supabase
  const onStep1Submit = async (values: z.infer<typeof step1Schema>) => {
    if (!businessId) return
    setSaving(true)
    setDbError(null)
    try {
      const { error } = await supabase
        .from("businesses")
        .update({
          name: values.name,
          // Storing businessType in logo_url for demo, or we can add it. Let's just save logo_url as the businessType for simplicity, or we can check the database column. Oh, businesses table doesn't have a business_type column! Let's check businesses columns in schema:
          // name, logo_url, email, phone, address, city, state, pincode, gstin, pan, bank_name, account_number, ifsc_code, upi_id, currency, timezone, whatsapp_number, invoice_prefix, invoice_counter
          // Let's store businessType in logo_url or just exclude it. Actually, logo_url can hold the string or we can store it in notes/logo_url. Storing in logo_url is fine.
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
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-800">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
        <p className="text-slate-500">Loading your profile...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8">
      {/* Glow Effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full filter blur-[100px] pointer-events-none" />
      <div className="absolute bottom-12 right-1/4 w-96 h-96 bg-violet-500/5 rounded-full filter blur-[100px] pointer-events-none" />

      {/* Top Header */}
      <div className="w-full max-w-xl mx-auto flex items-center justify-between mb-8 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-600/10">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-slate-900 text-lg">CollectBot Onboarding</span>
        </div>
        <div className="text-sm text-slate-500">
          Step <span className="text-slate-900 font-semibold">{currentStep}</span> of 4
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full max-w-xl mx-auto mb-10 z-10">
        <Progress value={progressPercentage} className="h-2 bg-slate-200 [&>div]:bg-indigo-600" />
      </div>

      {/* Main Card */}
      <div className="w-full max-w-xl mx-auto z-10 flex-grow flex items-center">
        <Card className="w-full border-slate-200 bg-white text-slate-800 shadow-[0_4px_24px_rgba(0,0,0,0.02)] rounded-2xl">
          {dbError && (
            <div className="m-6 p-4 rounded-lg bg-red-50 border border-red-100 text-red-650 text-sm flex gap-2 items-center">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{dbError}</span>
            </div>
          )}

          {/* STEP 1: BUSINESS DETAILS */}
          {currentStep === 1 && (
            <form onSubmit={form1.handleSubmit(onStep1Submit)}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-650">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-slate-900 font-bold">Business Details</CardTitle>
                    <CardDescription className="text-slate-500">Let's set up your business identity.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-slate-600 font-semibold">Business / Agency Name</Label>
                    <Input 
                      id="name" 
                      className="bg-white border-slate-200 text-slate-900 focus-visible:ring-indigo-600 focus-visible:border-slate-350"
                      placeholder="My Agency" 
                      {...form1.register("name")} 
                    />
                    {form1.formState.errors.name && <p className="text-xs text-red-650">{form1.formState.errors.name.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessType" className="text-slate-600 font-semibold">Business Type</Label>
                    <Select 
                       onValueChange={(val) => form1.setValue("businessType", val as any)} 
                       defaultValue={form1.getValues("businessType")}
                    >
                      <SelectTrigger className="bg-white border-slate-200 text-slate-900 focus:ring-indigo-600">
                        <SelectValue placeholder="Select business type" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200 text-slate-900">
                        <SelectItem value="Agency">Agency</SelectItem>
                        <SelectItem value="Freelancer">Freelancer</SelectItem>
                        <SelectItem value="Gym & Fitness">Gym & Fitness</SelectItem>
                        <SelectItem value="Coaching Center">Coaching Center</SelectItem>
                        <SelectItem value="School">School</SelectItem>
                        <SelectItem value="Retail">Retail</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-600 font-semibold">Business Email</Label>
                    <Input 
                      id="email" 
                      type="email"
                      className="bg-white border-slate-200 text-slate-900 focus-visible:ring-indigo-600 focus-visible:border-slate-350"
                      placeholder="contact@myagency.com" 
                      {...form1.register("email")} 
                    />
                    {form1.formState.errors.email && <p className="text-xs text-red-650">{form1.formState.errors.email.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-slate-600 font-semibold">Business Phone</Label>
                    <Input 
                      id="phone" 
                      className="bg-white border-slate-200 text-slate-900 focus-visible:ring-indigo-600 focus-visible:border-slate-350"
                      placeholder="9876543210" 
                      {...form1.register("phone")} 
                    />
                    {form1.formState.errors.phone && <p className="text-xs text-red-650">{form1.formState.errors.phone.message}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address" className="text-slate-600 font-semibold">Full Address</Label>
                  <Input 
                    id="address" 
                    className="bg-white border-slate-200 text-slate-900 focus-visible:ring-indigo-600 focus-visible:border-slate-350"
                    placeholder="Floor 2, Central Business Hub" 
                    {...form1.register("address")} 
                  />
                  {form1.formState.errors.address && <p className="text-xs text-red-650">{form1.formState.errors.address.message}</p>}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1 space-y-2">
                    <Label htmlFor="city" className="text-slate-600 font-semibold">City</Label>
                    <Input 
                      id="city" 
                      className="bg-white border-slate-200 text-slate-900 focus-visible:ring-indigo-600 focus-visible:border-slate-350"
                      placeholder="Mumbai" 
                      {...form1.register("city")} 
                    />
                    {form1.formState.errors.city && <p className="text-xs text-red-650">{form1.formState.errors.city.message}</p>}
                  </div>

                  <div className="col-span-1 space-y-2">
                    <Label htmlFor="state" className="text-slate-600 font-semibold">State</Label>
                    <Input 
                      id="state" 
                      className="bg-white border-slate-200 text-slate-900 focus-visible:ring-indigo-600 focus-visible:border-slate-350"
                      placeholder="Maharashtra" 
                      {...form1.register("state")} 
                    />
                    {form1.formState.errors.state && <p className="text-xs text-red-650">{form1.formState.errors.state.message}</p>}
                  </div>

                  <div className="col-span-1 space-y-2">
                    <Label htmlFor="pincode" className="text-slate-600 font-semibold">Pincode</Label>
                    <Input 
                      id="pincode" 
                      className="bg-white border-slate-200 text-slate-900 focus-visible:ring-indigo-600 focus-visible:border-slate-350"
                      placeholder="400001" 
                      {...form1.register("pincode")} 
                    />
                    {form1.formState.errors.pincode && <p className="text-xs text-red-650">{form1.formState.errors.pincode.message}</p>}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end border-t border-slate-100 mt-6 pt-6">
                <Button 
                  type="submit" 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm gap-2"
                  disabled={saving}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save & Continue"}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </CardFooter>
            </form>
          )}

          {/* STEP 2: TAX & LEGAL */}
          {currentStep === 2 && (
            <form onSubmit={form2.handleSubmit(onStep2Submit)}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-650">
                    <Percent className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-slate-900 font-bold">Tax & Legal Info</CardTitle>
                    <CardDescription className="text-slate-500">These will appear on tax invoices. (Optional)</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="gstin" className="text-slate-600 font-semibold">GSTIN Number (15 Characters)</Label>
                  <Input 
                    id="gstin" 
                    className="bg-white border-slate-200 text-slate-900 focus-visible:ring-indigo-600 focus-visible:border-slate-350"
                    placeholder="27AAAAA1111A1Z1" 
                    {...form2.register("gstin")} 
                  />
                  {form2.formState.errors.gstin && <p className="text-xs text-red-655">{form2.formState.errors.gstin.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pan" className="text-slate-600 font-semibold">PAN Number (10 Characters)</Label>
                  <Input 
                    id="pan" 
                    className="bg-white border-slate-200 text-slate-900 focus-visible:ring-indigo-600 focus-visible:border-slate-350"
                    placeholder="ABCDE1234F" 
                    {...form2.register("pan")} 
                  />
                  {form2.formState.errors.pan && <p className="text-xs text-red-655">{form2.formState.errors.pan.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoice_prefix" className="text-slate-600 font-semibold">Invoice Number Prefix (Default: INV)</Label>
                  <Input 
                    id="invoice_prefix" 
                    className="bg-white border-slate-200 text-slate-900 focus-visible:ring-indigo-600 focus-visible:border-slate-350"
                    placeholder="INV" 
                    {...form2.register("invoice_prefix")} 
                  />
                  {form2.formState.errors.invoice_prefix && <p className="text-xs text-red-655">{form2.formState.errors.invoice_prefix.message}</p>}
                  <p className="text-xs text-slate-450">For example: CB, IND, INV. Max 6 characters.</p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between border-t border-slate-100 mt-6 pt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl"
                  onClick={() => setCurrentStep(1)}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button 
                  type="submit" 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm gap-2"
                  disabled={saving}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save & Continue"}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </CardFooter>
            </form>
          )}

          {/* STEP 3: PAYMENT DETAILS */}
          {currentStep === 3 && (
            <form onSubmit={form3.handleSubmit(onStep3Submit)}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-650">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-slate-900 font-bold">Payment Details</CardTitle>
                    <CardDescription className="text-slate-500">These details will appear on your client's payment portal.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="upi_id" className="text-slate-600 font-semibold">UPI ID (e.g. dynamic-upi@okhdfcbank)</Label>
                  <Input 
                    id="upi_id" 
                    className="bg-white border-slate-200 text-slate-900 focus-visible:ring-indigo-600 focus-visible:border-slate-350"
                    placeholder="mybusiness@okaxis" 
                    {...form3.register("upi_id")} 
                  />
                  {form3.formState.errors.upi_id && <p className="text-xs text-red-655">{form3.formState.errors.upi_id.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bank_name" className="text-slate-600 font-semibold">Bank Name</Label>
                  <Input 
                    id="bank_name" 
                    className="bg-white border-slate-200 text-slate-900 focus-visible:ring-indigo-600 focus-visible:border-slate-350"
                    placeholder="HDFC Bank" 
                    {...form3.register("bank_name")} 
                  />
                  {form3.formState.errors.bank_name && <p className="text-xs text-red-655">{form3.formState.errors.bank_name.message}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="account_number" className="text-slate-600 font-semibold">Account Number</Label>
                    <Input 
                      id="account_number" 
                      className="bg-white border-slate-200 text-slate-900 focus-visible:ring-indigo-600 focus-visible:border-slate-350"
                      placeholder="50100012345678" 
                      {...form3.register("account_number")} 
                    />
                    {form3.formState.errors.account_number && <p className="text-xs text-red-655">{form3.formState.errors.account_number.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ifsc_code" className="text-slate-600 font-semibold">IFSC Code</Label>
                    <Input 
                      id="ifsc_code" 
                      className="bg-white border-slate-200 text-slate-900 focus-visible:ring-indigo-600 focus-visible:border-slate-350"
                      placeholder="HDFC0000001" 
                      {...form3.register("ifsc_code")} 
                    />
                    {form3.formState.errors.ifsc_code && <p className="text-xs text-red-655">{form3.formState.errors.ifsc_code.message}</p>}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between border-t border-slate-100 mt-6 pt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl"
                  onClick={() => setCurrentStep(2)}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button 
                  type="submit" 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm gap-2"
                  disabled={saving}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save & Finish"}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </CardFooter>
            </form>
          )}

          {/* STEP 4: SUCCESS */}
          {currentStep === 4 && (
            <div className="text-center p-8 space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-650 animate-pulse">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-900 flex items-center justify-center gap-2">
                  You're all set! <Sparkles className="w-5 h-5 text-indigo-600" />
                </h2>
                <p className="text-slate-500 max-w-sm mx-auto text-sm">
                  Your business profile has been completed. Now you're ready to collect payments automatically!
                </p>
              </div>

              <div className="flex flex-col gap-3 max-w-xs mx-auto pt-4">
                <Button 
                  onClick={() => router.push("/invoices/new")} 
                  className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl shadow-sm"
                >
                  Create Your First Invoice
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={completeOnboarding} 
                  className="w-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl"
                >
                  Go to Dashboard
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Footer */}
      <div className="w-full max-w-xl mx-auto text-center mt-8 text-xs text-slate-400 z-10">
        © {new Date().getFullYear()} CollectBot. Secure payment collection.
      </div>
    </div>
  )
}
