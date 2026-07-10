import { useState } from "react";
import { Disc3, LogIn, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useAuth } from "@/lib/auth";

export function LoginPage() {
  const { entrar } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      await entrar(email.trim(), senha);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao entrar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-zinc-900 px-4">
      <div className="w-full max-w-sm">
        {/* Lockup da marca */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="grid size-14 place-items-center rounded-2xl bg-orange-600 text-white shadow-lg ring-1 ring-orange-500/30">
            <Disc3 className="size-8" />
          </div>
          <div className="text-center leading-none">
            <p className="font-display text-2xl font-semibold uppercase tracking-wide text-zinc-100">
              Luciano <span className="text-orange-500">Freios</span>
            </p>
            <div className="mt-2 flex items-center justify-center gap-1.5">
              <span className="h-0.5 w-5 rounded-full bg-amber-400" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Qualidade e Segurança
              </span>
              <span className="h-0.5 w-5 rounded-full bg-amber-400" />
            </div>
          </div>
        </div>

        {/* Cartão de login */}
        <form
          onSubmit={submit}
          className="space-y-5 rounded-xl border border-zinc-700 border-t-2 border-t-orange-600 bg-zinc-800 p-6 shadow-xl"
        >
          <div>
            <h1 className="text-base font-semibold text-zinc-100">Entrar no sistema</h1>
            <p className="mt-0.5 text-sm text-zinc-400">Acesso restrito à equipe</p>
          </div>

          <Field label="E-mail" required>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@lucianofreios.com"
              autoComplete="username"
              required
            />
          </Field>

          <Field label="Senha" required>
            <Input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </Field>

          {erro && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 px-3.5 py-3 text-sm font-medium text-rose-400 ring-1 ring-inset ring-rose-500/25">
              <AlertTriangle className="size-4 shrink-0" /> {erro}
            </div>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={enviando}>
            {enviando ? <Loader2 className="size-5 animate-spin" /> : <LogIn className="size-5" />}
            Entrar
          </Button>
        </form>
      </div>
    </div>
  );
}
