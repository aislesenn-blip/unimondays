import * as React from "react"
import { cn } from "@/lib/utils"

export interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onCheckedChange?: (checked: boolean) => void;
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, onCheckedChange, ...props }, ref) => {
    return (
      <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
        <input
          type="checkbox"
          className={cn(
            "toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer transition-transform duration-200 ease-in-out peer checked:translate-x-full checked:border-primary",
            className
          )}
          ref={ref}
          onChange={(e) => {
             props.onChange?.(e);
             onCheckedChange?.(e.target.checked);
          }}
          {...props}
        />
        <label
          htmlFor={props.id}
          className="toggle-label block overflow-hidden h-6 rounded-full bg-muted cursor-pointer peer-checked:bg-primary transition-colors duration-200"
        ></label>
      </div>
    )
  }
)
Switch.displayName = "Switch"

export { Switch }
