# Luciano Freios — Escopo & Roadmap

> Documento de referência do escopo. Atualizado em **2026-07-04** após a
> "Avaliação do Sistema 01" do Gabriel. Ordem das etapas = ordem de
> dependência: nenhuma etapa depende de algo que vem depois dela.

## Decisões de produto vigentes

| Decisão | Detalhe |
|---|---|
| Foco do sistema | Controle interno da oficina: estoque (entrada/saída/empréstimo), cadastros de apoio, visão do dono |
| Papéis de acesso | **ADMIN** (donos) e **ALMOXARIFADO** — só. RH entra junto com o módulo banco de horas; FATURAMENTO não existe (financeiro é dos admins, módulo futuro) |
| Usuário ≠ Funcionário | Usuário = quem loga (~3). Funcionário = quem trabalha (~10, p/ banco de horas e empréstimos). Tabelas separadas |
| Preços de peças | **Ocultos no frontend** (inútil por agora). Colunas continuam no banco sendo capturadas — reativação futura com o módulo financeiro |
| Ferramentas | Estoque único com categoria `PECA`/`FERRAMENTA`. Ferramenta sai por **empréstimo** (temporário, vinculado ao funcionário) e volta por **devolução** |
| Pendências de ferramenta | Visíveis para ADMIN **e** ALMOXARIFADO (cobrar mecânico). **Notificação só para ADMIN**, após prazo configurável (padrão 24h) |
| Migração de região (sa-east-1) | Adiada — sem necessidade por agora |
| Cobrança do sistema | Direção: SaaS mensal + implantação (decisão externa, não bloqueia nada) |

## Etapas (ordem de execução)

### ✅ Concluído
- Fase 0: scaffold monorepo (Vite/React + NestJS + Prisma + Supabase)
- Cadastros: produtos, clientes, veículos, funcionários
- Núcleo de estoque: movimentação ENTRADA/SAÍDA atômica + ledger imutável + histórico
- Tempo real sem F5 (Supabase Realtime) — live em produção
- Design system da marca (aço + laranja, Oswald/Inter)
- Auth (Supabase, JWKS ES256) + RBAC em 3 camadas (menu/rota/API)
- Remoção de vendas/fiscal/locais_estoque (refoco)

### Etapa 1 — Faxina de escopo 🧹 ✅ (2026-07-04)
*Sem dependências. Rápida.*
- Ocultar preços em toda a UI: cards do console, colunas de tabelas, campos do formulário de produto
- Banco intocado (continua capturando custo/venda p/ o futuro financeiro)

### Etapa 2 — Identidade: Usuários × Funcionários 👤 ✅ (2026-07-04)
*Sem dependências. Base das etapas 3, 5 e do futuro RH.*
- Nova tabela `usuarios`: authUserId, papel (`ADMIN` | `ALMOXARIFADO`), vínculo opcional a funcionário
- `funcionarios` vira registro de pessoa/equipe: nome, cpf, **cargo** (texto: Mecânico, Secretária…), ativo — sem login, sem papel de acesso
- Migração de dados: Luciano → usuário ADMIN; Marina → usuária ALMOXARIFADO (+ funcionária); demais ficam só como funcionários
- Ledger passa a registrar `usuarioId` (quem operou o sistema)
- API + menu + guards atualizados para os 2 papéis

### Etapa 3 — Ferramentaria (empréstimo/devolução) 🔧 ✅ (2026-07-05)
*Depende da Etapa 2 (empréstimo aponta para funcionário do modelo novo).*
- `Produto.categoria`: `PECA` (consumível, baixa definitiva) | `FERRAMENTA` (retornável)
- Novos tipos no ledger: `EMPRESTIMO` e `DEVOLUCAO` (auditáveis como tudo)
- Tabela `emprestimos` (pendências abertas): ferramenta, funcionário, retirada, prazo, devolução
- Console: ferramenta selecionada → fluxo de empréstimo (para qual funcionário) em vez de saída
- Tela **Pendências** (ADMIN + ALMOXARIFADO): o que está fora, com quem, há quanto tempo; vencidas em destaque
- Alerta para ADMIN após prazo configurável (padrão 24h) — in-app primeiro
- Casos cobertos: perda (converte em baixa definitiva com motivo), múltiplas unidades da mesma ferramenta com pessoas diferentes

### Etapa 4 — Filtros e ordenações 🔍 ✅ (2026-07-05)
*Depois da 3 para já nascer filtrando categorias/pendências.*
- Ordenação por coluna nas tabelas (CrudPage genérico → propaga para todas)
- Chips contextuais por tela: Produtos ("abaixo do mínimo", categoria), Histórico (período, tipo, produto), Pendências (vencidas)
- Sem poluição: filtro só onde o dado pede

### Etapa 5 — Permissões no banco + gestão pelo Admin ⚙️
*Depende da Etapa 2.*
- Matriz papel × recurso × ação sai do código e vira tabela
- Tela do Admin: checkboxes por papel (ver/criar/editar/excluir por recurso)
- Gestão de usuários (criar/desativar login, trocar papel) na mesma tela
- Enforcement continua em 3 camadas (menu/rota/API), agora lendo do banco

### Etapa 6 — Dashboard do Admin 📊
*Depende das etapas 3 e 4 (dados + filtros). Sem valores financeiros (preços ocultos).*
- Visão operacional: movimentações no tempo, itens críticos (abaixo do mínimo), top consumo, pendências de ferramentas
- Gráfico coerente ao dado; leitura em segundos; só ADMIN

### Etapa 7 — Performance e resiliência ⚡
*Por último entre as técnicas: a fila offline envolve o fluxo de movimentação, que a Etapa 3 modifica — fazer depois evita retrabalho.*
- Cache-first: React Query persistido → telas pintam instantâneo do cache e revalidam por trás
- Boot paralelo (auth + dados juntos)
- Offline crítico: leitura do cache sem internet + fila de escrita para movimentações (registra local, sincroniza ao voltar)
- *Fora do escopo: sync offline completo com resolução de conflitos (custo não justifica)*

## Gaveta (futuro, ordem provável)
1. **RH / Banco de horas** — requer Etapa 2 pronta + descoberta do scanner facial (marca/modelo → AFD ou API). Papel RH nasce aqui. Nunca: cálculo de folha (CLT = risco legal) nem armazenar biometria (LGPD)
2. **Fila de atendimento de OS** — prioridade por parceria, override do dono, tempo real
3. **Portal do cliente** — status da OS por link com token, sem login
4. **Financeiro** — reativa preços na UI; fornecedores, custo mensal, faturamento; só ADMIN
5. **Migração sa-east-1 / multi-cliente / cobrança SaaS** — quando for escalar
