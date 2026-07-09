"use client"

import * as React from "react"
import Link from "next/link"
import { Check, X, HelpCircle, ArrowRight, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = React.useState<"monthly" | "yearly">("monthly")
  const [openFaq, setOpenFaq] = React.useState<number | null>(null)

  const plans = [
    {
      name: "Free",
      description: "Ideal for freelancers starting their collection automation journey.",
      price: { monthly: 0, yearly: 0 },
      features: [
        "5 Invoices per month",
        "1 Client seat",
        "Email reminders only",
        "CollectBot watermark branding",
        "Standard bank transfer & UPI",
      ],
      notIncluded: [
        "WhatsApp reminder nudges",
        "Razorpay online payments",
        "Additional team members",
        "Advanced collection analytics",
      ],
      cta: "Get Started Free",
      href: "/register",
      popular: false,
    },
    {
      name: "Solo",
      description: "Perfect for independent consultants and small business owners.",
      price: { monthly: 799, yearly: 7999 },
      features: [
        "30 Invoices per month",
        "Unlimited client seats",
        "Email reminders",
        "Razorpay payment links",
        "Custom branding (no watermark)",
        "1 Owner seat",
      ],
      notIncluded: [
        "WhatsApp reminder nudges", // Forced false/disabled for now
        "Additional team members",
        "Advanced analytics & recurring",
      ],
      cta: "Start Solo Trial",
      href: "/register?plan=solo",
      popular: false,
    },
    {
      name: "Business",
      description: "Best for growing startups requiring basic team collaboration.",
      price: { monthly: 2499, yearly: 24999 },
      features: [
        "Unlimited Invoices",
        "Unlimited client seats",
        "Email reminders",
        "Razorpay payment links",
        "Custom branding (no watermark)",
        "3 Team member seats",
        "Basic analytics & recurring reports",
      ],
      notIncluded: [
        "WhatsApp reminder nudges", // Forced false/disabled for now
        "White-label customization",
        "Dedicated account support manager",
      ],
      cta: "Choose Business",
      href: "/register?plan=business",
      popular: true,
    },
    {
      name: "Scale",
      description: "Built for enterprises requiring white-label control and bulk operations.",
      price: { monthly: 3999, yearly: 39999 },
      features: [
        "Unlimited Invoices & clients",
        "Email reminders",
        "Razorpay payment links",
        "Custom branding",
        "5 Team member seats",
        "White-label client invoice portals",
        "Bulk invoice upload import",
        "Priority dedicated manager support",
      ],
      notIncluded: [
        "WhatsApp reminder nudges", // Forced false/disabled for now
      ],
      cta: "Upgrade to Scale",
      href: "/register?plan=scale",
      popular: false,
    },
  ]

  const faqs = [
    {
      q: "Is the setup completely free?",
      a: "Yes, creating an account and configuring test modes takes less than 2 minutes and is completely free. We do not charge subscription fees on sandbox environments.",
    },
    {
      q: "Can I upgrade or downgrade my plan anytime?",
      a: "Absolutely. You can modify your subscription billing cycles or change tiers inside the settings billing tab at any point.",
    },
    {
      q: "How does invoice watermarking work?",
      a: "On the Free plan, client invoices display a tiny 'Powered by CollectBot' label at the footer. Subscribed tiers remove all branding.",
    },
    {
      q: "Is WhatsApp alerts integration active?",
      a: "Currently, all automated invoice and reminder dispatches are routed strictly through high-deliverability Resend Email templates to ensure robust performance. WhatsApp integration is paused.",
    },
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-indigo-600 selection:text-white select-none">
      {/* Navigation Header */}
      <header className="max-w-6xl mx-auto px-4 py-5 flex items-center justify-between border-b border-slate-900">
        <Link href="/" className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
          <span className="w-6 h-6 rounded-lg bg-indigo-650 flex items-center justify-center text-xs text-white">C</span>
          CollectBot
        </Link>
        <Link href="/login" className="text-xs font-bold text-slate-400 hover:text-white transition-colors">
          Back to Dashboard
        </Link>
      </header>

      {/* Hero section */}
      <section className="max-w-5xl mx-auto px-4 py-16 text-center space-y-6">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white max-w-2xl mx-auto leading-tight">
          Simple, transparent pricing
        </h1>
        <p className="text-slate-400 text-sm sm:text-base max-w-lg mx-auto">
          Start for free, configure payment links, and upgrade as your invoicing requirements grow. No hidden setups.
        </p>

        {/* Billing cycle toggle */}
        <div className="flex items-center justify-center gap-3 pt-4">
          <span className={cn("text-xs font-semibold", billingCycle === "monthly" ? "text-white" : "text-slate-500")}>Monthly Billing</span>
          <button
            onClick={() => setBillingCycle(billingCycle === "monthly" ? "yearly" : "monthly")}
            className="w-11 h-6 bg-slate-900 border border-slate-800 rounded-full relative p-0.5 transition-colors focus:outline-none"
          >
            <div
              className={cn(
                "w-4 h-4 bg-indigo-500 rounded-full transition-transform",
                billingCycle === "yearly" ? "translate-x-5" : "translate-x-0"
              )}
            />
          </button>
          <span className={cn("text-xs font-semibold flex items-center gap-1.5", billingCycle === "yearly" ? "text-white" : "text-slate-500")}>
            Yearly Billing
            <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
              Save 17%
            </span>
          </span>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "border rounded-2xl p-5 flex flex-col justify-between transition-all bg-slate-900/40 relative",
                plan.popular 
                  ? "border-indigo-500 shadow-xl shadow-indigo-500/5 bg-slate-900/60" 
                  : "border-slate-850 hover:border-slate-800"
              )}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] uppercase font-black bg-indigo-600 text-white px-3 py-1 rounded-full tracking-widest">
                  Most Popular
                </span>
              )}
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-extrabold">{plan.name} Plan</h3>
                  <p className="text-[10px] text-slate-500 leading-relaxed mt-1">{plan.description}</p>
                </div>

                <div className="py-2 border-y border-slate-850/50">
                  <span className="text-3xl font-black font-mono">
                    ₹{billingCycle === "monthly" ? plan.price.monthly.toLocaleString("en-IN") : plan.price.yearly.toLocaleString("en-IN")}
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mt-1">
                    per {billingCycle === "monthly" ? "month" : "year"}
                  </span>
                </div>

                <ul className="space-y-2 text-xs">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                      <span className="text-slate-300 text-[11px] leading-tight">{f}</span>
                    </li>
                  ))}
                  {plan.notIncluded.map((f) => (
                    <li key={f} className="flex items-start gap-2 opacity-40">
                      <X className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                      <span className="text-slate-500 text-[11px] leading-tight line-through">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-6">
                <Link
                  href={plan.href}
                  className={cn(
                    "w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all",
                    plan.popular
                      ? "bg-indigo-650 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-650/15"
                      : "bg-slate-900 hover:bg-slate-800 text-slate-200"
                  )}
                >
                  {plan.cta}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Comparisons */}
      <section className="max-w-4xl mx-auto px-4 pb-20">
        <h3 className="text-lg font-extrabold border-b border-slate-800 pb-3 mb-6 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-indigo-400" />
          Plan Comparison Details
        </h3>
        <div className="overflow-x-auto border border-slate-850 rounded-xl bg-slate-900/20">
          <table className="w-full text-left border-collapse text-xs select-none">
            <thead>
              <tr className="bg-slate-950 text-[10px] text-slate-500 font-bold uppercase tracking-wider border-b border-slate-850">
                <th className="p-3.5 w-1/3">Feature</th>
                <th className="p-3.5 text-center">Free</th>
                <th className="p-3.5 text-center">Solo</th>
                <th className="p-3.5 text-center">Business</th>
                <th className="p-3.5 text-center">Scale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 text-slate-300">
              <tr>
                <td className="p-3.5 font-semibold">Monthly Invoices Allowance</td>
                <td className="p-3.5 text-center font-mono font-bold text-indigo-400">5</td>
                <td className="p-3.5 text-center font-mono font-bold text-indigo-400">30</td>
                <td className="p-3.5 text-center font-mono font-bold text-indigo-400">Unlimited</td>
                <td className="p-3.5 text-center font-mono font-bold text-indigo-400">Unlimited</td>
              </tr>
              <tr>
                <td className="p-3.5 font-semibold">Client Contacts Limit</td>
                <td className="p-3.5 text-center font-mono font-bold text-indigo-400">1</td>
                <td className="p-3.5 text-center font-mono font-bold text-indigo-400">Unlimited</td>
                <td className="p-3.5 text-center font-mono font-bold text-indigo-400">Unlimited</td>
                <td className="p-3.5 text-center font-mono font-bold text-indigo-400">Unlimited</td>
              </tr>
              <tr>
                <td className="p-3.5 font-semibold">Team members seats</td>
                <td className="p-3.5 text-center font-mono">1</td>
                <td className="p-3.5 text-center font-mono">1</td>
                <td className="p-3.5 text-center font-mono font-bold text-indigo-400">3</td>
                <td className="p-3.5 text-center font-mono font-bold text-indigo-400">5</td>
              </tr>
              <tr>
                <td className="p-3.5 font-semibold">Email PDF Attachments</td>
                <td className="p-3.5 text-center"><Check className="w-4 h-4 text-emerald-500 mx-auto" /></td>
                <td className="p-3.5 text-center"><Check className="w-4 h-4 text-emerald-500 mx-auto" /></td>
                <td className="p-3.5 text-center"><Check className="w-4 h-4 text-emerald-500 mx-auto" /></td>
                <td className="p-3.5 text-center"><Check className="w-4 h-4 text-emerald-500 mx-auto" /></td>
              </tr>
              <tr>
                <td className="p-3.5 font-semibold">Online Payment Checkout</td>
                <td className="p-3.5 text-center"><X className="w-4 h-4 text-slate-655 mx-auto" /></td>
                <td className="p-3.5 text-center"><Check className="w-4 h-4 text-emerald-500 mx-auto" /></td>
                <td className="p-3.5 text-center"><Check className="w-4 h-4 text-emerald-500 mx-auto" /></td>
                <td className="p-3.5 text-center"><Check className="w-4 h-4 text-emerald-500 mx-auto" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="max-w-3xl mx-auto px-4 pb-20">
        <h3 className="text-lg font-extrabold text-center mb-8 flex items-center justify-center gap-1.5">
          <HelpCircle className="w-5 h-5 text-indigo-400" />
          Frequently Asked Questions
        </h3>
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="border border-slate-850 rounded-xl bg-slate-900/20 overflow-hidden transition-all"
            >
              <button
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
                className="w-full flex justify-between items-center px-4 py-3.5 text-left text-xs font-bold hover:bg-slate-900/40 focus:outline-none"
              >
                <span>{faq.q}</span>
                <span className="text-indigo-400 text-xs font-mono">{openFaq === index ? "−" : "+"}</span>
              </button>
              {openFaq === index && (
                <div className="px-4 pb-4 text-[11px] text-slate-400 leading-relaxed border-t border-slate-850/50 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Public Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 text-center py-10 text-slate-500 text-[10px] space-y-2">
        <p>CollectBot © 2026. Made in India 🇮🇳 for Indian business entities.</p>
        <div className="flex justify-center gap-4">
          <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          <Link href="/refund" className="hover:text-white transition-colors">Refund Policy</Link>
        </div>
      </footer>
    </div>
  )
}
