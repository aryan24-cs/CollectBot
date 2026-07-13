"use client"

import * as React from "react"
import { Calendar, ChevronDown, TrendingUp, TrendingDown, ArrowUpRight } from "lucide-react"

interface HeroStatProps {
  label: string
  totalAmount: number // e.g. 528976.82
  dueAmount: number
  trendPercent: number
  previousAmount?: number
  dateRangeLabel: string
}

export default function HeroStatSection({
  label,
  totalAmount,
  dueAmount,
  trendPercent,
  previousAmount,
  dateRangeLabel
}: HeroStatProps) {
  // Format currency helper to split integer and decimal
  const formattedVal = totalAmount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  const dotIdx = formattedVal.indexOf(".")
  const integerPart = dotIdx !== -1 ? formattedVal.slice(0, dotIdx) : formattedVal
  const decimalPart = dotIdx !== -1 ? formattedVal.slice(dotIdx) : ""

  const formattedDue = dueAmount.toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })

  return (
    <div className="bg-transparent py-4 select-none">
      <p className="text-[10px] uppercase font-bold tracking-wider text-ink-secondary mb-1">
        {label}
      </p>

      {/* Large Stat Display */}
      <div className="flex flex-col sm:flex-row sm:items-baseline gap-3 flex-wrap">
        <h1 className="text-stat-xl font-extrabold tracking-tight text-ink-black leading-none font-display">
          ₹{integerPart}
          <span className="text-ink-secondary text-5xl font-medium tracking-tight">
            {decimalPart}
          </span>
        </h1>

        {/* Dynamic Pills */}
        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          {/* Trend Pill */}
          <div className="inline-flex items-center gap-0.5 px-3 py-1 rounded-pill bg-success-light text-success-dark text-[10px] font-bold shadow-soft">
            <ArrowUpRight className="w-3 h-3 text-success" />
            <span>{trendPercent}%</span>
          </div>

          {/* Due amount Pill */}
          {dueAmount > 0 && (
            <div className="inline-flex items-center px-3 py-1 rounded-pill bg-brand-50 text-brand-600 text-[10px] font-bold border border-brand-100 shadow-soft">
              <span>₹{formattedDue} due</span>
            </div>
          )}
        </div>
      </div>

      {/* Comparison label and Date Picker dropdown trigger */}
      <div className="mt-3 flex items-center gap-2.5 text-xs font-semibold text-ink-secondary">
        {previousAmount && (
          <span>
            vs prev. ₹
            {previousAmount.toLocaleString("en-IN", {
              maximumFractionDigits: 0,
            })}
          </span>
        )}
        <div className="flex items-center gap-1 hover:text-ink-primary transition-colors cursor-pointer">
          <span>{dateRangeLabel}</span>
          <ChevronDown className="w-3.5 h-3.5 text-ink-muted" />
        </div>
      </div>
    </div>
  )
}
