import { useState } from "react";

// Ordenação por coluna compartilhada por todas as tabelas do sistema
// (CrudPage genérico, Histórico, Pendências). Clique cicla asc → desc → sem.

export type ValorOrdenavel = string | number | boolean | null | undefined;
export type Ordem = { coluna: string; dir: "asc" | "desc" } | null;

// Nulos sempre por último; texto compara em pt-BR com números "humanos" (2 < 10).
export function comparar(a: ValorOrdenavel, b: ValorOrdenavel): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "pt-BR", { numeric: true, sensitivity: "base" });
}

export function useOrdenacao<T>(sortValues: Record<string, (row: T) => ValorOrdenavel>) {
  const [ordem, setOrdem] = useState<Ordem>(null);

  function alternar(coluna: string) {
    setOrdem((o) =>
      o?.coluna !== coluna ? { coluna, dir: "asc" } : o.dir === "asc" ? { coluna, dir: "desc" } : null,
    );
  }

  /** Aplica a ordenação ativa; sem coluna ativa, devolve as linhas como vieram. */
  function ordenar(rows: T[]): T[] {
    const get = ordem ? sortValues[ordem.coluna] : undefined;
    if (!ordem || !get) return rows;
    const dir = ordem.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => comparar(get(a), get(b)) * dir);
  }

  return { ordem, alternar, ordenar };
}
