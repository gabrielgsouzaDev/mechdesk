// Seed mínimo: tenant padrão, um admin e algumas peças.
//   node prisma/seed.mjs  (com DATABASE_URL/DIRECT_URL no ambiente)
// Multi-tenant: TODO registro semeado pertence ao tenant 'default'
// (a oficina fundadora). Uniques de negócio são compostos por tenant.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TENANT = "default";

async function main() {
  await prisma.tenant.upsert({
    where: { id: TENANT },
    update: {},
    create: { id: TENANT, nome: "Luciano Freios" },
  });

  await prisma.configuracao.upsert({
    where: { tenantId: TENANT },
    update: {},
    create: { tenantId: TENANT, prazoEmprestimoHoras: 24 },
  });

  await prisma.funcionario.upsert({
    where: { tenantId_cpf: { tenantId: TENANT, cpf: "00000000000" } },
    update: {},
    create: { tenantId: TENANT, nome: "Administrador", cpf: "00000000000", cargo: "Proprietário" },
  });

  // Matriz de permissões vigente (Etapa 5b) — espelha a MATRIZ_PADRAO da API.
  // createMany + skipDuplicates: idempotente sem apagar ajustes do Admin.
  // O recurso "admin" não é semeado: trava anti-lockout vive na API.
  const RECURSOS = ["movimentacao", "historico", "pendencias", "produtos", "clientes", "veiculos", "funcionarios"];
  const ACOES = ["VER", "CRIAR", "EDITAR", "EXCLUIR"];
  const permitidoPara = (papel, recurso) =>
    papel === "ADMIN" ? true : recurso !== "funcionarios";
  await prisma.permissao.createMany({
    data: ["ADMIN", "ALMOXARIFADO"].flatMap((papel) =>
      RECURSOS.flatMap((recurso) =>
        ACOES.map((acao) => ({
          tenantId: TENANT,
          papel,
          recurso,
          acao,
          permitido: permitidoPara(papel, recurso),
        })),
      ),
    ),
    skipDuplicates: true,
  });

  const pecas = [
    { sku: "PAT-001", descricao: "Patinho de freio caminhão", precoCusto: 45, precoVenda: 89.9, estoqueAtual: 24, estoqueMinimo: 10 },
    { sku: "LON-002", descricao: "Lona de freio dianteira", precoCusto: 60, precoVenda: 120, estoqueAtual: 8, estoqueMinimo: 6 },
    { sku: "FLU-003", descricao: "Fluido de freio DOT4 (L)", precoCusto: 18, precoVenda: 39.9, estoqueAtual: 5, estoqueMinimo: 8 },
  ];

  for (const p of pecas) {
    await prisma.produto.upsert({
      where: { tenantId_sku: { tenantId: TENANT, sku: p.sku } },
      update: {},
      create: { ...p, tenantId: TENANT, controle: "RIGIDO", unidade: "UN", localizacao: "A-01" },
    });
  }

  console.log("✔ Seed concluído.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
