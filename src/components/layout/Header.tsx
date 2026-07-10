"use client"

import * as React from "react"
import { Menu, Bell, IndianRupee } from "lucide-react"

import { Button } from "@/components/ui/button"

interface HeaderProps {
  onMenuClick: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="lg:hidden h-16 bg-white border-b border-slate-200 px-4 flex items-center justify-between fixed top-0 left-0 right-0 z-20 select-none">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="text-slate-500 hover:text-slate-950 hover:bg-slate-50"
          onClick={onMenuClick}
        >
          <Menu className="w-6 h-6" />
        </Button>
        
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-600/10">
            <IndianRupee className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-slate-900 tracking-tight text-sm">CollectBot</span>
        </div>
      </div>

      <div>
        <Button
          variant="ghost"
          size="icon"
          className="text-slate-500 hover:text-slate-950 hover:bg-slate-50 relative"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
        </Button>
      </div>
    </header>
  )
}
