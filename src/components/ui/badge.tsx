import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5.5 w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-pill border border-transparent px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap transition-all",
  {
    variants: {
      variant: {
        default: "bg-[#1A1A1A] text-white",
        secondary: "bg-[#EDE7E1] text-[#6B6B6B]",
        destructive: "bg-[#FFEBEE] text-[#C62828] border border-[#F44336]/10",
        outline: "bg-white border border-[#EEE9E4] text-[#1A1A1A] shadow-soft",
        ghost: "bg-[#FAF8F5] text-[#6B6B6B]",
        link: "text-[#E91E63] underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
