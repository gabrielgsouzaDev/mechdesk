import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { isLiveMode } from "@/lib/config";

// Assina mudanças de uma tabela no Supabase Realtime e invalida a query
// correspondente — é o que faz a tela atualizar "sem F5".
export function useRealtimeInvalidate(channel: string, table: string, queryKey: string[]) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!hasSupabaseConfig || !isLiveMode) return;
    const ch = supabase
      .channel(channel)
      .on("postgres_changes", { event: "*", schema: "public", table }, () => {
        qc.invalidateQueries({ queryKey });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
