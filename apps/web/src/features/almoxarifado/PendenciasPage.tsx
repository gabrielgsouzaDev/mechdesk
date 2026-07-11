import { useMemo, useState } from "react";
import { ClipboardList, AlertTriangle, Undo2, Ban, Loader2, Settings2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Table, THead, TH, THOrdenavel, TBody, TR, TD } from "@/components/ui/table";
import { useFerramentaria } from "@/hooks/useFerramentaria";
import { useOrdenacao, type ValorOrdenavel } from "@/hooks/useOrdenacao";
import { useAuth } from "@/lib/auth";
import type { Emprestimo } from "@/lib/types";

const tempoDecorrido = (iso: string) => {
  const ms = Date.now() - new Date(iso).getTime();
  const horas = Math.floor(ms / 3_600_000);
  if (horas < 1) return "menos de 1h";
  if (horas < 24) return `${horas}h`;
  return `${Math.floor(horas / 24)}d ${horas % 24}h`;
};

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

function isVencido(e: Emprestimo) {
  return e.status === "ABERTO" && new Date(e.prazoEm).getTime() < Date.now();
}

// Chips de situação (Etapa 4): recorte rápido do que precisa de cobrança.
const SITUACOES = [
  { id: "todas", label: "Todas", predicate: () => true },
  { id: "abertas", label: "Abertas", predicate: (e: Emprestimo) => e.status === "ABERTO" },
  { id: "vencidas", label: "Vencidas", predicate: isVencido },
  { id: "fechadas", label: "Fechadas", predicate: (e: Emprestimo) => e.status !== "ABERTO" },
] as const;
type Situacao = (typeof SITUACOES)[number]["id"];

// Sem ordenação escolhida, mantém retirada mais recente primeiro.
const SORT_VALUES: Record<string, (e: Emprestimo) => ValorOrdenavel> = {
  Ferramenta: (e) => e.produto?.descricao,
  Qtd: (e) => e.quantidade,
  "Com quem": (e) => e.funcionario?.nome,
  "Retirado há": (e) => e.retiradoEm,
  Prazo: (e) => e.prazoEm,
  Status: (e) => (isVencido(e) ? "Vencida" : e.status === "ABERTO" ? "Aberta" : e.status === "DEVOLVIDO" ? "Devolvida" : "Perdida"),
};

