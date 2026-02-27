import React from "react";
import { cn } from "@/lib/utils";

export const PlaybookAI = ({ className }: { className?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-6 w-6", className)}
    >
      {/* Left Page */}
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      {/* Right Page */}
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      {/* Neural Nodes / Data Grid Overlay */}
      <circle cx="6" cy="8" r="1" fill="currentColor" stroke="none" className="opacity-60" />
      <circle cx="18" cy="8" r="1" fill="currentColor" stroke="none" className="opacity-60" />
      <path d="M6 8l2 2" className="opacity-40" />
      <path d="M18 8l-2 2" className="opacity-40" />
      <path d="M12 7v10" className="opacity-30" />
    </svg>
  );
};
