import type { Papel } from "./types";

// ─────────────────────────────────────────────────────────────
// RBAC do frontend em DUAS camadas (Etapa 5b):
//   1. MAPA DINÂMICO — vem do GET /me (matriz papel × recurso × ação
//      editável pelo Admin, por tenant). Quando presente, ELE manda.
//   2. MATRIZ ESTÁTICA (abaixo) — fallback do modo demo e de API antiga.
// O menu (AppShell) e o guard de rotas (App) leem de podeAcessarComMapa —
// e a API reforça a mesma matriz via @Permissao (defesa em camadas:
// esconder o menu é UX; a rota redireciona; a API nega).
// Papéis ativos (decisão de escopo): ADMIN e ALMOXARIFADO.
// ─────────────────────────────────────────────────────────────
//
// | Rota                     | ADMIN | ALMOXARIFADO |
// |--------------------------|-------|--------------|
// | / (movimentação)         |  ✅   |     ✅       |
// | /movimentacoes (log)     |  ✅   |     ✅       |
// | /pendencias (ferramenta) |  ✅   |     ✅       |
// | /cadastros/produtos      |  ✅   |     ✅       |
// | /cadastros/clientes      |  ✅   |     ✅       |
// | /cadastros/veiculos      |  ✅   |     ✅       |
// | /cadastros/funcionarios  |  ✅   |     ❌       |
// | /admin (gestão)          |  ✅   |     ❌ (trava dura) |
//
// Avaliação 02: clientes/veículos liberados p/ ALMOXARIFADO (apoio à
// operação — a saída vincula OS/veículo). "Dados mais importantes"
// (funcionários, financeiro) continuam só do ADMIN.

export const PERMISSOES_ROTAS: Record<string, Papel[]> = {
  "/": ["ADMIN", "ALMOXARIFADO"],
  "/movimentacoes": ["ADMIN", "ALMOXARIFADO"],
  "/pendencias": ["ADMIN", "ALMOXARIFADO"],
  "/cadastros/produtos": ["ADMIN", "ALMOXARIFADO"],
  "/cadastros/clientes": ["ADMIN", "ALMOXARIFADO"],
  "/cadastros/veiculos": ["ADMIN", "ALMOXARIFADO"],
  "/cadastros/funcionarios": ["ADMIN"],
  "/admin": ["ADMIN"],
};

export function podeAcessar(papel: string | undefined, rota: string): boolean {
  if (!papel) return false;
  return PERMISSOES_ROTAS[rota]?.includes(papel as Papel) ?? false;
}

/** Primeira rota que o papel pode ver — destino de redirecionamentos. */
export function primeiraRotaPermitida(papel: string | undefined): string | null {
  return Object.keys(PERMISSOES_ROTAS).find((r) => podeAcessar(papel, r)) ?? null;
}

// ── Camada dinâmica (Etapa 5b) ────────────────────────────────

export type Acao = "VER" | "CRIAR" | "EDITAR" | "EXCLUIR";
/** Mapa recurso → ações, como devolvido pelo GET /me. */
export type MapaPermissoes = Record<string, Partial<Record<Acao, boolean>>>;

// Tradução rota → recurso do vocabulário da API.
export const ROTA_RECURSO: Record<string, string> = {
  "/": "movimentacao",
  "/movimentacoes": "historico",
  "/pendencias": "pendencias",
  "/cadastros/produtos": "produtos",
  "/cadastros/clientes": "clientes",
  "/cadastros/veiculos": "veiculos",
  "/cadastros/funcionarios": "funcionarios",
  "/admin": "admin",
};

/**
 * Decisão de acesso com o mapa do /me. Precedência:
 *   trava dura do /admin (só o papel ADMIN — nem mapa forjado muda; espelho
 *   da regra anti-lockout do backend) → mapa dinâmico (recurso presente) →
 *   fallback estático (demo / API antiga).
 */
export function podeAcessarComMapa(
  papel: string | undefined,
  mapa: MapaPermissoes | undefined | null,
  rota: string,
): boolean {
  if (rota === "/admin") return papel === "ADMIN";
  const recurso = ROTA_RECURSO[rota];
  if (!recurso) return false;
  if (mapa && recurso in mapa) return mapa[recurso]?.VER === true;
  return podeAcessar(papel, rota);
}

/** Primeira rota visível segundo o mapa — destino de redirecionamentos. */
export function primeiraRotaPermitidaComMapa(
  papel: string | undefined,
  mapa: MapaPermissoes | undefined | null,
): string | null {
  return Object.keys(PERMISSOES_ROTAS).find((r) => podeAcessarComMapa(papel, mapa, r)) ?? null;
}
