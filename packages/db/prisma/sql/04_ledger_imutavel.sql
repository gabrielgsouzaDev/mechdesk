-- ════════════════════════════════════════════════════════════════
--  Ledger imutável (Avaliação 02: "histórico deve registrar tudo de
--  forma imutável"). movimentacoes_estoque é INSERT-only por design —
--  aqui isso vira regra do BANCO, não convenção da aplicação:
--    1) trigger rejeita UPDATE/DELETE de qualquer papel (inclusive a
--       service_role da API — nem um bug na API consegue reescrever);
--    2) revoke tira o privilégio de update/delete dos papéis do Supabase.
--  Correções legítimas entram como novo movimento (AJUSTE com motivo).
-- ════════════════════════════════════════════════════════════════

create or replace function ledger_imutavel() returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'LEDGER_IMUTAVEL: movimentações não podem ser alteradas ou apagadas — registre um AJUSTE com motivo.';
end;
$$;

revoke execute on function ledger_imutavel() from public, anon, authenticated;

drop trigger if exists trg_ledger_imutavel on "movimentacoes_estoque";
create trigger trg_ledger_imutavel
  before update or delete on "movimentacoes_estoque"
  for each row execute function ledger_imutavel();

revoke update, delete on "movimentacoes_estoque" from public, anon, authenticated, service_role;
