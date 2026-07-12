import type { PapelUsuario } from "@lf/db";

// ─────────────────────────────────────────────────────────────
// Vocabulário do RBAC dinâmico (Etapa 5b).
// `recurso` = superfície funcional do sistema (espelha as telas);
// `acao`    = o que se faz nela. A matriz papel × recurso × ação
// vive na tabela `permissoes` (por tenant) — o que está AQUI é:
//   1. o universo válido (validação de DTO e da tela Admin);
//   2. a MATRIZ PADRÃO: fallback quando o tenant ainda não tem
//      linhas no banco (seed não rodou / oficina recém-criada) e
//      valor de recurso+ação sem linha específica.
// A matriz padrão REPRODUZ o comportamento hardcoded anterior
// (permissions.ts do web + @Roles da API): migração sem regressão.
// ─────────────────────────────────────────────────────────────

export const RECURSOS = [
  "movimentacao", // console de entrada/saída/empréstimo ("/")
  "historico", // ledger de movimentações ("/movimentacoes")
  "pendencias", // ferramentas emprestadas ("/pendencias")
  "produtos",
  "clientes",
  "veiculos",
  "funcionarios",
  "admin", // tela de gestão (permissões + usuários + auditoria)
] as const;
export type Recurso = (typeof RECURSOS)[number];

export const ACOES = ["VER", "CRIAR", "EDITAR", "EXCLUIR"] as const;
export type Acao = (typeof ACOES)[number];

export type MapaPermissoes = Record<Recurso, Record<Acao, boolean>>;

// REGRA DURA (anti-lockout): o recurso "admin" NÃO é configurável.
// Sempre e somente ADMIN — nem o banco nem a tela mudam isso. Sem esta
// trava, um clique errado na matriz trancaria o dono fora da própria
// tela que corrige permissões.
export const RECURSO_TRAVADO: Recurso = "admin";

function tudo(permitido: boolean): Record<Acao, boolean> {
  return { VER: permitido, CRIAR: permitido, EDITAR: permitido, EXCLUIR: permitido };
}

export const MATRIZ_PADRAO: Record<PapelUsuario, MapaPermissoes> = {
  ADMIN: {
    movimentacao: tudo(true),
    historico: tudo(true),
    pendencias: tudo(true),
    produtos: tudo(true),
    clientes: tudo(true),
    veiculos: tudo(true),
    funcionarios: tudo(true),
    admin: tudo(true),
  },
  ALMOXARIFADO: {
    movimentacao: tudo(true),
    historico: tudo(true),
    pendencias: tudo(true),
    produtos: tudo(true),
    clientes: tudo(true),
    veiculos: tudo(true),
    // A TELA de funcionários é do dono (dados pessoais). A listagem de
    // apoio da API (pra quem se empresta ferramenta) continua estática
    // via @Roles no controller — não passa por este recurso.
    funcionarios: tudo(false),
    admin: tudo(false),
  },
};
