"use client"

import * as React from "react"
import { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  onActionClick?: () => void
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onActionClick
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center select-none bg-surface-white border border-surface-border rounded-card p-8 shadow-card max-w-lg mx-auto">
      {/* Icon Circle */}
      <div className="w-24 h-24 rounded-full bg-cream-200 flex items-center justify-center text-ink-secondary mb-6 animate-pulse shadow-soft">
        <Icon className="w-10 h-10 stroke-[1.5]" />
      </div>

      {/* Text Details */}
      <h3 className="text-lg font-bold text-ink-black mb-2 tracking-tight">
        {title}
      </h3>
      <p className="text-xs text-ink-secondary max-w-xs mb-6 leading-relaxed">
        {description}
      </p>

      {/* Call to Action button */}
      {actionLabel && onActionClick && (
        <Button
          onClick={onActionClick}
          className="btn-primary px-6 py-2.5 rounded-button text-xs font-semibold shadow-soft cursor-pointer inline-flex items-center gap-1.5"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
