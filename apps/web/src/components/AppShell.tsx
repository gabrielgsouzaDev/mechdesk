import { NavLink, Outlet } from "react-router-dom";
import { Disc3, ArrowLeftRight, History, ClipboardList, Package, Building2, Truck, Users, LogOut, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { isLiveMode } from "@/lib/config";
import { useAuth } from "@/lib/auth";
import { podeAcessar } from "@/lib/permissions";
import { useFerramentaria } from "@/hooks/useFerramentaria";

type NavItem = { to: string; label: string; icon: typeof Package; end?: boolean };
const NAV: { secao: string; itens: NavItem[] }[] = [
  {
    secao: "Operação",
    itens: [
      { to: "/", label: "Movimentação", icon: ArrowLeftRight, end: true },
      { to: "/movimentacoes", label: "Histórico", icon: History },
      { to: "/pendencias", label: "Pendências", icon: ClipboardList },
    ],
  },
  {
    secao: "Cadastros",
    itens: [
      { to: "/cadastros/produtos", label: "Produtos", icon: Package },
      { to: "/cadastros/clientes", label: "Clientes", icon: Building2 },
      { to: "/cadastros/veiculos", label: "Veículos", icon: Truck },
      { to: "/cadastros/funcionarios", label: "Funcionários", icon: Users },
    ],
  },
];

const PAPEL_LABEL: Record<string, string> = {
  ADMIN: "Administrador",
  ALMOXARIFADO: "Almoxarifado",
};

export function AppShell() {
  const { operador, sair } = useAuth();
  const { abertos } = useFerramentaria();
  const vencidos = abertos.filter((e) => new Date(e.prazoEm).getTime() < Date.now());

  // Menu por papel: só mostra o que o operador pode acessar (a rota e a
  // API reforçam a mesma matriz — esconder aqui é UX, não segurança).
  const gruposVisiveis = NAV.map((g) => ({
    ...g,
    itens: g.itens.filter((i) => podeAcessar(operador?.papel, i.to)),
  })).filter((g) => g.itens.length > 0);

  return (
    <div className="flex min-h-dvh bg-zinc-900 text-zinc-100">
      {/* ── Sidebar ── */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900 md:flex">
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="grid size-10 place-items-center rounded-lg bg-orange-600 text-white shadow-sm ring-1 ring-orange-500/30">
            <Disc3 className="size-6" />
          </div>
          <div className="leading-none">
            <p className="font-display text-lg font-semibold uppercase tracking-wide text-zinc-100">
              Luciano <span className="text-orange-500">Freios</span>
            </p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded-full bg-amber-400" />
              <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Qualidade e Segurança
              </span>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-6 px-3 py-4">
          {gruposVisiveis.map((grupo) => (
            <div key={grupo.secao}>
              <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                {grupo.secao}
              </p>
              <div className="space-y-1">
                {grupo.itens.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-orange-500/10 text-orange-400 ring-1 ring-inset ring-orange-500/20"
                          : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100",
                      )
                    }
                  >
                    <item.icon className="size-4" />
                    {item.label}
                    {item.to === "/pendencias" && vencidos.length > 0 && (
                      <span className="ml-auto grid size-5 place-items-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                        {vencidos.length}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-zinc-800 p-3">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
            <div className="grid size-8 shrink-0 place-items-center rounded-full bg-orange-600/20 text-xs font-bold text-orange-400">
              {(operador?.nome ?? "?").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-zinc-200">{operador?.nome}</p>
              <p className="text-[10px] text-zinc-500">
                {PAPEL_LABEL[operador?.papel ?? ""] ?? operador?.papel}
                {isLiveMode ? "" : " · modo demo"}
              </p>
            </div>
            {isLiveMode && (
              <button
                onClick={sair}
                title="Sair"
                className="grid size-8 shrink-0 place-items-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
              >
                <LogOut className="size-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ── Conteúdo ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-6">
          {/* Alerta de ferramenta vencida: só o Admin recebe notificação (escopo Etapa 3). */}
          {operador?.papel === "ADMIN" && vencidos.length > 0 && (
            <NavLink
              to="/pendencias"
              className="mb-5 flex items-center gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-300 shadow-sm transition-colors hover:bg-rose-500/15"
            >
              <AlertTriangle className="size-4 shrink-0" />
              {vencidos.length === 1
                ? "1 ferramenta emprestada passou do prazo de devolução."
                : `${vencidos.length} ferramentas emprestadas passaram do prazo de devolução.`}
              <span className="ml-auto text-xs font-semibold uppercase tracking-wide text-rose-400">Ver pendências →</span>
            </NavLink>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
