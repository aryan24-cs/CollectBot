import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner"
import { validateEnv } from "@/lib/env"
import { SITE_CONFIG } from "@/lib/constants/site"

// Validate environmental variables at module load (boot/startup)
validateEnv()

export const metadata: Metadata = {
  metadataBase: new URL(SITE_CONFIG.canonicalUrl),
  title: {
    default: "CollectBot — Payment Collection Automation & Business OS",
    template: "%s | CollectBot",
  },
  description: SITE_CONFIG.description,
  applicationName: SITE_CONFIG.name,
  keywords: [
    "invoice automation",
    "payment collection",
    "Razorpay payment links",
    "WhatsApp invoice reminders",
    "automated reconciliation",
    "Business OS",
    "Tally export",
    "India GST invoicing",
    "SaaS ERP",
    "sales pipeline",
    "marketing campaigns",
  ],
  authors: [{ name: SITE_CONFIG.legalName, url: SITE_CONFIG.canonicalUrl }],
  creator: SITE_CONFIG.name,
  publisher: SITE_CONFIG.legalName,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "CollectBot — One Business OS. Finance • Sales • Marketing.",
    description: SITE_CONFIG.description,
    url: SITE_CONFIG.canonicalUrl,
    siteName: SITE_CONFIG.name,
    locale: SITE_CONFIG.locale,
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "CollectBot — Payment Collection Automation & Business OS",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CollectBot — One Business OS. Finance • Sales • Marketing.",
    description: SITE_CONFIG.description,
    images: ["/og-image.png"],
    creator: "@collectbot_in",
  },
  icons: {
    icon: "/favicon.ico",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Structured Data (JSON-LD) for Search Engines
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_CONFIG.canonicalUrl}/#organization`,
        name: SITE_CONFIG.name,
        legalName: SITE_CONFIG.legalName,
        url: SITE_CONFIG.canonicalUrl,
        logo: `${SITE_CONFIG.canonicalUrl}/icon.png`,
        contactPoint: {
          "@type": "ContactPoint",
          email: SITE_CONFIG.supportEmail,
          contactType: "Customer Support",
          areaServed: "IN",
          availableLanguage: ["English", "Hindi"],
        },
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_CONFIG.canonicalUrl}/#website`,
        url: SITE_CONFIG.canonicalUrl,
        name: SITE_CONFIG.name,
        description: SITE_CONFIG.description,
        publisher: {
          "@id": `${SITE_CONFIG.canonicalUrl}/#organization`,
        },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${SITE_CONFIG.canonicalUrl}/#software`,
        name: SITE_CONFIG.name,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web Browser, Cloud",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "INR",
          description: "Free tier available for startups and freelancers.",
        },
        description: SITE_CONFIG.description,
        featureList: [
          "Automated WhatsApp & Email Invoice Reminders",
          "Razorpay Payment Gateway Integration",
          "Instant Auto-Reconciliation",
          "Tally XML & CSV Accounting Exports",
          "Multi-Tenant Finance, Sales & Marketing Workspaces",
        ],
      },
    ],
  };

  return (
    <html
      lang="en"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans" suppressHydrationWarning>
        {children}
        <Toaster />
      </body>
    </html>
  );
}


