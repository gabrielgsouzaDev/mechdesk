import { describe, expect, test, vi } from "vitest";
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import type { PrismaService } from "../prisma/prisma.service";
import { EstoqueService, traduzirErroRpc } from "./estoque.service";

// A RPC do Postgres sinaliza erros de domínio via `raise exception 'CODIGO'`.
// Este tradutor é a única fronteira entre o banco e o HTTP: cada código
// conhecido vira a exceção certa com mensagem PT-BR para a UI — e NUNCA
// vaza texto bruto do driver/banco para o cliente.
describe("traduzirErroRpc — códigos de domínio", () => {
  const casos: Array<{ codigo: string; excecao: unknown; mensagem: string }> = [
    { codigo: "ESTOQUE_INSUFICIENTE", excecao: ConflictException, mensagem: "Estoque insuficiente para esta saída." },
    { codigo: "FERRAMENTA_INDISPONIVEL", excecao: ConflictException, mensagem: "Não há unidades disponíveis desta ferramenta." },
    { codigo: "FERRAMENTA_EMPRESTADA", excecao: ConflictException, mensagem: "Há unidades emprestadas: registre a devolução (ou perda) antes de dar saída." },
    { codigo: "AJUSTE_ABAIXO_EMPRESTADO", excecao: ConflictException, mensagem: "O ajuste ficaria abaixo das unidades emprestadas. Feche as pendências antes." },
    { codigo: "PRODUTO_NAO_ENCONTRADO", excecao: NotFoundException, mensagem: "Produto não encontrado." },
    { codigo: "EMPRESTIMO_NAO_ENCONTRADO", excecao: NotFoundException, mensagem: "Empréstimo não encontrado ou já fechado." },
    { codigo: "CATEGORIA_INVALIDA", excecao: BadRequestException, mensagem: "Este produto não é uma ferramenta." },
    { codigo: "MOTIVO_OBRIGATORIO", excecao: BadRequestException, mensagem: "Informe o motivo da perda." },
    { codigo: "QUANTIDADE_INVALIDA", excecao: BadRequestException, mensagem: "Dados de movimentação inválidos." },
    { codigo: "TIPO_INVALIDO", excecao: BadRequestException, mensagem: "Dados de movimentação inválidos." },
  ];

  for (const { codigo, excecao, mensagem } of casos) {
    test(`${codigo} → ${(excecao as { name: string }).name} com mensagem PT-BR`, () => {
      // O driver embute o código no texto do erro do Postgres — simulamos o formato real.
      const errDoBanco = new Error(`db error: ERROR: ${codigo}\n    at Parser.parseErrorMessage`);
      let lancado: unknown;
      try {
        traduzirErroRpc(errDoBanco);
      } catch (e) {
        lancado = e;
      }
      expect(lancado).toBeInstanceOf(excecao);
      expect((lancado as Error).message).toBe(mensagem);
    });
  }

  test("mensagem HTTP não vaza o texto bruto do banco", () => {
    const errDoBanco = new Error("db error: ERROR: ESTOQUE_INSUFICIENTE at plpgsql line 42 SELECT registrar_movimentacao_estoque");
    let lancado: Error | undefined;
    try {
      traduzirErroRpc(errDoBanco);
    } catch (e) {
      lancado = e as Error;
    }
    expect(lancado?.message).not.toContain("plpgsql");
    expect(lancado?.message).not.toContain("SELECT");
    expect(lancado?.message).not.toContain("db error");
  });
});

describe("traduzirErroRpc — erros desconhecidos", () => {
  test("Error desconhecido é repassado como está (vira 500 no filtro global)", () => {
    const original = new Error("ECONNREFUSED 127.0.0.1:6543");
    let lancado: unknown;
    try {
      traduzirErroRpc(original);
    } catch (e) {
      lancado = e;
    }
    expect(lancado).toBe(original);
  });

  test("valor não-Error é embrulhado em Error", () => {
    let lancado: unknown;
    try {
      traduzirErroRpc("string solta do driver");
    } catch (e) {
      lancado = e;
    }
    expect(lancado).toBeInstanceOf(Error);
    expect((lancado as Error).message).toBe("string solta do driver");
  });

  test("nunca retorna normalmente (assinatura never)", () => {
    expect(() => traduzirErroRpc(new Error("qualquer"))).toThrow();
  });
});

// ── Fase D: robustez de produção (agora sob escopo de tenant) ─────

const TENANT = "oficina-a";
const CONFIG_PADRAO = { tenantId: TENANT, prazoEmprestimoHoras: 24 };

function servicoCom(prismaParcial: Record<string, unknown>): EstoqueService {
  return new EstoqueService(prismaParcial as unknown as PrismaService);
}

describe("getConfig — resiliente sem seed e por tenant", () => {
  test("tenant sem linha de configuração recebe o padrão de 24h (não 500)", async () => {
    const service = servicoCom({
      configuracao: { findUnique: vi.fn().mockResolvedValue(null) },
    });
    await expect(service.getConfig(TENANT)).resolves.toEqual(CONFIG_PADRAO);
  });

  test("com a linha no banco, devolve o registro persistido do tenant", async () => {
    const persistida = { tenantId: TENANT, prazoEmprestimoHoras: 48 };
    const findUnique = vi.fn().mockResolvedValue(persistida);
    const service = servicoCom({ configuracao: { findUnique } });
    await expect(service.getConfig(TENANT)).resolves.toEqual(persistida);
    expect(findUnique).toHaveBeenCalledWith({ where: { tenantId: TENANT } });
  });

  test("CROSS-OVER: a busca é sempre pela PK do tenant do chamador", async () => {
    const findUnique = vi.fn().mockResolvedValue(null);
    const service = servicoCom({ configuracao: { findUnique } });
    await service.getConfig("oficina-b");
    expect(findUnique).toHaveBeenCalledWith({ where: { tenantId: "oficina-b" } });
  });
});

