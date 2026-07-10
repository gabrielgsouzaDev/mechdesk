import { useMemo, useState } from "react";
import {
  Search, Package, Wrench, ArrowDownToLine, ArrowUpFromLine, Undo2, Minus, Plus, Check,
  MapPin, AlertTriangle, Boxes, ListChecks, X, Loader2, Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { horaCurta } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import { Metric } from "@/components/ui/metric";
import { useEstoque, type TipoMov } from "@/hooks/useEstoque";
import { useFerramentaria } from "@/hooks/useFerramentaria";
import type { Movimentacao, Produto } from "@/lib/types";

type TipoConsole = TipoMov | "EMPRESTAR";

const isHoje = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();

export function ConsoleMovimentacao() {
  const { produtos, ordens, movimentacoes, mode, registrarMovimentacao } = useEstoque();
  const ferramentaria = useFerramentaria();

  const [busca, setBusca] = useState("");
  const [selId, setSelId] = useState<string | null>(null);
  const [tipo, setTipo] = useState<TipoConsole>("SAIDA");
  const [osId, setOsId] = useState<string>("");
  const [funcionarioId, setFuncionarioId] = useState("");
  const [motivo, setMotivo] = useState("");
  const [qtd, setQtd] = useState(1);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const sel = produtos.find((p) => p.id === selId) ?? null;
  const isFerramenta = sel?.categoria === "FERRAMENTA";
  const disponivel = sel ? ferramentaria.disponivel(sel) : 0;

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return produtos;
    return produtos.filter((p) => p.descricao.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
  }, [produtos, busca]);

  const stats = useMemo(() => {
    const hoje = movimentacoes.filter((m) => isHoje(m.criadoEm));
    return {
      totalItens: produtos.reduce((s, p) => s + p.estoqueAtual, 0),
      entradasHoje: hoje.filter((m) => m.tipo === "ENTRADA").reduce((s, m) => s + m.quantidade, 0),
      saidasHoje: hoje.filter((m) => m.tipo === "SAIDA").reduce((s, m) => s + m.quantidade, 0),
      // Ferramenta conta pelo DISPONÍVEL (total − emprestadas): toda emprestada
      // também é "abaixo do mínimo", mesmo que o total possuído não mude.
      abaixoMin: produtos.filter(
        (p) => (p.categoria === "FERRAMENTA" ? ferramentaria.disponivel(p) : p.estoqueAtual) <= p.estoqueMinimo,
      ).length,
    };
  }, [movimentacoes, produtos, ferramentaria]);

  function selecionar(id: string) {
    const p = produtos.find((x) => x.id === id);
    setSelId(id);
    setQtd(1);
    setErro(null);
    setFuncionarioId("");
    setTipo(p?.categoria === "FERRAMENTA" ? "EMPRESTAR" : "SAIDA");
  }

  async function confirmar() {
    if (!sel) return;
    setSalvando(true);
    setErro(null);
    try {
      if (tipo === "EMPRESTAR") {
        if (!funcionarioId) throw new Error("Selecione para quem vai a ferramenta.");
        await ferramentaria.emprestar({
          produtoId: sel.id,
          funcionarioId,
          quantidade: qtd,
          motivo: motivo.trim() || undefined,
        });
        setToast(`${qtd}× ${sel.descricao} emprestado(a)`);
      } else {
        await registrarMovimentacao({
          produtoId: sel.id,
          quantidade: qtd,
          tipo,
          ordemServicoId: tipo === "SAIDA" && osId ? osId : undefined,
          motivo: motivo.trim() || undefined,
        });
        setToast(`${tipo === "ENTRADA" ? "Entrada" : "Saída"} de ${qtd}× ${sel.descricao} registrada`);
      }
      setTimeout(() => setToast(null), 2800);
      setSelId(null);
      setQtd(1);
      setMotivo("");
      setFuncionarioId("");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao registrar a movimentação.");
    } finally {
      setSalvando(false);
    }
  }

  const estoqueInsuf = sel
    ? tipo === "EMPRESTAR"
      ? qtd > disponivel
      : tipo === "SAIDA" && qtd > sel.estoqueAtual
    : false;

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-zinc-100">Movimentação de Estoque</h1>
          <p className="text-sm text-zinc-400">Almoxarifado · entrada, saída e empréstimo de ferramenta</p>
        </div>
        {mode === "demo" ? (
          <Badge tone="amber" className="px-2.5 py-1">Modo demonstração</Badge>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-orange-500/10 px-2.5 py-1 text-xs font-medium text-orange-400 ring-1 ring-inset ring-orange-500/25">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-orange-500 opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-orange-500" />
            </span>
            Sincronizado
          </span>
        )}
      </div>

      {/* Métricas */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric icon={<Boxes className="size-4" />} rotulo="Itens em estoque" valor={String(stats.totalItens)} hint="peças e ferramentas" />
        <Metric icon={<ArrowDownToLine className="size-4" />} rotulo="Entradas hoje" valor={String(stats.entradasHoje)} hint="unidades recebidas" tone="primary" />
        <Metric icon={<ArrowUpFromLine className="size-4" />} rotulo="Saídas hoje" valor={String(stats.saidasHoje)} hint="unidades baixadas" />
        <Metric
          icon={<AlertTriangle className="size-4" />}
          rotulo="Abaixo do mínimo"
          valor={String(stats.abaixoMin)}
          hint={stats.abaixoMin > 0 ? "requer reposição" : "tudo ok"}
          tone={stats.abaixoMin > 0 ? "alerta" : "default"}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* Catálogo */}
        <section>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
            <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar peça ou ferramenta por nome ou código (SKU)…" className="pl-10" />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {filtrados.map((p) => (
              <CatalogoCard key={p.id} p={p} ativo={selId === p.id} disponivel={ferramentaria.disponivel(p)} onClick={() => selecionar(p.id)} />
            ))}
          </div>
        </section>

        {/* Painel — Registrar movimentação */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="overflow-hidden rounded-xl border border-zinc-700 border-t-2 border-t-orange-600 bg-zinc-800 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-700/70 bg-zinc-800/60 px-5 py-3.5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                <Settings2 className="size-4 text-orange-400" /> Registrar Movimentação
              </h2>
              <span className="rounded-md bg-zinc-700/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-400 ring-1 ring-inset ring-zinc-600/50">
                {tipo === "ENTRADA" ? "Entrada" : tipo === "EMPRESTAR" ? "Empréstimo" : "Saída"}
              </span>
            </div>

            <div className="p-5">
              {!sel ? (
                <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-700 bg-zinc-900/40 py-12 text-center">
                  <Package className="size-7 text-zinc-600" />
                  <p className="text-sm text-zinc-400">Selecione uma peça ou ferramenta no catálogo</p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex items-center gap-3 rounded-lg border border-zinc-700/70 bg-zinc-900/40 p-3.5">
                    <div className="grid size-11 place-items-center rounded-lg bg-orange-500/10 text-orange-400 ring-1 ring-inset ring-orange-500/20">
                      {isFerramenta ? <Wrench className="size-5" /> : <Package className="size-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-zinc-100">{sel.descricao}</p>
                      <p className="text-xs text-zinc-400">
                        {sel.sku} · {isFerramenta ? `${disponivel} disponível de ${sel.estoqueAtual}` : `${sel.estoqueAtual} em estoque`}
                      </p>
                    </div>
                  </div>

                  {/* Tipo: entrada x saída/empréstimo */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Tipo de movimentação</p>
                    <div className="grid grid-cols-2 gap-3">
                      <TipoBtn ativo={tipo === "ENTRADA"} onClick={() => setTipo("ENTRADA")} icon={<ArrowDownToLine className="size-4" />} label="Entrada" />
                      {isFerramenta ? (
                        <TipoBtn ativo={tipo === "EMPRESTAR"} onClick={() => setTipo("EMPRESTAR")} icon={<Wrench className="size-4" />} label="Emprestar" />
                      ) : (
                        <TipoBtn ativo={tipo === "SAIDA"} onClick={() => setTipo("SAIDA")} icon={<ArrowUpFromLine className="size-4" />} label="Saída" />
                      )}
                    </div>
                  </div>

                  {/* OS opcional na saída de peça */}
                  {tipo === "SAIDA" && (
                    <div className="space-y-2 duration-200 animate-in fade-in slide-in-from-top-1">
                      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Vincular a uma OS (opcional)</p>
                      <Select value={osId} onChange={(e) => setOsId(e.target.value)}>
                        <option value="">— Sem OS (consumo avulso) —</option>
                        {ordens.map((o) => (
                          <option key={o.id} value={o.id}>
                            OS #{o.numero} · {o.veiculoPlaca} · {o.veiculoModelo}
                          </option>
                        ))}
                      </Select>
                    </div>
                  )}

                  {/* Funcionário no empréstimo de ferramenta. O prazo NÃO é decidido
                      aqui: é a configuração do Admin (Avaliação 02) — quem empresta
                      só vê qual é. */}
                  {tipo === "EMPRESTAR" && (
                    <div className="space-y-4 duration-200 animate-in fade-in slide-in-from-top-1">
                      <div className="space-y-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Emprestar para</p>
                        <Select value={funcionarioId} onChange={(e) => setFuncionarioId(e.target.value)}>
                          <option value="" disabled>Selecione o funcionário…</option>
                          {ferramentaria.funcionarios.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.nome}{f.cargo ? ` · ${f.cargo}` : ""}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <p className="text-xs text-zinc-500">
                        Prazo de devolução: <span className="font-medium text-zinc-300">{ferramentaria.config.prazoEmprestimoHoras}h</span> (definido pelo administrador)
                      </p>
                    </div>
                  )}

                  {/* Motivo */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Motivo (opcional)</p>
                    <Input
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      placeholder={tipo === "ENTRADA" ? "ex: Recebimento fornecedor" : tipo === "EMPRESTAR" ? "ex: Troca de óleo na OS 1042" : "ex: Consumo / perda"}
                    />
                  </div>

                  {/* Quantidade */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Quantidade</p>
                    <div className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-900/40 p-2">
                      <Button variant="outline" size="icon" onClick={() => setQtd((q) => Math.max(1, q - 1))} aria-label="Diminuir">
                        <Minus className="size-5" />
                      </Button>
                      <span className="font-display text-3xl font-semibold tabular-nums text-zinc-100">{qtd}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          setQtd((q) => (tipo === "SAIDA" ? Math.min(sel.estoqueAtual, q + 1) : tipo === "EMPRESTAR" ? Math.min(disponivel, q + 1) : q + 1))
                        }
                        aria-label="Aumentar"
                      >
                        <Plus className="size-5" />
                      </Button>
                    </div>
                  </div>

                  {(estoqueInsuf || erro) && (
                    <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 px-3.5 py-3 text-sm font-medium text-rose-400 ring-1 ring-inset ring-rose-500/25">
                      <AlertTriangle className="size-4 shrink-0" />
                      {erro ?? (tipo === "EMPRESTAR" ? "Quantidade acima do disponível para empréstimo." : "Quantidade acima do estoque disponível.")}
                    </div>
                  )}

                  <Button onClick={confirmar} disabled={estoqueInsuf || salvando || (tipo === "EMPRESTAR" && !funcionarioId)} size="lg" className="w-full">
                    {salvando ? <Loader2 className="size-5 animate-spin" /> : <Check className="size-5" />}
                    {tipo === "ENTRADA" ? "Confirmar entrada" : tipo === "EMPRESTAR" ? "Confirmar empréstimo" : "Confirmar saída"}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Feed — últimas movimentações (mesmo log da tela de Histórico) */}
          <Card className="mt-4 p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
              <ListChecks className="size-4 text-orange-400" /> Últimas movimentações
            </h2>
            {movimentacoes.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-400">Nenhuma movimentação ainda.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {movimentacoes.slice(0, 8).map((m) => (
                  <FeedItem key={m.id} m={m} />
                ))}
              </ul>
            )}
          </Card>
        </aside>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2.5 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm font-medium text-zinc-100 shadow-xl duration-300 animate-in fade-in slide-in-from-bottom-3">
          <div className="grid size-5 place-items-center rounded-full bg-orange-600 text-white">
            <Check className="size-3.5" />
          </div>
          {toast}
          <button onClick={() => setToast(null)} className="ml-1 text-zinc-500 transition-colors hover:text-zinc-200">
            <X className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function CatalogoCard({ p, ativo, disponivel, onClick }: { p: Produto; ativo: boolean; disponivel: number; onClick: () => void }) {
  const isFerramenta = p.categoria === "FERRAMENTA";
  const baixo = (isFerramenta ? disponivel : p.estoqueAtual) <= p.estoqueMinimo;
  const Icone = isFerramenta ? Wrench : Package;
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex flex-col gap-4 rounded-xl border bg-zinc-800 p-5 text-left shadow-md transition-all duration-150",
        "hover:-translate-y-0.5 hover:border-zinc-600 hover:shadow-lg active:translate-y-0",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900",
        ativo ? "border-orange-500/60 ring-1 ring-orange-500/40" : "border-zinc-700/70",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-zinc-700/60 text-zinc-300 ring-1 ring-inset ring-zinc-600/50">
          <Icone className="size-5" />
        </div>
        <Badge tone={baixo ? "rose" : "zinc"} className="px-2.5 py-1 text-sm">
          {baixo && <AlertTriangle className="size-3" />}
          {isFerramenta ? `${disponivel}/${p.estoqueAtual} disp.` : `${p.estoqueAtual} un`}
        </Badge>
      </div>

      <div className="space-y-1">
        <p className="text-base font-semibold leading-snug text-zinc-100">{p.descricao}</p>
        <div className="flex items-center gap-3 text-xs text-zinc-400">
          <span className="font-medium">{p.sku}</span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" /> {p.localizacao ?? "—"}
          </span>
        </div>
      </div>

      <div className="flex items-end justify-between">
        <span className="text-xs text-zinc-500">{isFerramenta ? `ferramenta · mín. ${p.estoqueMinimo}` : `mín. ${p.estoqueMinimo}`}</span>
        <span className="font-display text-lg font-semibold tabular-nums text-zinc-200">
          {isFerramenta ? disponivel : p.estoqueAtual}
          <span className="ml-1 text-xs text-zinc-500">un</span>
        </span>
      </div>
    </button>
  );
}

