import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "flex h-11 w-full rounded-button bg-[#FAF8F5] border border-[#EEE9E4] px-4 py-2.5 text-xs font-semibold text-[#1A1A1A] placeholder:text-[#9B9B9B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E63]/25 disabled:cursor-not-allowed disabled:opacity-50 shadow-soft transition-all",
        className
      )}
      suppressHydrationWarning
      {...props}
    />
  )
}

export { Input }
