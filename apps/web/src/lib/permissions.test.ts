import { describe, expect, test } from "vitest";
import { PERMISSOES_ROTAS, podeAcessar, primeiraRotaPermitida } from "./permissions";

// Caracterização da matriz RBAC do frontend (fonte única de verdade do menu
// e do guard de rota). Se a Etapa 5 mover a matriz para o banco, estes testes
// seguram a semântica de acesso durante a migração.
describe("podeAcessar", () => {
  test("ADMIN acessa /cadastros/funcionarios", () => {
    expect(podeAcessar("ADMIN", "/cadastros/funcionarios")).toBe(true);
  });

  test("ALMOXARIFADO tem /cadastros/funcionarios negado", () => {
    expect(podeAcessar("ALMOXARIFADO", "/cadastros/funcionarios")).toBe(false);
  });

  test("ALMOXARIFADO acessa as telas de operação e cadastros de apoio", () => {
    for (const rota of ["/", "/movimentacoes", "/pendencias", "/cadastros/produtos", "/cadastros/clientes", "/cadastros/veiculos"]) {
      expect(podeAcessar("ALMOXARIFADO", rota), `rota ${rota}`).toBe(true);
    }
  });

  test("papel undefined bloqueia todas as rotas da matriz", () => {
    for (const rota of Object.keys(PERMISSOES_ROTAS)) {
      expect(podeAcessar(undefined, rota), `rota ${rota}`).toBe(false);
    }
  });

  test("papel desconhecido bloqueia todas as rotas da matriz", () => {
    for (const rota of Object.keys(PERMISSOES_ROTAS)) {
      expect(podeAcessar("FATURAMENTO", rota), `rota ${rota}`).toBe(false);
    }
  });

  test("rota fora da matriz é negada mesmo para ADMIN", () => {
    expect(podeAcessar("ADMIN", "/rota-que-nao-existe")).toBe(false);
  });
});

describe("primeiraRotaPermitida", () => {
  test("ALMOXARIFADO é direcionado para o console de movimentação", () => {
    expect(primeiraRotaPermitida("ALMOXARIFADO")).toBe("/");
  });

  test("ADMIN é direcionado para o console de movimentação", () => {
    expect(primeiraRotaPermitida("ADMIN")).toBe("/");
  });

  test("papel sem nenhuma rota devolve null (tela SemAcesso)", () => {
    expect(primeiraRotaPermitida(undefined)).toBeNull();
    expect(primeiraRotaPermitida("FATURAMENTO")).toBeNull();
  });
});
