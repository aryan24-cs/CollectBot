"use client"

import * as React from "react"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface FilterOption {
  id: string
  label: string
  count?: number
  avatarUrl?: string
  initials?: string
}

interface FilterPillsProps {
  options: FilterOption[]
  selectedId: string
  onSelect: (id: string) => void
  onAddClick?: () => void
  className?: string
}

export default function FilterPills({
  options,
  selectedId,
  onSelect,
  onAddClick,
  className
}: FilterPillsProps) {
  return (
    <div className={cn("flex items-center gap-2 flex-wrap select-none py-2", className)}>
      {/* Plus Add Custom Button */}
      {onAddClick && (
        <button
          onClick={onAddClick}
          className="w-8 h-8 rounded-full bg-surface-white border border-surface-border flex items-center justify-center hover:bg-cream-50 text-ink-secondary hover:text-ink-primary shadow-soft transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Options */}
      {options.map((option) => {
        const isActive = selectedId === option.id
        
        return (
          <button
            key={option.id}
            onClick={() => onSelect(option.id)}
            className={cn(
              "h-8 px-3.5 rounded-pill text-xs font-semibold flex items-center gap-1.5 transition-all shadow-soft cursor-pointer shrink-0 border border-transparent",
              isActive
                ? "bg-[#1A1A1A] text-white shadow-soft"
                : "bg-surface-white border-surface-border hover:bg-cream-50 text-ink-secondary hover:text-ink-primary"
            )}
          >
            {/* Optional Avatar */}
            {(option.avatarUrl || option.initials) && (
              <Avatar className="w-4.5 h-4.5 shrink-0 bg-cream-200 text-ink-primary text-[8px] font-bold">
                {option.avatarUrl && <img src={option.avatarUrl} alt={option.label} />}
                <AvatarFallback className="bg-cream-200 text-[8px] font-extrabold">{option.initials}</AvatarFallback>
              </Avatar>
            )}
            
            <span>{option.label}</span>
            
            {option.count !== undefined && (
              <span className={cn(
                "text-[9px] font-bold px-1.5 py-0.2 rounded-pill shrink-0",
                isActive ? "bg-[#252525] text-white" : "bg-cream-200 text-ink-secondary"
              )}>
                {option.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
