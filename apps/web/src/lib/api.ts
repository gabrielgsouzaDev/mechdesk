import { API_URL, isLiveMode } from "./config";
import { supabase } from "./supabase";

// Cliente HTTP fino para a API NestJS. Anexa o JWT da sessão (a API valida
// via JWKS) e lança Error com a mensagem do backend para a UI exibir direto.
async function http<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (isLiveMode) {
    const { data } = await supabase.auth.getSession();
    if (data.session) headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  const res = await fetch(`${API_URL}/api${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let msg = `Erro ${res.status}`;
    try {
      const data = await res.json();
      msg = Array.isArray(data.message) ? data.message.join(", ") : data.message ?? msg;
    } catch {
      /* corpo não-JSON */
    }
    throw new Error(msg);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string) => http<T>("GET", path),
  post: <T>(path: string, body?: unknown) => http<T>("POST", path, body),
  patch: <T>(path: string, body?: unknown) => http<T>("PATCH", path, body),
  del: <T = void>(path: string) => http<T>("DELETE", path),
};
