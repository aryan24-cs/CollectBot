import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-button text-xs font-bold whitespace-nowrap transition-all outline-none select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-[#1A1A1A] text-white hover:bg-[#0A0A0A] shadow-soft cursor-pointer border-none",
        primary: "bg-[#E91E63] text-white hover:bg-[#D81B60] shadow-soft cursor-pointer border-none",
        outline:
          "bg-white text-[#1A1A1A] hover:bg-[#FAF8F5] border border-[#EEE9E4] shadow-soft cursor-pointer",
        secondary:
          "bg-white text-[#1A1A1A] hover:bg-[#FAF8F5] border border-[#EEE9E4] shadow-soft cursor-pointer",
        ghost:
          "hover:bg-[#EDE7E1]/50 text-[#1A1A1A] cursor-pointer border-none",
        destructive:
          "bg-[#F44336] text-white hover:bg-[#C62828] shadow-soft cursor-pointer border-none",
        link: "text-[#E91E63] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 py-2.5 gap-1.5",
        xs: "h-6 gap-1 px-2 text-xs",
        sm: "h-8 gap-1 px-3 text-xs",
        lg: "h-12 px-6 py-3 text-base gap-1.5",
        icon: "size-10",
        "icon-xs": "size-6",
        "icon-sm": "size-8",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      suppressHydrationWarning
      {...props}
    />
  )
}

export { Button, buttonVariants }
