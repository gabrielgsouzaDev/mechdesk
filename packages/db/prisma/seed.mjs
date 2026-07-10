// Seed mínimo: um admin e algumas peças.
//   node prisma/seed.mjs  (com DATABASE_URL/DIRECT_URL no ambiente)
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.funcionario.upsert({
    where: { cpf: "00000000000" },
    update: {},
    create: { nome: "Administrador", cpf: "00000000000", cargo: "Proprietário" },
  });

  const pecas = [
    { sku: "PAT-001", descricao: "Patinho de freio caminhão", precoCusto: 45, precoVenda: 89.9, estoqueAtual: 24, estoqueMinimo: 10 },
    { sku: "LON-002", descricao: "Lona de freio dianteira", precoCusto: 60, precoVenda: 120, estoqueAtual: 8, estoqueMinimo: 6 },
    { sku: "FLU-003", descricao: "Fluido de freio DOT4 (L)", precoCusto: 18, precoVenda: 39.9, estoqueAtual: 5, estoqueMinimo: 8 },
  ];

  for (const p of pecas) {
    await prisma.produto.upsert({
      where: { sku: p.sku },
      update: {},
      create: { ...p, controle: "RIGIDO", unidade: "UN", localizacao: "A-01" },
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