describe("updateConfig — upsert escopado por tenant", () => {
  test("grava (ou cria) a linha do próprio tenant, nunca de outro", async () => {
    const upsert = vi.fn().mockResolvedValue({ tenantId: TENANT, prazoEmprestimoHoras: 48 });
    const service = servicoCom({ configuracao: { upsert } });
    await service.updateConfig(TENANT, { prazoEmprestimoHoras: 48 });
    expect(upsert).toHaveBeenCalledWith({
      where: { tenantId: TENANT },
      update: { prazoEmprestimoHoras: 48 },
      create: { tenantId: TENANT, prazoEmprestimoHoras: 48 },
    });
  });
});

describe("listarEmprestimos — blindagem de query + tenant", () => {
  function capturarArgs() {
    const findMany = vi.fn().mockResolvedValue([]);
    const service = servicoCom({ emprestimo: { findMany } });
    return { findMany, service };
  }

  test("sempre limita a 500 linhas (take)", async () => {
    const { findMany, service } = capturarArgs();
    await service.listarEmprestimos(TENANT);
    expect(findMany).toHaveBeenCalledOnce();
    expect(findMany.mock.calls[0][0]).toMatchObject({ take: 500 });
  });

  test("com status, filtra por status E pelo tenant", async () => {
    const { findMany, service } = capturarArgs();
    await service.listarEmprestimos(TENANT, "ABERTO");
    expect(findMany.mock.calls[0][0]).toMatchObject({
      take: 500,
      where: { tenantId: TENANT, status: "ABERTO" },
    });
  });

  test("sem status, o where ainda tranca no tenant (nunca lista tudo)", async () => {
    const { findMany, service } = capturarArgs();
    await service.listarEmprestimos(TENANT);
    expect(findMany.mock.calls[0][0].where).toEqual({ tenantId: TENANT });
  });
});

describe("listagens de apoio — sempre trancadas no tenant", () => {
  test("listarProdutos filtra por tenant", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const service = servicoCom({ produto: { findMany } });
    await service.listarProdutos(TENANT);
    expect(findMany.mock.calls[0][0].where).toMatchObject({ tenantId: TENANT, ativo: true });
  });

  test("listarMovimentacoes filtra por tenant (com e sem produtoId)", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const service = servicoCom({ movimentacaoEstoque: { findMany } });
    await service.listarMovimentacoes(TENANT);
    expect(findMany.mock.calls[0][0].where).toEqual({ tenantId: TENANT });
    await service.listarMovimentacoes(TENANT, "prod-1");
    expect(findMany.mock.calls[1][0].where).toEqual({ tenantId: TENANT, produtoId: "prod-1" });
  });
});

// ── RPCs: o tenant que chega ao banco é SEMPRE o do chamador ──────
// O isolamento de fato acontece dentro da função SQL (filtro por
// tenantId sob FOR UPDATE); o contrato da API é nunca aceitar tenant
// vindo de DTO/query e repassar o do usuário autenticado à RPC.

describe("RPCs — escopo por tenant (anti cross-over)", () => {
  function servicoRpc(chave: string, resultado: unknown) {
    const queryRaw = vi.fn().mockResolvedValue([{ [chave]: resultado }]);
    const service = servicoCom({ $queryRaw: queryRaw });
    // $queryRaw é tagged template: calls[0] = [strings, ...valores]
    const valoresDaChamada = () => queryRaw.mock.calls[0].slice(1);
    return { service, valoresDaChamada };
  }

  test("registrar repassa o tenant do chamador", async () => {
    const { service, valoresDaChamada } = servicoRpc("registrar_movimentacao_estoque", {
      movimentacaoId: "m1",
      saldoApos: 5,
    });
    const dto = { produtoId: "p1", quantidade: 2, tipo: "ENTRADA" };
    await service.registrar(TENANT, dto as never, "u1");
    expect(valoresDaChamada()).toContain(TENANT);
  });

  test("registrarEmprestimo repassa o tenant do chamador", async () => {
    const { service, valoresDaChamada } = servicoRpc("registrar_emprestimo", {
      emprestimoId: "e1",
      movimentacaoId: "m1",
      saldoApos: 5,
    });
    const dto = { produtoId: "p1", funcionarioId: "f1", quantidade: 1 };
    await service.registrarEmprestimo(TENANT, dto as never, "u1");
    expect(valoresDaChamada()).toContain(TENANT);
  });

  test("registrarDevolucao repassa o tenant do chamador (id de empréstimo alheio morre na RPC)", async () => {
    const { service, valoresDaChamada } = servicoRpc("registrar_devolucao", {
      movimentacaoId: "m1",
      saldoApos: 5,
    });
    await service.registrarDevolucao(TENANT, "emp-de-outro-tenant", {}, "u1");
    expect(valoresDaChamada()).toContain(TENANT);
  });

  test("registrarPerda repassa o tenant do chamador", async () => {
    const { service, valoresDaChamada } = servicoRpc("registrar_perda", {
      movimentacaoId: "m1",
      saldoApos: 5,
    });
    await service.registrarPerda(TENANT, "emp-1", { motivo: "quebrou" }, "u1");
    expect(valoresDaChamada()).toContain(TENANT);
  });
});
