import type { Metadata } from "next"
import * as React from "react"

export const metadata: Metadata = {
  title: "Join Workspace",
  robots: {
    index: false,
    follow: false,
  },
}

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

