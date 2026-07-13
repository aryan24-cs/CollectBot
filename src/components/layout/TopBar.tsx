"use client"

import * as React from "react"
import { Search, Bell, HelpCircle, User, LogOut, Settings } from "lucide-react"
import { useRouter } from "next/navigation"
import getSupabaseBrowserClient from "@/lib/supabase/client"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"

export default function TopBar() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [userName, setUserName] = React.useState("User")
  const [initials, setInitials] = React.useState("US")
  const [searchValue, setSearchValue] = React.useState("")

  React.useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // First try to fetch business owner name
        const { data: business } = await supabase
          .from("businesses")
          .select("name")
          .eq("user_id", user.id)
          .maybeSingle()

        const name = user.user_metadata?.full_name || business?.name || user.email?.split("@")[0] || "User"
        setUserName(name)
        
        const init = name
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
        setInitials(init)
      }
    }
    loadUser()
  }, [])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push("/login")
      router.refresh()
    } catch (err) {
      console.error("Logout failed:", err)
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchValue.trim()) {
      router.push(`/invoices?search=${encodeURIComponent(searchValue.trim())}`)
    }
  }

  return (
    <header className="h-16 flex items-center justify-between px-8 bg-transparent select-none z-10 w-full">
      {/* Centered Search Container */}
      <div className="flex-1 flex justify-center max-w-xl mx-auto">
        <form onSubmit={handleSearchSubmit} className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Try searching 'invoices', 'clients' (Press '/' to focus)..."
            className="w-full h-11 bg-surface-white rounded-pill pl-11 pr-6 py-2.5 text-xs text-ink-primary placeholder:text-ink-muted shadow-soft focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all border border-surface-border/20"
          />
        </form>
      </div>

      {/* Right Side Icons */}
      <div className="flex items-center gap-4 shrink-0">
        
        {/* Notification Bell */}
        <button className="relative w-9 h-9 flex items-center justify-center rounded-full bg-surface-white border border-surface-border/30 hover:bg-cream-50 transition-colors shadow-soft cursor-pointer">
          <Bell className="w-4 h-4 text-ink-secondary" />
          <span className="absolute top-2 right-2.5 w-1.5 h-1.5 rounded-full bg-brand-600" />
        </button>

        {/* Command / Help Icon */}
        <div className="hidden sm:flex items-center justify-center h-9 px-3 rounded-full bg-surface-white border border-surface-border/30 shadow-soft text-ink-secondary text-[10px] font-bold gap-1">
          <span>⌘</span>
          <span>Help</span>
        </div>

        {/* User Profile Avatar Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="focus:outline-none focus:ring-0 cursor-pointer">
            <Avatar className="h-9 w-9 bg-cream-200 border border-surface-border hover:opacity-90 transition-opacity">
              <AvatarFallback className="bg-cream-200 text-ink-primary font-bold text-xs select-none">
                {initials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent className="w-52 bg-white border border-surface-border rounded-xl shadow-floating z-50">
            <div className="px-3.5 py-2">
              <p className="text-xs font-bold text-ink-primary truncate">{userName}</p>
              <p className="text-[10px] text-ink-secondary truncate">Owner Account</p>
            </div>
            <DropdownMenuSeparator className="bg-surface-border/50" />
            <DropdownMenuItem onClick={() => router.push("/settings")} className="cursor-pointer text-xs font-semibold py-2">
              <Settings className="w-4 h-4 mr-2 text-ink-secondary" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-surface-border/50" />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-xs font-semibold py-2 text-danger">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

      </div>
    </header>
  )
}
