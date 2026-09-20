-- =====================================================================
-- BLACK DIAMOND — 0003_helpers.sql
-- Funções auxiliares de segurança usadas pelas RLS policies.
--
-- Todas são SECURITY DEFINER e retornam apenas os fatos mínimos sobre o
-- usuário atual (auth.uid()). As policies NUNCA devem depender do
-- frontend para autorizar consultas.
-- =====================================================================

-- O usuário atual é SUPERADMIN global?
create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select pp.is_superadmin
    from public.profiles pp
    where pp.id = auth.uid()
  ), false);
$$;

-- O usuário atual é membro ativo da barbearia?
create or replace function public.is_member_of(p_barbershop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members m
    where m.barbershop_id = p_barbershop_id
      and m.user_id = auth.uid()
      and m.is_active
  );
$$;

-- Papel do usuário atual dentro da barbearia ('owner' | 'barber' | null).
create or replace function public.current_role(p_barbershop_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select m.role::text
  from public.members m
  where m.barbershop_id = p_barbershop_id
    and m.user_id = auth.uid()
    and m.is_active
  limit 1;
$$;

-- Member id do usuário atual dentro da barbearia.
create or replace function public.current_member_id(p_barbershop_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select m.id
  from public.members m
  where m.barbershop_id = p_barbershop_id
    and m.user_id = auth.uid()
    and m.is_active
  limit 1;
$$;

-- A barbearia está ativa?
create or replace function public.barbershop_is_active(p_barbershop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select b.is_active from public.barbershops b where b.id = p_barbershop_id), false);
$$;