import { beforeEach, describe, expect, test, vi } from "vitest";
import { BadRequestException } from "@nestjs/common";
import type { PrismaService } from "../prisma/prisma.service";
import { PermissoesService } from "./permissoes.service";

// ── RBAC dinâmico: a matriz mora no banco, POR TENANT ─────────────
// Contratos cobertos aqui:
//   1. Sem linhas no banco (seed não rodou / oficina nova) → matriz padrão
//      (idêntica ao comportamento hardcoded anterior: sem regressão).
//   2. Linha do banco SOBREPÕE o padrão (é o que a tela Admin edita).
//   3. CROSS-TENANT: a decisão de um tenant nunca lê linhas de outro.
//   4. Anti-lockout: recurso "admin" é imutável (sempre e somente ADMIN),
//      mesmo que o banco diga o contrário.
//   5. Cache curto: decisões repetidas não marretam o banco.

type LinhaPermissao = {
  tenantId: string;
  papel: string;
  recurso: string;
  acao: string;
  permitido: boolean;
};

function prismaComLinhas(linhas: LinhaPermissao[]) {
  const findMany = vi.fn(async (args: { where: { tenantId: string; papel: string } }) =>
    linhas.filter((l) => l.tenantId === args.where.tenantId && l.papel === args.where.papel),
  );
  const upsert = vi.fn(async (args: unknown) => args);
  const createMany = vi.fn(async (args: unknown) => args);
  const $transaction = vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
    fn({ permissao: { upsert }, permissaoLog: { createMany } }),
  );
  const prisma = {
    permissao: { findMany },
    permissaoLog: { findMany: vi.fn().mockResolvedValue([]) },
    $transaction,
  } as unknown as PrismaService;
  return { prisma, findMany, upsert, createMany, $transaction };
}

describe("PermissoesService.pode — matriz padrão (tenant sem linhas)", () => {
  let service: PermissoesService;
  beforeEach(() => {
    service = new PermissoesService(prismaComLinhas([]).prisma);
  });

  test("ADMIN pode tudo por padrão", async () => {
    await expect(service.pode("t1", "ADMIN", "funcionarios", "EXCLUIR")).resolves.toBe(true);
    await expect(service.pode("t1", "ADMIN", "movimentacao", "CRIAR")).resolves.toBe(true);
  });

  test("ALMOXARIFADO opera estoque e cadastros de apoio", async () => {
    await expect(service.pode("t1", "ALMOXARIFADO", "movimentacao", "CRIAR")).resolves.toBe(true);
    await expect(service.pode("t1", "ALMOXARIFADO", "produtos", "EDITAR")).resolves.toBe(true);
  });

  test("ALMOXARIFADO não gerencia funcionários (sem regressão do RBAC anterior)", async () => {
    await expect(service.pode("t1", "ALMOXARIFADO", "funcionarios", "VER")).resolves.toBe(false);
    await expect(service.pode("t1", "ALMOXARIFADO", "funcionarios", "CRIAR")).resolves.toBe(false);
  });

  test("papel desconhecido não pode nada", async () => {
    await expect(service.pode("t1", "FATURAMENTO" as never, "produtos", "VER")).resolves.toBe(false);
  });
});

describe("PermissoesService.pode — override do banco (o que a tela Admin edita)", () => {
  test("linha do banco nega o que o padrão permitia", async () => {
    const { prisma } = prismaComLinhas([
      { tenantId: "t1", papel: "ALMOXARIFADO", recurso: "produtos", acao: "EXCLUIR", permitido: false },
    ]);
    const service = new PermissoesService(prisma);
    await expect(service.pode("t1", "ALMOXARIFADO", "produtos", "EXCLUIR")).resolves.toBe(false);
    // As demais ações do recurso continuam no padrão.
    await expect(service.pode("t1", "ALMOXARIFADO", "produtos", "VER")).resolves.toBe(true);
  });

  test("linha do banco concede o que o padrão negava", async () => {
    const { prisma } = prismaComLinhas([
      { tenantId: "t1", papel: "ALMOXARIFADO", recurso: "funcionarios", acao: "VER", permitido: true },
    ]);
    const service = new PermissoesService(prisma);
    await expect(service.pode("t1", "ALMOXARIFADO", "funcionarios", "VER")).resolves.toBe(true);
  });
});

describe("PermissoesService — isolamento por tenant", () => {
  test("CROSS-OVER: override do tenant B não vaza para a decisão do tenant A", async () => {
    const { prisma, findMany } = prismaComLinhas([
      { tenantId: "t-b", papel: "ALMOXARIFADO", recurso: "produtos", acao: "VER", permitido: false },
    ]);
    const service = new PermissoesService(prisma);
    // t-a não tem linhas → padrão (permitido); a linha de t-b não interfere.
    await expect(service.pode("t-a", "ALMOXARIFADO", "produtos", "VER")).resolves.toBe(true);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tenantId: "t-a" }) }),
    );
  });
});

