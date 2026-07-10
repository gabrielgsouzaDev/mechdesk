import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { isLiveMode } from "@/lib/config";
import { useRealtimeInvalidate } from "./useRealtime";
import { PRODUTOS_MOCK, ORDENS_MOCK, MOVIMENTACOES_MOCK, OPERADOR } from "@/lib/mock";
import type { Produto, OrdemServico, Movimentacao } from "@/lib/types";

export type TipoMov = "ENTRADA" | "SAIDA";

export type MovInput = {
  produtoId: string;
  quantidade: number;
  tipo: TipoMov;
  ordemServicoId?: string;
  motivo?: string;
};

// Dados + ações do console de movimentação de estoque.
//  - live: API + Realtime (estoque reconcilia sozinho).
//  - demo: cache do React Query semeado com mock; a baixa/entrada ajusta o
//    saldo e grava no log local — compartilhado com a tela de Histórico.
export function useEstoque() {
  const live = isLiveMode;
  const qc = useQueryClient();

  const prodQ = useQuery({
    queryKey: ["produtos"],
    queryFn: live ? () => api.get<Produto[]>("/produtos") : async () => PRODUTOS_MOCK,
    staleTime: live ? 10_000 : Infinity,
  });
  const ordensQ = useQuery({
    queryKey: ["ordens"],
    queryFn: live ? () => api.get<OrdemServico[]>("/ordens") : async () => ORDENS_MOCK,
    staleTime: live ? 10_000 : Infinity,
  });
  const movQ = useQuery({
    queryKey: ["movimentacoes"],
    queryFn: live ? () => api.get<Movimentacao[]>("/estoque/movimentacoes") : async () => MOVIMENTACOES_MOCK,
    staleTime: live ? 5_000 : Infinity,
  });

  useRealtimeInvalidate("console-produtos", "produtos", ["produtos"]);
  useRealtimeInvalidate("console-mov", "movimentacoes_estoque", ["movimentacoes"]);

  const produtos = prodQ.data ?? [];
  const ordens = ordensQ.data ?? [];
  const movimentacoes = movQ.data ?? [];

  async function registrarMovimentacao(i: MovInput) {
    if (live) {
      // funcionarioId não é enviado: a API resolve o operador do JWT.
      await api.post("/estoque/movimentacao", i);
      qc.invalidateQueries({ queryKey: ["produtos"] });
      qc.invalidateQueries({ queryKey: ["movimentacoes"] });
      return;
    }
    // Demo: ajusta saldo e grava no log (cache compartilhado).
    const prod = produtos.find((p) => p.id === i.produtoId);
    const delta = i.tipo === "ENTRADA" ? i.quantidade : -i.quantidade;
    const saldoApos = (prod?.estoqueAtual ?? 0) + delta;
    const os = ordens.find((o) => o.id === i.ordemServicoId);

    qc.setQueryData<Produto[]>(["produtos"], (arr = []) =>
      arr.map((p) => (p.id === i.produtoId ? { ...p, estoqueAtual: p.estoqueAtual + delta } : p)),
    );
    qc.setQueryData<Movimentacao[]>(["movimentacoes"], (arr = []) => [
      {
        id: crypto.randomUUID(),
        tipo: i.tipo,
        quantidade: i.quantidade,
        saldoApos,
        motivo: i.motivo ?? null,
        criadoEm: new Date().toISOString(),
        produto: prod ? { sku: prod.sku, descricao: prod.descricao } : undefined,
        usuario: { nome: OPERADOR.nome },
        ordemServico: os ? { numero: os.numero, veiculo: { placa: os.veiculoPlaca } } : null,
      },
      ...arr,
    ]);
  }

  return {
    mode: live ? ("live" as const) : ("demo" as const),
    loading: live && (prodQ.isLoading || ordensQ.isLoading),
    produtos,
    ordens,
    movimentacoes,
    registrarMovimentacao,
  };
}
