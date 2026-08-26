"use client"

import * as React from "react"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function DashboardErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  React.useEffect(() => {
    console.error("Dashboard caught error in Error Boundary:", error)
  }, [error])

  return (
    <div className="flex-1 min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-6 shadow-sm">
        <AlertTriangle className="w-8 h-8" />
      </div>

      <h2 className="text-2xl font-bold text-ink-primary mb-2">
        Something unexpected happened
      </h2>
      <p className="text-ink-secondary text-sm max-w-md mb-6 leading-relaxed">
        We encountered a temporary issue while loading your workspace data.
        {error.message && (
          <span className="block mt-2 font-mono text-xs text-amber-700 bg-amber-50/80 p-2 rounded border border-amber-200/50 break-all">
            {error.message}
          </span>
        )}
      </p>

      <div className="flex items-center gap-3">
        <Button
          onClick={() => reset()}
          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </Button>
        <Link href="/dashboard">
          <Button variant="outline" className="border-border text-ink-secondary hover:text-ink-primary flex items-center gap-2">
            <Home className="w-4 h-4" />
            Reload Workspace
          </Button>
        </Link>
      </div>
    </div>
  )
}
