import * as React from "react"
import { cn } from "@/lib/utils"

const TooltipProvider = ({ children }: { children: React.ReactNode }) => (
  <div className="relative inline-block group">{children}</div>
)

const TooltipTrigger = ({ children, asChild }: { children: React.ReactNode, asChild?: boolean }) => {
  return <div className="inline-block">{children}</div>
}

const TooltipContent = ({ children, className }: { children: React.ReactNode, className?: string }) => {
  return (
    <div className={cn(
      "absolute z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      "hidden group-hover:block whitespace-nowrap top-full mt-2 left-1/2 -translate-x-1/2",
      className
    )}>
      {children}
    </div>
  )
}

export { TooltipProvider, TooltipTrigger, TooltipContent }
