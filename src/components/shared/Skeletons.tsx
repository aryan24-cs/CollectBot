"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-xl bg-[#FAF8F5] border border-[#EEE9E4]/60", className)}
      {...props}
    />
  )
}

// 1. Dashboard Skeleton (Owner, Finance, Sales, Marketing)
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10 select-none animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#EEE9E4]/60 pb-5">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 rounded-xl" />
          <Skeleton className="h-4 w-96 rounded-lg" />
        </div>
        <Skeleton className="h-10 w-32 rounded-full" />
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border border-[#EEE9E4] p-5 rounded-2xl shadow-card space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24 rounded-lg" />
              <Skeleton className="h-8 w-8 rounded-xl" />
            </div>
            <Skeleton className="h-8 w-36 rounded-xl" />
            <Skeleton className="h-3 w-28 rounded-md" />
          </div>
        ))}
      </div>

      {/* 2 Grid Chart Skeletons */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white border border-[#EEE9E4] p-6 rounded-2xl shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-[#EEE9E4] pb-4">
            <Skeleton className="h-5 w-40 rounded-lg" />
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
        <div className="lg:col-span-4 bg-white border border-[#EEE9E4] p-6 rounded-2xl shadow-card space-y-4">
          <div className="border-b border-[#EEE9E4] pb-4">
            <Skeleton className="h-5 w-32 rounded-lg" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-[#FAF8F5] rounded-xl">
                <Skeleton className="h-4 w-32 rounded-md" />
                <Skeleton className="h-4 w-16 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// 2. Table Skeleton (Invoices, Clients, Expenses, Tasks, Approvals)
export function TableSkeleton() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10 select-none animate-pulse">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#EEE9E4]/60 pb-5">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 rounded-xl" />
          <Skeleton className="h-4 w-80 rounded-lg" />
        </div>
        <Skeleton className="h-10 w-36 rounded-full" />
      </div>

      <div className="bg-white border border-[#EEE9E4] rounded-2xl p-4 shadow-card space-y-4">
        {/* Search & Filter Bar */}
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-10 w-72 rounded-xl" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-24 rounded-xl" />
            <Skeleton className="h-10 w-24 rounded-xl" />
          </div>
        </div>

        {/* Rows */}
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-4 bg-[#FAF8F5] rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 h-9 rounded-xl" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-40 rounded-md" />
                  <Skeleton className="h-3 w-24 rounded-md" />
                </div>
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-5 w-24 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// 3. Card Grid Skeleton (Clients, Marketing Campaigns)
export function CardGridSkeleton() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10 select-none animate-pulse">
      <div className="flex justify-between items-center border-b border-[#EEE9E4]/60 pb-5">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <Skeleton className="h-10 w-36 rounded-full" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white border border-[#EEE9E4] p-5 rounded-2xl shadow-card space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="w-12 h-12 rounded-xl" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32 rounded-md" />
                <Skeleton className="h-3 w-20 rounded-md" />
              </div>
            </div>
            <Skeleton className="h-16 w-full rounded-xl" />
            <div className="flex justify-between items-center pt-2">
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// 4. Chart Standalone Skeleton
export function ChartSkeleton() {
  return (
    <div className="w-full h-64 bg-[#FAF8F5] border border-[#EEE9E4] rounded-xl flex items-center justify-center animate-pulse">
      <div className="text-center space-y-2">
        <div className="w-10 h-10 rounded-full bg-[#EEE9E4] mx-auto" />
        <p className="text-xs font-semibold text-ink-muted">Rendering visual analytics...</p>
      </div>
    </div>
  )
}
