import { type HTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'outline' | 'secondary' | 'accent' | 'success' | 'warning' | 'destructive';
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: "border-transparent bg-indigo-600 text-slate-50 hover:bg-indigo-700/80",
      secondary: "border-transparent bg-slate-100 text-slate-900 hover:bg-slate-100/80 dark:bg-slate-800 dark:text-slate-50",
      destructive: "border-transparent bg-red-500 text-slate-50 hover:bg-red-500/80",
      outline: "text-slate-950 dark:text-slate-50 border-slate-200 dark:border-slate-800",
      accent: "border-transparent bg-lime-400 text-slate-900 font-semibold",
      success: "border-transparent bg-green-500 text-white",
      warning: "border-transparent bg-amber-500 text-white",
    };

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2",
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = 'Badge';
