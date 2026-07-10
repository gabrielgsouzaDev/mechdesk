-- CreateEnum
CREATE TYPE "PapelFuncionario" AS ENUM ('MECANICO', 'ALMOXARIFE', 'FATURAMENTO', 'ADMIN');

-- CreateEnum
CREATE TYPE "TipoPessoa" AS ENUM ('PF', 'PJ');

-- CreateEnum
CREATE TYPE "TipoControleEstoque" AS ENUM ('RIGIDO', 'ESTOQUE_CHAO');

-- CreateEnum
CREATE TYPE "TipoMovimentacao" AS ENUM ('ENTRADA', 'SAIDA', 'AJUSTE');

-- CreateEnum
CREATE TYPE "StatusOS" AS ENUM ('RECEBIDO', 'DIAGNOSTICO', 'AGUARDANDO_PECA', 'EXECUCAO', 'PRONTO', 'FATURADO');

-- CreateEnum
CREATE TYPE "TipoItemOS" AS ENUM ('PECA', 'MAO_DE_OBRA');

-- CreateTable
CREATE TABLE "funcionarios" (
    "id" TEXT NOT NULL,
    "authUserId" TEXT,
    "nome" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "email" TEXT,
    "papel" "PapelFuncionario" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "funcionarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "tipo" "TipoPessoa" NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "nomeFantasia" TEXT,
    "cnpjCpf" TEXT NOT NULL,
    "inscEstadual" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "logradouro" TEXT,
    "numero" TEXT,
    "bairro" TEXT,
    "municipio" TEXT,
    "uf" CHAR(2),
    "cep" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "veiculos" (
    "id" TEXT NOT NULL,
    "placa" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "marca" TEXT,
    "anoFab" INTEGER,
    "chassi" TEXT,
    "renavam" TEXT,
    "tipo" TEXT,
    "kmAtual" INTEGER,
    "clienteId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "veiculos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locais_estoque" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "reconciliavel" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "locais_estoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produtos" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "ncm" TEXT,
    "unidade" TEXT NOT NULL DEFAULT 'UN',
    "precoCusto" DECIMAL(12,2) NOT NULL,
    "precoVenda" DECIMAL(12,2) NOT NULL,
    "controle" "TipoControleEstoque" NOT NULL DEFAULT 'RIGIDO',
    "estoqueAtual" INTEGER NOT NULL DEFAULT 0,
    "estoqueMinimo" INTEGER NOT NULL DEFAULT 0,
    "localizacao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "produtos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimentacoes_estoque" (
    "id" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "tipo" "TipoMovimentacao" NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "saldoApos" INTEGER NOT NULL,
    "funcionarioId" TEXT NOT NULL,
    "ordemServicoId" TEXT,
    "motivo" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimentacoes_estoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordens_servico" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "clienteId" TEXT NOT NULL,
    "veiculoId" TEXT NOT NULL,
    "mecanicoId" TEXT,
    "status" "StatusOS" NOT NULL DEFAULT 'RECEBIDO',
    "kmEntrada" INTEGER,
    "descricaoProblema" TEXT,
    "abertaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "concluidaEm" TIMESTAMP(3),

    CONSTRAINT "ordens_servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_ordem_servico" (
    "id" TEXT NOT NULL,
    "ordemServicoId" TEXT NOT NULL,
    "tipo" "TipoItemOS" NOT NULL,
    "produtoId" TEXT,
    "descricao" TEXT NOT NULL,
    "quantidade" DECIMAL(10,2) NOT NULL,
    "executorId" TEXT,

    CONSTRAINT "itens_ordem_servico_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "funcionarios_authUserId_key" ON "funcionarios"("authUserId");

-- CreateIndex
CREATE UNIQUE INDEX "funcionarios_cpf_key" ON "funcionarios"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "funcionarios_email_key" ON "funcionarios"("email");

-- CreateIndex
CREATE INDEX "funcionarios_papel_ativo_idx" ON "funcionarios"("papel", "ativo");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_cnpjCpf_key" ON "clientes"("cnpjCpf");

-- CreateIndex
CREATE INDEX "clientes_razaoSocial_idx" ON "clientes"("razaoSocial");

-- CreateIndex
CREATE UNIQUE INDEX "veiculos_placa_key" ON "veiculos"("placa");

-- CreateIndex
CREATE UNIQUE INDEX "veiculos_chassi_key" ON "veiculos"("chassi");

-- CreateIndex
CREATE INDEX "veiculos_clienteId_idx" ON "veiculos"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "locais_estoque_nome_key" ON "locais_estoque"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "produtos_sku_key" ON "produtos"("sku");

-- CreateIndex
CREATE INDEX "produtos_descricao_idx" ON "produtos"("descricao");

-- CreateIndex
CREATE INDEX "produtos_estoqueAtual_estoqueMinimo_idx" ON "produtos"("estoqueAtual", "estoqueMinimo");

-- CreateIndex
CREATE INDEX "movimentacoes_estoque_produtoId_criadoEm_idx" ON "movimentacoes_estoque"("produtoId", "criadoEm");

-- CreateIndex
CREATE INDEX "movimentacoes_estoque_tipo_criadoEm_idx" ON "movimentacoes_estoque"("tipo", "criadoEm");

-- CreateIndex
CREATE UNIQUE INDEX "ordens_servico_numero_key" ON "ordens_servico"("numero");

-- CreateIndex
CREATE INDEX "ordens_servico_status_idx" ON "ordens_servico"("status");

-- CreateIndex
CREATE INDEX "ordens_servico_clienteId_idx" ON "ordens_servico"("clienteId");

-- CreateIndex
CREATE INDEX "itens_ordem_servico_ordemServicoId_idx" ON "itens_ordem_servico"("ordemServicoId");

-- AddForeignKey
ALTER TABLE "veiculos" ADD CONSTRAINT "veiculos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "funcionarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_ordemServicoId_fkey" FOREIGN KEY ("ordemServicoId") REFERENCES "ordens_servico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "veiculos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_mecanicoId_fkey" FOREIGN KEY ("mecanicoId") REFERENCES "funcionarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_ordem_servico" ADD CONSTRAINT "itens_ordem_servico_ordemServicoId_fkey" FOREIGN KEY ("ordemServicoId") REFERENCES "ordens_servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_ordem_servico" ADD CONSTRAINT "itens_ordem_servico_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_ordem_servico" ADD CONSTRAINT "itens_ordem_servico_executorId_fkey" FOREIGN KEY ("executorId") REFERENCES "funcionarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
