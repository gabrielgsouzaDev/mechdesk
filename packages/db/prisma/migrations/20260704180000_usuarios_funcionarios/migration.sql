-- Etapa 2 (Identidade): separa USUÁRIO (quem loga) de FUNCIONÁRIO (quem trabalha).
-- Migração com preservação de dados: usuários nascem dos funcionários que tinham
-- login, e o ledger é re-apontado para eles antes de qualquer DROP.

-- 1) Papel de acesso novo (só quem loga tem papel)
CREATE TYPE "PapelUsuario" AS ENUM ('ADMIN', 'ALMOXARIFADO');

-- 2) Tabela de usuários
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "authUserId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT,
    "papel" "PapelUsuario" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "funcionarioId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "usuarios_authUserId_key" ON "usuarios"("authUserId");
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");
CREATE UNIQUE INDEX "usuarios_funcionarioId_key" ON "usuarios"("funcionarioId");
CREATE INDEX "usuarios_papel_ativo_idx" ON "usuarios"("papel", "ativo");
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_funcionarioId_fkey"
  FOREIGN KEY ("funcionarioId") REFERENCES "funcionarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 3) Cria usuários a partir dos funcionários que tinham login
INSERT INTO "usuarios" ("id", "authUserId", "nome", "email", "papel", "ativo", "funcionarioId", "criadoEm")
SELECT gen_random_uuid()::text,
       f."authUserId",
       f."nome",
       f."email",
       CASE f."papel"::text WHEN 'ADMIN' THEN 'ADMIN'::"PapelUsuario" ELSE 'ALMOXARIFADO'::"PapelUsuario" END,
       f."ativo",
       f."id",
       now()
FROM "funcionarios" f
WHERE f."authUserId" IS NOT NULL;

-- 4) Ledger passa a apontar para o usuário (re-mapeia ANTES de dropar a coluna antiga)
ALTER TABLE "movimentacoes_estoque" ADD COLUMN "usuarioId" TEXT;
UPDATE "movimentacoes_estoque" m
   SET "usuarioId" = u."id"
  FROM "usuarios" u
 WHERE u."funcionarioId" = m."funcionarioId";
ALTER TABLE "movimentacoes_estoque" ALTER COLUMN "usuarioId" SET NOT NULL;
ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_usuarioId_fkey"
  FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "movimentacoes_estoque" DROP COLUMN "funcionarioId";

-- 5) Funcionário vira pessoa/equipe: cargo em texto, sem login e sem papel de acesso
ALTER TABLE "funcionarios" ADD COLUMN "cargo" TEXT;
UPDATE "funcionarios" SET "cargo" =
  CASE "papel"::text
    WHEN 'ADMIN' THEN 'Proprietário'
    WHEN 'ALMOXARIFE' THEN 'Almoxarife'
    WHEN 'FATURAMENTO' THEN 'Faturamento'
    ELSE 'Mecânico'
  END;
DROP INDEX IF EXISTS "funcionarios_papel_ativo_idx";
DROP INDEX IF EXISTS "funcionarios_email_key";
DROP INDEX IF EXISTS "funcionarios_authUserId_key";
ALTER TABLE "funcionarios" DROP COLUMN "papel";
ALTER TABLE "funcionarios" DROP COLUMN "authUserId";
CREATE INDEX "funcionarios_ativo_idx" ON "funcionarios"("ativo");

-- 6) Enum antigo sai de cena
DROP TYPE "PapelFuncionario";
