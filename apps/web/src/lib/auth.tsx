import { createContext, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { isDemoMode, isLiveMode } from "./config";
import { api } from "./api";
import { OPERADOR } from "./mock";

export type Operador = { id: string; nome: string; papel: string; email?: string | null };

type AuthState = {
  carregando: boolean;
  session: Session | null;
  operador: Operador | null;
  erro: string | null;
  entrar: (email: string, senha: string) => Promise<void>;
  sair: () => Promise<void>;
};

const AuthContext = createContext<AuthState>(null as never);

// Modo demo (APENAS com VITE_DEMO=1 explícito): opera sem login, com operador
// fictício. Sem a flag, ambiente incompleto nem chega aqui — o main.tsx trava
// na tela "Configuração de Ambiente Ausente".
const DEMO: AuthState = {
  carregando: false,
  session: {} as Session,
  operador: { id: OPERADOR.id, nome: OPERADOR.nome, papel: "ALMOXARIFADO" },
  erro: null,
  entrar: async () => {},
  sair: async () => {},
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [operador, setOperador] = useState<Operador | null>(null);
  const [carregando, setCarregando] = useState(isLiveMode);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!isLiveMode) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setCarregando(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_ev, s) => {
      setSession(s);
      if (!s) {
        setOperador(null);
        setCarregando(false);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Com sessão, resolve o funcionário vinculado na API (fonte da verdade do papel).
  useEffect(() => {
    if (!isLiveMode || !session) return;
    setCarregando(true);
    api
      .get<Operador>("/me")
      .then((op) => {
        setOperador(op);
        setErro(null);
      })
      .catch((e) => {
        setErro(e instanceof Error ? e.message : "Falha ao identificar o operador.");
        setOperador(null);
      })
      .finally(() => setCarregando(false));
  }, [session]);

  async function entrar(email: string, senha: string) {
    setErro(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) {
      throw new Error(
        error.message === "Invalid login credentials"
          ? "E-mail ou senha incorretos."
          : error.message,
      );
    }
  }

  async function sair() {
    await supabase.auth.signOut();
  }

  // Demo exige a flag explícita; qualquer outro caminho usa o fluxo real.
  const value = isDemoMode
    ? DEMO
    : { carregando, session, operador, erro, entrar, sair };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
