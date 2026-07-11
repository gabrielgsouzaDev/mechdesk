import * as React from "react";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Ordem } from "@/hooks/useOrdenacao";

export function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    // overflow-x-auto: em tela estreita a tabela densa rola na horizontal
    // dentro do próprio card — nenhuma coluna (ex.: Ações) é decepada.
    <div className="overflow-x-auto rounded-xl border border-zinc-700/70 bg-zinc-800 shadow-sm">
      <table className={cn("w-full text-sm", className)} {...props} />
    </div>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="border-b border-zinc-700/70 bg-zinc-800/60 text-left">
      <tr className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{children}</tr>
    </thead>
  );
}

export function TH({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn("px-4 py-3 font-semibold", className)} {...props} />;
}

/** Cabeçalho clicável de coluna ordenável — par do hook useOrdenacao. */
export function THOrdenavel({
  coluna,
  ordem,
  onOrdenar,
  className,
  children,
}: {
  coluna: string;
  ordem: Ordem;
  onOrdenar: (coluna: string) => void;
  className?: string;
  children?: React.ReactNode;
}) {
  const ativa = ordem?.coluna === coluna;
  return (
    <TH className={className} aria-sort={ativa ? (ordem.dir === "asc" ? "ascending" : "descending") : undefined}>
      <button
        onClick={() => onOrdenar(coluna)}
        className={cn(
          "group inline-flex items-center gap-1 uppercase tracking-wide transition-colors hover:text-zinc-100",
          ativa && "text-orange-400",
        )}
      >
        {children ?? coluna}
        {ativa ? (
          ordem.dir === "asc" ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />
        ) : (
          <ArrowUpDown className="size-3.5 opacity-0 transition-opacity group-hover:opacity-60" />
        )}
      </button>
    </TH>
  );
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-zinc-700/50">{children}</tbody>;
}

export function TR({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("transition-colors hover:bg-zinc-700/30", className)} {...props} />;
}

export function TD({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-4 py-3 text-zinc-200", className)} {...props} />;
}
