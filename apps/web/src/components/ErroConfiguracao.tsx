import { Disc3, OctagonAlert } from "lucide-react";

// Tela de erro FATAL de configuração — renderizada pelo main.tsx no lugar do
// app quando o ambiente não define nem VITE_DEMO=1 nem as variáveis do modo
// live. Propositalmente sem dependência de auth, API ou React Query: precisa
// funcionar exatamente quando nada disso pode ser inicializado.
export function ErroConfiguracao({ faltando }: { faltando: string[] }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-zinc-900 px-4 py-8 text-zinc-100">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="grid size-14 place-items-center rounded-2xl bg-orange-600 text-white shadow-lg ring-1 ring-orange-500/30">
            <Disc3 className="size-8" />
          </div>
          <p className="font-display text-2xl font-semibold uppercase tracking-wide text-zinc-100">
            Luciano <span className="text-orange-500">Freios</span>
          </p>
        </div>

        <div
          role="alert"
          className="space-y-5 rounded-xl border border-zinc-700 border-t-2 border-t-rose-500 bg-zinc-800 p-6 shadow-xl"
        >
          <div className="flex items-start gap-3">
            <OctagonAlert className="mt-0.5 size-6 shrink-0 text-rose-400" />
            <div className="min-w-0">
              <h1 className="text-base font-semibold text-zinc-100">
                Configuração de Ambiente Ausente
              </h1>
              <p className="mt-1 text-sm text-zinc-300">
                O sistema não pôde iniciar porque as variáveis abaixo não foram
                definidas. Por segurança, o app não entra em modo demonstração
                sozinho.
              </p>
            </div>
          </div>

          <ul className="space-y-1.5 rounded-lg bg-zinc-900/60 px-4 py-3 ring-1 ring-inset ring-zinc-700/70">
            {faltando.map((nome) => (
              <li key={nome} className="break-all font-mono text-sm text-rose-300">
                {nome}
              </li>
            ))}
          </ul>

          <div className="space-y-2 text-sm text-zinc-400">
            <p className="font-medium text-zinc-300">Como resolver:</p>
            <ol className="list-inside list-decimal space-y-1">
              <li>
                Copie <code className="rounded bg-zinc-900/60 px-1.5 py-0.5 font-mono text-xs text-zinc-200">.env.example</code>{" "}
                para <code className="rounded bg-zinc-900/60 px-1.5 py-0.5 font-mono text-xs text-zinc-200">.env</code> na
                raiz do projeto e preencha os valores.
              </li>
              <li>Reinicie o servidor de desenvolvimento (o Vite só lê o .env no boot).</li>
              <li>
                Para avaliar o design sem backend, defina explicitamente{" "}
                <code className="rounded bg-zinc-900/60 px-1.5 py-0.5 font-mono text-xs text-amber-300">VITE_DEMO=1</code>.
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
