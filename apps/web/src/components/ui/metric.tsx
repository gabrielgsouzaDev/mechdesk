import * as React from "react";
import { Card } from "./card";
import { cn } from "@/lib/utils";

type Tone = "default" | "primary" | "alerta";

const toneStyles: Record<Tone, { value: string; iconWrap: string }> = {
  default: { value: "text-zinc-100", iconWrap: "bg-zinc-700/60 text-zinc-300" },
  primary: { value: "text-orange-400", iconWrap: "bg-orange-500/10 text-orange-400" },
  alerta: { value: "text-rose-500", iconWrap: "bg-rose-500/10 text-rose-500" },
};

// Painel de métrica sólido: rótulo (uppercase, zinc-400) separado do
// número grande (text-2xl bold), com ícone à direita. Leitura instantânea.
export function Metric({
  icon,
  rotulo,
  valor,
  hint,
  tone = "default",
}: {
  icon: React.ReactNode;
  rotulo: string;
  valor: string;
  hint?: string;
  tone?: Tone;
}) {
  const s = toneStyles[tone];
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">{rotulo}</span>
        <span className={cn("grid size-8 place-items-center rounded-lg", s.iconWrap)}>{icon}</span>
      </div>
      <p className={cn("mt-2 font-display text-3xl font-semibold tabular-nums", s.value)}>{valor}</p>
      {hint && <p className="mt-0.5 text-xs text-zinc-500">{hint}</p>}
    </Card>
  );
}