describe("PermissoesService — anti-lockout do recurso admin", () => {
  test("banco dizendo que ALMOXARIFADO pode 'admin' é IGNORADO", async () => {
    const { prisma } = prismaComLinhas([
      { tenantId: "t1", papel: "ALMOXARIFADO", recurso: "admin", acao: "VER", permitido: true },
    ]);
    const service = new PermissoesService(prisma);
    await expect(service.pode("t1", "ALMOXARIFADO", "admin", "VER")).resolves.toBe(false);
  });

  test("banco dizendo que ADMIN não pode 'admin' é IGNORADO", async () => {
    const { prisma } = prismaComLinhas([
      { tenantId: "t1", papel: "ADMIN", recurso: "admin", acao: "VER", permitido: false },
    ]);
    const service = new PermissoesService(prisma);
    await expect(service.pode("t1", "ADMIN", "admin", "VER")).resolves.toBe(true);
  });

  test("atualizar recusa alterações no recurso travado", async () => {
    const { prisma, upsert } = prismaComLinhas([]);
    const service = new PermissoesService(prisma);
    await expect(
      service.atualizar("t1", "u1", [
        { papel: "ALMOXARIFADO", recurso: "admin", acao: "VER", permitido: true },
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(upsert).not.toHaveBeenCalled();
  });
});

describe("PermissoesService — cache curto por tenant+papel", () => {
  test("decisões repetidas usam 1 consulta; invalidar(tenant) força releitura", async () => {
    const { prisma, findMany } = prismaComLinhas([]);
    const service = new PermissoesService(prisma);
    await service.pode("t1", "ALMOXARIFADO", "produtos", "VER");
    await service.pode("t1", "ALMOXARIFADO", "clientes", "CRIAR");
    expect(findMany).toHaveBeenCalledTimes(1);
    service.invalidar("t1");
    await service.pode("t1", "ALMOXARIFADO", "produtos", "VER");
    expect(findMany).toHaveBeenCalledTimes(2);
  });
});

describe("PermissoesService.atualizar — gravação com auditoria", () => {
  test("upserts escopados pelo tenant + log insert-only na MESMA transação", async () => {
    const { prisma, upsert, createMany, $transaction } = prismaComLinhas([]);
    const service = new PermissoesService(prisma);
    const alteracoes = [
      { papel: "ALMOXARIFADO", recurso: "produtos", acao: "EXCLUIR", permitido: false } as const,
      { papel: "ALMOXARIFADO", recurso: "veiculos", acao: "CRIAR", permitido: false } as const,
    ];
    const r = await service.atualizar("t1", "u-admin", [...alteracoes]);
    expect(r).toEqual({ alteradas: 2 });
    expect($transaction).toHaveBeenCalledOnce();
    expect(upsert).toHaveBeenCalledTimes(2);
    // Toda escrita carrega o tenant do chamador.
    for (const chamada of upsert.mock.calls) {
      expect(JSON.stringify(chamada[0])).toContain("t1");
    }
    // Auditoria: uma linha de log por alteração, com o autor.
    const log = createMany.mock.calls[0][0] as { data: Array<Record<string, unknown>> };
    expect(log.data).toHaveLength(2);
    expect(log.data[0]).toMatchObject({ tenantId: "t1", usuarioId: "u-admin" });
  });

  test("recurso ou ação fora do vocabulário → BadRequest (nada gravado)", async () => {
    const { prisma, upsert } = prismaComLinhas([]);
    const service = new PermissoesService(prisma);
    await expect(
      service.atualizar("t1", "u1", [
        { papel: "ALMOXARIFADO", recurso: "financeiro" as never, acao: "VER", permitido: true },
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(upsert).not.toHaveBeenCalled();
  });
});

describe("PermissoesService.mapaDoPapel — contrato do GET /me", () => {
  test("mapa completo: padrão + overrides do banco + trava do admin", async () => {
    const { prisma } = prismaComLinhas([
      { tenantId: "t1", papel: "ALMOXARIFADO", recurso: "produtos", acao: "EXCLUIR", permitido: false },
      { tenantId: "t1", papel: "ALMOXARIFADO", recurso: "admin", acao: "VER", permitido: true }, // ignorada
    ]);
    const service = new PermissoesService(prisma);
    const mapa = await service.mapaDoPapel("t1", "ALMOXARIFADO");
    expect(mapa.produtos.EXCLUIR).toBe(false); // override
    expect(mapa.produtos.VER).toBe(true); // padrão
    expect(mapa.funcionarios.VER).toBe(false); // padrão
    expect(mapa.admin.VER).toBe(false); // trava ignora o banco
  });
});
