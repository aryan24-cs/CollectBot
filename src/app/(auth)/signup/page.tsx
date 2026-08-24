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
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false)
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

  const handleGoogleSignup = async () => {
    try {
      setIsGoogleLoading(true)
      setError(null)
      const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"
      
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/api/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      })

      if (oauthError) {
        throw oauthError
      }
    } catch (err: any) {
      setError(err.message || "Failed to initiate Google Sign-Up.")
      toast.error(err.message || "Google sign-up error")
      setIsGoogleLoading(false)
    }
  }

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

      // 2. Insert business record
      const { error: bizError } = await supabase.from("businesses").insert({
        user_id: authData.user.id,
        name: values.businessName,
        email: values.email,
      })

      if (bizError) {
        throw new Error(`Auth successful, but business creation failed: ${bizError.message}`)
      }

      // Trigger welcome email dispatch in background
      fetch("/api/email/welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email,
          name: values.fullName,
        }),
      }).catch((err) => console.error("Failed to trigger welcome email:", err))

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

        {/* Hero message */}
        <div className="relative z-10 my-auto max-w-lg space-y-6">
          <h1 className="text-5xl font-extrabold tracking-tight text-ink-black leading-tight">
            Supercharge your business invoicing.
          </h1>
          <p className="text-ink-secondary text-base leading-relaxed">
            Create professional GST-compliant invoices in 30 seconds, send automated WhatsApp reminders, and auto-reconcile payments with Indian payment gateways.
          </p>
          
          <div className="inline-flex items-center gap-2 bg-surface-white px-4 py-2.5 rounded-pill shadow-soft border border-surface-border mt-4">
            <span className="text-xs font-semibold text-ink-primary">🚀 Join 1,000+ businesses collecting faster</span>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 text-[10px] uppercase tracking-wider font-bold text-ink-muted">
          © {new Date().getFullYear()} CollectBot SaaS. Built for Indian Businesses.
        </div>
      </div>

      {/* RIGHT PANEL (40% width) - Modern White Signup Form */}
      <div className="lg:col-span-5 flex items-center justify-center p-8 bg-surface-white overflow-y-auto">
        <div className="w-full max-w-md space-y-6 py-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-ink-black">Get started today</h2>
            <p className="text-xs text-ink-secondary mt-1 font-medium">Create a workspace to manage collections.</p>
          </div>

          {/* GOOGLE SIGN UP BUTTON */}
          <Button
            onClick={handleGoogleSignup}
            disabled={isGoogleLoading || isLoading}
            variant="outline"
            className="w-full border-[#EEE9E4] hover:bg-cream-50 transition-all font-bold text-xs py-5"
          >
            {isGoogleLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Connecting to Google...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                Sign up with Google
              </>
            )}
          </Button>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-surface-border"></div>
            <span className="flex-shrink mx-4 text-[10px] uppercase tracking-wider font-bold text-ink-muted">
              or register with email
            </span>
            <div className="flex-grow border-t border-surface-border"></div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3.5">
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
                disabled={isLoading || isGoogleLoading}
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
