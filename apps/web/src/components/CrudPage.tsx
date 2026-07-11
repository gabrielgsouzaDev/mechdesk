import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select } from "@/components/ui/field";
import { Table, THead, TH, THOrdenavel, TBody, TR, TD } from "@/components/ui/table";
import { useOrdenacao, type ValorOrdenavel } from "@/hooks/useOrdenacao";
import type { EntityData } from "@/hooks/useEntityData";

export type FieldDef<T> = {
  name: keyof T & string;
  label: string;
  type?: "text" | "number" | "select" | "boolean";
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  full?: boolean;
};

export type ColumnDef<T> = {
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
  /** Valor cru usado para ordenar a coluna; sem ele a coluna não ordena. */
  sortValue?: (row: T) => ValorOrdenavel;
};

export type ChipDef<T> = {
  id: string;
  label: string;
  predicate: (row: T) => boolean;
};

/**
 * Grupo de chips de filtro: dentro do grupo os chips marcados somam (OU);
 * entre grupos os filtros se combinam (E). `exclusive` limita o grupo a
 * um chip ativo por vez (ex.: categoria).
 */
export type ChipGroup<T> = {
  id: string;
  exclusive?: boolean;
  chips: ChipDef<T>[];
};

export function CrudPage<T extends { id: string }>({
  title,
  subtitle,
  icon,
  entity,
  columns,
  fields,
  makeEmpty,
  searchKeys,
  chipGroups,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  entity: EntityData<T>;
  columns: ColumnDef<T>[];
  fields: FieldDef<T>[];
  makeEmpty: () => Partial<T>;
  searchKeys: (keyof T & string)[];
  chipGroups?: ChipGroup<T>[];
}) {
  const [editing, setEditing] = useState<{ row: T | null } | null>(null);
  const [form, setForm] = useState<Partial<T>>({});
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [excluir, setExcluir] = useState<T | null>(null);
  const [busca, setBusca] = useState("");
  const [chipsAtivos, setChipsAtivos] = useState<Set<string>>(new Set());

  const sortValues = useMemo(
    () => Object.fromEntries(columns.filter((c) => c.sortValue).map((c) => [c.header, c.sortValue!])),
    [columns],
  );
  const { ordem, alternar, ordenar } = useOrdenacao<T>(sortValues);

  function alternarChip(grupo: ChipGroup<T>, chipId: string) {
    setChipsAtivos((prev) => {
      const next = new Set(prev);
      const key = `${grupo.id}:${chipId}`;
      if (next.has(key)) {
        next.delete(key);
      } else {
        if (grupo.exclusive) for (const c of grupo.chips) next.delete(`${grupo.id}:${c.id}`);
        next.add(key);
      }
      return next;
    });
  }

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const rows = entity.data.filter((row) => {
      if (q && !searchKeys.some((k) => String(row[k] ?? "").toLowerCase().includes(q))) return false;
      for (const grupo of chipGroups ?? []) {
        const marcados = grupo.chips.filter((c) => chipsAtivos.has(`${grupo.id}:${c.id}`));
        if (marcados.length > 0 && !marcados.some((c) => c.predicate(row))) return false;
      }
      return true;
    });
    return ordenar(rows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity.data, busca, searchKeys, chipGroups, chipsAtivos, ordem, sortValues]);

  function abrirNovo() {
    setForm(makeEmpty());
    setEditing({ row: null });
    setErro(null);
  }
  function abrirEdicao(row: T) {
    setForm({ ...row });
    setEditing({ row });
    setErro(null);
  }

  function setCampo(name: string, value: string, type?: string) {
    const v = type === "number" ? Number(value) : type === "boolean" ? value === "true" : value;
    setForm((f) => ({ ...f, [name]: v }));
  }

  async function salvar() {
    setSaving(true);
    setErro(null);
    try {
      if (editing?.row) await entity.update(editing.row.id, form);
      else await entity.create(form);
      setEditing(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmarExclusao() {
    if (!excluir) return;
    try {
      await entity.remove(excluir.id);
    } finally {
      setExcluir(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg bg-zinc-800 text-orange-400 ring-1 ring-inset ring-zinc-700">
            {icon}
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold text-zinc-100">{title}</h1>
            <p className="text-sm text-zinc-400">{subtitle}</p>
          </div>
        </div>
        <Button onClick={abrirNovo}>
          <Plus className="size-4" /> Novo
        </Button>
      </div>

      {entity.mode === "demo" && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3.5 py-2.5 text-sm text-amber-400 ring-1 ring-inset ring-amber-500/25">
          <AlertTriangle className="size-4 shrink-0" />
          Modo demonstração — alterações ficam apenas nesta sessão. Configure a API para persistir.
        </div>
      )}

      {/* Busca + chips de filtro */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar…" className="pl-10" />
        </div>
        {chipGroups?.map((grupo) => (
          <div key={grupo.id} className="flex flex-wrap gap-1.5">
            {grupo.chips.map((chip) => {
              const ativo = chipsAtivos.has(`${grupo.id}:${chip.id}`);
              return (
                <button
                  key={chip.id}
                  onClick={() => alternarChip(grupo, chip.id)}
                  aria-pressed={ativo}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                    ativo
                      ? "border-transparent bg-orange-600 text-white shadow-sm"
                      : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-zinc-100",
                  )}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Tabela */}
      <Table>
        <THead>
          {columns.map((c) =>
            c.sortValue ? (
              <THOrdenavel key={c.header} coluna={c.header} ordem={ordem} onOrdenar={alternar} className={c.className}>
                {c.header}
              </THOrdenavel>
            ) : (
              <TH key={c.header} className={c.className}>
                {c.header}
              </TH>
            ),
          )}
          <TH className="w-24 text-right">Ações</TH>
        </THead>
        <TBody>
          {filtrados.length === 0 ? (
            <TR>
              <TD colSpan={columns.length + 1} className="py-10 text-center text-zinc-500">
                {entity.loading ? "Carregando…" : "Nenhum registro."}
              </TD>
            </TR>
          ) : (
            filtrados.map((row) => (
              <TR key={row.id}>
                {columns.map((c) => {
                  const conteudo = c.cell(row);
                  return (
                    <TD key={c.header} className={c.className}>
                      {/* Limite visual do template: texto longo trunca com
                          reticências em vez de deformar a tabela inteira. */}
                      <div
                        className="max-w-[250px] truncate"
                        title={typeof conteudo === "string" ? conteudo : undefined}
                      >
                        {conteudo}
                      </div>
                    </TD>
                  );
                })}
                <TD className="text-right">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => abrirEdicao(row)}
                      className="grid size-8 place-items-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-700/60 hover:text-zinc-100"
                      title="Editar"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      onClick={() => setExcluir(row)}
                      className="grid size-8 place-items-center rounded-lg text-zinc-400 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                      title="Excluir"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>

      {/* Modal criar/editar */}
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.row ? `Editar ${title.slice(0, -1).toLowerCase()}` : `Novo registro`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              Salvar
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          {fields.map((f) => (
            <div key={f.name} className={f.full ? "col-span-2" : "col-span-2 sm:col-span-1"}>
              <Field label={f.label} required={f.required}>
                {f.type === "boolean" ? (
                  <Select
                    value={String(form[f.name] ?? "false")}
                    onChange={(e) => setCampo(f.name, e.target.value, "boolean")}
                  >
                    <option value="false">Não</option>
                    <option value="true">Sim</option>
                  </Select>
                ) : f.type === "select" ? (
                  <Select
                    value={String(form[f.name] ?? "")}
                    onChange={(e) => setCampo(f.name, e.target.value)}
                  >
                    <option value="" disabled>
                      Selecione…
                    </option>
                    {f.options?.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Input
                    type={f.type === "number" ? "number" : "text"}
                    value={String(form[f.name] ?? "")}
                    placeholder={f.placeholder}
                    onChange={(e) => setCampo(f.name, e.target.value, f.type)}
                  />
                )}
              </Field>
            </div>
          ))}
        </div>
        {erro && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-rose-500/10 px-3.5 py-2.5 text-sm text-rose-400 ring-1 ring-inset ring-rose-500/25">
            <AlertTriangle className="size-4 shrink-0" /> {erro}
          </div>
        )}
      </Modal>

      {/* Modal excluir */}
      <Modal
        open={excluir !== null}
        onClose={() => setExcluir(null)}
        title="Excluir registro"
        footer={
          <>
            <Button variant="ghost" onClick={() => setExcluir(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmarExclusao}>
              <Trash2 className="size-4" /> Excluir
            </Button>
          </>
        }
      >
        <p className="text-sm text-zinc-300">Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.</p>
      </Modal>
    </div>
  );
}
