-- =====================================================================
-- BLACK DIAMOND — 0003_features.sql
--
-- Funcionalidades complementares:
--   · Galeria pública (fotos dos cortes na página inicial)
--   · Cupons de desconto (R$ ou %) com limite de usos e validade
--   · Bucket público "gallery" no Storage (fotos de galeria e de perfis)
--
-- A tabela coupons passa a ser referenciada pelos agendamentos — por
-- isso as colunas coupon_id/discount são adicionadas aqui, junto dela.
-- =====================================================================

-- ---------------------------------------------------------------------
-- gallery_items — galeria pública de fotos
-- ---------------------------------------------------------------------
create table if not exists public.gallery_items (
  id            uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops (id) on delete cascade,
  image_url     text,
  caption       text,
  position      int  not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists gallery_items_shop_idx on public.gallery_items (barbershop_id, position);

alter table public.gallery_items enable row level security;

create policy gallery_items_select on public.gallery_items
  for select
  using (true);

create policy gallery_items_insert on public.gallery_items
  for insert
  with check (public.is_superadmin() or public.current_role(barbershop_id) = 'owner');

create policy gallery_items_update on public.gallery_items
  for update
  using (public.is_superadmin() or public.current_role(barbershop_id) = 'owner');

create policy gallery_items_delete on public.gallery_items
  for delete
  using (public.is_superadmin() or public.current_role(barbershop_id) = 'owner');

-- ---------------------------------------------------------------------
-- coupons — descontos na página de agendamento
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- appointments passa a guardar o cupom aplicado
-- ---------------------------------------------------------------------
alter table public.appointments
  add column if not exists coupon_id uuid references public.coupons (id) on delete set null,
  add column if not exists discount   numeric(10,2) not null default 0;

create index if not exists appointments_coupon_idx on public.appointments (coupon_id);

-- ---------------------------------------------------------------------
-- Consulta pública de validade do cupom (o cliente aplica na página)
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- Storage: bucket público "gallery" (fotos da galeria e de perfis)
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from storage.buckets where name = 'gallery') then
    perform storage.create_bucket('gallery', jsonb_build_object('public', true));
  end if;
end $$;

-- Leitura pública (o bucket já é público, mas garante no nível da policy).
create policy "gallery_read_public"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'gallery');

-- Upload/edição/exclusão por qualquer usuário autenticado (dono/barbeiro/admin).
create policy "gallery_write_authenticated"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'gallery');

create policy "gallery_update_authenticated"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'gallery')
  with check (bucket_id = 'gallery');

create policy "gallery_delete_authenticated"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'gallery');