export function PendenciasPage() {
  const ferramentaria = useFerramentaria();
  const { operador } = useAuth();
  const isAdmin = operador?.papel === "ADMIN";

  const [acao, setAcao] = useState<{ emprestimo: Emprestimo; tipo: "devolucao" | "perda" } | null>(null);
  const [motivoModal, setMotivoModal] = useState("");
  const [salvandoModal, setSalvandoModal] = useState(false);
  const [erroModal, setErroModal] = useState<string | null>(null);

  const [prazoInput, setPrazoInput] = useState<number | null>(null);
  const [salvandoPrazo, setSalvandoPrazo] = useState(false);

  const [situacao, setSituacao] = useState<Situacao>("todas");
  const { ordem, alternar, ordenar } = useOrdenacao<Emprestimo>(SORT_VALUES);

  const lista = useMemo(() => {
    const { predicate } = SITUACOES.find((s) => s.id === situacao)!;
    const base = ferramentaria.emprestimos
      .filter(predicate)
      .sort((a, b) => +new Date(b.retiradoEm) - +new Date(a.retiradoEm));
    return ordenar(base);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ferramentaria.emprestimos, situacao, ordem]);
  const vencidos = ferramentaria.abertos.filter(isVencido);

  function abrirAcao(emprestimo: Emprestimo, tipo: "devolucao" | "perda") {
    setAcao({ emprestimo, tipo });
    setMotivoModal("");
    setErroModal(null);
  }

  async function confirmarAcao() {
    if (!acao) return;
    if (acao.tipo === "perda" && !motivoModal.trim()) {
      setErroModal("Descreva o motivo da perda.");
      return;
    }
    setSalvandoModal(true);
    setErroModal(null);
    try {
      if (acao.tipo === "devolucao") await ferramentaria.devolver(acao.emprestimo.id, motivoModal.trim() || undefined);
      else await ferramentaria.perder(acao.emprestimo.id, motivoModal.trim());
      setAcao(null);
    } catch (e) {
      setErroModal(e instanceof Error ? e.message : "Falha ao registrar.");
    } finally {
      setSalvandoModal(false);
    }
  }

  async function salvarPrazo() {
    if (prazoInput === null || prazoInput < 1) return;
    setSalvandoPrazo(true);
    try {
      await ferramentaria.salvarPrazoPadrao(prazoInput);
      setPrazoInput(null);
    } finally {
      setSalvandoPrazo(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg bg-zinc-800 text-orange-400 ring-1 ring-inset ring-zinc-700">
            <ClipboardList className="size-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold text-zinc-100">Pendências de Ferramenta</h1>
            <p className="text-sm text-zinc-400">O que está emprestado, com quem e há quanto tempo</p>
          </div>
        </div>
        {vencidos.length > 0 && (
          <Badge tone="rose" className="px-2.5 py-1 text-sm">
            <AlertTriangle className="size-3.5" /> {vencidos.length} vencida{vencidos.length > 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {ferramentaria.mode === "demo" && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-400/10 px-3.5 py-2.5 text-sm text-amber-300 ring-1 ring-inset ring-amber-400/25">
          <AlertTriangle className="size-4 shrink-0" />
          Modo demonstração — as pendências refletem apenas esta sessão.
        </div>
      )}

      {isAdmin && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-700/70 bg-zinc-800 px-4 py-3">
          <Settings2 className="size-4 shrink-0 text-orange-400" />
          <span className="text-sm text-zinc-300">Prazo padrão de devolução:</span>
          <Input
            type="number"
            min={1}
            value={prazoInput ?? ferramentaria.config.prazoEmprestimoHoras}
            onChange={(e) => setPrazoInput(Math.max(1, Number(e.target.value) || 1))}
            className="h-9 w-20"
          />
          <span className="text-sm text-zinc-400">horas</span>
          <Button size="sm" variant="outline" onClick={salvarPrazo} disabled={prazoInput === null || salvandoPrazo}>
            {salvandoPrazo ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
            Salvar
          </Button>
        </div>
      )}

      {/* Situação */}
      <div className="inline-flex rounded-lg border border-zinc-700 bg-zinc-800 p-1 shadow-sm">
        {SITUACOES.map((s) => (
          <button
            key={s.id}
            onClick={() => setSituacao(s.id)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
              situacao === s.id ? "bg-orange-600 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-100",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Tabela */}
      <Table>
        <THead>
          <THOrdenavel coluna="Ferramenta" ordem={ordem} onOrdenar={alternar} />
          <THOrdenavel coluna="Qtd" ordem={ordem} onOrdenar={alternar} className="w-20 text-right" />
          <THOrdenavel coluna="Com quem" ordem={ordem} onOrdenar={alternar} />
          <THOrdenavel coluna="Retirado há" ordem={ordem} onOrdenar={alternar} className="w-28" />
          <THOrdenavel coluna="Prazo" ordem={ordem} onOrdenar={alternar} className="w-40" />
          <THOrdenavel coluna="Status" ordem={ordem} onOrdenar={alternar} className="w-28" />
          <TH className="w-40 text-right">Ações</TH>
        </THead>
        <TBody>
          {lista.length === 0 ? (
            <TR>
              <TD colSpan={7} className="py-10 text-center text-zinc-500">
                {ferramentaria.loading
                  ? "Carregando…"
                  : situacao === "todas"
                    ? "Nenhum empréstimo registrado."
                    : "Nenhum empréstimo nesta situação."}
              </TD>
            </TR>
          ) : (
            lista.map((e) => <LinhaEmprestimo key={e.id} e={e} onDevolver={() => abrirAcao(e, "devolucao")} onPerder={() => abrirAcao(e, "perda")} />)
          )}
        </TBody>
      </Table>

      {/* Modal devolução/perda */}
      <Modal
        open={acao !== null}
        onClose={() => setAcao(null)}
        title={acao?.tipo === "perda" ? "Registrar perda" : "Registrar devolução"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setAcao(null)}>Cancelar</Button>
            <Button variant={acao?.tipo === "perda" ? "danger" : "primary"} onClick={confirmarAcao} disabled={salvandoModal}>
              {salvandoModal ? <Loader2 className="size-4 animate-spin" /> : acao?.tipo === "perda" ? <Ban className="size-4" /> : <Undo2 className="size-4" />}
              {acao?.tipo === "perda" ? "Confirmar perda" : "Confirmar devolução"}
            </Button>
          </>
        }
      >
        {acao && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-300">
              {acao.emprestimo.quantidade}× {acao.emprestimo.produto?.descricao} · com {acao.emprestimo.funcionario?.nome}
            </p>
            <Field label={acao.tipo === "perda" ? "Motivo da perda" : "Observação (opcional)"} required={acao.tipo === "perda"}>
              <Input value={motivoModal} onChange={(e) => setMotivoModal(e.target.value)} placeholder={acao.tipo === "perda" ? "ex: Extraviada na oficina" : undefined} />
            </Field>
            {erroModal && (
              <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 px-3.5 py-2.5 text-sm text-rose-400 ring-1 ring-inset ring-rose-500/25">
                <AlertTriangle className="size-4 shrink-0" /> {erroModal}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function LinhaEmprestimo({ e, onDevolver, onPerder }: { e: Emprestimo; onDevolver: () => void; onPerder: () => void }) {
  const vencido = isVencido(e);
  return (
    <TR className={vencido ? "bg-rose-500/[0.04]" : undefined}>
      <TD>
        {/* max-w + truncate: descrição de produto longa não deforma a tabela. */}
        <div className="flex max-w-[250px] items-baseline gap-2">
          <span className="min-w-0 truncate font-medium text-zinc-100" title={e.produto?.descricao}>
            {e.produto?.descricao ?? "—"}
          </span>
          <span className="shrink-0 text-xs text-zinc-500">{e.produto?.sku}</span>
        </div>
      </TD>
      <TD className="text-right font-display font-semibold tabular-nums text-zinc-200">{e.quantidade}</TD>
      <TD>
        <div className="flex max-w-[200px] items-baseline gap-2">
          <span className="min-w-0 truncate text-zinc-100" title={e.funcionario?.nome}>
            {e.funcionario?.nome ?? "—"}
          </span>
          {e.funcionario?.cargo && <span className="shrink-0 text-xs text-zinc-500">{e.funcionario.cargo}</span>}
        </div>
      </TD>
      <TD className="text-zinc-400">{tempoDecorrido(e.retiradoEm)}</TD>
      <TD className={vencido ? "font-medium text-rose-400" : "text-zinc-400"}>{dataHora(e.prazoEm)}</TD>
      <TD>
        {e.status === "ABERTO" ? (
          <Badge tone={vencido ? "rose" : "orange"}>{vencido && <AlertTriangle className="size-3" />} {vencido ? "Vencida" : "Aberta"}</Badge>
        ) : e.status === "DEVOLVIDO" ? (
          <Badge tone="zinc">Devolvida</Badge>
        ) : (
          <Badge tone="rose">Perdida</Badge>
        )}
      </TD>
      <TD className="text-right">
        {e.status === "ABERTO" && (
          <div className="flex justify-end gap-1">
            <button onClick={onDevolver} title="Registrar devolução" className="grid size-8 place-items-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-700/60 hover:text-orange-400">
              <Undo2 className="size-4" />
            </button>
            <button onClick={onPerder} title="Registrar perda" className="grid size-8 place-items-center rounded-lg text-zinc-400 transition-colors hover:bg-rose-500/10 hover:text-rose-400">
              <Ban className="size-4" />
            </button>
          </div>
        )}
      </TD>
    </TR>
  );
}
