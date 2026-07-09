"use client"

import * as React from "react"
import { X } from "lucide-react"
import Sidebar from "@/components/layout/Sidebar"
import Header from "@/components/layout/Header"
import MobileNav from "@/components/layout/MobileNav"
import { Button } from "@/components/ui/button"

import { useRouter } from "next/navigation"

interface LayoutClientProps {
  businessName: string
  userEmail: string
  userName: string
  children: React.ReactNode
}

export default function DashboardLayoutClient({
  businessName,
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
        const searchInput = document.querySelector('input[placeholder*="Search" i]') as HTMLInputElement
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col lg:flex-row">
      {/* Sidebar - Desktop and toggleable Mobile */}
      <div
        className={`lg:block w-60 flex-shrink-0 transition-all duration-300 z-40 ${
          isMobileMenuOpen ? "block" : "hidden lg:block"
        }`}
      >
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm lg:hidden z-30" 
            onClick={() => setIsMobileMenuOpen(false)} 
          />
        )}
        <Sidebar
          businessName={businessName}
          userEmail={userEmail}
          userName={userName}
        />
        {isMobileMenuOpen && (
          <Button
            variant="ghost"
            size="icon"
            className="fixed top-4 right-4 z-50 text-slate-400 hover:text-white lg:hidden bg-slate-900 border border-slate-800"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Main Page Content wrapper */}
      <div className="flex-grow min-h-screen flex flex-col lg:pl-60">
        {/* Mobile top header */}
        <Header onMenuClick={() => setIsMobileMenuOpen(true)} />

        {/* Content Area */}
        <main className="flex-1 p-6 lg:p-10 pt-24 lg:pt-10 pb-24 lg:pb-10 w-full max-w-7xl mx-auto">
          {children}
        </main>

        {/* Mobile bottom navigation bar */}
        <MobileNav />
      </div>
    </div>
  )
}
