-- ════════════════════════════════════════════════════════════════
--  Tempo real (Supabase Realtime)
--  Tabelas que o front escuta para atualizar SEM F5.
--  Rode DEPOIS de `prisma migrate`.
-- ════════════════════════════════════════════════════════════════

alter table "produtos"               replica identity full;
alter table "movimentacoes_estoque"  replica identity full;
alter table "ordens_servico"         replica identity full;
alter table "emprestimos"            replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table "produtos";
  exception when duplicate_object then null; end;
  begin
    alter publication supabase_realtime add table "movimentacoes_estoque";
  exception when duplicate_object then null; end;
  begin
    alter publication supabase_realtime add table "ordens_servico";
  exception when duplicate_object then null; end;
  begin
    alter publication supabase_realtime add table "emprestimos";
  exception when duplicate_object then null; end;
end $$;
