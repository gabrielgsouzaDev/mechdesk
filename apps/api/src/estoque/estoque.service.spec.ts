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

// ── Fase D: robustez de produção ──────────────────────────────────

const CONFIG_PADRAO = { id: "default", prazoEmprestimoHoras: 24 };

function servicoCom(prismaParcial: Record<string, unknown>): EstoqueService {
  return new EstoqueService(prismaParcial as unknown as PrismaService);
}

describe("getConfig — resiliente sem seed", () => {
  test("sem a linha 'default' no banco, devolve a configuração padrão (não 500)", async () => {
    const service = servicoCom({
      configuracao: { findUnique: vi.fn().mockResolvedValue(null) },
    });
    await expect(service.getConfig()).resolves.toEqual(CONFIG_PADRAO);
  });

  test("com a linha no banco, devolve o registro persistido", async () => {
    const persistida = { id: "default", prazoEmprestimoHoras: 48 };
    const service = servicoCom({
      configuracao: { findUnique: vi.fn().mockResolvedValue(persistida) },
    });
    await expect(service.getConfig()).resolves.toEqual(persistida);
  });
});

describe("listarEmprestimos — blindagem de query", () => {
  function capturarArgs() {
    const findMany = vi.fn().mockResolvedValue([]);
    const service = servicoCom({ emprestimo: { findMany } });
    return { findMany, service };
  }

  test("sempre limita a 500 linhas (take)", async () => {
    const { findMany, service } = capturarArgs();
    await service.listarEmprestimos();
    expect(findMany).toHaveBeenCalledOnce();
    expect(findMany.mock.calls[0][0]).toMatchObject({ take: 500 });
  });

  test("com status, filtra exatamente por ele", async () => {
    const { findMany, service } = capturarArgs();
    await service.listarEmprestimos("ABERTO");
    expect(findMany.mock.calls[0][0]).toMatchObject({ take: 500, where: { status: "ABERTO" } });
  });

  test("sem status, não aplica where", async () => {
    const { findMany, service } = capturarArgs();
    await service.listarEmprestimos();
    expect(findMany.mock.calls[0][0].where).toBeUndefined();
  });
});
