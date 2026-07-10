import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { isLiveMode } from "@/lib/config";
import { useRealtimeInvalidate } from "./useRealtime";
import { MOVIMENTACOES_MOCK } from "@/lib/mock";
import type { Movimentacao } from "@/lib/types";

// Log/histórico de movimentações — lê a mesma chave de cache do console,
// então entradas/saídas feitas na tela de movimentação aparecem aqui na hora.
export function useMovimentacoes() {
  const live = isLiveMode;
  const q = useQuery({
    queryKey: ["movimentacoes"],
    queryFn: live ? () => api.get<Movimentacao[]>("/estoque/movimentacoes") : async () => MOVIMENTACOES_MOCK,
    staleTime: live ? 5_000 : Infinity,
  });

  useRealtimeInvalidate("log-mov", "movimentacoes_estoque", ["movimentacoes"]);

  return {
    mode: live ? ("live" as const) : ("demo" as const),
    loading: q.isLoading,
    movimentacoes: q.data ?? [],
  };
}
