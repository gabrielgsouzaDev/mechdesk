import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, UserPlus, Loader2, AlertTriangle, ScrollText, KeyRound } from "lucide-react";
import { api } from "@/lib/api";
import { isLiveMode } from "@/lib/config";
import { useAuth } from "@/lib/auth";
import type { Papel } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select } from "@/components/ui/field";
import { Table, THead, TH, TBody, TR, TD } from "@/components/ui/table";

// ─────────────────────────────────────────────────────────────
// Tela de Gestão (Etapa 5b) — exclusiva do ADMIN (trava dura na rota,
// no menu e na API). Três blocos:
//   1. Matriz de permissões do ALMOXARIFADO (checkboxes recurso × ação;
//      o papel ADMIN tem acesso total e NÃO é configurável — anti-lockout);
//   2. Usuários (quem loga): trocar papel, ativar/desativar, criar login;
//   3. Auditoria: ledger insert-only das mudanças de permissão.
// ─────────────────────────────────────────────────────────────

type Acao = "VER" | "CRIAR" | "EDITAR" | "EXCLUIR";
type PermissaoLinha = { papel: Papel; recurso: string; acao: Acao; permitido: boolean };
type UsuarioAdmin = {
  id: string;
  nome: string;
  email?: string | null;
  papel: Papel;
  ativo: boolean;
  criadoEm: string;
};
type LogPermissao = {
  id: string;
  papel: Papel;
  recurso: string;
  acao: Acao;
  permitido: boolean;
  criadoEm: string;
  usuario?: { nome: string } | null;
};

const RECURSOS_EDITAVEIS = [
  "movimentacao",
  "historico",
  "pendencias",
  "produtos",
  "clientes",
  "veiculos",
  "funcionarios",
] as const;
const ACOES: Acao[] = ["VER", "CRIAR", "EDITAR", "EXCLUIR"];

const RECURSO_LABEL: Record<string, string> = {
  movimentacao: "Movimentação",
  historico: "Histórico",
  pendencias: "Pendências",
  produtos: "Produtos",
  clientes: "Clientes",
  veiculos: "Veículos",
  funcionarios: "Funcionários",
};
const ACAO_LABEL: Record<Acao, string> = { VER: "Ver", CRIAR: "Criar", EDITAR: "Editar", EXCLUIR: "Excluir" };
const PAPEL_LABEL: Record<string, string> = { ADMIN: "Administrador", ALMOXARIFADO: "Almoxarifado" };

// Modo demo: espelho da MATRIZ_PADRAO da API (funcionários negado ao almoxarifado).
const MATRIZ_DEMO: PermissaoLinha[] = RECURSOS_EDITAVEIS.flatMap((recurso) =>
  ACOES.flatMap((acao) => [
    { papel: "ADMIN" as Papel, recurso, acao, permitido: true },
    { papel: "ALMOXARIFADO" as Papel, recurso, acao, permitido: recurso !== "funcionarios" },
  ]),
);
const USUARIOS_DEMO: UsuarioAdmin[] = [
  { id: "u-demo-1", nome: "Luciano (Dono)", email: "luciano@lucianofreios.com", papel: "ADMIN", ativo: true, criadoEm: new Date().toISOString() },
  { id: "u-demo-2", nome: "Marina Souza", email: "marina@lucianofreios.com", papel: "ALMOXARIFADO", ativo: true, criadoEm: new Date().toISOString() },
];

const dataHora = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso),
  );

