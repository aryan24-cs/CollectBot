"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { ShieldCheck, MessageSquare, IndianRupee, Loader2 } from "lucide-react"

import getSupabaseBrowserClient from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
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
      // 1. Sign in the user in Supabase
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

      // 2. Check if the user is an active admin
      const { data: adminUser } = await supabase
        .from("admin_users")
        .select("role")
        .eq("user_id", authData.user.id)
        .eq("is_active", true)
        .maybeSingle()

      if (adminUser) {
        router.push("/admin/overview")
      } else {
        // 3. Check if the business record exists for this user
        const { data: business, error: bizError } = await supabase
          .from("businesses")
          .select("id")
          .eq("user_id", authData.user.id)
          .maybeSingle()

        if (bizError) {
          throw new Error(`Auth successful, but checking business details failed: ${bizError.message}`)
        }

        if (!business) {
          router.push("/onboarding")
        } else {
          router.push("/dashboard")
        }
      }
      router.refresh()
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 overflow-hidden bg-slate-50">
      {/* Left side: Marketing panel */}
      <div className="hidden lg:flex lg:col-span-5 relative flex-col justify-between p-12 bg-gradient-to-br from-slate-50 via-slate-100/50 to-indigo-50/50 text-slate-800 border-r border-slate-200">
        {/* Glow effect background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(99,102,241,0.05),transparent_50%)]" />
        
        {/* Logo */}
        <div className="relative z-10 flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-600/10">
            <IndianRupee className="w-6 h-6 text-white stroke-[2.5]" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">
            CollectBot
          </span>
        </div>

        {/* Benefits text */}
        <div className="relative z-10 my-auto space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-extrabold tracking-tight leading-tight text-slate-900">
              Automate Payment Collection in India
            </h1>
            <p className="text-slate-500 text-lg">
              CollectBot takes the hassle out of invoices, reminders, and reconciliations.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex gap-4 items-start">
              <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 mt-1">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">WhatsApp & Email Reminders</h3>
                <p className="text-slate-500 text-sm">Send automatic reminder alerts via WhatsApp directly to your clients.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="p-2 rounded-lg bg-violet-50 border border-violet-100 text-violet-600 mt-1">
                <IndianRupee className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Razorpay UPI & Cards</h3>
                <p className="text-slate-500 text-sm">Accept direct payments via Razorpay payment links generated automatically.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 mt-1">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Auto-Reconciliation</h3>
                <p className="text-slate-500 text-sm">Payments are auto-matched to invoices. Status updates instantly.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs text-slate-400">
          © {new Date().getFullYear()} CollectBot. Built for Indian businesses.
        </div>
      </div>

      {/* Right side: Login Form */}
      <div className="lg:col-span-7 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md space-y-6">
          <Card className="border-slate-200 bg-white text-slate-800 shadow-[0_4px_24px_rgba(0,0,0,0.02)] rounded-2xl">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">Welcome back</CardTitle>
              <CardDescription className="text-slate-500">
                Log in to manage your clients and track invoices.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {error && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-650 text-sm">
                      {error}
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-600 font-semibold">Email Address</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="john@example.com"
                            className="bg-white border-slate-200 text-slate-900 focus-visible:ring-indigo-600 focus-visible:border-slate-350"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-red-600" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel className="text-slate-600 font-semibold">Password</FormLabel>
                          <Link href="#" className="text-xs text-indigo-600 hover:underline">
                            Forgot password?
                          </Link>
                        </div>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            className="bg-white border-slate-200 text-slate-900 focus-visible:ring-indigo-600 focus-visible:border-slate-350"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-red-600" />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold py-2.5 rounded-xl shadow-sm transition-all"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Logging In...
                      </>
                    ) : (
                      "Log In"
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <div className="text-sm text-slate-500 text-center">
                Don't have an account?{" "}
                <Link href="/signup" className="text-indigo-600 hover:text-indigo-700 font-semibold transition-colors">
                  Sign up
                </Link>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
