import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// Modal leve (sem dependência externa). Fecha no overlay e no Esc.
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
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-zinc-950/70 p-4 backdrop-blur-sm duration-150 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className={cn(
          "mt-12 w-full max-w-lg rounded-xl border border-zinc-700 bg-zinc-800 shadow-2xl",
          "duration-200 animate-in fade-in zoom-in-95",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-700/70 px-5 py-4">
          <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
          <button
            onClick={onClose}
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
