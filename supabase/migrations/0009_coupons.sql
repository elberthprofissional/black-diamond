-- =====================================================================
-- BLACK DIAMOND — 0009_coupons.sql
--
-- Cupons de desconto: o dono cria cupons (R$ ou %) com limite de usos
-- e validade. O cliente aplica no agendamento e o desconto é calculado
-- e reservado no banco (não confia no frontend).
-- =====================================================================

-- ------------------------------------------------ tabela coupons
create table if not exists public.coupons (
  id             uuid primary key default gen_random_uuid(),
  barbershop_id  uuid not null references public.barbershops (id) on delete cascade,
  code           text not null,
  title          text,
  discount_type  text not null default 'fixed' check (discount_type in ('fixed', 'percent')),
  discount_value numeric(10,2) not null check (discount_value > 0),
  max_uses       int  not null default 1 check (max_uses >= 1),
  used_count     int  not null default 0 check (used_count between 0 and max_uses),
  starts_at      timestamptz,
  expires_at     timestamptz,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (barbershop_id, code),
  check (length(trim(code)) between 2 and 40)
);

create index if not exists coupons_shop_idx on public.coupons (barbershop_id, is_active);

-- ------------------------------------------------ RLS
alter table public.coupons enable row level security;

create policy coupons_select on public.coupons
  for select
  using (public.is_superadmin() or public.is_member_of(barbershop_id));

create policy coupons_insert on public.coupons
  for insert
  with check (public.is_superadmin() or public.current_role(barbershop_id) = 'owner');

create policy coupons_update on public.coupons
  for update
  using (public.is_superadmin() or public.current_role(barbershop_id) = 'owner');

create policy coupons_delete on public.coupons
  for delete
  using (public.is_superadmin() or public.current_role(barbershop_id) = 'owner');

-- ------------------------------------------------ agendamento guarda o cupom
alter table public.appointments
  add column if not exists coupon_id uuid references public.coupons (id) on delete set null,
  add column if not exists discount   numeric(10,2) not null default 0;

create index if not exists appointments_coupon_idx on public.appointments (coupon_id);

-- ------------------------------------------------ consulta pública de validade
-- Retorna apenas o necessário para o cliente aplicar o cupom na página.
create or replace function public.get_coupon_validity(
  p_barbershop_id uuid,
  p_code text
) returns jsonb
language plpgsql
security definer
set search_path = public
volatile
as $$
declare
  v_coupon public.coupons%rowtype;
begin
  select * into v_coupon
  from public.coupons
  where barbershop_id = p_barbershop_id
    and upper(trim(code)) = upper(trim(coalesce(p_code, '')));

  if not found or not v_coupon.is_active then
    return jsonb_build_object('is_valid', false, 'reason', 'Cupom não encontrado ou inativo.');
  end if;
  if v_coupon.starts_at is not null and v_coupon.starts_at > now() then
    return jsonb_build_object('is_valid', false, 'reason', 'Este cupom ainda não está ativo.');
  end if;
  if v_coupon.expires_at is not null and v_coupon.expires_at < now() then
    return jsonb_build_object('is_valid', false, 'reason', 'Este cupom expirou.');
  end if;
  if v_coupon.used_count >= v_coupon.max_uses then
    return jsonb_build_object('is_valid', false, 'reason', 'Este cupom já atingiu o limite de usos.');
  end if;

  return jsonb_build_object(
    'is_valid', true,
    'coupon_id', v_coupon.id,
    'code', v_coupon.code,
    'title', v_coupon.title,
    'discount_type', v_coupon.discount_type,
    'discount_value', v_coupon.discount_value,
    'uses_left', v_coupon.max_uses - v_coupon.used_count
  );
end;
$$;

revoke all on function public.get_coupon_validity(uuid, text) from public, anon, authenticated;
grant execute on function public.get_coupon_validity(uuid, text) to anon, authenticated;

