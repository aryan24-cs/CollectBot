import type { Metadata } from "next"
import * as React from "react"

export const metadata: Metadata = {
  title: "Create Your Account",
  description: "Start your free CollectBot workspace. Automate payment collections, invoice tracking, and customer follow-ups.",
  alternates: {
    canonical: "/signup",
  },
}

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

