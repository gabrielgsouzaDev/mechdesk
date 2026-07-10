import * as React from "react";
import { Input, Select } from "./input";

// Campo rotulado para formulários de cadastro — alinhamento e espaçamento
// consistentes em todas as telas.
export function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-zinc-400">
        {label}
        {required && <span className="ml-0.5 text-rose-400">*</span>}
      </span>
      {children}
    </label>
  );
}

export { Input, Select };
