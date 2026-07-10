# Luciano Freios — Gestão de Oficina & Fiscal

Sistema web (PWA) para a oficina Luciano Freios: operação em **tempo real**, almoxarifado,
ordens de serviço e módulo fiscal (NF-e/NFS-e). Diferencial central: **o painel atualiza sem F5**.

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React + Vite + Tailwind + Shadcn/ui + Lucide |
| Backend | NestJS + Prisma |
| Banco / Tempo real | PostgreSQL + Supabase (Realtime) |
| Fiscal | Focus NFe / PlugNotas (a integrar na Fase 3) |

## Estrutura (monorepo npm workspaces)

```
lucianofreios/
├── packages/db        # Prisma schema, RPC atômica, RLS, tempo real (compartilhado)
└── apps/
    ├── api            # NestJS — REST + chamada da RPC de baixa
    └── web            # Vite/React — UI dark + assinatura Realtime
```

## Pré-requisitos

- Node.js 20+ (testado no 22)
- Um projeto Supabase (gratuito serve) → pegue as connection strings e as keys

## Setup

```bash
# 1. Dependências (raiz do monorepo)
npm install

# 2. Variáveis de ambiente
cp .env.example .env
#   preencha DATABASE_URL, DIRECT_URL, SUPABASE_* e VITE_SUPABASE_*

# 3. Banco: gera client, cria tabelas e aplica RPC/RLS/Realtime
npm run db:generate
npm run db:migrate          # cria as tabelas (Prisma Migrate)
npm run db:sql              # aplica RPC atômica, RLS e publicação de tempo real
node packages/db/prisma/seed.mjs   # (opcional) dados de exemplo

# 4. Subir tudo (API + Web em paralelo)
npm run dev
```

- API: http://localhost:3333/api/health
- Web: http://localhost:5173

> A tela inicial é um **smoke test visual**: mostra API, banco e tempo real no ar, e o
> "estoque ao vivo". Edite um produto no Supabase/Studio e veja a lista mudar **sem recarregar**.

## Decisões de arquitetura (resumo)

- **Operador = almoxarife** (desktop/tablet), não o mecânico no celular.
- **Duas portas de saída de peça:** Venda (balcão, com NF) e Conserto (OS).
- **Baixa atômica via RPC Postgres** (`registrar_saida_peca`) — sem estoque negativo em concorrência.
- **`movimentacoes_estoque` = ledger imutável** (fonte da verdade); `produtos.estoqueAtual` é cache.
- **NotaFiscal polimórfica:** nasce de OS **ou** de Venda.
- **Escrita só pela API** (service role); o browser apenas **lê** em tempo real (RLS).

## Próximas fases

1. Cadastros (funcionários, clientes, veículos, produtos, locais)
2. **Console de Saída de Peça + Venda Avulsa** (a tela de demo do tempo real)
3. Módulo fiscal (NF da venda) com máquina de estados + webhooks
4. OS + Kanban tempo real
5. Dashboard do dono + contagem cíclica + relatório de perda
6. Polimento PWA / fila offline
```
