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
-- Tabelas de GESTÃO (Etapa 5a/5b): tenants, permissoes, permissoes_log.
-- RLS ligada SEM nenhuma policy = browser não lê nem escreve NADA
-- (deny-by-default do Postgres); só a API (service role) acessa.
-- O front nunca consulta essas tabelas direto: permissões chegam
-- via GET /me e a tela Admin fala com a API. Sem esta trava, o
-- schema public exposto pelo PostgREST deixaria a matriz de
-- permissões legível/gravável com a chave anon.
-- ─────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['tenants','permissoes','permissoes_log'] loop
    execute format('alter table if exists %I enable row level security;', t);
  end loop;
end $$;

-- ─────────────────────────────────────────────────────────────
-- Dívida paga (task Autenticação): a leitura anônima temporária
-- foi removida. Com login obrigatório, o Realtime entrega eventos
-- ao papel `authenticated` — anon não lê mais nada.
-- ─────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────
-- MULTI-TENANT (Etapa 5) — política futura, DOCUMENTADA e NÃO ativada.
-- Hoje o isolamento por tenant é garantido em duas camadas:
--   1. API: toda query escopada pelo tenantId do usuário autenticado;
--   2. RPCs: filtro por "tenantId" dentro da transação (FOR UPDATE).
-- Quando o multi-tenant pleno for ativado (onboarding de outras
-- oficinas), a leitura direta do browser TAMBÉM precisa ser isolada.
-- Pré-requisito: custom claim `tenant_id` no JWT do Supabase Auth
-- (via Auth Hook "Custom Access Token"). Aí a política de leitura de
-- cada tabela com coluna "tenantId" troca `using (true)` por:
--
--   create policy "leitura_do_proprio_tenant" on <tabela>
--     for select to authenticated
--     using ("tenantId" = (auth.jwt() ->> 'tenant_id'));
--
-- Enquanto a claim não existir, ativar essa política DERRUBARIA o
-- Realtime (jwt sem tenant_id → nenhuma linha visível). Por isso a
-- troca acontece junto com o onboarding, não antes.
-- ─────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['produtos','movimentacoes_estoque'] loop
    execute format('drop policy if exists "leitura_anon_temporaria" on %I;', t);
  end loop;
end $$;
