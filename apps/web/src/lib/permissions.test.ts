import { describe, expect, test } from "vitest";
import {
  PERMISSOES_ROTAS,
  podeAcessar,
  podeAcessarComMapa,
  primeiraRotaPermitida,
  primeiraRotaPermitidaComMapa,
  type MapaPermissoes,
} from "./permissions";

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

// ── Etapa 5b: RBAC dinâmico — o mapa vem do GET /me ───────────────
// O mapa (banco) MANDA quando presente; a matriz estática vira
// fallback (modo demo / API antiga). A rota /admin tem trava dura:
// só o papel ADMIN, nem um mapa forjado muda isso (anti-lockout,
// espelho da regra do backend).

describe("podeAcessarComMapa", () => {
  test("mapa concedendo VER libera a rota", () => {
    const mapa: MapaPermissoes = { funcionarios: { VER: true } };
    expect(podeAcessarComMapa("ALMOXARIFADO", mapa, "/cadastros/funcionarios")).toBe(true);
  });

  test("mapa negando VER bloqueia mesmo o que a matriz estática permitia", () => {
    const mapa: MapaPermissoes = { produtos: { VER: false } };
    expect(podeAcessarComMapa("ALMOXARIFADO", mapa, "/cadastros/produtos")).toBe(false);
  });

  test("recurso ausente no mapa cai no fallback estático do papel", () => {
    const mapa: MapaPermissoes = { produtos: { VER: true } };
    expect(podeAcessarComMapa("ALMOXARIFADO", mapa, "/movimentacoes")).toBe(true);
    expect(podeAcessarComMapa("ALMOXARIFADO", mapa, "/cadastros/funcionarios")).toBe(false);
  });

  test("sem mapa (demo / API antiga) usa a matriz estática", () => {
    expect(podeAcessarComMapa("ADMIN", undefined, "/cadastros/funcionarios")).toBe(true);
    expect(podeAcessarComMapa("ALMOXARIFADO", undefined, "/cadastros/funcionarios")).toBe(false);
  });

  test("TRAVA DURA: /admin é do ADMIN mesmo sem mapa", () => {
    expect(podeAcessarComMapa("ADMIN", undefined, "/admin")).toBe(true);
  });

  test("TRAVA DURA: mapa forjado não abre /admin para outro papel", () => {
    const forjado: MapaPermissoes = { admin: { VER: true } };
    expect(podeAcessarComMapa("ALMOXARIFADO", forjado, "/admin")).toBe(false);
    expect(podeAcessarComMapa(undefined, forjado, "/admin")).toBe(false);
  });

  test("rota desconhecida é negada com ou sem mapa", () => {
    expect(podeAcessarComMapa("ADMIN", { produtos: { VER: true } }, "/nao-existe")).toBe(false);
    expect(podeAcessarComMapa("ADMIN", undefined, "/nao-existe")).toBe(false);
  });
});

describe("primeiraRotaPermitidaComMapa", () => {
  test("mapa negando o console manda para a próxima rota liberada", () => {
    const mapa: MapaPermissoes = { movimentacao: { VER: false }, historico: { VER: true } };
    expect(primeiraRotaPermitidaComMapa("ALMOXARIFADO", mapa)).toBe("/movimentacoes");
  });

  test("mapa negando tudo devolve null (tela SemAcesso)", () => {
    const nadaVe: MapaPermissoes = Object.fromEntries(
      ["movimentacao", "historico", "pendencias", "produtos", "clientes", "veiculos", "funcionarios", "admin"].map(
        (r) => [r, { VER: false }],
      ),
    );
    expect(primeiraRotaPermitidaComMapa("ALMOXARIFADO", nadaVe)).toBeNull();
  });

  test("sem mapa reproduz o fallback estático", () => {
    expect(primeiraRotaPermitidaComMapa("ADMIN", undefined)).toBe("/");
  });
});
