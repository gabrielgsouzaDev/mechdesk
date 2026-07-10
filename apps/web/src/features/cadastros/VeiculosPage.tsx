import { Truck } from "lucide-react";
import { CrudPage, type ColumnDef, type FieldDef } from "@/components/CrudPage";
import { useEntityData } from "@/hooks/useEntityData";
import { VEICULOS_MOCK, CLIENTES_MOCK } from "@/lib/mock";
import type { Veiculo, Cliente } from "@/lib/types";

export function VeiculosPage() {
  const entity = useEntityData<Veiculo>({ key: "veiculos", endpoint: "/veiculos", seed: VEICULOS_MOCK });
  const clientes = useEntityData<Cliente>({ key: "clientes", endpoint: "/clientes", seed: CLIENTES_MOCK });

  const nomeCliente = (v: Veiculo) =>
    v.cliente?.razaoSocial ?? clientes.data.find((c) => c.id === v.clienteId)?.razaoSocial ?? "—";

  const columns: ColumnDef<Veiculo>[] = [
    { header: "Placa", cell: (v) => <span className="font-semibold tabular-nums text-zinc-100">{v.placa}</span>, className: "w-28", sortValue: (v) => v.placa },
    { header: "Modelo", cell: (v) => <span className="font-medium text-zinc-100">{v.modelo}</span>, sortValue: (v) => v.modelo },
    { header: "Marca", cell: (v) => <span className="text-zinc-400">{v.marca ?? "—"}</span>, className: "w-32", sortValue: (v) => v.marca },
    { header: "Tipo", cell: (v) => <span className="text-zinc-400">{v.tipo ?? "—"}</span>, className: "w-28", sortValue: (v) => v.tipo },
    { header: "Cliente", cell: (v) => <span className="text-zinc-300">{nomeCliente(v)}</span>, sortValue: (v) => nomeCliente(v) },
  ];

  const fields: FieldDef<Veiculo>[] = [
    { name: "placa", label: "Placa", required: true, placeholder: "RTA-7G21" },
    { name: "modelo", label: "Modelo", required: true },
    { name: "marca", label: "Marca" },
    { name: "tipo", label: "Tipo", type: "select", options: [
      { value: "CAVALO", label: "Cavalo mecânico" },
      { value: "CARRETA", label: "Carreta" },
      { value: "CAMINHAO", label: "Caminhão" },
      { value: "OUTRO", label: "Outro" },
    ] },
    { name: "clienteId", label: "Cliente / Frota", type: "select", required: true, full: true,
      options: clientes.data.map((c) => ({ value: c.id, label: c.razaoSocial })) },
  ];

  return (
    <CrudPage
      title="Veículos"
      subtitle="Frota de caminhões dos clientes"
      icon={<Truck className="size-5" />}
      entity={entity}
      columns={columns}
      fields={fields}
      searchKeys={["placa", "modelo", "marca"]}
      makeEmpty={() => ({})}
    />
  );
}
