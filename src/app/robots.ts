import type { MetadataRoute } from "next"
import { SITE_CONFIG } from "@/lib/constants/site"

export default function robots(): MetadataRoute.Robots {
  const baseUrl = SITE_CONFIG.canonicalUrl

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/privacy", "/terms", "/refund", "/login", "/signup"],
        disallow: [
          "/admin/",
          "/dashboard/",
          "/invoices/",
          "/expenses/",
          "/clients/",
          "/settings/",
          "/tasks/",
          "/approvals/",
          "/reminders/",
          "/select-workspace",
          "/onboarding",
          "/join",
          "/pay/",
          "/api/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}

