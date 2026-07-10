import { Users } from "lucide-react";
import { CrudPage, type ColumnDef, type FieldDef } from "@/components/CrudPage";
import { Badge } from "@/components/ui/badge";
import { useEntityData } from "@/hooks/useEntityData";
import { FUNCIONARIOS_MOCK } from "@/lib/mock";
import type { Funcionario } from "@/lib/types";

// Funcionário = pessoa da equipe (não loga no sistema). Cargo é texto livre.
const columns: ColumnDef<Funcionario>[] = [
  { header: "Nome", cell: (f) => <span className="font-medium text-zinc-100">{f.nome}</span>, sortValue: (f) => f.nome },
  { header: "CPF", cell: (f) => <span className="tabular-nums text-zinc-300">{f.cpf}</span>, className: "w-36", sortValue: (f) => f.cpf },
  { header: "Cargo", cell: (f) => <span className="text-zinc-300">{f.cargo ?? "—"}</span>, className: "w-40", sortValue: (f) => f.cargo },
  { header: "E-mail", cell: (f) => <span className="text-zinc-400">{f.email ?? "—"}</span>, sortValue: (f) => f.email },
  { header: "Status", cell: (f) => <Badge tone={f.ativo === false ? "rose" : "zinc"}>{f.ativo === false ? "Inativo" : "Ativo"}</Badge>, className: "w-24", sortValue: (f) => f.ativo !== false },
];

const fields: FieldDef<Funcionario>[] = [
  { name: "nome", label: "Nome completo", required: true, full: true },
  { name: "cpf", label: "CPF", required: true },
  { name: "cargo", label: "Cargo", placeholder: "Mecânico, Secretária…" },
  { name: "email", label: "E-mail", full: true },
];

export function FuncionariosPage() {
  const entity = useEntityData<Funcionario>({ key: "funcionarios", endpoint: "/funcionarios", seed: FUNCIONARIOS_MOCK });
  return (
    <CrudPage
      title="Funcionários"
      subtitle="Equipe da oficina (quem trabalha — o acesso ao sistema é dos usuários)"
      icon={<Users className="size-5" />}
      entity={entity}
      columns={columns}
      fields={fields}
      searchKeys={["nome", "cpf", "cargo"]}
      makeEmpty={() => ({ ativo: true })}
    />
  );
}
