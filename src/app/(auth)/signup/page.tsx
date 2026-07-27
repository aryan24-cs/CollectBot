"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import getSupabaseBrowserClient from "@/lib/supabase/client"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const signupSchema = z
  .object({
    fullName: z.string().min(2, "Name must be at least 2 characters"),
    businessName: z.string().min(2, "Business name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Confirm password must be at least 6 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

type SignupFormValues = z.infer<typeof signupSchema>

export default function SignupPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: "",
      businessName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  })

  async function onSubmit(values: SignupFormValues) {
    setIsLoading(true)
    setError(null)

    try {
      // 1. Sign up the user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            full_name: values.fullName,
          },
        },
      })

      if (authError) {
        throw new Error(authError.message)
      }

      if (!authData.user) {
        throw new Error("Signup failed. Please try again.")
      }

      // 2. Insert business record (Deferring UPI/Bank config to Settings)
      const { error: bizError } = await supabase.from("businesses").insert({
        user_id: authData.user.id,
        name: values.businessName,
        email: values.email,
      })

      if (bizError) {
        throw new Error(`Auth successful, but business creation failed: ${bizError.message}`)
      }

      // Trigger welcome email dispatch in the background
      fetch("/api/email/welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email,
          name: values.fullName,
        }),
      }).catch(err => console.error("Failed to trigger welcome email:", err))

      toast.success("Account created successfully!")
      router.push("/onboarding")
      router.refresh()
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.")
      toast.error(err.message || "Registration failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-cream-50 select-none">
      
      {/* LEFT PANEL (60% width) - Premium Cream Hero */}
      <div className="hidden lg:flex lg:col-span-7 flex-col justify-between p-16 bg-cream-100 border-r border-surface-border relative overflow-hidden">
        {/* Geometric overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,#FDFCFB_0%,transparent_60%)] opacity-80" />
        
        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-dark flex items-center justify-center shadow-soft">
            <span className="text-white font-extrabold text-lg font-display">C</span>
          </div>
          <span className="text-lg font-bold tracking-tight text-ink-black">CollectBot</span>
        </div>

        {/* Hero Message */}
        <div className="relative z-10 my-auto max-w-lg space-y-6">
          <h1 className="text-5xl font-extrabold tracking-tight text-ink-black leading-tight">
            Billing automation built for freelancers.
          </h1>
          <p className="text-ink-secondary text-base leading-relaxed">
            Register your profile, import contacts, and generate beautiful payment requests. Deferred Payment configuration means you can start drafting invoices instantly.
          </p>
          
          {/* Testimonial pill */}
          <div className="inline-flex items-center gap-2 bg-surface-white px-4 py-2.5 rounded-pill shadow-soft border border-surface-border mt-4">
            <span className="text-xs font-semibold text-ink-primary">⭐⭐⭐⭐⭐ Clears payment dues 3x faster</span>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 text-[10px] uppercase tracking-wider font-bold text-ink-muted">
          © {new Date().getFullYear()} CollectBot SaaS. Built for Indian Workspaces.
        </div>
      </div>

      {/* RIGHT PANEL (40% width) - Modern White Signup Form */}
      <div className="lg:col-span-5 flex items-center justify-center p-8 bg-surface-white overflow-y-auto">
        <div className="w-full max-w-md space-y-6 py-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-ink-black">Get started today</h2>
            <p className="text-xs text-ink-secondary mt-1 font-medium">Create a workspace to manage collections.</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <div className="p-3 rounded-button bg-danger-light border border-danger/20 text-danger-dark text-xs font-semibold">
                  {error}
                </div>
              )}

              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[9px] uppercase font-bold text-ink-secondary">Full Name</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="John Doe"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-danger" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="businessName"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[9px] uppercase font-bold text-ink-secondary">Business Workspace Name</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="e.g. Acme Agency"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-danger" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[9px] uppercase font-bold text-ink-secondary">Email Address</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="john@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-danger" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[9px] uppercase font-bold text-ink-secondary">Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-danger" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[9px] uppercase font-bold text-ink-secondary">Confirm Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-danger" />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Registering...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>
          </Form>

          <div className="text-center pt-2">
            <p className="text-xs text-ink-secondary">
              Already registered?{" "}
              <Link href="/login" className="text-brand-600 hover:text-brand-700 font-bold hover:underline transition-all">
                Login here →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
