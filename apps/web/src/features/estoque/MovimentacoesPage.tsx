import { useMemo, useState } from "react";
import { History, Search, ArrowDownToLine, ArrowUpFromLine, Settings2, Wrench, Undo2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, THead, TH, THOrdenavel, TBody, TR, TD } from "@/components/ui/table";
import { useMovimentacoes } from "@/hooks/useMovimentacoes";
import { useOrdenacao, type ValorOrdenavel } from "@/hooks/useOrdenacao";
import type { Movimentacao, TipoMovimentacao } from "@/lib/types";

const META: Record<TipoMovimentacao, { label: string; icon: typeof Settings2; sinal: string }> = {
  ENTRADA: { label: "Entrada", icon: ArrowDownToLine, sinal: "+" },
  SAIDA: { label: "Saída", icon: ArrowUpFromLine, sinal: "−" },
  AJUSTE: { label: "Ajuste", icon: Settings2, sinal: "=" },
  EMPRESTIMO: { label: "Empréstimo", icon: Wrench, sinal: "→" },
  DEVOLUCAO: { label: "Devolução", icon: Undo2, sinal: "←" },
};

const FILTROS = ["TODOS", "ENTRADA", "SAIDA", "AJUSTE", "EMPRESTIMO", "DEVOLUCAO"] as const;
type Filtro = (typeof FILTROS)[number];

// Recorte de período (Etapa 4). "Hoje" = desde a meia-noite local.
const PERIODOS = [
  { id: "tudo", label: "Tudo", desde: () => 0 },
  { id: "hoje", label: "Hoje", desde: () => new Date().setHours(0, 0, 0, 0) },
  { id: "7d", label: "7 dias", desde: () => Date.now() - 7 * 86_400_000 },
  { id: "30d", label: "30 dias", desde: () => Date.now() - 30 * 86_400_000 },
] as const;
type Periodo = (typeof PERIODOS)[number]["id"];

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

// Sem ordenação escolhida, o log fica como veio: mais recente primeiro.
const SORT_VALUES: Record<string, (m: Movimentacao) => ValorOrdenavel> = {
  Quando: (m) => m.criadoEm,
  Tipo: (m) => META[m.tipo].label,
  "Peça": (m) => m.produto?.descricao,
  Qtd: (m) => m.quantidade,
  Saldo: (m) => m.saldoApos,
  Operador: (m) => m.usuario?.nome,
};

export function MovimentacoesPage() {
  const { movimentacoes, mode, loading } = useMovimentacoes();
  const [filtro, setFiltro] = useState<Filtro>("TODOS");
  const [periodo, setPeriodo] = useState<Periodo>("tudo");
  const [busca, setBusca] = useState("");
  const { ordem, alternar, ordenar } = useOrdenacao<Movimentacao>(SORT_VALUES);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const desde = PERIODOS.find((p) => p.id === periodo)!.desde();
    return ordenar(
      movimentacoes.filter((m) => {
        if (filtro !== "TODOS" && m.tipo !== filtro) return false;
        if (desde > 0 && new Date(m.criadoEm).getTime() < desde) return false;
        if (!q) return true;
        return (
          (m.produto?.descricao ?? "").toLowerCase().includes(q) ||
          (m.produto?.sku ?? "").toLowerCase().includes(q)
        );
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movimentacoes, filtro, periodo, busca, ordem]);

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-lg bg-zinc-800 text-orange-400 ring-1 ring-inset ring-zinc-700">
          <History className="size-5" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold text-zinc-100">Histórico de Movimentações</h1>
          <p className="text-sm text-zinc-400">Log de toda entrada e saída do estoque</p>
        </div>
      </div>

      {mode === "demo" && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-400/10 px-3.5 py-2.5 text-sm text-amber-300 ring-1 ring-inset ring-amber-400/25">
          <AlertTriangle className="size-4 shrink-0" />
          Modo demonstração — o log reflete as movimentações desta sessão.
        </div>
      )}

      {/* Filtros + busca */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-zinc-700 bg-zinc-800 p-1 shadow-sm">
          {FILTROS.map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                filtro === f ? "bg-orange-600 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-100",
              )}
            >
              {f === "TODOS" ? "Todos" : META[f as TipoMovimentacao].label}
            </button>
          ))}
        </div>
        <div className="inline-flex rounded-lg border border-zinc-700 bg-zinc-800 p-1 shadow-sm">
          {PERIODOS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriodo(p.id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                periodo === p.id ? "bg-orange-600 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-100",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar peça…" className="pl-10" />
        </div>
      </div>

      {/* Tabela / log */}
      <Table>
        <THead>
          <THOrdenavel coluna="Quando" ordem={ordem} onOrdenar={alternar} className="w-28" />
          <THOrdenavel coluna="Tipo" ordem={ordem} onOrdenar={alternar} className="w-28" />
          <THOrdenavel coluna="Peça" ordem={ordem} onOrdenar={alternar} />
          <THOrdenavel coluna="Qtd" ordem={ordem} onOrdenar={alternar} className="w-20 text-right" />
          <THOrdenavel coluna="Saldo" ordem={ordem} onOrdenar={alternar} className="w-20 text-right" />
          <THOrdenavel coluna="Operador" ordem={ordem} onOrdenar={alternar} className="w-32" />
          <TH>Origem</TH>
        </THead>
        <TBody>
          {lista.length === 0 ? (
            <TR>
              <TD colSpan={7} className="py-10 text-center text-zinc-500">
                {loading ? "Carregando…" : "Nenhuma movimentação."}
              </TD>
            </TR>
          ) : (
            lista.map((m) => <LinhaLog key={m.id} m={m} />)
          )}
        </TBody>
      </Table>
    </div>
  );
}

function LinhaLog({ m }: { m: Movimentacao }) {
  const meta = META[m.tipo];
  const Icone = meta.icon;
  const origem = m.emprestimo
    ? `${m.tipo === "SAIDA" ? "Perda" : "Ferramenta"} · ${m.emprestimo.funcionario.nome}`
    : m.ordemServico
      ? `OS #${m.ordemServico.numero} · ${m.ordemServico.veiculo?.placa ?? ""}`
      : m.motivo ?? "—";
  return (
    <TR>
      <TD className="whitespace-nowrap text-zinc-400">{dataHora(m.criadoEm)}</TD>
      <TD>
        <Badge tone={m.tipo === "AJUSTE" ? "amber" : "zinc"}>
          <Icone className="size-3" /> {meta.label}
        </Badge>
      </TD>
      <TD>
        <span className="font-medium text-zinc-100">{m.produto?.descricao ?? "—"}</span>
        <span className="ml-2 text-xs text-zinc-500">{m.produto?.sku}</span>
      </TD>
      <TD className="text-right font-display font-semibold tabular-nums text-zinc-200">{meta.sinal}{m.quantidade}</TD>
      <TD className="text-right font-display tabular-nums text-zinc-400">{m.saldoApos}</TD>
      <TD className="text-zinc-300">{m.usuario?.nome ?? "—"}</TD>
      <TD className="text-zinc-400">{origem}</TD>
    </TR>
  );
}
