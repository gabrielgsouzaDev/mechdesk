import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { isLiveMode } from "@/lib/config";
import { useRealtimeInvalidate } from "./useRealtime";
import { EMPRESTIMOS_MOCK, FUNCIONARIOS_MOCK, MOVIMENTACOES_MOCK, PRODUTOS_MOCK, CONFIG_MOCK, OPERADOR } from "@/lib/mock";
import type { Emprestimo, Funcionario, Configuracao, Movimentacao, Produto } from "@/lib/types";

export type EmprestimoInput = {
  produtoId: string;
  funcionarioId: string;
  quantidade: number;
  motivo?: string;
};

// Dados + ações da ferramentaria: empréstimo, devolução, perda e o prazo
// padrão configurável (decidido só pelo Admin — Avaliação 02). Mesmo par
// live/demo dos outros hooks de estoque. No demo, TODO o estado mora no
// query cache (["emprestimos"], ["config"], ["movimentacoes"]): cada tela
// que usa o hook enxerga as mesmas pendências e o mesmo ledger — um
// empréstimo feito no Console aparece em Pendências e no Histórico na hora.
export function useFerramentaria() {
  const live = isLiveMode;
  const qc = useQueryClient();

  const funcionariosQ = useQuery({
    queryKey: ["funcionarios-ativos"],
    queryFn: live ? () => api.get<Funcionario[]>("/funcionarios") : async () => FUNCIONARIOS_MOCK,
    staleTime: live ? 30_000 : Infinity,
  });
  const emprestimosQ = useQuery({
    queryKey: ["emprestimos"],
    queryFn: live ? () => api.get<Emprestimo[]>("/estoque/emprestimos") : async () => EMPRESTIMOS_MOCK,
    staleTime: live ? 5_000 : Infinity,
  });
  const configQ = useQuery({
    queryKey: ["config"],
    queryFn: live ? () => api.get<Configuracao>("/estoque/config") : async () => CONFIG_MOCK,
    staleTime: live ? 30_000 : Infinity,
  });

  useRealtimeInvalidate("ferramentaria-emprestimos", "emprestimos", ["emprestimos"]);

  const funcionarios = (funcionariosQ.data ?? []).filter((f) => f.ativo !== false);
  const emprestimos = emprestimosQ.data ?? [];
  const config = configQ.data ?? CONFIG_MOCK;
  const abertos = emprestimos.filter((e) => e.status === "ABERTO");

  /** Unidades livres pra emprestar: estoqueAtual (total possuído) menos o que está em aberto. */
  function disponivel(produto: Pick<Produto, "id" | "estoqueAtual">) {
    const emprestado = abertos
      .filter((e) => e.produtoId === produto.id)
      .reduce((s, e) => s + e.quantidade, 0);
    return produto.estoqueAtual - emprestado;
  }

  // ── helpers do modo demo (espelham o que a RPC grava no live) ──
  function produtoDemo(id: string) {
    return (qc.getQueryData<Produto[]>(["produtos"]) ?? PRODUTOS_MOCK).find((p) => p.id === id);
  }
  function registrarNoLedgerDemo(mov: Movimentacao) {
    qc.setQueryData<Movimentacao[]>(["movimentacoes"], (arr) => [mov, ...(arr ?? MOVIMENTACOES_MOCK)]);
  }
  function atualizarEmprestimosDemo(fn: (arr: Emprestimo[]) => Emprestimo[]) {
    qc.setQueryData<Emprestimo[]>(["emprestimos"], (arr) => fn(arr ?? EMPRESTIMOS_MOCK));
  }

  async function emprestar(i: EmprestimoInput) {
    if (live) {
      await api.post("/estoque/emprestimo", i);
      qc.invalidateQueries({ queryKey: ["emprestimos"] });
      qc.invalidateQueries({ queryKey: ["movimentacoes"] });
      return;
    }
    const produto = produtoDemo(i.produtoId);
    const funcionario = funcionarios.find((f) => f.id === i.funcionarioId);
    atualizarEmprestimosDemo((arr) => [
      {
        id: crypto.randomUUID(),
        produtoId: i.produtoId,
        funcionarioId: i.funcionarioId,
        quantidade: i.quantidade,
        status: "ABERTO",
        retiradoEm: new Date().toISOString(),
        prazoEm: new Date(Date.now() + config.prazoEmprestimoHoras * 3_600_000).toISOString(),
        motivo: i.motivo ?? null,
        produto: produto ? { sku: produto.sku, descricao: produto.descricao } : undefined,
        funcionario: funcionario ? { nome: funcionario.nome, cargo: funcionario.cargo } : undefined,
        usuarioRetirada: { nome: OPERADOR.nome },
      },
      ...arr,
    ]);
    registrarNoLedgerDemo({
      id: crypto.randomUUID(),
      tipo: "EMPRESTIMO",
      quantidade: i.quantidade,
      saldoApos: produto?.estoqueAtual ?? 0,
      motivo: i.motivo ?? null,
      criadoEm: new Date().toISOString(),
      produto: produto ? { sku: produto.sku, descricao: produto.descricao } : undefined,
      usuario: { nome: OPERADOR.nome },
      emprestimo: funcionario ? { funcionario: { nome: funcionario.nome } } : null,
    });
  }

  async function devolver(id: string, motivo?: string) {
    if (live) {
      await api.post(`/estoque/emprestimo/${id}/devolucao`, { motivo });
      qc.invalidateQueries({ queryKey: ["emprestimos"] });
      qc.invalidateQueries({ queryKey: ["movimentacoes"] });
      return;
    }
    const emp = emprestimos.find((e) => e.id === id);
    atualizarEmprestimosDemo((arr) =>
      arr.map((e) =>
        e.id === id
          ? { ...e, status: "DEVOLVIDO", devolvidoEm: new Date().toISOString(), motivoFechamento: motivo ?? null, usuarioFechamento: { nome: OPERADOR.nome } }
          : e,
      ),
    );
    if (emp) {
      const produto = produtoDemo(emp.produtoId);
      registrarNoLedgerDemo({
        id: crypto.randomUUID(),
        tipo: "DEVOLUCAO",
        quantidade: emp.quantidade,
        saldoApos: produto?.estoqueAtual ?? 0,
        motivo: motivo ?? null,
        criadoEm: new Date().toISOString(),
        produto: produto ? { sku: produto.sku, descricao: produto.descricao } : emp.produto,
        usuario: { nome: OPERADOR.nome },
        emprestimo: emp.funcionario ? { funcionario: { nome: emp.funcionario.nome } } : null,
      });
    }
  }

  async function perder(id: string, motivo: string) {
    if (live) {
      await api.post(`/estoque/emprestimo/${id}/perda`, { motivo });
      qc.invalidateQueries({ queryKey: ["emprestimos"] });
      qc.invalidateQueries({ queryKey: ["movimentacoes"] });
      qc.invalidateQueries({ queryKey: ["produtos"] });
      return;
    }
    const emp = emprestimos.find((e) => e.id === id);
    atualizarEmprestimosDemo((arr) =>
      arr.map((e) =>
        e.id === id
          ? { ...e, status: "PERDIDO", devolvidoEm: new Date().toISOString(), motivoFechamento: motivo, usuarioFechamento: { nome: OPERADOR.nome } }
          : e,
      ),
    );
    // Perda também é baixa definitiva — mesma regra da RPC no modo live.
    if (emp) {
      const produto = produtoDemo(emp.produtoId);
      const saldoApos = (produto?.estoqueAtual ?? emp.quantidade) - emp.quantidade;
      qc.setQueryData<Produto[]>(["produtos"], (arr = []) =>
        arr.map((p) => (p.id === emp.produtoId ? { ...p, estoqueAtual: p.estoqueAtual - emp.quantidade } : p)),
      );
      registrarNoLedgerDemo({
        id: crypto.randomUUID(),
        tipo: "SAIDA",
        quantidade: emp.quantidade,
        saldoApos,
        motivo: `Perda: ${motivo}`,
        criadoEm: new Date().toISOString(),
        produto: produto ? { sku: produto.sku, descricao: produto.descricao } : emp.produto,
        usuario: { nome: OPERADOR.nome },
        emprestimo: emp.funcionario ? { funcionario: { nome: emp.funcionario.nome } } : null,
      });
    }
  }

  async function salvarPrazoPadrao(horas: number) {
    if (live) {
      await api.patch("/estoque/config", { prazoEmprestimoHoras: horas });
      qc.invalidateQueries({ queryKey: ["config"] });
      return;
    }
    qc.setQueryData<Configuracao>(["config"], (c) => ({ ...(c ?? CONFIG_MOCK), prazoEmprestimoHoras: horas }));
  }

  return {
    mode: live ? ("live" as const) : ("demo" as const),
    loading: live && (funcionariosQ.isLoading || emprestimosQ.isLoading),
    funcionarios,
    emprestimos,
    abertos,
    config,
    disponivel,
    emprestar,
    devolver,
    perder,
    salvarPrazoPadrao,
  };
}
