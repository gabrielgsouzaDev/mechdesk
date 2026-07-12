# Luciano Freios (MechDesk) — Escopo & Roadmap

> Documento de referência do escopo. Atualizado em **2026-07-10** após a
> **Auditoria de Integridade Técnica** (pós-Etapa 4, pré-Etapa 5). Ordem das
> etapas = ordem de dependência: nenhuma etapa depende de algo que vem depois.

## Decisões de produto vigentes

| Decisão | Detalhe |
|---|---|
| Foco do sistema | Controle interno da oficina: estoque (entrada/saída/empréstimo), cadastros de apoio, visão do dono |
| Papéis de acesso | **ADMIN** (donos) e **ALMOXARIFADO** — só. RH entra junto com o módulo banco de horas; FATURAMENTO não existe (financeiro é dos admins, módulo futuro) |
| Usuário ≠ Funcionário | Usuário = quem loga (~3). Funcionário = quem trabalha (~10, p/ banco de horas e empréstimos). Tabelas separadas |
| Preços de peças | **Ocultos no frontend** (inútil por agora). Colunas continuam no banco sendo capturadas — reativação futura com o módulo financeiro |
| Ferramentas | Estoque único com categoria `PECA`/`FERRAMENTA`. Ferramenta sai por **empréstimo** (temporário, vinculado ao funcionário) e volta por **devolução** |
| Pendências de ferramenta | Visíveis para ADMIN **e** ALMOXARIFADO (cobrar mecânico). **Notificação só para ADMIN**, após prazo configurável (padrão 24h, decidido só pelo Admin) |
| Modo demonstração | **Só com `VITE_DEMO=1` explícito.** Ambiente sem configuração = tela de erro fatal ("Configuração de Ambiente Ausente"), nunca fallback silencioso |
| Migração de região (sa-east-1) | Adiada — sem necessidade por agora |
| Cobrança do sistema | Direção: SaaS mensal + implantação. Consequência arquitetural: **toda decisão nova nasce compatível com multi-tenant** (ver Etapa 5) |

## Etapas concluídas (consolidado)

### ✅ Fundação (Fase 0)
- Scaffold monorepo (Vite/React + NestJS + Prisma + Supabase)
- Cadastros: produtos, clientes, veículos, funcionários
- Núcleo de estoque: movimentação ENTRADA/SAÍDA atômica (RPC `FOR UPDATE`) + ledger imutável + histórico
- Tempo real sem F5 (Supabase Realtime); RLS: leitura só autenticada, escrita só via API (service role)
- Design system da marca (aço + laranja, Oswald/Inter)
- Auth (Supabase, JWKS ES256 verificado localmente) + RBAC em 3 camadas (menu/rota/API)

### ✅ Etapa 1 — Faxina de escopo 🧹 (2026-07-04)
- Preços ocultos em toda a UI; banco continua capturando custo/venda

### ✅ Etapa 2 — Identidade: Usuários × Funcionários 👤 (2026-07-04)
- Tabela `usuarios` (authUserId, papel, vínculo opcional a funcionário); `funcionarios` = pessoa/equipe sem login
- Ledger registra `usuarioId` (quem operou); API + menu + guards nos 2 papéis

### ✅ Etapa 3 — Ferramentaria (empréstimo/devolução) 🔧 (2026-07-05)
- `Produto.categoria` PECA/FERRAMENTA; tipos `EMPRESTIMO`/`DEVOLUCAO` no ledger; tabela `emprestimos`
- RPCs atômicas com trava de concorrência (`registrar_emprestimo`, `registrar_devolucao`, `registrar_perda`)
- Tela **Pendências** + alerta in-app para ADMIN após o prazo; perda = baixa definitiva com motivo
- Prazo padrão configurável **só pelo Admin** (`configuracoes`, Avaliação 02)

### ✅ Etapa 4 — Filtros e ordenações 🔍 (2026-07-05)
- `useOrdenacao` compartilhado (asc → desc → sem; pt-BR, numérico humano, nulos por último) em todas as tabelas
- Chips contextuais por tela (Produtos, Histórico, Pendências)

### ✅ Auditoria de Integridade Técnica 🔎 (2026-07-10)
- Diagnóstico completo de frontend, backend, banco e segurança (relatório da auditoria)
- **Correção aplicada:** fallback silencioso pro modo demo eliminado — `VITE_DEMO=1`
  explícito ou tela de erro fatal; string vazia no `.env` tratada como ausente
  (`config.ts`, `main.tsx`, `auth.tsx`, `supabase.ts`, `ErroConfiguracao.tsx`)

## Etapa 4.5 — Pré-requisitos de Infraestrutura 🧱 (NOVA — antes da Etapa 5)

*Descobertos na auditoria. Nenhuma feature nova entra antes disto: são a rede de
segurança que a Etapa 5 (permissões dinâmicas) exige.*

1. **Higiene de versionamento** — o repositório tem um único commit gigante
   ("Estado inicial"). Adotar commits pequenos por tarefa; commitar o estado
   atual (incluindo as correções da auditoria) antes de qualquer código novo.
2. **Base de testes = zero.** Instalar Vitest no `apps/web` e cobrir primeiro o
   que a Etapa 5 vai tocar: `permissions.ts` (matriz papel × rota),
   `useOrdenacao` (comparador pt-BR), `config.ts` (gate de ambiente). API: teste
   e2e mínimo do guard (401 sem token, 403 papel errado) antes de mexer em RBAC.
3. **Navegação mobile inexistente** — a sidebar é `hidden md:flex` e não há menu
   alternativo: no celular o operador não navega. Corrigir antes da Etapa 5
   (a tela de admin nascerá responsiva).