function FeedItem({ m }: { m: Movimentacao }) {
  const SINAL: Record<string, string> = { ENTRADA: "+", SAIDA: "−", EMPRESTIMO: "→", DEVOLUCAO: "←", AJUSTE: "=" };
  const ICONE: Record<string, typeof Settings2> = {
    ENTRADA: ArrowDownToLine, SAIDA: ArrowUpFromLine, EMPRESTIMO: Wrench, DEVOLUCAO: Undo2, AJUSTE: Settings2,
  };
  const sinal = SINAL[m.tipo] ?? "=";
  const Icone = ICONE[m.tipo] ?? Settings2;
  const ref = m.emprestimo
    ? `${m.tipo === "EMPRESTIMO" ? "Empréstimo" : m.tipo === "DEVOLUCAO" ? "Devolução" : "Perda"} · ${m.emprestimo.funcionario.nome}`
    : m.ordemServico
      ? `OS #${m.ordemServico.numero} · ${m.ordemServico.veiculo?.placa ?? ""}`
      : m.motivo ?? (m.tipo === "AJUSTE" ? "Ajuste de inventário" : "Avulso");
  return (
    <li className="flex items-center gap-3 rounded-lg border border-zinc-700/60 bg-zinc-900/40 px-3 py-2.5 duration-300 animate-in fade-in slide-in-from-top-1">
      <div className="grid size-8 shrink-0 place-items-center rounded-md bg-zinc-700/60 text-zinc-300 ring-1 ring-inset ring-zinc-600/50">
        <Icone className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-zinc-200">
          {sinal}{m.quantidade}× {m.produto?.descricao ?? m.produto?.sku ?? "—"}
        </p>
        <p className="truncate text-xs text-zinc-400">{ref}</p>
      </div>
      <p className="text-[10px] text-zinc-500">{horaCurta(m.criadoEm)}</p>
    </li>
  );
}

function TipoBtn({ ativo, onClick, icon, label }: {
  ativo: boolean; onClick: () => void; icon: React.ReactNode; label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-xs font-semibold shadow-sm transition-all duration-150 active:translate-y-px",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-800",
        ativo
          ? "border-orange-500/50 bg-orange-500/10 text-orange-400 ring-1 ring-orange-500/30"
          : "border-zinc-600 bg-zinc-700/40 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-700/60 hover:text-zinc-100",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
