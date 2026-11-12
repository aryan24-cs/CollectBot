export const SITE_CONFIG = {
  name: "CollectBot",
  legalName: "CollectBot Technologies",
  tagline: "One Business OS. Finance • Sales • Marketing.",
  description: "Automate invoice creation, WhatsApp follow-ups, Razorpay payment collections, and reconciliation for Indian businesses, agencies, and enterprises.",
  domain: "collectbot.vercel.app",
  canonicalUrl: (process.env.NEXT_PUBLIC_APP_URL || "https://collectbot.vercel.app").replace(/\/$/, ""),
  supportEmail: "support@collectbot.in",
  currency: "INR",
  currencySymbol: "₹",
  locale: "en_IN",
  country: "IN",
} as const

