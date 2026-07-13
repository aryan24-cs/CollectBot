"use client"

import * as React from "react"
import { ArrowUpRight, ArrowDownRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatCardProps {
  title: string
  value: string | number
  subtext?: string
  trend?: {
    value: string | number
    isPositive: boolean
  }
  isDark?: boolean
  className?: string
  onClick?: () => void
}

export default function StatCard({
  title,
  value,
  subtext,
  trend,
  isDark = false,
  className,
  onClick
}: StatCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-card p-6 shadow-card transition-all duration-200 border border-surface-border/50",
        isDark 
          ? "bg-[#1A1A1A] text-white hover:bg-[#252525]" 
          : "bg-surface-white text-ink-primary hover:shadow-card-hover hover:-translate-y-0.5",
        onClick && "cursor-pointer",
        className
      )}
    >
      {/* Title */}
      <div className="flex justify-between items-start mb-4">
        <span className={cn(
          "text-[10px] uppercase font-bold tracking-wider",
          isDark ? "text-ink-light" : "text-ink-secondary"
        )}>
          {title}
        </span>
        {trend && (
          <div className={cn(
            "flex items-center gap-0.5 px-2 py-0.5 rounded-pill text-[10px] font-bold shadow-soft",
            trend.isPositive 
              ? (isDark ? "bg-success text-success-light" : "bg-success-light text-success-dark")
              : (isDark ? "bg-danger text-danger-light" : "bg-danger-light text-danger-dark")
          )}>
            {trend.isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {trend.value}
          </div>
        )}
      </div>

      {/* Main value */}
      <div className="space-y-1">
        <h3 className={cn(
          "text-stat-md font-extrabold tracking-tight leading-none font-display",
          isDark ? "text-white" : "text-ink-black"
        )}>
          {value}
        </h3>
        {subtext && (
          <p className={cn(
            "text-xs font-semibold leading-normal",
            isDark ? "text-ink-muted" : "text-ink-secondary"
          )}>
            {subtext}
          </p>
        )}
      </div>
    </div>
  )
}
