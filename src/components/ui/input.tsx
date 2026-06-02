import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "placeholder:text-muted-foreground selection:bg-accent selection:text-accent-foreground flex h-7 w-full min-w-0 rounded-sm border border-border bg-input px-2 py-0 text-[11px] outline-none transition-colors",
        "focus-visible:border-[#007acc] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#007acc]",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40",
        "aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
