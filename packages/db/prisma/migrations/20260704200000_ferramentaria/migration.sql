-- Etapa 3 (Ferramentaria): categoria PECA/FERRAMENTA + empréstimo/devolução.
-- ALTER TYPE ... ADD VALUE não pode ser usado na MESMA transação em que o
-- valor novo é referenciado — esta migração só adiciona os valores; nada
-- aqui grava linhas com 'EMPRESTIMO'/'DEVOLUCAO' (isso é feito pela RPC,
-- aplicada depois, em outra conexão/transação via `npm run sql`).

-- 1) Categoria do produto: peça consumível ou ferramenta retornável
CREATE TYPE "CategoriaProduto" AS ENUM ('PECA', 'FERRAMENTA');
ALTER TABLE "produtos" ADD COLUMN "categoria" "CategoriaProduto" NOT NULL DEFAULT 'PECA';
CREATE INDEX "produtos_categoria_idx" ON "produtos"("categoria");

-- 2) Novos tipos de movimento no ledger (auditam o ciclo de vida do empréstimo)
ALTER TYPE "TipoMovimentacao" ADD VALUE 'EMPRESTIMO';
ALTER TYPE "TipoMovimentacao" ADD VALUE 'DEVOLUCAO';

-- 3) Pendências de ferramenta emprestada
CREATE TYPE "StatusEmprestimo" AS ENUM ('ABERTO', 'DEVOLVIDO', 'PERDIDO');

CREATE TABLE "emprestimos" (
    "id" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "funcionarioId" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "status" "StatusEmprestimo" NOT NULL DEFAULT 'ABERTO',
    "retiradoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prazoEm" TIMESTAMP(3) NOT NULL,
    "devolvidoEm" TIMESTAMP(3),
    "usuarioRetiradaId" TEXT NOT NULL,
    "usuarioFechamentoId" TEXT,
    "motivo" TEXT,
    "motivoFechamento" TEXT,
    CONSTRAINT "emprestimos_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "emprestimos" ADD CONSTRAINT "emprestimos_produtoId_fkey"
  FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "emprestimos" ADD CONSTRAINT "emprestimos_funcionarioId_fkey"
  FOREIGN KEY ("funcionarioId") REFERENCES "funcionarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "emprestimos" ADD CONSTRAINT "emprestimos_usuarioRetiradaId_fkey"
  FOREIGN KEY ("usuarioRetiradaId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "emprestimos" ADD CONSTRAINT "emprestimos_usuarioFechamentoId_fkey"
  FOREIGN KEY ("usuarioFechamentoId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "emprestimos_status_idx" ON "emprestimos"("status");
CREATE INDEX "emprestimos_produtoId_idx" ON "emprestimos"("produtoId");
CREATE INDEX "emprestimos_funcionarioId_idx" ON "emprestimos"("funcionarioId");

-- 4) Ledger passa a poder referenciar o empréstimo (EMPRESTIMO/DEVOLUCAO e a SAIDA de uma perda)
ALTER TABLE "movimentacoes_estoque" ADD COLUMN "emprestimoId" TEXT;
ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_emprestimoId_fkey"
  FOREIGN KEY ("emprestimoId") REFERENCES "emprestimos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 5) Prazo padrão de devolução, configurável pelo Admin (linha única)
CREATE TABLE "configuracoes" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "prazoEmprestimoHoras" INTEGER NOT NULL DEFAULT 24,
    CONSTRAINT "configuracoes_pkey" PRIMARY KEY ("id")
);
INSERT INTO "configuracoes" ("id") VALUES ('default');
