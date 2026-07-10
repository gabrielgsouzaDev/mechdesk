import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Não derruba o app — apenas avisa. A tela inicial detecta e orienta a config.
  console.warn(
    "[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY ausentes. Copie .env.example para .env.",
  );
}

// Cliente do browser: usado para a leitura em tempo real (Realtime).
// Escrita sempre vai pela API (service role) — o RLS bloqueia escrita direta.
export const supabase = createClient(url ?? "http://localhost", anonKey ?? "anon", {
  realtime: { params: { eventsPerSecond: 10 } },
});

export const hasSupabaseConfig = Boolean(url && anonKey);
