import { describe, expect, test } from "vitest";
import { comparar, type ValorOrdenavel } from "./useOrdenacao";

// Caracterização do comparador compartilhado por TODAS as tabelas do sistema
// (CrudPage, Histórico, Pendências). Regras: nulos por último, números
// "humanos" ("2" < "10") e collation pt-BR (acentos não quebram a ordem).
describe("comparar — nulos por último", () => {
  test("null vai depois de qualquer valor", () => {
    expect(comparar(null, "a")).toBeGreaterThan(0);
    expect(comparar("a", null)).toBeLessThan(0);
  });

  test("undefined vai depois de qualquer valor", () => {
    expect(comparar(undefined, 0)).toBeGreaterThan(0);
    expect(comparar(0, undefined)).toBeLessThan(0);
  });

  test("dois nulos empatam (ordem estável)", () => {
    expect(comparar(null, null)).toBe(0);
    expect(comparar(undefined, null)).toBe(0);
  });

  test("lista ordenada asc deixa os nulos no fim", () => {
    const valores: ValorOrdenavel[] = ["Lona", null, "Cuíca", undefined, "Tambor"];
    const ordenados = [...valores].sort(comparar);
    expect(ordenados).toEqual(["Cuíca", "Lona", "Tambor", null, undefined]);
  });
});

describe("comparar — números", () => {
  test("números comparam numericamente", () => {
    expect(comparar(2, 10)).toBeLessThan(0);
    expect(comparar(10, 2)).toBeGreaterThan(0);
    expect(comparar(5, 5)).toBe(0);
  });

  test('strings numéricas ordenam como número humano: "2" < "10"', () => {
    expect(comparar("2", "10")).toBeLessThan(0);
  });

  test("SKUs com sufixo numérico ordenam naturalmente (FER-2 < FER-10)", () => {
    expect(comparar("FER-2", "FER-10")).toBeLessThan(0);
  });
});

describe("comparar — collation pt-BR", () => {
  test("acento não joga a palavra para o fim do alfabeto", () => {
    // Em comparação por code point, "Válvula" > "Veículo" (á = U+00E1 > e).
    // Em pt-BR, Vá < Ve.
    expect(comparar("Válvula", "Veículo")).toBeLessThan(0);
  });

  test("base sensitivity: maiúscula/minúscula e acento empatam", () => {
    expect(comparar("cuíca", "CUICA")).toBe(0);
  });

  test("ordenação de descrições reais da oficina", () => {
    const descricoes = ["Válvula reguladora", "Tambor de freio", "Cuíca de freio 24", "Água destilada"];
    const ordenadas = [...descricoes].sort(comparar);
    expect(ordenadas).toEqual(["Água destilada", "Cuíca de freio 24", "Tambor de freio", "Válvula reguladora"]);
  });
});

describe("comparar — tipos mistos", () => {
  test("boolean compara como string (false < true)", () => {
    expect(comparar(false, true)).toBeLessThan(0);
  });

  test("número contra string compara como texto numérico", () => {
    expect(comparar(2, "10")).toBeLessThan(0);
  });
});
