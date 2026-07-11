-- ════════════════════════════════════════════════════════════════
--  RPC: movimentação de estoque atômica (à prova de concorrência)
--  Numa ÚNICA transação:
--    ENTRADA → estoqueAtual += qtd
--    SAIDA   → estoqueAtual -= qtd  (só se houver saldo; senão ESTOQUE_INSUFICIENTE)
--    AJUSTE  → estoqueAtual  = qtd  (contagem de inventário; define o valor absoluto)
--  Sempre grava o movimento no ledger imutável com o saldo resultante.
--  FERRAMENTA: unidades emprestadas (status ABERTO) continuam contando em
--  estoqueAtual mas NÃO estão na prateleira — SAIDA só pode consumir o
--  disponível (FERRAMENTA_EMPRESTADA se esbarrar nos emprestados) e AJUSTE
--  não pode definir o saldo abaixo do que está emprestado
--  (AJUSTE_ABAIXO_EMPRESTADO). O FOR UPDATE na linha do produto serializa
--  contra registrar_emprestimo/perda e outras movimentações.
--  Obs.: ids são TEXT (Prisma String @id @default(uuid())).
--
--  MULTI-TENANT (Etapa 5): todas as RPCs recebem p_tenant_id (default
--  'default') e TODO acesso a linha — leitura, trava e escrita — é
--  filtrado pelo tenant DENTRO da transação. Um id de outro tenant é
--  indistinguível de um id inexistente (PRODUTO_NAO_ENCONTRADO /
--  EMPRESTIMO_NAO_ENCONTRADO): cross-over não vaza nem existência.
--  A trava FOR UPDATE continua por linha de produto — tenants nunca
--  disputam a mesma linha, então não há contenção entre oficinas.
-- ════════════════════════════════════════════════════════════════

-- Remove versões antigas (assinaturas anteriores). O DROP é necessário
-- porque CREATE OR REPLACE não permite mudar a lista de parâmetros.
drop function if exists registrar_saida_peca(uuid, int, text, uuid, uuid, uuid, text);
drop function if exists registrar_movimentacao_estoque(uuid, int, text, uuid, uuid, text);
drop function if exists registrar_movimentacao_estoque(text, int, text, text, text, text);

create or replace function registrar_movimentacao_estoque(
  p_produto_id text,
  p_qtd        int,
  p_tipo       text,
  p_usuario_id text,
  p_os_id      text default null,
  p_motivo     text default null,
  p_tenant_id  text default 'default'
) returns json
language plpgsql
set search_path = public
as $$
declare
  v_categoria  text;
  v_estoque    int;
  v_emprestado int := 0;
  v_saldo      int;
  v_mov_id     text := gen_random_uuid()::text;
begin
  if p_qtd < 0 then
    raise exception 'QUANTIDADE_INVALIDA';
  end if;

  -- Trava a linha do produto: nenhum empréstimo/perda/movimentação
  -- concorrente lê ou grava saldo enquanto esta transação não terminar.
  -- Filtro por tenant na MESMA cláusula: produto de outra oficina não
  -- é encontrado (nem travado).
  select "categoria"::text, "estoqueAtual" into v_categoria, v_estoque
    from "produtos" where id = p_produto_id and "tenantId" = p_tenant_id
    for update;
  if not found then
    raise exception 'PRODUTO_NAO_ENCONTRADO';
  end if;

  if v_categoria = 'FERRAMENTA' and p_tipo in ('SAIDA', 'AJUSTE') then
    select coalesce(sum(quantidade), 0) into v_emprestado
      from "emprestimos"
     where "produtoId" = p_produto_id and "tenantId" = p_tenant_id and status = 'ABERTO';
  end if;

  if p_tipo = 'ENTRADA' then
    v_saldo := v_estoque + p_qtd;

  elsif p_tipo = 'SAIDA' then
    if p_qtd > v_estoque then
      raise exception 'ESTOQUE_INSUFICIENTE';
    end if;
    -- Ferramenta emprestada não está na prateleira: não pode sair de novo.
    if p_qtd > v_estoque - v_emprestado then
      raise exception 'FERRAMENTA_EMPRESTADA';
    end if;
    v_saldo := v_estoque - p_qtd;

  elsif p_tipo = 'AJUSTE' then
    -- A contagem física não enxerga o que está emprestado; o saldo nunca
    -- pode ficar menor do que as unidades fora com funcionários.
    if p_qtd < v_emprestado then
      raise exception 'AJUSTE_ABAIXO_EMPRESTADO';
    end if;
    v_saldo := p_qtd;

  else
    raise exception 'TIPO_INVALIDO';
  end if;

  update "produtos" set "estoqueAtual" = v_saldo
   where id = p_produto_id and "tenantId" = p_tenant_id;

  insert into "movimentacoes_estoque"
    (id, "tenantId", "produtoId", tipo, quantidade, "saldoApos",
     "usuarioId", "ordemServicoId", motivo, "criadoEm")
  values
    (v_mov_id, p_tenant_id, p_produto_id, p_tipo::"TipoMovimentacao", p_qtd, v_saldo,
     p_usuario_id, p_os_id, p_motivo, now());

  return json_build_object('movimentacaoId', v_mov_id, 'saldoApos', v_saldo);
