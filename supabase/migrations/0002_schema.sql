-- =====================================================================
-- BLACK DIAMOND — 0002_schema.sql
-- Schema multi-tenant: perfis, barbearias, membros, serviços,
-- horários, bloqueios, clientes e agendamentos.
--
-- Todo dado "de negócio" pertence a uma barbershop (tenant) e carrega
-- barbershop_id. Os membros (member_id) são reutilizados como "barbeiros".
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
create type public.appointment_status as enum
  ('agendado', 'confirmado', 'em_atendimento', 'concluido', 'cancelado', 'faltou');

create type public.member_role as enum
  ('owner', 'barber');

-- ---------------------------------------------------------------------
-- profiles — um registro por usuário autenticado (auth.users)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  full_name     text not null default '',
  avatar_url    text,
  is_superadmin boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- barbershops — o "tenant" do sistema
-- ---------------------------------------------------------------------
create table if not exists public.barbershops (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  description   text,
  about         text,
  address       text,
  phone         text,
  whatsapp      text,
  instagram     text,
  logo_url      text,
  hero_image_url text,
  primary_color text not null default '#c2a878',
  is_active     boolean not null default true,
  settings      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists barbershops_slug_idx on public.barbershops (slug);

-- ---------------------------------------------------------------------
-- members — vínculo usuário <-> barbearia (OWNER ou BARBER)
-- user_id pode ser nulo enquanto o dono não cria a conta do profissional
-- (o "placeholder" aparece na página pública assim que linkado).
-- ---------------------------------------------------------------------
create table if not exists public.members (
  id            uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops (id) on delete cascade,
  user_id       uuid references auth.users (id) on delete cascade,
  role          public.member_role not null default 'barber',
  is_active     boolean not null default true,
  full_name     text not null,
  specialty     text,
  bio           text,
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (barbershop_id, user_id)
);

create index if not exists members_barbershop_idx on public.members (barbershop_id);
create index if not exists members_user_idx on public.members (user_id);

-- Uma barbearia só possui UM dono ativo.
create unique index if not exists members_one_owner_idx
  on public.members (barbershop_id)
  where role = 'owner' and is_active;

-- ---------------------------------------------------------------------
-- services — serviços/preços oferecidos pela barbearia
-- ---------------------------------------------------------------------
create table if not exists public.services (
  id               uuid primary key default gen_random_uuid(),
  barbershop_id    uuid not null references public.barbershops (id) on delete cascade,
  name             text not null,
  description      text,
  price            numeric(10,2) not null check (price >= 0),
  duration_minutes int not null check (duration_minutes between 5 and 480),
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (barbershop_id, name) -- constraint services_barbershop_id_name_key (nome gerado automaticamente)
);

create index if not exists services_barbershop_idx on public.services (barbershop_id, is_active);

-- ---------------------------------------------------------------------
-- business_hours — horário de funcionamento da barbearia por dia da
-- semana (weekday: 0 = domingo ... 6 = sábado)
-- ---------------------------------------------------------------------
create table if not exists public.business_hours (
  id            uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops (id) on delete cascade,
  weekday       int not null check (weekday between 0 and 6),
  open_time     time not null,
  close_time    time not null,
  is_closed     boolean not null default false,
  check (close_time > open_time),
  unique (barbershop_id, weekday)
);

-- ---------------------------------------------------------------------
-- barber_hours — disponibilidade individual de cada profissional
-- ---------------------------------------------------------------------
create table if not exists public.barber_hours (
  id            uuid primary key default gen_random_uuid(),
  member_id     uuid not null references public.members (id) on delete cascade,
  barbershop_id uuid not null references public.barbershops (id) on delete cascade,
  weekday       int not null check (weekday between 0 and 6),
  open_time     time not null,
  close_time    time not null,
  is_closed     boolean not null default false,
  check (close_time > open_time),
  unique (member_id, weekday)
);

create index if not exists barber_hours_shop_idx on public.barber_hours (barbershop_id);

-- ---------------------------------------------------------------------
-- blocked_times — bloqueios (feriado, dia inteiro, horário específico,
-- férias ou compromisso pessoal). member_id nulo = bloqueio da barbearia.
-- ---------------------------------------------------------------------
create table if not exists public.blocked_times (
  id            uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops (id) on delete cascade,
  member_id     uuid references public.members (id) on delete cascade,
  start_at      timestamptz not null,
  end_at        timestamptz not null,
  reason        text,
  created_at    timestamptz not null default now(),
  check (end_at > start_at)
);

create index if not exists blocked_times_shop_idx on public.blocked_times (barbershop_id);
create index if not exists blocked_times_member_idx on public.blocked_times (member_id);

-- ---------------------------------------------------------------------
-- clients — clientes (criados automaticamente no agendamento)
-- ---------------------------------------------------------------------
create table if not exists public.clients (
  id            uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops (id) on delete cascade,
  name          text not null,
  whatsapp      text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (barbershop_id, whatsapp)
);

create index if not exists clients_shop_idx on public.clients (barbershop_id);

-- ---------------------------------------------------------------------
-- appointments — agendamentos
-- ---------------------------------------------------------------------
create table if not exists public.appointments (
  id             uuid primary key default gen_random_uuid(),
  barbershop_id  uuid not null references public.barbershops (id) on delete cascade,
  service_id     uuid not null references public.services (id),
  member_id      uuid not null references public.members (id),
  client_id      uuid references public.clients (id) on delete set null,
  client_name    text not null,
  client_whatsapp text not null,
  start_at       timestamptz not null,
  end_at         timestamptz not null,
  status         public.appointment_status not null default 'agendado',
  price          numeric(10,2) not null check (price >= 0),
  created_by     uuid references auth.users (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (end_at > start_at)
);

create index if not exists appointments_shop_start_idx on public.appointments (barbershop_id, start_at);
create index if not exists appointments_member_start_idx on public.appointments (member_id, start_at);
create index if not exists appointments_client_idx on public.appointments (client_id);

-- Um profissional não pode ter dois agendamentos ativos com o mesmo início.
create unique index if not exists appointments_member_start_unique
  on public.appointments (member_id, start_at)
  where status <> 'cancelado';

-- ---------------------------------------------------------------------
-- settings — configurações globais do sistema (apenas SUPERADMIN)
-- ---------------------------------------------------------------------
create table if not exists public.settings (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- =====================================================================
-- Triggers comuns
-- =====================================================================

-- Mantém updated_at atualizado.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

drop trigger if exists trg_barbershops_updated on public.barbershops;
create trigger trg_barbershops_updated
  before update on public.barbershops
  for each row execute procedure public.set_updated_at();

drop trigger if exists trg_members_updated on public.members;
create trigger trg_members_updated
  before update on public.members
  for each row execute procedure public.set_updated_at();

drop trigger if exists trg_services_updated on public.services;
create trigger trg_services_updated
  before update on public.services
  for each row execute procedure public.set_updated_at();

drop trigger if exists trg_clients_updated on public.clients;
create trigger trg_clients_updated
  before update on public.clients
  for each row execute procedure public.set_updated_at();

drop trigger if exists trg_appointments_updated on public.appointments;
create trigger trg_appointments_updated
  before update on public.appointments
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------
-- Auto-cria o profile quando um usuário é criado no auth.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------
-- Garante que end_at e price de um agendamento acompanhem o serviço.
-- ---------------------------------------------------------------------
create or replace function public.compute_appointment_bounds()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service public.services%rowtype;
begin
  select * into v_service from public.services where id = new.service_id;
  if not found then
    raise exception 'Serviço inválido.' using errcode = 'P0001';
  end if;
  if new.end_at is null then
    new.end_at := new.start_at + (v_service.duration_minutes || ' minutes')::interval;
  end if;
  if new.price is null then
    new.price := v_service.price;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_appointments_bounds on public.appointments;
create trigger trg_appointments_bounds
  before insert or update of service_id, start_at on public.appointments
  for each row execute procedure public.compute_appointment_bounds();