import type { Metadata } from "next"
import * as React from "react"

export const metadata: Metadata = {
  title: "Secure Invoice Payment",
  description: "Complete your invoice payment securely via CollectBot.",
  robots: {
    index: false,
    follow: false,
  },
}

export default function PayLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

