"use client"

import * as React from "react"
import { X, Menu } from "lucide-react"
import { useRouter } from "next/navigation"

import ContextSidebar from "@/components/layout/ContextSidebar"
import TopBar from "@/components/layout/TopBar"
import Header from "@/components/layout/Header"
import MobileBottomNav from "@/components/layout/MobileBottomNav"
import { Button } from "@/components/ui/button"

interface LayoutClientProps {
  business: {
    id: string
    name: string
    logo_url?: string | null
  }
  userEmail: string
  userName: string
  children: React.ReactNode
}

export default function DashboardLayoutClient({
  business,
  userEmail,
  userName,
  children,
}: LayoutClientProps) {
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)

  // Close mobile menu on path changes
  React.useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [])

  // Mount global keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return
      }

      const key = e.key.toLowerCase()

      if (key === "n") {
        e.preventDefault()
        router.push("/invoices/new")
      } else if (key === "c") {
        e.preventDefault()
        router.push("/clients/new")
      } else if (e.key === "/") {
        const searchInput = document.querySelector('input[placeholder*="searching" i]') as HTMLInputElement
        if (searchInput) {
          e.preventDefault()
          searchInput.focus()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [router])

  return (
    <div className="min-h-screen bg-cream-100 text-ink-primary flex flex-col md:flex-row">
      {/* Sidebars - Desktop (Dual Sidebar layout) */}
      <div className="hidden md:flex flex-row shrink-0">
        <ContextSidebar business={business} />
      </div>

      {/* Mobile Top Header (hidden on desktop) */}
      <Header onMenuClick={() => setIsMobileMenuOpen(true)} />

      {/* Mobile Context Sidebar Drawer (hidden on desktop) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative bg-cream-100 w-64 h-full shadow-floating animate-in slide-in-from-left duration-250 z-10 flex">
            {/* Render ContextSidebar inside drawer */}
            <div className="flex-1 flex flex-col pt-12 relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 z-20 text-ink-secondary hover:text-ink-primary"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
              <ContextSidebar business={business} />
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-grow min-h-screen flex flex-col md:pl-0 pt-16 md:pt-0 pb-16 md:pb-0">
        {/* TopBar on Desktop */}
        <div className="hidden md:block">
          <TopBar />
        </div>
        
        {/* Main Body */}
        <main className="flex-1 p-4 md:p-8 overflow-auto">
          {children}
        </main>
      </div>

      {/* Fixed Bottom Navigation for Mobile */}
      <MobileBottomNav />
    </div>
  )
}