end;
$$;

-- Zero Trust: só a API (service_role) pode executar a RPC.
-- Sem isto, o PostgREST exporia a função ao anon via /rest/v1/rpc.
revoke execute on function registrar_movimentacao_estoque(text, int, text, text, text, text, text) from public, anon, authenticated;
grant execute on function registrar_movimentacao_estoque(text, int, text, text, text, text, text) to service_role;

-- Higiene: trava função utilitária de template (se existir) para não ser
-- executável por anon/authenticated via REST.
do $$
begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'rls_auto_enable') then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;

-- ════════════════════════════════════════════════════════════════
--  RPCs: ferramentaria (empréstimo / devolução / perda)
--  Ferramenta é retornável: EMPRESTIMO/DEVOLUCAO NÃO tocam
--  "estoqueAtual" (a ferramenta continua sendo do almoxarifado, só está
--  fora). A disponibilidade é sempre calculada:
--    disponível = estoqueAtual - soma(quantidade dos empréstimos ABERTO)
--  Perda converte em baixa DEFINITIVA (SAIDA, decrementa estoqueAtual).
-- ════════════════════════════════════════════════════════════════

drop function if exists registrar_emprestimo(text, int, text, text, int, text);
drop function if exists registrar_devolucao(text, text, text);
drop function if exists registrar_perda(text, text, text);

create or replace function registrar_emprestimo(
  p_produto_id     text,
  p_qtd            int,
  p_funcionario_id text,
  p_usuario_id     text,
  p_prazo_horas    int default null,
  p_motivo         text default null,
  p_tenant_id      text default 'default'
) returns json
language plpgsql
set search_path = public
as $$
declare
  v_categoria   text;
  v_estoque     int;
  v_emprestado  int;
  v_disponivel  int;
  v_prazo_horas int;
  v_emp_id      text := gen_random_uuid()::text;
  v_mov_id      text := gen_random_uuid()::text;
begin
  if p_qtd <= 0 then
    raise exception 'QUANTIDADE_INVALIDA';
  end if;

  -- FOR UPDATE serializa empréstimos concorrentes da mesma ferramenta (e
  -- também contra SAIDA/AJUSTE/perda): sem ele, dois check-then-insert
  -- simultâneos passariam ambos na checagem de disponibilidade.
  select "categoria"::text, "estoqueAtual" into v_categoria, v_estoque
    from "produtos" where id = p_produto_id and "tenantId" = p_tenant_id
    for update;
  if not found then
    raise exception 'PRODUTO_NAO_ENCONTRADO';
  end if;
  if v_categoria <> 'FERRAMENTA' then
    raise exception 'CATEGORIA_INVALIDA';
  end if;

  select coalesce(sum(quantidade), 0) into v_emprestado
    from "emprestimos"
   where "produtoId" = p_produto_id and "tenantId" = p_tenant_id and status = 'ABERTO';
  v_disponivel := v_estoque - v_emprestado;
  if p_qtd > v_disponivel then
    raise exception 'FERRAMENTA_INDISPONIVEL';
  end if;

  -- Prazo padrão é POR TENANT (uma linha de configuração por oficina).
  select "prazoEmprestimoHoras" into v_prazo_horas
    from "configuracoes" where "tenantId" = p_tenant_id;
  v_prazo_horas := coalesce(p_prazo_horas, v_prazo_horas, 24);

  insert into "emprestimos"
    (id, "tenantId", "produtoId", "funcionarioId", quantidade, status, "retiradoEm", "prazoEm", "usuarioRetiradaId", motivo)
  values
    (v_emp_id, p_tenant_id, p_produto_id, p_funcionario_id, p_qtd, 'ABERTO', now(),
     now() + (v_prazo_horas || ' hours')::interval, p_usuario_id, p_motivo);

  insert into "movimentacoes_estoque"
    (id, "tenantId", "produtoId", tipo, quantidade, "saldoApos", "usuarioId", "emprestimoId", motivo, "criadoEm")
  values
    (v_mov_id, p_tenant_id, p_produto_id, 'EMPRESTIMO'::"TipoMovimentacao", p_qtd, v_estoque, p_usuario_id, v_emp_id, p_motivo, now());

  return json_build_object('emprestimoId', v_emp_id, 'movimentacaoId', v_mov_id, 'saldoApos', v_estoque);
