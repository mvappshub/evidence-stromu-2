import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-sm text-[11px] font-normal transition-colors disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-3.5 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:outline-ring",
  {
    variants: {
      variant: {
        default:
          "bg-[#0e639c] text-white hover:bg-[#1177bb] dark:bg-[#0e639c] dark:hover:bg-[#1177bb] dark:text-white",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90",
        outline:
          "border border-border bg-transparent hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground",
        link: "text-[#58a6ff] underline-offset-2 hover:underline p-0 h-auto",
      },
      size: {
        default: "h-7 px-2.5 has-[>svg]:px-2",
        sm: "h-[22px] px-2 has-[>svg]:px-1.5",
        lg: "h-8 px-3",
        icon: "size-7",
      },
    },
    defaultVariants: {
      variant: "outline",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
