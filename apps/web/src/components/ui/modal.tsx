import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// Elementos que participam da navegação por Tab dentro do modal.
const SELETOR_FOCAVEL =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focaveisDe(painel: HTMLElement): HTMLElement[] {
  return Array.from(painel.querySelectorAll<HTMLElement>(SELETOR_FOCAVEL)).filter(
    // getClientRects vazio = elemento não renderizado (display:none etc.)
    (el) => el.getClientRects().length > 0,
  );
}

// Modal leve (sem dependência externa) e acessível:
//  - role="dialog" + aria-modal + aria-labelledby (título anunciado por leitor de tela);
//  - foco entra no modal ao abrir, fica PRESO nele (Tab/Shift+Tab ciclam) e
//    volta ao elemento que o abriu ao fechar;
//  - fecha no overlay e no Esc.
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const painelRef = React.useRef<HTMLDivElement>(null);
  const tituloId = React.useId();

  React.useEffect(() => {
    if (!open) return;
    const abridor = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    // Foco inicial: primeiro campo/botão do conteúdo; sem nenhum, o painel.
    const frame = requestAnimationFrame(() => {
      const painel = painelRef.current;
      if (!painel) return;
      const alvo = focaveisDe(painel)[0] ?? painel;
      alvo.focus();
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const painel = painelRef.current;
      if (!painel) return;

      const focaveis = focaveisDe(painel);
      if (focaveis.length === 0) {
        // Nada focável no conteúdo: o foco fica no próprio painel.
        e.preventDefault();
        painel.focus();
        return;
      }
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      const ativo = document.activeElement;

      if (!(ativo instanceof HTMLElement) || !painel.contains(ativo)) {
        // Foco escapou (ou está no painel): traz de volta para a ponta certa.
        e.preventDefault();
        (e.shiftKey ? ultimo : primeiro).focus();
      } else if (e.shiftKey && (ativo === primeiro || ativo === painel)) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && ativo === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKey);
      // Devolve o foco a quem abriu o modal (se ainda estiver na página).
      if (abridor && document.contains(abridor)) abridor.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-zinc-950/70 p-4 backdrop-blur-sm duration-150 animate-in fade-in"
      onClick={onClose}
    >
      <div
        ref={painelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
        className={cn(
          "mt-12 w-full max-w-lg rounded-xl border border-zinc-700 bg-zinc-800 shadow-2xl outline-none",
          "duration-200 animate-in fade-in zoom-in-95",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-700/70 px-5 py-4">
          <h2 id={tituloId} className="text-sm font-semibold text-zinc-100">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="grid size-8 place-items-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-700/60 hover:text-zinc-100"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-zinc-700/70 px-5 py-4">{footer}</div>
        )}
      </div>
    </div>
  );
}
