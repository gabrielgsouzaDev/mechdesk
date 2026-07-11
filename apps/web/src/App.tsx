import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Loader2, AlertTriangle, ShieldOff } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ConsoleMovimentacao } from "@/features/almoxarifado/ConsoleMovimentacao";
import { PendenciasPage } from "@/features/almoxarifado/PendenciasPage";
import { MovimentacoesPage } from "@/features/estoque/MovimentacoesPage";
import { LoginPage } from "@/features/auth/LoginPage";
import { useAuth } from "@/lib/auth";
import { podeAcessar, primeiraRotaPermitida } from "@/lib/permissions";
import { Button } from "@/components/ui/button";

// Cadastros saem do bundle principal: são telas secundárias ao fluxo diário
// (console/histórico/pendências) e carregam sob demanda via React.lazy.
const ProdutosPage = lazy(() =>
  import("@/features/cadastros/ProdutosPage").then((m) => ({ default: m.ProdutosPage })),
);
const ClientesPage = lazy(() =>
  import("@/features/cadastros/ClientesPage").then((m) => ({ default: m.ClientesPage })),
);
const VeiculosPage = lazy(() =>
  import("@/features/cadastros/VeiculosPage").then((m) => ({ default: m.VeiculosPage })),
);
const FuncionariosPage = lazy(() =>
  import("@/features/cadastros/FuncionariosPage").then((m) => ({ default: m.FuncionariosPage })),
);

// Skeleton do carregamento de rota lazy: ecoa a estrutura das telas de
// cadastro (cabeçalho + busca + tabela) para o conteúdo não "pular".
function PaginaCarregando() {
  return (
    <div className="animate-pulse space-y-5" aria-hidden="true">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-lg bg-zinc-800" />
        <div className="space-y-2">
          <div className="h-5 w-40 rounded bg-zinc-800" />
          <div className="h-3 w-56 rounded bg-zinc-800/70" />
        </div>
      </div>
      <div className="h-10 w-full max-w-sm rounded-lg bg-zinc-800" />
      <div className="space-y-px overflow-hidden rounded-xl border border-zinc-700/70">
        <div className="h-10 bg-zinc-800" />
        <div className="h-12 bg-zinc-800/60" />
        <div className="h-12 bg-zinc-800/60" />
        <div className="h-12 bg-zinc-800/60" />
        <div className="h-12 bg-zinc-800/60" />
      </div>
    </div>
  );
}

// Guard de rota: URL digitada na mão também respeita a matriz de papéis.
// Sem acesso à rota → redireciona pra primeira permitida; sem nenhuma → aviso.
function Protegida({ rota, children }: { rota: string; children: React.ReactNode }) {
  const { operador } = useAuth();
  if (podeAcessar(operador?.papel, rota)) return <>{children}</>;
  const destino = primeiraRotaPermitida(operador?.papel);
  return destino ? <Navigate to={destino} replace /> : <SemAcesso />;
}

function SemAcesso() {
  const { sair, operador } = useAuth();
  return (
    <div className="grid min-h-[60vh] place-items-center px-4">
      <div className="w-full max-w-sm space-y-4 rounded-xl border border-zinc-700 bg-zinc-800 p-6 text-center shadow-xl">
        <ShieldOff className="mx-auto size-8 text-zinc-500" />
        <p className="text-sm text-zinc-300">
          Seu papel ({operador?.papel}) não tem telas liberadas neste sistema. Fale com o administrador.
        </p>
        <Button variant="outline" onClick={sair} className="w-full">
          Sair
        </Button>
      </div>
    </div>
  );
}

// Foco: controle de estoque (entrada/saída) + histórico + cadastros de apoio.
// Acesso: login obrigatório no modo live; modo demo só com VITE_DEMO=1.
export default function App() {
  const { carregando, session, operador, erro, sair } = useAuth();

  if (carregando) {
    return (
      <div className="grid min-h-dvh place-items-center bg-zinc-900">
        <Loader2 className="size-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!session) return <LoginPage />;

  // Logado no Supabase mas sem vínculo de funcionário ativo.
  if (!operador) {
    return (
      <div className="grid min-h-dvh place-items-center bg-zinc-900 px-4">
        <div className="w-full max-w-sm space-y-4 rounded-xl border border-zinc-700 bg-zinc-800 p-6 text-center shadow-xl">
          <AlertTriangle className="mx-auto size-8 text-amber-400" />
          <p className="text-sm text-zinc-300">
            {erro ?? "Sua conta não está vinculada a um funcionário ativo. Fale com o administrador."}
          </p>
          <Button variant="outline" onClick={sair} className="w-full">
            Sair
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Protegida rota="/"><ConsoleMovimentacao /></Protegida>} />
        <Route path="movimentacoes" element={<Protegida rota="/movimentacoes"><MovimentacoesPage /></Protegida>} />
        <Route path="pendencias" element={<Protegida rota="/pendencias"><PendenciasPage /></Protegida>} />
        <Route
          path="cadastros/produtos"
          element={
            <Protegida rota="/cadastros/produtos">
              <Suspense fallback={<PaginaCarregando />}>
                <ProdutosPage />
              </Suspense>
            </Protegida>
          }
        />
        <Route
          path="cadastros/clientes"
          element={
            <Protegida rota="/cadastros/clientes">
              <Suspense fallback={<PaginaCarregando />}>
                <ClientesPage />
              </Suspense>
            </Protegida>
          }
        />
        <Route
          path="cadastros/veiculos"
          element={
            <Protegida rota="/cadastros/veiculos">
              <Suspense fallback={<PaginaCarregando />}>
                <VeiculosPage />
              </Suspense>
            </Protegida>
          }
        />
        <Route
          path="cadastros/funcionarios"
          element={
            <Protegida rota="/cadastros/funcionarios">
              <Suspense fallback={<PaginaCarregando />}>
                <FuncionariosPage />
              </Suspense>
            </Protegida>
          }
        />
        <Route path="*" element={<Protegida rota="/"><ConsoleMovimentacao /></Protegida>} />
      </Route>
    </Routes>
  );
}
