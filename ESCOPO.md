# Luciano Freios (MechDesk) — Escopo & Roadmap

> Documento de referência do escopo. Atualizado em **2026-07-12** após o
> **Interrogatório de Operação** (pós-Realinhamento): o sistema foi criticado
> etapa a etapa contra a operação real de uma oficina de caminhão para achar os
> gaps de modelagem ANTES da prática. Descoberta central: o núcleo que falta não
> é "financeiro" nem "fiscal" isolados — é a **Ordem de Serviço (OS)**, da qual
> preço, nota, fila e faturamento todos dependem. Ordem das etapas = ordem de
> dependência.

---

## Como ler os marcadores

- **🔒 DECIDIDO** — decisão vigente, não reabrir sem motivo.
- **🟡 PROPOSTO (a confirmar em campo)** — a decisão mais provável já está
  escrita para não travar o trabalho, mas depende de confirmação do dono e/ou
  contador. É proposta, não verdade.
- **⛔ BLOQUEADOR** — não começar o código dependente antes de resolver.
- **❓ GAP** — pergunta de modelagem que o sistema atual não responde.

---

## Princípio de escopo (a bússola)

**Teste único para qualquer feature nova:** *"isso ajuda a oficina a OPERAR, ou é
contabilidade/gestão empresarial?"* Operação entra; contabilidade da empresa é
outro produto e fica fora.

- **Dentro:** estoque, ferramenta, cadastro, Ordem de Serviço, fila, peça
  vendida, mão de obra, nota da venda, registro operacional de horas.
- **Fora (é do contador / do sistema financeiro dele):** contas a pagar, fluxo
  de caixa, conciliação bancária, fornecedores como módulo de compras, folha de
  pagamento CLT.
- **Financeiro que ENTRA = operacional:** o que a oficina faturou em peça e
  serviço, derivado direto da OS. Nada além disso.
- A IA remove o atrito de construir; o atrito era o freio natural do escopo.
  **A disciplina do teste acima substitui o freio que a IA tirou.**

**Estratégia comercial que orienta a prioridade:** não se vence o Excellent
sendo mais completo — vence-se **cortando as âncoras** que prendem o dono ao
sistema antigo e **despertando interesse** com o que dói mais. Âncora, não lista
de features, é o que trava a troca.

Âncoras conhecidas, em ordem de força:

1. **Nota fiscal** — motivo declarado da escolha do Excellent. Portão de venda.
2. **Dados históricos** (clientes, veículos, peças, histórico) presos no
   Excellent. Migração fácil vale mais que features novas (ver Etapa 10).
3. **Rotina do contador** já montada em cima das notas do Excellent.

---

## Decisões de produto vigentes

| Decisão                       | Detalhe                                                                                                                              | Status                |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------- |
| Foco do sistema               | Operação da oficina (ver bússola). Contabilidade empresarial fica fora                                                               | 🔒                    |
| Portão de venda               | **Nota fiscal é requisito de entrada** do 1º cliente. Fiscal é a próxima grande fase; Dashboard pausado                              | 🔒                    |
| Ordem de Serviço              | **A OS é o núcleo operacional que falta.** Peça, mão de obra, preço, nota e faturamento penduram nela (ver Etapa 6)                  | 🔒                    |
| Emissão fiscal                | Sempre via **integrador terceirizado** (Focus NFe, NFe.io, PlugNotas, eNotas…). Nunca SEFAZ direto nem cálculo tributário próprio    | 🔒                    |
| Preço de peça: compra × venda | **Duas grandezas distintas.** Custo (entra na compra) e venda (sai na OS/nota) NÃO são o mesmo campo. Modelagem detalhada na Etapa 6 | 🔒 conceito / 🟡 forma |
| Papéis de acesso              | **ADMIN** e **ALMOXARIFADO**. RH entra com banco de horas; faturamento é visão do ADMIN, não papel novo                              | 🔒                    |
| Usuário ≠ Funcionário         | Usuário loga (~3); Funcionário trabalha (~10). Tabelas separadas                                                                     | 🔒                    |
| Preços na UI                  | **Reativados** com o fiscal — nota precisa de valor. O banco já capturava custo/venda desde a Fundação                               | 🔒                    |
| Ferramentas                   | Estoque único categoria `PECA`/`FERRAMENTA`; ferramenta sai por empréstimo e volta por devolução                                     | 🔒                    |
| Modo demonstração             | Só com `VITE_DEMO=1` explícito; senão tela de erro fatal, nunca fallback silencioso                                                  | 🔒                    |
| Cobrança do sistema           | SaaS mensal + implantação. Consequência: toda decisão nova nasce multi-tenant                                                        | 🔒                    |
| RH / Banco de horas           | Só **registro operacional de horas**. **Nunca** cálculo de folha CLT nem biometria armazenada (LGPD). Fica na gaveta                 | 🔒 fronteira          |

