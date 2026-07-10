import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { isLiveMode } from "@/lib/config";

export type EntityData<T> = {
  mode: "live" | "demo";
  data: T[];
  loading: boolean;
  create: (d: Partial<T>) => Promise<void>;
  update: (id: string, d: Partial<T>) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

// CRUD genérico que funciona em dois modos:
//  - live: React Query contra a API (com invalidação).
//  - demo: estado local semeado com mock (para avaliar telas sem backend).
export function useEntityData<T extends { id: string }>(opts: {
  key: string;
  endpoint: string;
  seed: T[];
}): EntityData<T> {
  const live = isLiveMode;
  const qc = useQueryClient();
  const [demo, setDemo] = useState<T[]>(opts.seed);

  const q = useQuery({
    queryKey: [opts.key],
    queryFn: () => api.get<T[]>(opts.endpoint),
    enabled: live,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: [opts.key] });
  const mCreate = useMutation({ mutationFn: (d: Partial<T>) => api.post<T>(opts.endpoint, d), onSuccess: invalidate });
  const mUpdate = useMutation({
    mutationFn: ({ id, d }: { id: string; d: Partial<T> }) => api.patch<T>(`${opts.endpoint}/${id}`, d),
    onSuccess: invalidate,
  });
  const mRemove = useMutation({ mutationFn: (id: string) => api.del(`${opts.endpoint}/${id}`), onSuccess: invalidate });

  if (!live) {
    return {
      mode: "demo",
      data: demo,
      loading: false,
      create: async (d) => setDemo((a) => [{ ...(d as T), id: crypto.randomUUID() }, ...a]),
      update: async (id, d) => setDemo((a) => a.map((x) => (x.id === id ? { ...x, ...d } : x))),
      remove: async (id) => setDemo((a) => a.filter((x) => x.id !== id)),
    };
  }

  return {
    mode: "live",
    data: q.data ?? [],
    loading: q.isLoading,
    create: async (d) => void (await mCreate.mutateAsync(d)),
    update: async (id, d) => void (await mUpdate.mutateAsync({ id, d })),
    remove: async (id) => void (await mRemove.mutateAsync(id)),
  };
}
