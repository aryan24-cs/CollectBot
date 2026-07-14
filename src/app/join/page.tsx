"use client"

import * as React from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, ShieldCheck, KeyRound, User, Mail } from "lucide-react"
import { toast } from "sonner"

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"

const joinSchema = z
  .object({
    fullName: z.string().min(2, "Name must be at least 2 characters"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Confirm password must be at least 6 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

type JoinFormValues = z.infer<typeof joinSchema>

function JoinWorkspaceForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isLoading, setIsLoading] = React.useState(false)

  const email = searchParams.get("email") || ""
  const businessId = searchParams.get("biz_id") || ""

  const form = useForm<JoinFormValues>({
    resolver: zodResolver(joinSchema),
    defaultValues: {
      fullName: "",
      password: "",
      confirmPassword: "",
    },
  })

  React.useEffect(() => {
    if (!email || !businessId) {
      toast.error("Invalid or incomplete invitation link.")
    }
  }, [email, businessId])

  async function onSubmit(values: JoinFormValues) {
    if (!email || !businessId) {
      toast.error("Cannot register: email or business ID is missing from invite link.")
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch("/api/employees/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password: values.password,
          name: values.fullName,
          business_id: businessId,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to complete workspace registration")
      }

      toast.success("Account activated successfully! You can now log in.")
      router.push("/login")
    } catch (err: any) {
      toast.error(err.message || "An error occurred during registration.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream-100 flex flex-col items-center justify-center p-4 select-none">
      <div className="w-full max-w-md bg-white border border-[#EEE9E4] rounded-card shadow-card overflow-hidden">
        <div className="px-6 py-8 border-b border-[#EEE9E4] text-center">
          <div className="w-12 h-12 rounded-full bg-[#E91E63]/10 flex items-center justify-center border border-[#E91E63]/20 mx-auto mb-4 text-[#E91E63]">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-extrabold text-ink-black tracking-tight leading-tight">Accept Workspace Invitation</h2>
          <p className="text-xs text-ink-secondary mt-1.5 leading-relaxed">
            Register your team credentials to gain access to your assigned modules.
          </p>
        </div>

        <div className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              
              {/* Readonly Invited Email */}
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-ink-secondary flex items-center gap-1.5">
                  <Mail className="w-3 h-3" />
                  Invited Email Address
                </span>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={email || "No email detected"}
                  className="w-full bg-cream-50 rounded-button px-4 py-3 text-xs font-semibold text-ink-secondary/60 border-none shadow-soft outline-none"
                />
              </div>

              {/* Full Name */}
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[10px] uppercase font-bold text-ink-secondary flex items-center gap-1.5">
                      <User className="w-3 h-3" />
                      Full Name
                    </FormLabel>
                    <FormControl>
                      <input
                        placeholder="e.g. Jane Doe"
                        {...field}
                        className="w-full bg-cream-50 rounded-button px-4 py-3 text-xs font-semibold text-ink-primary border-none shadow-soft focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all placeholder:text-ink-secondary/35"
                      />
                    </FormControl>
                    <FormMessage className="text-[10px] text-red-600 font-bold" />
                  </FormItem>
                )}
              />

              {/* Password */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[10px] uppercase font-bold text-ink-secondary flex items-center gap-1.5">
                      <KeyRound className="w-3 h-3" />
                      Password
                    </FormLabel>
                    <FormControl>
                      <input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                        className="w-full bg-cream-50 rounded-button px-4 py-3 text-xs font-semibold text-ink-primary border-none shadow-soft focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all placeholder:text-ink-secondary/35"
                      />
                    </FormControl>
                    <FormMessage className="text-[10px] text-red-600 font-bold" />
                  </FormItem>
                )}
              />

              {/* Confirm Password */}
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[10px] uppercase font-bold text-ink-secondary flex items-center gap-1.5">
                      <KeyRound className="w-3 h-3" />
                      Confirm Password
                    </FormLabel>
                    <FormControl>
                      <input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                        className="w-full bg-cream-50 rounded-button px-4 py-3 text-xs font-semibold text-ink-primary border-none shadow-soft focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all placeholder:text-ink-secondary/35"
                      />
                    </FormControl>
                    <FormMessage className="text-[10px] text-red-600 font-bold" />
                  </FormItem>
                )}
              />

              <button
                type="submit"
                className="w-full btn-primary py-3 mt-4 rounded-button text-xs font-bold gap-2 shadow-soft disabled:opacity-50 disabled:cursor-not-allowed justify-center flex items-center"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Accepting Invite...
                  </>
                ) : (
                  "Accept Invitation"
                )}
              </button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  )
}

export default function JoinWorkspacePage() {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen bg-cream-100 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#E91E63]" />
      </div>
    }>
      <JoinWorkspaceForm />
    </React.Suspense>
  )
}