---

## Interrogatório de Operação — os gaps invisíveis

*Percurso crítico pela operação real de uma oficina de caminhão. Cada gap é uma
pergunta que o modelo atual não responde. Nenhum destes exige reescrever a
arquitetura — são decisões de modelagem de negócio sobre a fundação que já
existe.*

### A. A Ordem de Serviço não existe no modelo — e é o coração de tudo

Hoje o sistema modela **estoque** (peça entra, peça sai) mas não modela **o
trabalho**: o caminhão que chega, o defeito, as peças aplicadas NAQUELE serviço,
a mão de obra, o total. A saída de estoque hoje é solta; numa oficina ela é quase
sempre *consequência de uma OS*. Sem OS não há o que faturar, o que colocar na
nota, o que pôr na fila, nem histórico do veículo.

- **❓ GAP A1 — O que é uma OS aqui?** 🟡 PROPOSTO: uma OS pertence a um veículo
  (logo a um cliente), tem status (aberta → em execução → concluída → faturada),
  agrega **itens de peça** (baixam estoque) e **itens de serviço/mão de obra**
  (não têm estoque), e fecha num total. *A confirmar com o dono: é assim que ele
  pensa o atendimento?*
- **❓ GAP A2 — Peça aplicada na OS baixa estoque quando?** 🟡 PROPOSTO: na
  aplicação/lançamento do item na OS, via a mesma RPC atômica que já existe
  (`registrar_movimentacao_estoque`), com o tipo de saída vinculado à OS
  (rastreabilidade no ledger imutável: qual OS consumiu qual peça). *A confirmar:
  ele separa peça na abertura ou vai lançando durante o serviço?*