-- ------------------------------------------------ book_appointment com cupom
-- Remove a assinatura antiga (0005) para evitar ambiguidade de resolução
-- e mantém apenas a versão com cupom. Nova assinatura (p_coupon_code
-- opcional): valida, calcula o desconto, grava no agendamento e consome
-- 1 uso do cupom de forma atômica.
drop function if exists public.book_appointment(uuid, uuid, uuid, timestamptz, text, text, text);
create or replace function public.book_appointment(
  p_barbershop_id  uuid,
  p_service_id     uuid,
  p_member_id      uuid,
  p_start_at       timestamptz,
  p_client_name    text,
  p_client_whatsapp text,
  p_timezone       text default 'America/Sao_Paulo',
  p_coupon_code    text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
volatile
as $$
declare
  v_shop      public.barbershops%rowtype;
  v_service   public.services%rowtype;
  v_member    public.members%rowtype;
  v_client_id uuid;
  v_appt      public.appointments%rowtype;
  v_coupon    public.coupons%rowtype;
  v_whatsapp  text;
  v_end       timestamptz;
  v_discount  numeric(10,2) := 0;
  v_price     numeric(10,2);
begin
  perform set_config('timezone', p_timezone, true);

  select * into v_shop from public.barbershops where id = p_barbershop_id;
  if not found then
    raise exception 'Barbearia não encontrada.' using errcode = 'P0001';
  end if;
  if not v_shop.is_active then
    raise exception 'Barbearia indisponível no momento.' using errcode = 'P0001';
  end if;

  select * into v_service from public.services where id = p_service_id and barbershop_id = p_barbershop_id;
  if not found then
    raise exception 'Serviço inválido.' using errcode = 'P0001';
  end if;
  if not v_service.is_active then
    raise exception 'Serviço indisponível.' using errcode = 'P0001';
  end if;

  select * into v_member from public.members where id = p_member_id and barbershop_id = p_barbershop_id;
  if not found then
    raise exception 'Profissional inválido.' using errcode = 'P0001';
  end if;
  if not v_member.is_active then
    raise exception 'Profissional indisponível.' using errcode = 'P0001';
  end if;

  if p_client_name is null or trim(p_client_name) = '' then
    raise exception 'Informe o seu nome.' using errcode = 'P0001';
  end if;

  v_whatsapp := regexp_replace(coalesce(p_client_whatsapp, ''), '\D', '', 'g');
  if length(v_whatsapp) < 10 or length(v_whatsapp) > 13 then
    raise exception 'Informe um WhatsApp válido (com DDD e número).' using errcode = 'P0001';
  end if;

  if p_start_at is null then
    raise exception 'Horário inválido.' using errcode = 'P0001';
  end if;

  -- Revalida o slot no banco (não confia no que o frontend mandou).
  if not exists (
    select 1
    from public._find_slots(p_barbershop_id, p_service_id, p_member_id, p_start_at::date, p_timezone) s
    where s = p_start_at
  ) then
    raise exception 'Este horário não está mais disponível. Escolha outro.' using errcode = 'P0001';
  end if;

  -- Proteção contra corrida: dois pedidos simultâneos do mesmo slot.
  perform pg_advisory_xact_lock(hashtextextended(p_member_id::text || '|' || p_start_at::text, 0));

  if exists (
    select 1 from public.appointments a
    where a.member_id = p_member_id
      and a.status <> 'cancelado'
      and a.start_at < p_start_at + (v_service.duration_minutes || ' minutes')::interval
      and a.end_at   > p_start_at
  ) then
    raise exception 'Este horário não está mais disponível. Escolha outro.' using errcode = 'P0001';
  end if;

  -- Cupom de desconto (opcional).
  if p_coupon_code is not null and trim(p_coupon_code) <> '' then
    select * into v_coupon
    from public.coupons
    where barbershop_id = p_barbershop_id
      and upper(trim(code)) = upper(trim(p_coupon_code))
    for update;

    if not found or not v_coupon.is_active then
      raise exception 'Cupom inválido ou inativo.' using errcode = 'P0001';
    end if;
    if v_coupon.starts_at is not null and v_coupon.starts_at > now() then
      raise exception 'Este cupom ainda não está ativo.' using errcode = 'P0001';
    end if;
    if v_coupon.expires_at is not null and v_coupon.expires_at < now() then
      raise exception 'Este cupom expirou.' using errcode = 'P0001';
    end if;
    if v_coupon.used_count >= v_coupon.max_uses then
      raise exception 'Este cupom já atingiu o limite de usos.' using errcode = 'P0001';
    end if;

    if v_coupon.discount_type = 'percent' then
      v_discount := round(v_service.price * v_coupon.discount_value / 100, 2);
    else
      v_discount := least(v_coupon.discount_value, v_service.price);
    end if;
  end if;

  v_price := v_service.price - v_discount;
  v_end := p_start_at + (v_service.duration_minutes || ' minutes')::interval;

  insert into public.clients (barbershop_id, name, whatsapp)
  values (p_barbershop_id, trim(p_client_name), v_whatsapp)
  on conflict (barbershop_id, whatsapp) do update set name = excluded.name
  returning id into v_client_id;

  insert into public.appointments (
    barbershop_id, service_id, member_id, client_id,
    client_name, client_whatsapp, start_at, end_at,
    status, price, coupon_id, discount, created_by
  ) values (
    p_barbershop_id, p_service_id, p_member_id, v_client_id,
    trim(p_client_name), v_whatsapp, p_start_at, v_end,
    'agendado', v_price, v_coupon.id, v_discount, auth.uid()
  )
  returning * into v_appt;

  -- Consome o uso do cupom (linha está travada pelo FOR UPDATE acima).
  if v_coupon.id is not null then
    update public.coupons
    set used_count = used_count + 1
    where id = v_coupon.id;
  end if;

  return jsonb_build_object(
    'id',            v_appt.id,
    'barbershop_id', v_appt.barbershop_id,
    'service_id',    v_appt.service_id,
    'service_name',  v_service.name,
    'service_price', v_price,
    'duration_minutes', v_service.duration_minutes,
    'member_id',     v_appt.member_id,
    'member_name',   v_member.full_name,
    'client_name',   v_appt.client_name,
    'client_whatsapp', v_appt.client_whatsapp,
    'start_at',      v_appt.start_at,
    'end_at',        v_appt.end_at,
    'status',        v_appt.status::text,
    'coupon_id',     v_appt.coupon_id,
    'discount',      v_discount
  );
end;
$$;

revoke all on function public.book_appointment(uuid, uuid, uuid, timestamptz, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.book_appointment(uuid, uuid, uuid, timestamptz, text, text, text, text)
  to anon, authenticated;

-- ------------------------------------------------ exemplo (editável no painel)
insert into public.coupons (barbershop_id, code, title, discount_type, discount_value, max_uses, is_active)
select b.id, 'BLACK10', 'Primeiro corte — R$10 de desconto', 'fixed', 10.00, 5, true
from public.barbershops b
where b.slug = 'black-diamond'
  and not exists (
    select 1 from public.coupons c where c.barbershop_id = b.id and upper(c.code) = 'BLACK10'
  );