import type { Metadata } from "next"
import * as React from "react"

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your CollectBot workspace to manage finance, sales, and marketing operations.",
  alternates: {
    canonical: "/login",
  },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

