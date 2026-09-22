-- =====================================================================
-- BLACK DIAMOND — 0006_clients_manual.sql
--
-- Clientes cadastrados manualmente (+ Adicionar cliente no painel).
-- · `clients.is_manual` marca clientes inseridos à mão pelo dono/barbeiro
--   (clientes vindos do agendamento continuam 99% automáticos).
-- · A policy de INSERT passa a permitir BARBER também (antes só OWNER),
--   já que o painel de clientes é acessível a dono, superadmin e barbeiro.
-- =====================================================================

alter table public.clients
  add column if not exists is_manual boolean not null default false;

drop policy if exists clients_insert on public.clients;
create policy clients_insert on public.clients
  for insert
  with check (
    public.is_superadmin()
    or public.current_role(barbershop_id) in ('owner', 'barber')
  );