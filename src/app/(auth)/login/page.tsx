"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { IndianRupee, Loader2 } from "lucide-react"
import { toast } from "sonner"

import getSupabaseBrowserClient from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  async function onSubmit(values: LoginFormValues) {
    setIsLoading(true)
    setError(null)

    try {
      // 1. Sign in
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      })

      if (authError) {
        throw new Error(authError.message)
      }

      if (!authData.user) {
        throw new Error("Login failed. User profile not found.")
      }

      // 2. Check if admin
      const { data: adminUser } = await supabase
        .from("admin_users")
        .select("role, is_active")
        .eq("user_id", authData.user.id)
        .eq("is_active", true)
        .maybeSingle()

      // Determine instant zero-flash destination route via route-user API
      try {
        const routeRes = await fetch("/api/auth/route-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: authData.user.id,
            email: authData.user.email,
          }),
        })

        const contentType = routeRes.headers.get("content-type") || ""
        if (routeRes.ok && contentType.includes("application/json")) {
          const routeData = await routeRes.json()
          if (routeData.destination) {
            toast.success("Welcome back")
            router.push(routeData.destination)
            router.refresh()
            return
          }
        }
      } catch (_) {}

      toast.success("Login successful")
      router.push("/dashboard")
      router.refresh()
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.")
      toast.error(err.message || "Invalid credentials")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-cream-50 select-none">
      {/* LEFT PANEL (60% width) - Premium Cream Hero */}
      <div className="hidden lg:flex lg:col-span-7 flex-col justify-between p-16 bg-cream-100 border-r border-surface-border relative overflow-hidden">
        {/* Subtle geometric overlay */}
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
            Get paid faster.
          </h1>
          <p className="text-ink-secondary text-base leading-relaxed">
            Automate invoice generation, WhatsApp notifications, and payment collection with native Razorpay integrations for Indian freelancers and businesses.
          </p>
          
          {/* Testimonial pill */}
          <div className="inline-flex items-center gap-2 bg-surface-white px-4 py-2.5 rounded-pill shadow-soft border border-surface-border mt-4">
            <span className="text-xs font-semibold text-ink-primary">⭐⭐⭐⭐⭐ Reduced payment delays by 40%</span>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 text-[10px] uppercase tracking-wider font-bold text-ink-muted">
          © {new Date().getFullYear()} CollectBot SaaS. Built for Indian Workspaces.
        </div>
      </div>

      {/* RIGHT PANEL (40% width) - Modern White Login Card */}
      <div className="lg:col-span-5 flex items-center justify-center p-8 bg-surface-white">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-ink-black">Welcome back</h2>
            <p className="text-xs text-ink-secondary mt-1">Login to access your billing registry dashboard.</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <div className="p-3 rounded-button bg-danger-light border border-danger/25 text-danger-dark text-xs font-semibold">
                  {error}
                </div>
              )}

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[10px] uppercase font-bold text-ink-secondary">Email Address</FormLabel>
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
                  <FormItem className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-[10px] uppercase font-bold text-ink-secondary">Password</FormLabel>
                      <Link href="#" className="text-xs text-brand-600 hover:text-brand-700 font-semibold hover:underline">
                        Forgot password?
                      </Link>
                    </div>
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
                    Logging in...
                  </>
                ) : (
                  "Login"
                )}
              </Button>
            </form>
          </Form>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-surface-border"></div>
            <span className="flex-shrink mx-4 text-[10px] uppercase tracking-wider font-bold text-ink-muted">or</span>
            <div className="flex-grow border-t border-surface-border"></div>
          </div>

          <Button
            onClick={() => toast.info("Google OAuth is coming soon!")}
            variant="outline"
            className="w-full"
          >
            <span className="w-4 h-4 rounded-full bg-cream-100 flex items-center justify-center text-[10px] text-ink-primary font-extrabold font-display">G</span>
            Continue with Google
          </Button>

          <div className="text-center pt-2">
            <p className="text-xs text-ink-secondary">
              New here?{" "}
              <Link href="/signup" className="text-brand-600 hover:text-brand-700 font-bold hover:underline transition-all">
                Sign up →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
