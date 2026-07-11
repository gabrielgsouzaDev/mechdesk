-- Etapa 5 (Multi-tenant nativo): todo dado operacional passa a ter dono.
-- Estratégia de migração SEM downtime e SEM quebra de comportamento:
--   1. Nasce a tabela `tenants` com a linha 'default' (a oficina atual).
--   2. Cada tabela ganha "tenantId" NOT NULL DEFAULT 'default' — o DEFAULT
--      faz o backfill de todas as linhas existentes na própria DDL.
--   3. Unicidade de negócio (sku, cpf, cnpj, placa, chassi, e-mail, nº de OS)
--      deixa de ser global e vira composta por tenant.
--   4. `configuracoes` deixa de ser linha única global: a PK passa a ser o
--      próprio tenantId (a linha 'default' é a configuração da oficina atual).
-- `authUserId` de usuarios segue ÚNICO GLOBAL: é a âncora que resolve
-- (conta de login) → (usuário, tenant) no AuthGuard.

-- 1) Tenants ------------------------------------------------------
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

INSERT INTO "tenants" ("id", "nome") VALUES ('default', 'Luciano Freios');

-- 2) tenantId em todas as tabelas operacionais --------------------
ALTER TABLE "usuarios"              ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "funcionarios"          ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "clientes"              ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "veiculos"              ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "produtos"              ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "movimentacoes_estoque" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "emprestimos"           ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "ordens_servico"        ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "itens_ordem_servico"   ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default';

-- configuracoes: a coluna id (valor 'default') VIRA o tenantId — preserva a
-- linha existente e o DEFAULT, só muda o significado para "uma linha por oficina".
ALTER TABLE "configuracoes" RENAME COLUMN "id" TO "tenantId";

-- 3) Chaves estrangeiras para tenants ------------------------------
ALTER TABLE "usuarios"              ADD CONSTRAINT "usuarios_tenantId_fkey"              FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "funcionarios"          ADD CONSTRAINT "funcionarios_tenantId_fkey"          FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "clientes"              ADD CONSTRAINT "clientes_tenantId_fkey"              FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "veiculos"              ADD CONSTRAINT "veiculos_tenantId_fkey"              FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "produtos"              ADD CONSTRAINT "produtos_tenantId_fkey"              FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "emprestimos"           ADD CONSTRAINT "emprestimos_tenantId_fkey"           FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "configuracoes"         ADD CONSTRAINT "configuracoes_tenantId_fkey"         FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ordens_servico"        ADD CONSTRAINT "ordens_servico_tenantId_fkey"        FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "itens_ordem_servico"   ADD CONSTRAINT "itens_ordem_servico_tenantId_fkey"   FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 4) Unicidade global → composta por tenant ------------------------
DROP INDEX "usuarios_email_key";
CREATE UNIQUE INDEX "usuarios_tenantId_email_key" ON "usuarios"("tenantId", "email");

DROP INDEX "funcionarios_cpf_key";
CREATE UNIQUE INDEX "funcionarios_tenantId_cpf_key" ON "funcionarios"("tenantId", "cpf");

DROP INDEX "clientes_cnpjCpf_key";
CREATE UNIQUE INDEX "clientes_tenantId_cnpjCpf_key" ON "clientes"("tenantId", "cnpjCpf");

DROP INDEX "veiculos_placa_key";
CREATE UNIQUE INDEX "veiculos_tenantId_placa_key" ON "veiculos"("tenantId", "placa");

DROP INDEX "veiculos_chassi_key";
CREATE UNIQUE INDEX "veiculos_tenantId_chassi_key" ON "veiculos"("tenantId", "chassi");

DROP INDEX "produtos_sku_key";
CREATE UNIQUE INDEX "produtos_tenantId_sku_key" ON "produtos"("tenantId", "sku");

DROP INDEX "ordens_servico_numero_key";
CREATE UNIQUE INDEX "ordens_servico_tenantId_numero_key" ON "ordens_servico"("tenantId", "numero");

-- 5) Índices de varredura por tenant --------------------------------
CREATE INDEX "usuarios_tenantId_idx"                       ON "usuarios"("tenantId");
CREATE INDEX "funcionarios_tenantId_idx"                   ON "funcionarios"("tenantId");
CREATE INDEX "clientes_tenantId_idx"                       ON "clientes"("tenantId");
CREATE INDEX "veiculos_tenantId_idx"                       ON "veiculos"("tenantId");
CREATE INDEX "produtos_tenantId_idx"                       ON "produtos"("tenantId");
CREATE INDEX "movimentacoes_estoque_tenantId_criadoEm_idx" ON "movimentacoes_estoque"("tenantId", "criadoEm");
CREATE INDEX "emprestimos_tenantId_status_idx"             ON "emprestimos"("tenantId", "status");
CREATE INDEX "ordens_servico_tenantId_idx"                 ON "ordens_servico"("tenantId");
CREATE INDEX "itens_ordem_servico_tenantId_idx"            ON "itens_ordem_servico"("tenantId");