- **GAP A3 — Mão de obra: como é cobrada?** 🔒 DIREÇÃO CONFIRMADA (2026-07-12):
  a mão de obra é **variável** — precificada caso a caso, não por tabela fixa.
  Modelo: **valor livre por item de serviço** (ele digita "troca de embreagem —
  R$X" na hora). Consequência de escopo: **NÃO** construir tabela de preços de
  serviço (menos código, não mais). Mão de obra é só mais um tipo de item na OS,
  com preço definido no lançamento. *Falta só o dono confirmar de viva voz na
  conversa de campo — mas a direção está travada.*
- **❓ GAP A4 — OS e Nota são a mesma coisa?** 🟡 PROPOSTO: **não.** A OS é
  operacional (pode existir sem nota, pode ter orçamento recusado); a nota é o
  ato fiscal que acontece *a partir de* uma OS concluída. Uma OS gera no máximo
  uma nota (v1). *A confirmar: ele fatura toda OS? Emite nota parcial?*

### B. Preço — a família de perguntas que o "custo × venda" abre

- **❓ GAP B1 — Venda é margem ou preço fixo?** 🟡 PROPOSTO: campo de **preço de
  venda editável por peça** (não margem calculada), com o custo da última entrada
  visível ao ADMIN como referência. Simples, cobre o caso real, e o dono mantém
  controle. *A confirmar: ele usa % de margem padrão ou preço item a item?*
- **❓ GAP B2 — O custo muda a cada compra. Qual custo vale?** 🟡 PROPOSTO: guardar
  o custo **em cada entrada de estoque** (já há ledger de movimentação — o dado
  cabe lá) e exibir como "custo da última compra". **Fora do escopo v1:** custo
  médio ponderado / PEPS contábil (é contabilidade, não operação — ver bússola).
  *A confirmar com o contador se a nota exige custo específico.*
- **❓ GAP B3 — Preço de venda pode variar por cliente/OS?** 🟡 PROPOSTO: o preço
  de venda da peça é padrão, mas **editável na linha da OS** (desconto ou ajuste
  pontual do dono — o mesmo "jogo de cintura" da fila). O padrão vem do cadastro;
  a OS pode sobrescrever. *A confirmar.*
- **❓ GAP B4 — Peça que ele vende mas não estoca (compra sob encomenda)?**
  🟡 PROPOSTO: permitir item de peça na OS **sem vínculo de estoque** (avulso,
  com descrição e preço), para não travar o atendimento. *A confirmar se ocorre.*
- **🔒 Preço de compra e preço de venda são colunas/grandezas separadas.** Este é
  o ponto que originou o interrogatório e está decidido no conceito.
- **🔒 Mão de obra é preço variável, não peça.** (Confirmado — ver A3.) O total de
  uma OS soma **dois tipos de item com naturezas diferentes**: peça (tem custo de
  entrada + venda, baixa estoque) e serviço/mão de obra (só valor de venda livre,
  não toca estoque). O modelo de item da OS precisa carregar essa distinção de
  tipo desde o início.

### C. Cliente e Veículo — a modelagem que a nota vai exigir

- **❓ GAP C1 — Cliente é PF ou PJ?** ⛔ importa para a nota. 🟡 PROPOSTO: suportar
  os dois (CPF/CNPJ), já que frota costuma ser PJ e avulso é PF. O cadastro já
  tem o campo; confirmar que a nota puxa os dados fiscais certos de cada tipo.
- **❓ GAP C2 — Um veículo pode trocar de dono?** 🟡 PROPOSTO: sim; histórico da OS
  fica no veículo, não se perde na troca. Baixa prioridade, mas não modelar isso
  errado agora evita retrabalho. *A confirmar se acontece na prática dele.*
- **❓ GAP C3 — O que a nota exige do cliente que hoje o cadastro não guarda?**
  ⛔ BLOQUEADOR junto da descoberta fiscal: endereço completo, inscrição estadual
  (PJ), etc. Levantar olhando uma nota real do Excellent.

### D. Fiscal — o portão (bloqueadores de campo mantidos)

- **⛔ BLOQUEADOR — descoberta de campo:** tipo de nota (NF-e produto / NFC-e /
  NFS-e serviço municipal), regime tributário e município. A escolha do
  integrador só ocorre depois. Sinal já coletado do dono ("emitir para a Receita
  Federal") aponta para nota **estadual/federal** (NF-e/NFC-e), mas oficina
  costuma precisar **também** de NFS-e de serviço — confirmar olhando uma nota.
- **❓ GAP D1 — Uma nota ou duas (peça e serviço)?** 🟡 PROPOSTO: depende do que o
  Excellent emite hoje. Se ele emite serviço (NFS-e municipal) e peça (NF-e)
  separadamente, o módulo precisa dos dois — e a NFS-e é o pedaço mais difícil
  (cada prefeitura tem seu padrão). *Confirmar na descoberta.*
- **❓ GAP D2 — Certificado digital: quem tem, está válido, quem administra?**
  ⛔ sem ele não há emissão. Dado sensível: nunca no frontend, criptografado no
  backend, senha nunca em texto puro. *Levantar no campo.*

### E. Concorrência e integridade — o que a operação real estressa

- **❓ GAP E1 — Dois usuários lançam a mesma peça em OSs diferentes ao mesmo
  tempo.** 🔒 já coberto: a RPC atômica com `FOR UPDATE` por linha de produto
  impede venda de estoque que não existe. Registrar que a OS reusa esse caminho,
  não cria um novo.
- **❓ GAP E2 — Estorno: peça lançada por engano na OS.** 🟡 PROPOSTO: estorno é
  **novo lançamento inverso** no ledger (nunca DELETE — mantém a imutabilidade
  que já é lei do projeto), com motivo. A peça estornada **não volta direto ao
  estoque disponível** — passa pelo Limbo (ver E4). *Confirmar o fluxo com o dono.*
- **❓ GAP E3 — OS concluída/faturada pode ser editada?** 🟡 PROPOSTO: não — depois
  de faturada, vira registro imutável (coerente com o ledger). Correção = estorno
  + nota de ajuste, território fiscal. *Confirmar.*
- **GAP E4 — Estoque Limbo / Quarentena** 🔒 CONCEITO APROVADO (2026-07-12,
  ideia do desenvolvedor). Peça que sai do fluxo normal por um motivo não-resolvido
  — comprada e ainda não conferida, estornada, sumida, usada por engano, devolução
  a inspecionar — vai para um **estado intermediário** em vez de ser apagada ou
  voltar cega ao estoque. É a expressão física da lei do ledger (nada some, tudo
  vira movimento registrado). Regras cravadas:
  - **Não conta como disponível para venda/OS enquanto estiver no Limbo** 🔒
    (confirmado pelo dono). Fica reservada até a resolução.
  - **Resolução OBRIGATÓRIA** 🔒 — toda peça no Limbo tem que ter uma porta de
    saída: **(a)** volta ao estoque disponível (engano resolvido), **(b)** vira
    perda definitiva (sumiu de verdade), ou **(c)** devolução ao fornecedor.
    Limbo sem porta de saída é um ralo de indefinição — proibido por design.
  - Cada entrada no Limbo carrega **motivo** e cada saída carrega **resolução +
    motivo**, tudo no ledger imutável (mesmo espírito de `permissoes_log`).
  - **❓ A confirmar em campo:** existe prazo/alerta para peça parada no Limbo
    (como já há para ferramenta emprestada)? Quem resolve — ADMIN, ALMOXARIFADO
    ou ambos? *Proposta: visível aos dois, notificação ao ADMIN após prazo,
    espelhando o padrão de Pendências que já existe.*

### F. SOS / Atendimento externo — diferencial estratégico a INVESTIGAR

*Levantado pelo desenvolvedor (2026-07-12) como serviço principal do dono e
provável "colírio pros olhos". Tratado aqui com disciplina: **intuição forte de
valor + zero definição de problema = risco de escopo infinito** (o mesmo padrão
que já espalhou o sistema financeiro anterior). Por isso NÃO é escopo ativo — é
diferencial a investigar em campo antes de virar qualquer linha de código.*

**Por que é estratégico (a intuição está certa):** SOS (socorro mecânico na
estrada) é serviço principal → dor real e recorrente. Software de oficina
tradicional pensa a oficina como lugar FIXO, não como equipe que sai à estrada —
então é forte candidato a algo que o Excellent faz **mal ou não faz**. Isso o
torna um **diferencial onde não se compete, se domina sozinho** — potencialmente
maior que a fila. É também a desculpa perfeita e natural para a conversa de campo:
"como funciona o SOS de vocês?" é curiosidade genuína sobre o trabalho de que ele
se orgulha, não interrogatório de programador. Acende interesse e coleta requisito
no mesmo movimento.

**Por que NÃO entra no escopo ainda (a armadilha):** "talvez com localização" é
pular para a solução antes de entender o problema. Localização (mapa/GPS/tempo
real) soa moderna e cara e **pode não ser nada do que ele precisa** — ou ser
exatamente. Ninguém sabe, porque o processo real de SOS ainda não foi observado.
Construir agora seria adivinhar.

**⛔ Descoberta de campo antes de qualquer feature (tudo sobre entender o
trabalho, nada técnico):**

- Como funciona hoje, do início ao fim: alguém liga? Como o chamado chega? Quem
  decide quem vai?
- O mecânico leva peça — qual, como sabe qual levar? (Conexão com o Limbo E4:
  peça que saiu no caminhão de SOS e ainda não foi baixada de uma OS é um caso
  natural de estado intermediário.)
- Como se registra o que foi usado lá fora? Como cobra? Vira nota?
- **Onde dói hoje** — o que dá errado, o que se perde, o que ele xinga. *É na
  resposta desta que a feature aparece sozinha* (localização, ou registro de peça
  fora do estoque físico, ou só saber quem está em atendimento externo agora).

*Enquanto a descoberta não acontece, SOS permanece como diferencial mapeado, não
como etapa. Vira escopo só quando o problema estiver definido.*

---

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

- Diagnóstico completo de frontend, backend, banco e segurança
- **Correção aplicada:** fallback silencioso do modo demo eliminado — `VITE_DEMO=1`
  explícito ou tela de erro fatal; string vazia no `.env` tratada como ausente

### ✅ Etapa 4.5 — Pré-requisitos de Infraestrutura 🧱

*Rede de segurança exigida pela Etapa 5. Todos concluídos (verificado 2026-07-11).*

1. Higiene de versionamento (commits pequenos por tarefa)
2. Base de testes (Vitest; `permissions.ts`, `useOrdenacao`, `config.ts`; e2e do guard)
3. Navegação mobile no `AppShell`
4. Acessibilidade do Modal (`role="dialog"`, `aria-modal`, foco)
5. Code-splitting por rota (`React.lazy`)
6. Robustez da API (`getConfig` com fallback, `take` em listagens, validação de query)

### ✅ Etapa 5a — Multi-tenant nativo 🏢 (2026-07-11)

- `tenants` + `tenantId TEXT NOT NULL DEFAULT 'default'` em TODAS as tabelas operacionais (backfill na migração); FKs e índices por tenant
- Unicidade de negócio composta por tenant; `authUserId` único global (âncora login→tenant no AuthGuard)
- `configuracoes` por tenant (PK = `tenantId`; `getConfig` fallback 24h; `updateConfig` upsert)
- RPCs com `p_tenant_id` filtrando DENTRO da transação (`FOR UPDATE` por linha); cross-over não vaza existência
- API exige tenant do usuário autenticado em todo método; escrita cross-tenant → 404; `GET /me` devolve `tenantId`
- TDD: 21 testes de Tenant Cross-Over — 44 na API, 73 no total
- RLS por tenant documentada em `03_rls.sql` (ativa no onboarding de outras oficinas)

### ✅ Etapa 5b — Permissões, RBAC dinâmico e Gestão Admin ⚙️ (2026-07-11)

- **Modelo:** `permissoes` (unique `tenantId+papel+recurso+acao`) e `permissoes_log` (auditoria INSERT-ONLY); 8 recursos × `VER|CRIAR|EDITAR|EXCLUIR`; migração semeia a matriz anterior; `seed.mjs` idempotente
- **Enforcement 3 camadas:** decorator `@Permissao` via AuthGuard + `PermissoesService` (cache 30s por tenant+papel, invalidado a cada gravação); `@Roles` como teto estático; front lê o mapa do `GET /me`
- **Tela `/admin` (lazy):** matriz de checkboxes do ALMOXARIFADO, salvamento em lote auditado; gestão de usuários (criar login com rollback anti-órfão, trocar papel, ativar/desativar)
- **Anti-lockout:** recurso `admin` inconfigurável (sempre e só ADMIN); admin não se desativa nem se despromove
- **Aplicado ao banco em 2026-07-12:** `migrate deploy` (5a+5b) + reaplicação dos SQLs; correção de segurança: RLS deny-by-default em `tenants`, `permissoes`, `permissoes_log` (ficariam expostas via PostgREST)

---

## Roadmap (reordenado — a OS entra antes do Fiscal)

> **Mudança-chave deste interrogatório:** o Fiscal **depende** da Ordem de
> Serviço (a nota fatura uma OS). Por isso a OS vira a Etapa 6 e o Fiscal, a 7.
> Não dá para faturar o que o modelo não sabe representar.

### Etapa 6 — Ordem de Serviço + Preço operacional 🧰 (NOVO NÚCLEO)

*O coração operacional que faltava. Resolve os gaps A, B e E. Sem reescrever nada
— usa estoque, ledger e RPCs que já existem.*

- Modelo de OS: veículo → cliente, status (aberta → em execução → concluída →
  faturada), com **itens de dois tipos distintos** (🔒 confirmado):
  - **item de peça** — tem custo (entrada) e venda; baixa estoque via a RPC
    atômica existente; vínculo OS↔movimentação no ledger
  - **item de serviço / mão de obra** — **valor de venda livre e variável**
    (digitado caso a caso, sem tabela fixa — ver A3); não toca estoque
- Preço da peça: **custo (por entrada) × venda (cadastro, editável na linha da
  OS)** — colunas separadas; venda padrão sobrescrevível na OS
- **Estoque Limbo/Quarentena** (🔒 conceito aprovado — E4): estado intermediário
  para peça fora do fluxo normal (comprada não-conferida, estornada, sumida, usada
  por engano). **Não conta como disponível** até resolver; **resolução obrigatória**
  (volta ao estoque / perda definitiva / devolução ao fornecedor); motivo de
  entrada e de saída no ledger imutável
- Estorno = lançamento inverso no ledger (nunca DELETE) → peça vai ao Limbo, não
  volta cega ao estoque; OS faturada = imutável
- Preços voltam à UI (ADMIN vê custo; venda visível conforme papel)
- **Antes de codar:** fechar os 🟡 restantes dos gaps A, B e E com o dono
  (roteiro de campo) — em especial quem resolve o Limbo e se há prazo/alerta

### Etapa 7 — Módulo Fiscal: emissão de nota 🧾 (PORTÃO DE VENDA)

*Fatura uma OS concluída (Etapa 6). Emissão via integrador terceirizado.*

- **⛔ BLOQUEADOR — descoberta de campo:** tipo de nota, regime, município,
  certificado digital. Escolha do integrador só depois.
- **Fase 1 — emitir nota real (sem tela):** config fiscal do tenant do dono FIXA
  na estrutura `configuracoes` (e/ou env). Objetivo único: nota **autorizada em
  homologação** e depois **produção**. Config nasce no shape da tela futura.
- **Fase 2 — tela de config multi-tenant:** espelha os campos PROVADOS na Fase 1.
- Certificado digital: criptografado no backend, senha nunca em texto puro,
  nunca no frontend.

### Etapa 8 — Fila de Atendimento de OS 📋

*Agora natural: a OS já existe (Etapa 6), a fila só a organiza no tempo.*

- Kanban **editável**, prioridade por cliente (parceria)
- **Override manual do dono** — o "jogo de cintura" de remanejar urgentes
- Tempo real (Supabase Realtime, padrão existente)

### Etapa 9 — Dashboard do Admin 📊 (PAUSADO — desenho aprovado)

*Aguarda o portão de venda. Depende de estoque + OS (agora tem faturamento real
para mostrar, sem entrar em contabilidade).*

- Visão operacional: movimentações no tempo, itens críticos, top consumo,
  pendências, **faturamento operacional (peça + serviço) da OS**
- Endpoint agregado por tenant (`GET /dashboard/resumo`), recurso RBAC
  `dashboard` configurável (não pega carona no `admin` travado), rota lazy
  (Recharts), top consumo por quantidade

### Etapa 10 — Migração de dados do Excellent 🔑 (CORTA A 2ª ÂNCORA)

*Estratégico para a VENDA, não só técnico. "Traz seus dados junto" derruba mais
resistência que qualquer feature. Descobrir se o Excellent exporta (CSV/planilha)
os cadastros; construir importador de clientes, veículos e peças por tenant.*

- **Antes:** verificar o que o Excellent consegue exportar (campo).
- Importador idempotente por tenant, com relatório de conflitos.

### Etapa 11 — Performance e resiliência ⚡

- Cache-first (React Query persistido), boot paralelo, fila offline de escrita
- *Fora do escopo: sync offline completo com resolução de conflitos*

### Fase transversal — Retrabalho visual 🎨

*Passe de design dedicado, coerente com o público (dono de oficina de caminhão).
Concentrar o maior capricho na PRIMEIRA tela que o dono vê — ela carrega a
mudança de percepção. Fazer logo antes desta fase a limpeza de arquivos mortos
(estrutura estável).*

- Tom **industrial robusto**, alto contraste, legibilidade forte — não minimalismo
- Design system atual (aço + laranja, Oswald/Inter) mantido

---

## Gaveta (futuro, ordem provável)

1. **RH / Banco de horas** — só registro operacional de horas. **Nunca** folha CLT nem biometria armazenada (LGPD). Informa o dashboard (horas gastas), não calcula folha
2. **Portal do cliente** — status da OS/veículo por link SEM login. **Token aleatório e não-adivinhável (nunca id sequencial)** — impede enumeração e vazamento
3. **Financeiro empresarial** — contas a pagar/receber, fornecedores, fluxo de caixa. **Fora da bússola** — provável NÃO permanente; é do contador
4. **Multi-tenant pleno / cobrança SaaS / sa-east-1** — ativar RLS por tenant, onboarding de oficinas

---

## Sequência de campo (o que destrava o quê)

O gargalo do MechDesk hoje **não é código** — é informação que só existe dentro
da oficina. Ordem de descoberta, antes do código dependente:

1. **Como funciona o SOS de vocês?** (seção F) → é a **porta de entrada natural**
   da conversa: curiosidade genuína sobre o serviço de que ele se orgulha, não
   interrogatório. Acende interesse E mapeia um possível diferencial no mesmo
   movimento. Foco em "onde dói hoje", não em features.
2. **Interrogatório da OS com o dono** (gaps A, B, E) → destrava a Etapa 6. Como
   ele atende, precifica mão de obra (caso a caso?), lida com peça devolvida/errada.
3. **Ver uma nota real do Excellent** + regime tributário (via contador) →
   destrava a escolha do integrador e a Etapa 7.
4. **Certificado digital** (quem tem, validade, quem administra).
5. **O Excellent exporta dados?** → destrava a Etapa 10 (âncora de dados).

**Como abordar sem quebrar a percepção:** o dono te vê como mecânico, não
programador. Não chegar com questionário. Primeiro **despertar interesse** —
mostrar o estoque em tempo real (e depois a fila) funcionando, no momento certo,
com a demo sólida; e conversar sobre o SOS, que é terreno dele. Com o interesse
aceso, as respostas de campo vêm naturais, porque ele passa a ajudar a construir
algo que quer.
