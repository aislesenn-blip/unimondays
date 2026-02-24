"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const TooltipProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>

const Tooltip = ({ children }: { children: React.ReactNode }) => {
  return <div className="relative flex items-center group">{children}</div>
}

const TooltipTrigger = ({ children, asChild }: { children: React.ReactNode, asChild?: boolean }) => {
  return <>{children}</>
}

const TooltipContent = ({ children, className, side = "top" }: { children: React.ReactNode, className?: string, side?: "top" | "right" | "bottom" | "left" }) => {
  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  }

  return (
    <div className={cn(
      "absolute z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 hidden group-hover:block whitespace-nowrap",
      positionClasses[side],
      className
    )}>
      {children}
    </div>
  )
}

export { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent }
