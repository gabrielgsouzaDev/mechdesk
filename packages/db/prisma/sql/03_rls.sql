-- ════════════════════════════════════════════════════════════════
--  RLS (Row Level Security) — segurança no banco, não só no front
--  Estratégia Fase 0 (base, será refinada por papel nas próximas fases):
--    - A API usa a SERVICE ROLE → faz bypass de RLS (operações de servidor).
--    - O front (anon/authenticated) só LÊ, e só quando autenticado.
--    - Escrita direta pelo browser fica bloqueada: tudo passa pela API.
--  Assim o tempo real entrega leitura ao vivo sem abrir brecha de escrita.
-- ════════════════════════════════════════════════════════════════

do $$
declare t text;
begin
  foreach t in array array[
    'usuarios','funcionarios','clientes','veiculos','produtos',
    'movimentacoes_estoque','ordens_servico','itens_ordem_servico',
    'emprestimos','configuracoes'
  ] loop
    execute format('alter table %I enable row level security;', t);

    -- Remove política anterior (idempotente)
    execute format('drop policy if exists "leitura_autenticada" on %I;', t);

    -- Leitura para usuários autenticados (o tempo real do front depende disto)
    execute format($f$
      create policy "leitura_autenticada" on %I
        for select to authenticated using (true);
    $f$, t);
  end loop;
end $$;

-- Observação: nenhuma policy de INSERT/UPDATE/DELETE para 'authenticated' →
-- escrita pelo browser é negada por padrão. A API (service role) ignora RLS.

-- ─────────────────────────────────────────────────────────────
-- Dívida paga (task Autenticação): a leitura anônima temporária
-- foi removida. Com login obrigatório, o Realtime entrega eventos
-- ao papel `authenticated` — anon não lê mais nada.
-- ─────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['produtos','movimentacoes_estoque'] loop
    execute format('drop policy if exists "leitura_anon_temporaria" on %I;', t);
  end loop;
end $$;
