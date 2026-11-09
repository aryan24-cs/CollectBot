import type { Metadata } from "next"
import * as React from "react"

export const metadata: Metadata = {
  title: "Select Workspace",
  robots: {
    index: false,
    follow: false,
  },
}

export default function SelectWorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

