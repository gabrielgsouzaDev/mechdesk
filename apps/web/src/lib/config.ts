// Modo de operação do app:
//  - "live": há API configurada (VITE_API_URL) → usa backend real + Realtime.
//  - "demo": sem backend → usa dados mock locais (para avaliar o design offline).
export const API_URL = import.meta.env.VITE_API_URL ?? "";
export const isLiveMode = Boolean(API_URL);
