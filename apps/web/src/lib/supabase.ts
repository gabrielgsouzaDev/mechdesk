import { createClient } from "@supabase/supabase-js";

// Trata vazio ("") como ausente — variável vazia no .env não pode derrubar a
// avaliação do módulo antes de o main.tsx renderizar a tela de erro fatal.
const url = import.meta.env.VITE_SUPABASE_URL || undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || undefined;

// Cliente do browser: usado para a leitura em tempo real (Realtime).
// Escrita sempre vai pela API (service role) — o RLS bloqueia escrita direta.
// Sem config (modo demo ou ambiente inválido), cria um cliente inerte com
// placeholders válidos: nada o consome fora do modo live, e o gate de
// ambiente do main.tsx é quem barra o app quando as variáveis faltam.
export const supabase = createClient(url ?? "http://localhost", anonKey ?? "anon", {
  realtime: { params: { eventsPerSecond: 10 } },
});

export const hasSupabaseConfig = Boolean(url && anonKey);
