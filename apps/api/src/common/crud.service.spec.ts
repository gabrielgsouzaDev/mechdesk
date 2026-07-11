import { describe, expect, test, vi } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { CrudService } from "./crud.service";

// ── Simulação de ataque Tenant Cross-Over ─────────────────────────
// O banco de mentira abaixo emula o comportamento do Prisma sobre um
// conjunto de linhas de DOIS tenants. Cada teste encena o inquilino A
// tentando ler/alterar/excluir dados do inquilino B: o contrato do
// CrudService é que NENHUMA operação escape do tenantId do chamador.

type Linha = Record<string, unknown>;

function casa(where: Linha) {
  return (linha: Linha) => Object.entries(where).every(([k, v]) => linha[k] === v);
}

function delegateSobre(linhas: Linha[]) {
  return {
    findMany: vi.fn(async (args?: { where?: Linha }) =>
      linhas.filter(casa(args?.where ?? {})),
    ),
    findFirst: vi.fn(async (args: { where: Linha }) =>
      linhas.find(casa(args.where)) ?? null,
    ),
    create: vi.fn(async (args: { data: Linha }) => {
      linhas.push(args.data);
      return args.data;
    }),
    updateMany: vi.fn(async (args: { where: Linha; data: Linha }) => {
      const alvo = linhas.filter(casa(args.where));
      for (const linha of alvo) Object.assign(linha, args.data);
      return { count: alvo.length };
    }),
    deleteMany: vi.fn(async (args: { where: Linha }) => {
      const sobram = linhas.filter((l) => !casa(args.where)(l));
      const removidas = linhas.length - sobram.length;
      linhas.splice(0, linhas.length, ...sobram);
      return { count: removidas };
    }),
  };
}

function cenario() {
  const linhas: Linha[] = [
    { id: "prod-a", tenantId: "oficina-a", sku: "SKU-A", descricao: "Peça da oficina A" },
    { id: "prod-b", tenantId: "oficina-b", sku: "SKU-B", descricao: "Peça da oficina B" },
  ];
  const delegate = delegateSobre(linhas);
  const service = new CrudService<Linha>(delegate as never, { descricao: "asc" });
  return { linhas, delegate, service };
}

describe("CrudService — isolamento por tenant", () => {
  test("list devolve apenas as linhas do tenant do chamador", async () => {
    const { service } = cenario();
    const doA = await service.list("oficina-a");
    expect(doA).toHaveLength(1);
    expect(doA[0].id).toBe("prod-a");
  });

  test("list preserva orderBy/include e injeta o where do tenant", async () => {
    const { service, delegate } = cenario();
    await service.list("oficina-a");
    expect(delegate.findMany).toHaveBeenCalledWith({
      where: { tenantId: "oficina-a" },
      orderBy: { descricao: "asc" },
      include: undefined,
    });
  });

  test("get dentro do tenant encontra a linha", async () => {
    const { service } = cenario();
    const linha = await service.get("oficina-a", "prod-a");
    expect(linha?.sku).toBe("SKU-A");
  });

  test("CROSS-OVER: get de id de outro tenant devolve null (indistinguível de inexistente)", async () => {
    const { service } = cenario();
    expect(await service.get("oficina-a", "prod-b")).toBeNull();
  });

  test("create injeta o tenant do chamador", async () => {
    const { service, linhas } = cenario();
    await service.create("oficina-a", { id: "prod-novo", sku: "SKU-N" });
    const criada = linhas.find((l) => l.id === "prod-novo");
    expect(criada?.tenantId).toBe("oficina-a");
  });

  test("CROSS-OVER: payload forjando tenantId de outro tenant é sobrescrito pelo do chamador", async () => {
    const { service, linhas } = cenario();
    await service.create("oficina-a", { id: "prod-forjado", tenantId: "oficina-b" });
    const criada = linhas.find((l) => l.id === "prod-forjado");
    expect(criada?.tenantId).toBe("oficina-a");
  });

  test("update dentro do tenant altera e devolve a linha atualizada", async () => {
    const { service } = cenario();
    const linha = await service.update("oficina-a", "prod-a", { descricao: "Atualizada" });
    expect(linha?.descricao).toBe("Atualizada");
  });

  test("CROSS-OVER: update em id de outro tenant lança NotFound e não altera nada", async () => {
    const { service, linhas } = cenario();
    await expect(
      service.update("oficina-a", "prod-b", { descricao: "hackeada" }),
    ).rejects.toBeInstanceOf(NotFoundException);
    const deB = linhas.find((l) => l.id === "prod-b");
    expect(deB?.descricao).toBe("Peça da oficina B");
  });

  test("remove dentro do tenant exclui a linha", async () => {
    const { service, linhas } = cenario();
    await service.remove("oficina-a", "prod-a");
    expect(linhas.find((l) => l.id === "prod-a")).toBeUndefined();
  });

  test("CROSS-OVER: remove em id de outro tenant lança NotFound e a linha sobrevive", async () => {
    const { service, linhas } = cenario();
    await expect(service.remove("oficina-a", "prod-b")).rejects.toBeInstanceOf(NotFoundException);
    expect(linhas.find((l) => l.id === "prod-b")).toBeDefined();
  });

  test("tenants diferentes enxergam catálogos disjuntos (nenhuma linha compartilhada)", async () => {
    const { service } = cenario();
    const doA = (await service.list("oficina-a")).map((l) => l.id);
    const doB = (await service.list("oficina-b")).map((l) => l.id);
    expect(doA.filter((id) => doB.includes(id))).toHaveLength(0);
  });
});
