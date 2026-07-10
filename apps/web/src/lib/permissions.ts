import type { Papel } from "./types";

// ─────────────────────────────────────────────────────────────
// Fonte única de verdade do RBAC no frontend.
// O menu (AppShell) e o guard de rotas (App) leem DAQUI —
// e a API espelha a mesma matriz via @Roles (defesa em camadas:
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
};

export function podeAcessar(papel: string | undefined, rota: string): boolean {
  if (!papel) return false;
  return PERMISSOES_ROTAS[rota]?.includes(papel as Papel) ?? false;
}

/** Primeira rota que o papel pode ver — destino de redirecionamentos. */
export function primeiraRotaPermitida(papel: string | undefined): string | null {
  return Object.keys(PERMISSOES_ROTAS).find((r) => podeAcessar(papel, r)) ?? null;
}
