// Modo de operação do app — decidido de forma EXPLÍCITA, nunca por omissão:
//  - "demo": exige a flag VITE_DEMO=1 (dados mock locais, sem backend).
//  - "live": exige VITE_API_URL + credenciais do Supabase (backend real + Realtime).
//  - Ambiente sem flag e sem API configurada é ERRO FATAL: o main.tsx renderiza
//    a tela "Configuração de Ambiente Ausente" e o app não monta.
// A flag explícita tem precedência: VITE_DEMO=1 força demo mesmo com API definida.

/** Recorte do ambiente que o app consome — string vazia conta como ausente. */
export type AmbienteEnv = {
  VITE_DEMO?: string;
  VITE_API_URL?: string;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
};

/** Normaliza a URL da API: sem barras finais; vazio/ausente vira "". */
function normalizarApiUrl(env: AmbienteEnv): string {
  return (env.VITE_API_URL ?? "").replace(/\/+$/, "");
}

/**
 * Núcleo puro da validação de ambiente (testável sem import.meta). Devolve a
 * lista de variáveis ausentes — vazia quando o ambiente está íntegro (demo
 * explícito ou live completo). O modo live exige também as credenciais do
 * Supabase, porque sem elas o login e o Realtime não funcionam.
 */
export function validarAmbienteDe(env: AmbienteEnv): string[] {
  if (env.VITE_DEMO === "1") return [];
  const faltando: string[] = [];
  if (!normalizarApiUrl(env)) faltando.push("VITE_API_URL");
  if (!env.VITE_SUPABASE_URL) faltando.push("VITE_SUPABASE_URL");
  if (!env.VITE_SUPABASE_ANON_KEY) faltando.push("VITE_SUPABASE_ANON_KEY");
  return faltando;
}

/** Valida o ambiente real do build antes de o app montar (gate do main.tsx). */
export function validarAmbiente(): string[] {
  return validarAmbienteDe(import.meta.env);
}

export const isDemoMode = import.meta.env.VITE_DEMO === "1";

export const API_URL: string = normalizarApiUrl(import.meta.env);

export const isLiveMode = !isDemoMode && Boolean(API_URL);
