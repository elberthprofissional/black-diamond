-- =====================================================================
-- BLACK DIAMOND — 0007_admin_tools.sql
--
-- Ferramentas de bootstrap usadas SOMENTE com a service_role key
-- (scripts locais de desenvolvimento). NÃO devem ser chamadas pela
-- aplicação — a criação normal de donos/barbeiros acontece pela RPC
-- admin_invite_member (tela "Equipe"), que é protegida por OWNER.
-- =====================================================================

-- ---------------------------------------------------------------------
-- promote_to_superadmin(email) — primeiro SUPERADMIN do sistema
-- (ou reativa). Requer service_role (ou um superadmin já existente).
-- Depois do bootstrap, um SUPERADMIN também pode chamar.
-- ---------------------------------------------------------------------
create or replace function public.promote_to_superadmin(p_email text)
returns uuid
language plpgsql
security definer
set search_path = public
volatile
as $$
declare
  v_email   text := lower(trim(p_email));
  v_user_id uuid;
begin
  -- Permite este bootstrap apenas via service_role ou superadmin existente.
  if coalesce((auth.jwt()->>'role'), '') <> 'service_role'
     and not public.is_superadmin() then
    raise exception 'Operação restrita ao bootstrap (service_role).' using errcode = 'P0001';
  end if;

  select id into v_user_id from auth.users where lower(email) = v_email;
  if not found then
    raise exception 'Usuário não encontrado no auth. Crie o usuário primeiro (sign up ou admin.create_user).' using errcode = 'P0001';
  end if;

  insert into public.profiles (id, full_name, is_superadmin)
  values (v_user_id, split_part(v_email, '@', 1), true)
  on conflict (id) do update set is_superadmin = true;

  return v_user_id;
end;
$$;

-- ---------------------------------------------------------------------
-- revoke_superadmin(email)
-- ---------------------------------------------------------------------
create or replace function public.revoke_superadmin(p_email text)
returns void
language plpgsql
security definer
set search_path = public
volatile
as $$
declare
  v_email   text := lower(trim(p_email));
  v_user_id uuid;
begin
  if coalesce((auth.jwt()->>'role'), '') <> 'service_role'
     and not public.is_superadmin() then
    raise exception 'Operação restrita ao bootstrap (service_role).' using errcode = 'P0001';
  end if;

  select id into v_user_id from auth.users where lower(email) = v_email;
  if not found then
    raise exception 'Usuário não encontrado no auth.' using errcode = 'P0001';
  end if;

  update public.profiles set is_superadmin = false where id = v_user_id;
end;
$$;

revoke all on function public.promote_to_superadmin(text) from public;
revoke all on function public.revoke_superadmin(text) from public;
grant execute on function public.promote_to_superadmin(text) to service_role, authenticated;
grant execute on function public.revoke_superadmin(text) to service_role, authenticated;