import * as React from "react";
import { cn } from "@/lib/utils";

// Campo com leve sombra interna (skeuomorfismo sutil) — parece um "encaixe"
// de entrada de dados, como em sistemas de balcão tradicionais.
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-lg border border-zinc-600 bg-zinc-900/60 px-3.5 text-sm text-zinc-100 shadow-inner transition-colors",
        "placeholder:text-zinc-500 focus:border-orange-500/60 focus:outline-none focus:ring-2 focus:ring-orange-500/20",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "h-11 w-full rounded-lg border border-zinc-600 bg-zinc-900/60 px-3 text-sm text-zinc-100 shadow-inner transition-colors",
        "focus:border-orange-500/60 focus:outline-none focus:ring-2 focus:ring-orange-500/20",
        className,
      )}
      {...props}
    />
  ),
);
Select.displayName = "Select";
