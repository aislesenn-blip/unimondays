import * as React from "react"

import { cn } from "@/lib/utils"

interface DashboardShellProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  nav?: React.ReactNode
  userNav?: React.ReactNode
}

export function DashboardShell({ children, nav, userNav, className, ...props }: DashboardShellProps) {
  return (
    <div className={cn("grid items-start gap-8", className)} {...props}>
       <header className="sticky top-0 z-40 border-b bg-background">
        <div className="container flex h-16 items-center justify-between py-4">
          {nav}
          {userNav}
        </div>
      </header>
      <main className="container grid gap-12">
        {children}
      </main>
    </div>
  )
}