end;
$$;

create or replace function registrar_devolucao(
  p_emprestimo_id text,
  p_usuario_id    text,
  p_motivo        text default null,
  p_tenant_id     text default 'default'
) returns json
language plpgsql
set search_path = public
as $$
declare
  v_produto_id text;
  v_qtd        int;
  v_saldo      int;
  v_mov_id     text := gen_random_uuid()::text;
begin
  -- Empréstimo de outro tenant = não encontrado (cross-over não vaza nada).
  select "produtoId", quantidade into v_produto_id, v_qtd
    from "emprestimos"
   where id = p_emprestimo_id and "tenantId" = p_tenant_id and status = 'ABERTO'
    for update;
  if not found then
    raise exception 'EMPRESTIMO_NAO_ENCONTRADO';
  end if;

  update "emprestimos" set
    status = 'DEVOLVIDO', "devolvidoEm" = now(),
    "usuarioFechamentoId" = p_usuario_id, "motivoFechamento" = p_motivo
   where id = p_emprestimo_id;

  select "estoqueAtual" into v_saldo
    from "produtos" where id = v_produto_id and "tenantId" = p_tenant_id;

  insert into "movimentacoes_estoque"
    (id, "tenantId", "produtoId", tipo, quantidade, "saldoApos", "usuarioId", "emprestimoId", motivo, "criadoEm")
  values
    (v_mov_id, p_tenant_id, v_produto_id, 'DEVOLUCAO'::"TipoMovimentacao", v_qtd, v_saldo, p_usuario_id, p_emprestimo_id, p_motivo, now());

  return json_build_object('movimentacaoId', v_mov_id, 'saldoApos', v_saldo);
end;
$$;

create or replace function registrar_perda(
  p_emprestimo_id text,
  p_usuario_id    text,
  p_motivo        text,
  p_tenant_id     text default 'default'
) returns json
language plpgsql
set search_path = public
as $$
declare
  v_produto_id text;
  v_qtd        int;
  v_saldo      int;
  v_mov_id     text := gen_random_uuid()::text;
begin
  if p_motivo is null or length(trim(p_motivo)) = 0 then
    raise exception 'MOTIVO_OBRIGATORIO';
  end if;

  select "produtoId", quantidade into v_produto_id, v_qtd
    from "emprestimos"
   where id = p_emprestimo_id and "tenantId" = p_tenant_id and status = 'ABERTO'
    for update;
  if not found then
    raise exception 'EMPRESTIMO_NAO_ENCONTRADO';
  end if;

  update "produtos" set "estoqueAtual" = "estoqueAtual" - v_qtd
   where id = v_produto_id and "tenantId" = p_tenant_id and "estoqueAtual" >= v_qtd
   returning "estoqueAtual" into v_saldo;
  if not found then
    raise exception 'ESTOQUE_INSUFICIENTE';
  end if;

  update "emprestimos" set
    status = 'PERDIDO', "devolvidoEm" = now(),
    "usuarioFechamentoId" = p_usuario_id, "motivoFechamento" = p_motivo
   where id = p_emprestimo_id;

  insert into "movimentacoes_estoque"
    (id, "tenantId", "produtoId", tipo, quantidade, "saldoApos", "usuarioId", "emprestimoId", motivo, "criadoEm")
  values
    (v_mov_id, p_tenant_id, v_produto_id, 'SAIDA'::"TipoMovimentacao", v_qtd, v_saldo, p_usuario_id, p_emprestimo_id, 'Perda: ' || p_motivo, now());

  return json_build_object('movimentacaoId', v_mov_id, 'saldoApos', v_saldo);
end;
$$;

-- Zero Trust: mesma regra da RPC de movimentação — só service_role executa.
revoke execute on function registrar_emprestimo(text, int, text, text, int, text, text) from public, anon, authenticated;
revoke execute on function registrar_devolucao(text, text, text, text) from public, anon, authenticated;
revoke execute on function registrar_perda(text, text, text, text) from public, anon, authenticated;
grant execute on function registrar_emprestimo(text, int, text, text, int, text, text) to service_role;
grant execute on function registrar_devolucao(text, text, text, text) to service_role;
grant execute on function registrar_perda(text, text, text, text) to service_role;
