import { describe, expect, test } from "vitest";
import { validarAmbienteDe, type AmbienteEnv } from "./config";

// Protege o fix da auditoria (fallback demo silencioso) contra regressão:
// o modo demo SÓ existe com VITE_DEMO=1 explícito; qualquer ambiente live
// incompleto devolve a lista exata de variáveis ausentes (tela de erro fatal).
const LIVE_COMPLETO: AmbienteEnv = {
  VITE_API_URL: "http://localhost:3333",
  VITE_SUPABASE_URL: "https://ref.supabase.co",
  VITE_SUPABASE_ANON_KEY: "anon-key",
};

describe("validarAmbienteDe — modo demo explícito", () => {
  test("VITE_DEMO=1 dispensa todas as variáveis", () => {
    expect(validarAmbienteDe({ VITE_DEMO: "1" })).toEqual([]);
  });

  test("VITE_DEMO=1 tem precedência mesmo com live parcial", () => {
    expect(validarAmbienteDe({ VITE_DEMO: "1", VITE_API_URL: "http://x" })).toEqual([]);
  });

  test('VITE_DEMO com valor diferente de "1" NÃO liga o demo', () => {
    expect(validarAmbienteDe({ VITE_DEMO: "true" })).toEqual([
      "VITE_API_URL",
      "VITE_SUPABASE_URL",
      "VITE_SUPABASE_ANON_KEY",
    ]);
    expect(validarAmbienteDe({ VITE_DEMO: "0", ...LIVE_COMPLETO })).toEqual([]);
  });
});

describe("validarAmbienteDe — modo live", () => {
  test("ambiente completo passa sem pendências", () => {
    expect(validarAmbienteDe(LIVE_COMPLETO)).toEqual([]);
  });

  test("ambiente totalmente vazio lista as três variáveis", () => {
    expect(validarAmbienteDe({})).toEqual([
      "VITE_API_URL",
      "VITE_SUPABASE_URL",
      "VITE_SUPABASE_ANON_KEY",
    ]);
  });

  test('string vazia "" conta como ausente (regressão do bug supabaseUrl is required)', () => {
    expect(
      validarAmbienteDe({ VITE_API_URL: "", VITE_SUPABASE_URL: "", VITE_SUPABASE_ANON_KEY: "" }),
    ).toEqual(["VITE_API_URL", "VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"]);
  });

  test("falta parcial devolve apenas o que falta", () => {
    expect(validarAmbienteDe({ ...LIVE_COMPLETO, VITE_SUPABASE_ANON_KEY: "" })).toEqual([
      "VITE_SUPABASE_ANON_KEY",
    ]);
    expect(validarAmbienteDe({ VITE_API_URL: "http://localhost:3333" })).toEqual([
      "VITE_SUPABASE_URL",
      "VITE_SUPABASE_ANON_KEY",
    ]);
  });

  test("API_URL só com barras finais conta como ausente", () => {
    expect(validarAmbienteDe({ ...LIVE_COMPLETO, VITE_API_URL: "///" })).toEqual(["VITE_API_URL"]);
  });
});