export function AdminPage() {
  const live = isLiveMode;
  const qc = useQueryClient();
  const { operador } = useAuth();

  const permissoesQ = useQuery({
    queryKey: ["permissoes"],
    queryFn: live ? () => api.get<PermissaoLinha[]>("/permissoes") : async () => MATRIZ_DEMO,
    staleTime: live ? 15_000 : Infinity,
  });
  const usuariosQ = useQuery({
    queryKey: ["usuarios-admin"],
    queryFn: live ? () => api.get<UsuarioAdmin[]>("/usuarios") : async () => USUARIOS_DEMO,
    staleTime: live ? 15_000 : Infinity,
  });
  const logQ = useQuery({
    queryKey: ["permissoes-log"],
    queryFn: live ? () => api.get<LogPermissao[]>("/permissoes/log") : async () => [] as LogPermissao[],
    staleTime: live ? 15_000 : Infinity,
  });

  // ── Matriz do almoxarifado: estado do servidor + alterações pendentes ──
  const vigente = useMemo(() => {
    const mapa = new Map<string, boolean>();
    for (const l of permissoesQ.data ?? []) {
      if (l.papel === "ALMOXARIFADO") mapa.set(`${l.recurso}|${l.acao}`, l.permitido);
    }
    return mapa;
  }, [permissoesQ.data]);

  const [pendentes, setPendentes] = useState<Record<string, boolean>>({});
  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);

  const valorDe = (recurso: string, acao: Acao) =>
    pendentes[`${recurso}|${acao}`] ?? vigente.get(`${recurso}|${acao}`) ?? false;

  function alternar(recurso: string, acao: Acao) {
    const chave = `${recurso}|${acao}`;
    const novo = !valorDe(recurso, acao);
    setPendentes((p) => {
      const prox = { ...p, [chave]: novo };
      // Voltou ao valor vigente? Deixa de ser pendência.
      if (vigente.get(chave) === novo) delete prox[chave];
      return prox;
    });
  }

  const totalPendentes = Object.keys(pendentes).length;

  async function salvarMatriz() {
    if (!live || totalPendentes === 0) return;
    setSalvando(true);
    setErroSalvar(null);
    try {
      const alteracoes = Object.entries(pendentes).map(([chave, permitido]) => {
        const [recurso, acao] = chave.split("|");
        return { papel: "ALMOXARIFADO" as Papel, recurso, acao, permitido };
      });
      await api.patch("/permissoes", { alteracoes });
      setPendentes({});
      qc.invalidateQueries({ queryKey: ["permissoes"] });
      qc.invalidateQueries({ queryKey: ["permissoes-log"] });
    } catch (e) {
      setErroSalvar(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  // ── Usuários ──
  const [erroUsuarios, setErroUsuarios] = useState<string | null>(null);

  async function mudarUsuario(id: string, dados: Partial<Pick<UsuarioAdmin, "papel" | "ativo">>) {
    if (!live) return;
    setErroUsuarios(null);
    try {
      await api.patch(`/usuarios/${id}`, dados);
      qc.invalidateQueries({ queryKey: ["usuarios-admin"] });
    } catch (e) {
      setErroUsuarios(e instanceof Error ? e.message : "Não foi possível atualizar o usuário.");
    }
  }

  const [modalNovo, setModalNovo] = useState(false);
  const [novo, setNovo] = useState({ nome: "", email: "", senha: "", papel: "ALMOXARIFADO" as Papel });
  const [criando, setCriando] = useState(false);
  const [erroCriar, setErroCriar] = useState<string | null>(null);

  async function criarUsuario(e: React.FormEvent) {
    e.preventDefault();
    if (!live) return;
    setCriando(true);
    setErroCriar(null);
    try {
      await api.post("/usuarios", novo);
      setModalNovo(false);
      setNovo({ nome: "", email: "", senha: "", papel: "ALMOXARIFADO" });
      qc.invalidateQueries({ queryKey: ["usuarios-admin"] });
    } catch (err) {
      setErroCriar(err instanceof Error ? err.message : "Não foi possível criar o usuário.");
    } finally {
      setCriando(false);
    }
  }

  const carregando = live && (permissoesQ.isLoading || usuariosQ.isLoading);

  return (
    <div className="space-y-8">
      {/* ── Cabeçalho ── */}
      <header className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-lg bg-orange-600/15 text-orange-400 ring-1 ring-inset ring-orange-500/25">
          <ShieldCheck className="size-5" />
        </div>
        <div>
          <h1 className="font-display text-xl font-semibold uppercase tracking-wide text-zinc-100">Gestão</h1>
          <p className="text-sm text-zinc-400">
            Permissões por papel, usuários do sistema e auditoria — só o administrador vê esta tela.
          </p>
        </div>
        {!live && <Badge tone="amber" className="ml-auto">modo demo · somente leitura</Badge>}
      </header>

      {carregando ? (
        <div className="grid place-items-center rounded-xl border border-zinc-700/70 bg-zinc-800 py-16">
          <Loader2 className="size-6 animate-spin text-orange-500" />
        </div>
      ) : (
        <>
          {/* ── 1. Matriz de permissões ── */}
          <section aria-labelledby="titulo-permissoes" className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h2 id="titulo-permissoes" className="font-display text-sm font-semibold uppercase tracking-wider text-zinc-300">
                Permissões do Almoxarifado
              </h2>
              <Badge tone="zinc">Administrador tem acesso total (fixo)</Badge>
              {totalPendentes > 0 && (
                <div className="ml-auto flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setPendentes({})} disabled={salvando}>
                    Descartar
                  </Button>
                  <Button size="sm" onClick={salvarMatriz} disabled={salvando}>
                    {salvando && <Loader2 className="size-4 animate-spin" />}
                    Salvar {totalPendentes} {totalPendentes === 1 ? "alteração" : "alterações"}
                  </Button>
                </div>
              )}
            </div>

            {erroSalvar && (
              <p role="alert" className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                <AlertTriangle className="size-4 shrink-0" /> {erroSalvar}
              </p>
            )}

            <Table>
              <THead>
                <TH>Recurso</TH>
                {ACOES.map((a) => (
                  <TH key={a} className="w-24 text-center">{ACAO_LABEL[a]}</TH>
                ))}
              </THead>
              <TBody>
                {RECURSOS_EDITAVEIS.map((recurso) => (
                  <TR key={recurso}>
                    <TD className="font-medium text-zinc-100">{RECURSO_LABEL[recurso]}</TD>
                    {ACOES.map((acao) => {
                      const chave = `${recurso}|${acao}`;
                      const pendente = chave in pendentes;
                      return (
                        <TD key={acao} className="text-center">
                          <input
                            type="checkbox"
                            className="size-4 cursor-pointer accent-orange-600 disabled:cursor-not-allowed"
                            checked={valorDe(recurso, acao)}
                            onChange={() => alternar(recurso, acao)}
                            disabled={!live || salvando}
                            aria-label={`Almoxarifado: ${ACAO_LABEL[acao]} em ${RECURSO_LABEL[recurso]}${pendente ? " (alteração pendente)" : ""}`}
                          />
                          {pendente && <span aria-hidden="true" className="ml-1.5 inline-block size-1.5 rounded-full bg-amber-400 align-middle" />}
                        </TD>
                      );
                    })}
                  </TR>
                ))}
              </TBody>
            </Table>
            <p className="text-xs text-zinc-500">
              As mudanças valem para todos os usuários do papel em até 30 segundos (cache da API). A tela de Gestão
              não é configurável: sempre e somente do administrador.
            </p>
          </section>

          {/* ── 2. Usuários ── */}
          <section aria-labelledby="titulo-usuarios" className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h2 id="titulo-usuarios" className="font-display text-sm font-semibold uppercase tracking-wider text-zinc-300">
                Usuários do sistema
              </h2>
              <Button size="sm" variant="outline" className="ml-auto" onClick={() => setModalNovo(true)} disabled={!live}>
                <UserPlus className="size-4" /> Novo usuário
              </Button>
            </div>

            {erroUsuarios && (
              <p role="alert" className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                <AlertTriangle className="size-4 shrink-0" /> {erroUsuarios}
              </p>
            )}

            <Table>
              <THead>
                <TH>Nome</TH>
                <TH>E-mail</TH>
                <TH className="w-44">Papel</TH>
                <TH className="w-28">Status</TH>
                <TH className="w-32">Ações</TH>
              </THead>
              <TBody>
                {(usuariosQ.data ?? []).map((u) => {
                  const proprio = u.id === operador?.id;
                  return (
                    <TR key={u.id} className={u.ativo ? undefined : "opacity-60"}>
                      <TD className="max-w-[220px] truncate font-medium text-zinc-100" title={u.nome}>
                        {u.nome}
                        {proprio && <Badge tone="orange" className="ml-2">você</Badge>}
                      </TD>
                      <TD className="max-w-[220px] truncate text-zinc-400" title={u.email ?? ""}>{u.email ?? "—"}</TD>
                      <TD>
                        <Select
                          value={u.papel}
                          onChange={(e) => mudarUsuario(u.id, { papel: e.target.value as Papel })}
                          disabled={!live || proprio}
                          aria-label={`Papel de ${u.nome}`}
                          title={proprio ? "Você não pode despromover a própria conta." : undefined}
                          className="h-9"
                        >
                          <option value="ADMIN">{PAPEL_LABEL.ADMIN}</option>
                          <option value="ALMOXARIFADO">{PAPEL_LABEL.ALMOXARIFADO}</option>
                        </Select>
                      </TD>
                      <TD>{u.ativo ? <Badge tone="orange">ativo</Badge> : <Badge tone="rose">desativado</Badge>}</TD>
                      <TD>
                        <Button
                          variant={u.ativo ? "ghost" : "outline"}
                          size="sm"
                          onClick={() => mudarUsuario(u.id, { ativo: !u.ativo })}
                          disabled={!live || proprio}
                          title={proprio ? "Você não pode desativar a própria conta." : undefined}
                        >
                          {u.ativo ? "Desativar" : "Reativar"}
                        </Button>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </section>

          {/* ── 3. Auditoria ── */}
          <section aria-labelledby="titulo-auditoria" className="space-y-3">
            <h2 id="titulo-auditoria" className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wider text-zinc-300">
              <ScrollText className="size-4 text-zinc-500" /> Auditoria de permissões
            </h2>
            {(logQ.data ?? []).length === 0 ? (
              <p className="rounded-xl border border-dashed border-zinc-700 bg-zinc-800/40 px-4 py-6 text-center text-sm text-zinc-500">
                Nenhuma mudança de permissão registrada ainda. Cada alteração salva acima entra aqui — o registro é
                permanente (insert-only), como o ledger do estoque.
              </p>
            ) : (
              <ol className="max-h-72 divide-y divide-zinc-700/50 overflow-y-auto rounded-xl border border-zinc-700/70 bg-zinc-800 text-sm">
                {(logQ.data ?? []).map((l) => (
                  <li key={l.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2.5">
                    <Badge tone={l.permitido ? "orange" : "rose"}>{l.permitido ? "liberou" : "negou"}</Badge>
                    <span className="text-zinc-200">
                      {ACAO_LABEL[l.acao]} em {RECURSO_LABEL[l.recurso] ?? l.recurso}
                    </span>
                    <span className="text-zinc-500">para {PAPEL_LABEL[l.papel] ?? l.papel}</span>
                    <span className="ml-auto text-xs tabular-nums text-zinc-500">
                      {l.usuario?.nome ?? "—"} · {dataHora(l.criadoEm)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}

      {/* ── Modal: novo usuário ── */}
      <Modal open={modalNovo} onClose={() => setModalNovo(false)} title="Novo usuário">
        <form onSubmit={criarUsuario} className="space-y-4">
          <Field label="Nome" required>
            <Input
              required
              value={novo.nome}
              onChange={(e) => setNovo((n) => ({ ...n, nome: e.target.value }))}
              placeholder="Nome completo"
              autoComplete="off"
            />
          </Field>
          <Field label="E-mail (login)" required>
            <Input
              required
              type="email"
              value={novo.email}
              onChange={(e) => setNovo((n) => ({ ...n, email: e.target.value }))}
              placeholder="pessoa@oficina.com"
              autoComplete="off"
            />
          </Field>
          <Field label="Senha inicial (mín. 8 caracteres)" required>
            <Input
              required
              type="password"
              minLength={8}
              value={novo.senha}
              onChange={(e) => setNovo((n) => ({ ...n, senha: e.target.value }))}
              autoComplete="new-password"
            />
          </Field>
          <Field label="Papel" required>
            <Select value={novo.papel} onChange={(e) => setNovo((n) => ({ ...n, papel: e.target.value as Papel }))}>
              <option value="ALMOXARIFADO">{PAPEL_LABEL.ALMOXARIFADO}</option>
              <option value="ADMIN">{PAPEL_LABEL.ADMIN}</option>
            </Select>
          </Field>

          {erroCriar && (
            <p role="alert" className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
              <AlertTriangle className="size-4 shrink-0" /> {erroCriar}
            </p>
          )}

          <p className="flex items-start gap-2 text-xs text-zinc-500">
            <KeyRound className="mt-0.5 size-3.5 shrink-0" />
            O login nasce ativo e com o e-mail confirmado: entregue a senha inicial pessoalmente e oriente a troca no
            primeiro acesso.
          </p>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setModalNovo(false)} disabled={criando}>
              Cancelar
            </Button>
            <Button type="submit" disabled={criando || !live}>
              {criando && <Loader2 className="size-4 animate-spin" />}
              Criar usuário
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
