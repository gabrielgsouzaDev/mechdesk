-- Etapa 5b (RBAC dinâmico): a matriz papel × recurso × ação vira dado por
-- tenant. Duas tabelas:
--   permissoes     → estado vigente (upsert pela tela Admin)
--   permissoes_log → auditoria INSERT-ONLY (mesmo espírito do ledger)
-- O seed abaixo reproduz a matriz hardcoded anterior para o tenant 'default'
-- (migração sem regressão). O recurso "admin" NÃO é semeado nem configurável:
-- a API impõe a trava anti-lockout (sempre e somente ADMIN).

CREATE TYPE "AcaoPermissao" AS ENUM ('VER', 'CRIAR', 'EDITAR', 'EXCLUIR');

CREATE TABLE "permissoes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default',
    "papel" "PapelUsuario" NOT NULL,
    "recurso" TEXT NOT NULL,
    "acao" "AcaoPermissao" NOT NULL,
    "permitido" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "permissoes_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "permissoes" ADD CONSTRAINT "permissoes_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "permissoes_tenantId_papel_recurso_acao_key"
  ON "permissoes"("tenantId", "papel", "recurso", "acao");
CREATE INDEX "permissoes_tenantId_papel_idx" ON "permissoes"("tenantId", "papel");

CREATE TABLE "permissoes_log" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default',
    "papel" "PapelUsuario" NOT NULL,
    "recurso" TEXT NOT NULL,
    "acao" "AcaoPermissao" NOT NULL,
    "permitido" BOOLEAN NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "permissoes_log_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "permissoes_log" ADD CONSTRAINT "permissoes_log_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "permissoes_log" ADD CONSTRAINT "permissoes_log_usuarioId_fkey"
  FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "permissoes_log_tenantId_criadoEm_idx" ON "permissoes_log"("tenantId", "criadoEm");

-- ── Seed da matriz vigente (tenant 'default') ─────────────────────
-- ADMIN: tudo permitido em todos os recursos configuráveis.
INSERT INTO "permissoes" ("id", "tenantId", "papel", "recurso", "acao", "permitido")
SELECT gen_random_uuid()::text, 'default', 'ADMIN'::"PapelUsuario", r.recurso, a.acao::"AcaoPermissao", true
FROM unnest(ARRAY['movimentacao','historico','pendencias','produtos','clientes','veiculos','funcionarios']) AS r(recurso),
     unnest(ARRAY['VER','CRIAR','EDITAR','EXCLUIR']) AS a(acao);

-- ALMOXARIFADO: operação e cadastros de apoio liberados…
INSERT INTO "permissoes" ("id", "tenantId", "papel", "recurso", "acao", "permitido")
SELECT gen_random_uuid()::text, 'default', 'ALMOXARIFADO'::"PapelUsuario", r.recurso, a.acao::"AcaoPermissao", true
FROM unnest(ARRAY['movimentacao','historico','pendencias','produtos','clientes','veiculos']) AS r(recurso),
     unnest(ARRAY['VER','CRIAR','EDITAR','EXCLUIR']) AS a(acao);

-- …e a TELA de funcionários negada (dados pessoais são do dono). A listagem
-- de apoio da API (pra quem se empresta ferramenta) é estática via @Roles.
INSERT INTO "permissoes" ("id", "tenantId", "papel", "recurso", "acao", "permitido")
SELECT gen_random_uuid()::text, 'default', 'ALMOXARIFADO'::"PapelUsuario", 'funcionarios', a.acao::"AcaoPermissao", false
FROM unnest(ARRAY['VER','CRIAR','EDITAR','EXCLUIR']) AS a(acao);
