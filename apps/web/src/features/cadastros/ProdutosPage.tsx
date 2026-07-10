import { Package } from "lucide-react";
import { CrudPage, type ChipGroup, type ColumnDef, type FieldDef } from "@/components/CrudPage";
import { Badge } from "@/components/ui/badge";
import { useEntityData } from "@/hooks/useEntityData";
import { PRODUTOS_MOCK } from "@/lib/mock";
import type { Produto } from "@/lib/types";

// Preços ficam FORA da UI por decisão de escopo (Etapa 1 — faxina).
// O banco continua capturando custo/venda; reativação junto com o módulo financeiro.
const columns: ColumnDef<Produto>[] = [
  { header: "SKU", cell: (p) => <span className="font-medium text-zinc-300">{p.sku}</span>, className: "w-28", sortValue: (p) => p.sku },
  { header: "Descrição", cell: (p) => <span className="font-medium text-zinc-100">{p.descricao}</span>, sortValue: (p) => p.descricao },
  { header: "Local", cell: (p) => <span className="text-zinc-400">{p.localizacao ?? "—"}</span>, className: "w-24", sortValue: (p) => p.localizacao },
  {
    header: "Estoque",
    cell: (p) => (
      <Badge tone={p.estoqueAtual <= p.estoqueMinimo ? "rose" : "zinc"}>
        {p.estoqueAtual} / mín {p.estoqueMinimo}
      </Badge>
    ),
    className: "w-36",
    sortValue: (p) => p.estoqueAtual,
  },
  {
    header: "Controle",
    cell: (p) => <Badge tone={p.controle === "ESTOQUE_CHAO" ? "amber" : "zinc"}>{p.controle === "ESTOQUE_CHAO" ? "Chão" : "Rígido"}</Badge>,
    className: "w-24",
    sortValue: (p) => p.controle,
  },
  {
    header: "Categoria",
    cell: (p) => <Badge tone={p.categoria === "FERRAMENTA" ? "orange" : "zinc"}>{p.categoria === "FERRAMENTA" ? "Ferramenta" : "Peça"}</Badge>,
    className: "w-28",
    sortValue: (p) => p.categoria,
  },
];

// Chips contextuais (Etapa 4): alerta de reposição + recorte por categoria.
const chipGroups: ChipGroup<Produto>[] = [
  {
    id: "alerta",
    chips: [{ id: "minimo", label: "Abaixo do mínimo", predicate: (p) => p.estoqueAtual <= p.estoqueMinimo }],
  },
  {
    id: "categoria",
    exclusive: true,
    chips: [
      { id: "peca", label: "Peças", predicate: (p) => p.categoria === "PECA" },
      { id: "ferramenta", label: "Ferramentas", predicate: (p) => p.categoria === "FERRAMENTA" },
    ],
  },
];

const fields: FieldDef<Produto>[] = [
  { name: "sku", label: "SKU", required: true, placeholder: "PAT-001" },
  { name: "descricao", label: "Descrição", required: true, full: true },
  { name: "localizacao", label: "Localização", placeholder: "A-12" },
  { name: "controle", label: "Controle de estoque", type: "select", options: [
    { value: "RIGIDO", label: "Rígido (rastreado 1 a 1)" },
    { value: "ESTOQUE_CHAO", label: "Estoque de chão (reconciliado)" },
  ] },
  { name: "categoria", label: "Categoria", type: "select", options: [
    { value: "PECA", label: "Peça (consumível)" },
    { value: "FERRAMENTA", label: "Ferramenta (empréstimo/devolução)" },
  ] },
  { name: "estoqueAtual", label: "Estoque atual", type: "number" },
  { name: "estoqueMinimo", label: "Estoque mínimo", type: "number" },
];

export function ProdutosPage() {
  const entity = useEntityData<Produto>({ key: "produtos", endpoint: "/produtos", seed: PRODUTOS_MOCK });
  return (
    <CrudPage
      title="Produtos"
      subtitle="Peças e itens do almoxarifado"
      icon={<Package className="size-5" />}
      entity={entity}
      columns={columns}
      fields={fields}
      chipGroups={chipGroups}
      searchKeys={["descricao", "sku"]}
      // precoCusto/precoVenda seguem no payload (ocultos) — a API os exige e o banco os guarda.
      makeEmpty={() => ({ unidade: "UN", controle: "RIGIDO" as const, categoria: "PECA" as const, estoqueAtual: 0, estoqueMinimo: 0, precoCusto: 0, precoVenda: 0 })}
    />
  );
}
