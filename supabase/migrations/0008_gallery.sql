-- =====================================================================
-- BLACK DIAMOND — 0008_gallery.sql
--
-- Galeria pública: fotos dos cortes que aparecem na página inicial.
-- O dono gerencia no painel (Painel > Galeria). Sem foto cadastrada,
-- a página mostra um placeholder com a legenda.
-- =====================================================================

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

-- ---------------------------------------------------------------------
-- RLS: leitura pública; gestão apenas superadmin/owner da barbearia.
-- ---------------------------------------------------------------------
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
-- Seed (desenvolvimento): quadros vazios da BLACK DIAMOND.
-- image_url NULL = placeholder (dono preenche no painel).
-- ---------------------------------------------------------------------
insert into public.gallery_items (barbershop_id, image_url, caption, position)
select b.id, null, v.caption, v.position
from public.barbershops b,
  (values
    ('Corte de Cabelo', 0),
    ('Barba alinhada',  1),
    ('Barba com Toalha',2),
    ('Corte degradê',   3),
    ('Acabamento',      4),
    ('Sobrancelha',     5)
  ) as v(caption, position)
where b.slug = 'black-diamond'
  and not exists (
    select 1 from public.gallery_items g where g.barbershop_id = b.id
  );