4. **Acessibilidade do Modal** — sem `role="dialog"`, `aria-modal`, foco não é
   capturado nem devolvido. Corrigir no componente único (`ui/modal.tsx`).
5. **Bundle único de 541 kB** — code-splitting por rota (`React.lazy`) nas telas
   de cadastro; a Etapa 5 adiciona telas de admin e o problema só cresce.
6. **Robustez da API** — `getConfig()` com `findUniqueOrThrow` vira 500 se o seed
   não rodou (deve devolver o padrão de 24h); `listarEmprestimos` sem `take`
   (crescimento sem limite); validar `status` recebido em query string.

### ✅ Etapa 5a — Multi-tenant nativo 🏢 (2026-07-11)
*Antecipada e elevada em relação ao plano original (5.4 era "preparação sem
ativar"): o isolamento por tenant foi entregue ATIVO em todas as camadas de
servidor, operando single-tenant no tenant `'default'` sem mudança de
comportamento para a oficina atual.*
- Tabela `tenants` + `tenantId TEXT NOT NULL DEFAULT 'default'` em TODAS as
  tabelas operacionais (backfill na própria migração); FKs e índices por tenant
- Unicidade de negócio virou composta por tenant: `(tenantId, sku|cpf|cnpjCpf|
  placa|chassi|email|numero)` — `authUserId` segue único global (âncora
  login→tenant no AuthGuard)
- `configuracoes` deixou de ser linha única global: PK = `tenantId` (uma linha
  por oficina; `getConfig` faz fallback de 24h e `updateConfig` virou upsert)
- RPCs (`registrar_movimentacao_estoque`, `registrar_emprestimo`,
  `registrar_devolucao`, `registrar_perda`) ganharam `p_tenant_id` e filtram
  por tenant DENTRO da transação (`FOR UPDATE` continua por linha de produto);
  id de outro tenant = "não encontrado" (cross-over não vaza existência)
- API: `CrudService` e `EstoqueService` exigem o tenant do usuário autenticado
  em todo método (nunca do body/query); escrita cross-tenant → 404 via
  `updateMany`/`deleteMany` com `{ id, tenantId }`; `GET /me` devolve `tenantId`
- TDD: 21 testes novos simulando ataques de Tenant Cross-Over (inquilino A
  lendo/escrevendo/excluindo dados do B) — 44 na API, 73 no total
- Política RLS por tenant (`tenant_id` como custom claim do JWT) documentada em
  `03_rls.sql` — ativação junto com o onboarding de outras oficinas

### ✅ Etapa 5b — Permissões, RBAC dinâmico e Gestão Admin ⚙️ (2026-07-11)
*Fecha a Etapa 5 (5a + 5b). A matriz papel × recurso × ação saiu do código e
virou dado POR TENANT, com enforcement nas 3 camadas e tela de gestão.*

**5.1 — Modelo de dados** — tabelas `permissoes` (estado vigente; unique
`tenantId+papel+recurso+acao`) e `permissoes_log` (auditoria INSERT-ONLY,
mesmo espírito do ledger); vocabulário: 8 recursos × `VER|CRIAR|EDITAR|EXCLUIR`;
migração semeia a matriz anterior (sem regressão) e o `seed.mjs` é idempotente.

**5.2 — Enforcement em 3 camadas** — API: decorator `@Permissao(recurso, acao)`
consultado pelo AuthGuard via `PermissoesService` (cache 30s por tenant+papel,
invalidado a cada gravação; `@Roles` continua como teto estático); tenant sem
linhas cai na `MATRIZ_PADRAO` em código. Frontend: `GET /me` devolve o mapa do
papel; menu e guard de rota leem de `podeAcessarComMapa` (matriz hardcoded =
fallback do demo). RLS inalterado (escrita só via API).

**5.3 — Tela do Admin (`/admin`, chunk lazy)** — matriz de checkboxes do
ALMOXARIFADO com alterações pendentes e salvamento em lote auditado; gestão de
usuários (criar login via Supabase Admin/service-role com rollback anti-órfão,
trocar papel, ativar/desativar); trilha de auditoria na própria tela.

**Anti-lockout (trava dura em todas as camadas)** — o recurso `admin` não é
configurável: sempre e somente ADMIN (banco/mapa forjado são ignorados); o
admin não desativa nem despromove a própria conta.

**5.4 — Preparação multi-tenant** — ✅ entregue (e ampliada) na Etapa 5a:
`tenant_id` em TODAS as tabelas (não só as 4 do núcleo), RPCs escopadas,
`configuracoes` por tenant e RLS futura documentada.

## Próxima grande fase

### Etapa 6 — Dashboard do Admin 📊
*Depende das etapas 3 e 4 (dados + filtros). Sem valores financeiros.*
- Visão operacional: movimentações no tempo, itens críticos, top consumo, pendências
- Gráfico coerente ao dado; leitura em segundos; só ADMIN

### Etapa 7 — Performance e resiliência ⚡
- Cache-first (React Query persistido), boot paralelo, fila offline de escrita
- *Fora do escopo: sync offline completo com resolução de conflitos*

## Gaveta (futuro, ordem provável)
1. **RH / Banco de horas** — requer Etapa 2 + descoberta do scanner facial. Nunca: cálculo de folha (CLT) nem biometria armazenada (LGPD)
2. **Fila de atendimento de OS** — prioridade por parceria, override do dono, tempo real
3. **Portal do cliente** — status da OS por link com token, sem login
4. **Financeiro** — reativa preços na UI; fornecedores, custo mensal, faturamento; só ADMIN
5. **Multi-tenant pleno / cobrança SaaS / sa-east-1** — ativar o `tenant_id` semeado na Etapa 5, RLS por tenant, onboarding de oficinas
