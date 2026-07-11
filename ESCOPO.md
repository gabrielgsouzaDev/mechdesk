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

## Próxima grande fase

### Etapa 5 — Permissões, RBAC e Gestão Admin ⚙️ (ótica multi-tenant / saas-pipeline)
*Depende da Etapa 2 e da Etapa 4.5. O SaaS mensal já é direção declarada:
a matriz de permissões nasce pronta para `tenant_id`, mesmo operando single-tenant.*

**5.1 — Modelo de dados de permissões**
- Matriz papel × recurso × ação sai do código e vira tabela (`permissoes`):
  `papel`, `recurso`, `acao` (`VER|CRIAR|EDITAR|EXCLUIR`), `permitido`
- **Toda tabela nova já nasce com `tenant_id TEXT NOT NULL DEFAULT 'default'`** +
  índice composto — custo zero hoje, migração trivial amanhã
- Seed reproduz a matriz atual (`permissions.ts`) para migração sem regressão

**5.2 — Enforcement em 3 camadas lendo do banco**
- API: guard consulta `permissoes` (cache curto em memória, invalidado por Realtime)
- Frontend: `GET /me` passa a devolver o mapa de permissões do papel; menu e
  guard de rota leem do mapa (o `permissions.ts` hardcoded vira fallback do demo)
- RLS continua bloqueando escrita direta do browser (inalterado)

**5.3 — Tela do Admin**
- Checkboxes papel × recurso × ação; gestão de usuários (criar/desativar login,
  trocar papel) na mesma tela; auditoria: mudanças de permissão registradas
  (padrão insert-only, mesmo espírito do ledger)

**5.4 — Preparação multi-tenant (sem ativar)**
- `tenant_id` nas 4 tabelas do núcleo operacional (`produtos`,
  `movimentacoes_estoque`, `emprestimos`, `configuracoes`) com `DEFAULT 'default'`
- `configuracoes` deixa de ser linha única global: PK passa a (`tenant_id`) —
  hoje uma linha 'default', amanhã uma por oficina
- RPCs ganham parâmetro `p_tenant_id` (default `'default'`) e filtram por ele
  dentro da transação — a trava `FOR UPDATE` continua por linha de produto
- Política RLS futura: `tenant_id = auth.jwt() ->> 'tenant_id'` (documentada,
  não ativada; hoje segue "leitura autenticada, escrita via API")

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
