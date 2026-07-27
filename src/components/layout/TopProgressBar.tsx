"use client"

import * as React from "react"
import { usePathname, useSearchParams } from "next/navigation"

export default function TopProgressBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isNavigating, setIsNavigating] = React.useState(false)

  React.useEffect(() => {
    setIsNavigating(false)
  }, [pathname, searchParams])

  React.useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a")
      if (target && target.href && target.href.startsWith(window.location.origin)) {
        const url = new URL(target.href)
        if (url.pathname !== window.location.pathname) {
          setIsNavigating(true)
        }
      }
    }

    window.addEventListener("click", handleAnchorClick)
    return () => window.removeEventListener("click", handleAnchorClick)
  }, [])

  if (!isNavigating) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gradient-to-r from-[#E91E63] via-[#FF4081] to-[#1A1A1A] animate-pulse transition-all duration-300" />
  )
}
