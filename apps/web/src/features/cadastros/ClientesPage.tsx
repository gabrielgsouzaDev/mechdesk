import { Building2 } from "lucide-react";
import { CrudPage, type ColumnDef, type FieldDef } from "@/components/CrudPage";
import { Badge } from "@/components/ui/badge";
import { useEntityData } from "@/hooks/useEntityData";
import { CLIENTES_MOCK } from "@/lib/mock";
import type { Cliente } from "@/lib/types";

const columns: ColumnDef<Cliente>[] = [
  { header: "Razão social", cell: (c) => <span className="font-medium text-zinc-100">{c.razaoSocial}</span>, sortValue: (c) => c.razaoSocial },
  { header: "Fantasia", cell: (c) => <span className="text-zinc-400">{c.nomeFantasia ?? "—"}</span>, sortValue: (c) => c.nomeFantasia },
  { header: "CNPJ / CPF", cell: (c) => <span className="tabular-nums text-zinc-300">{c.cnpjCpf}</span>, className: "w-40", sortValue: (c) => c.cnpjCpf },
  { header: "Cidade/UF", cell: (c) => <span className="text-zinc-400">{c.municipio ? `${c.municipio}/${c.uf ?? ""}` : "—"}</span>, className: "w-36", sortValue: (c) => c.municipio },
  { header: "Tipo", cell: (c) => <Badge tone="zinc">{c.tipo}</Badge>, className: "w-20", sortValue: (c) => c.tipo },
];

const fields: FieldDef<Cliente>[] = [
  { name: "tipo", label: "Tipo", type: "select", required: true, options: [
    { value: "PJ", label: "Pessoa Jurídica" },
    { value: "PF", label: "Pessoa Física" },
  ] },
  { name: "cnpjCpf", label: "CNPJ / CPF", required: true },
  { name: "razaoSocial", label: "Razão social / Nome", required: true, full: true },
  { name: "nomeFantasia", label: "Nome fantasia", full: true },
  { name: "telefone", label: "Telefone" },
  { name: "municipio", label: "Município" },
  { name: "uf", label: "UF", placeholder: "SP" },
];

export function ClientesPage() {
  const entity = useEntityData<Cliente>({ key: "clientes", endpoint: "/clientes", seed: CLIENTES_MOCK });
  return (
    <CrudPage
      title="Clientes"
      subtitle="Empresas, frotas e clientes avulsos"
      icon={<Building2 className="size-5" />}
      entity={entity}
      columns={columns}
      fields={fields}
      searchKeys={["razaoSocial", "cnpjCpf", "nomeFantasia"]}
      makeEmpty={() => ({ tipo: "PJ" as const })}
    />
  );
}
