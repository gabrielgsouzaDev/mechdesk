import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Botões com "peso" tátil: sombra, borda sutil e anel de foco visível —
// usuários de ERP antigo precisam enxergar o que é clicável.
const buttonVariants = cva(
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 active:translate-y-px disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "border border-orange-500/40 bg-orange-600 text-white shadow-sm hover:bg-orange-700 active:bg-orange-700",
        secondary:
          "border border-zinc-600/70 bg-zinc-700/60 text-zinc-100 shadow-sm hover:bg-zinc-700",
        outline:
          "border border-zinc-600 bg-zinc-800 text-zinc-200 shadow-sm hover:border-zinc-500 hover:bg-zinc-700/60",
        ghost: "text-zinc-300 hover:bg-zinc-700/50 hover:text-zinc-100",
        danger:
          "border border-rose-500/40 bg-rose-600 text-white shadow-sm hover:bg-rose-700",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "size-11",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = "Button";

export { buttonVariants };
