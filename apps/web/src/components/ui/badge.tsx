import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Badges com anel interno (ring-inset) — leem como "etiquetas" de sistema.
// Tons contidos: zinc (neutro/padrão), orange (marca), rose (perigo), amber (atenção).
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums ring-1 ring-inset",
  {
    variants: {
      tone: {
        zinc: "bg-zinc-700/50 text-zinc-300 ring-zinc-600/50",
        orange: "bg-orange-500/10 text-orange-400 ring-orange-500/25",
        rose: "bg-rose-500/10 text-rose-400 ring-rose-500/25",
        amber: "bg-amber-400/10 text-amber-300 ring-amber-400/25",
      },
    },
    defaultVariants: { tone: "zinc" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
