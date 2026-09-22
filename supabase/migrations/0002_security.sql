-- =====================================================================
-- BLACK DIAMOND — 0002_security.sql
-- RLS + policies + triggers de proteção.
--
-- Funções auxiliares de segurança usadas pelas policies: todas são
-- SECURITY DEFINER e retornam apenas os fatos mínimos sobre o usuário
-- atual (auth.uid()). As policies NUNCA dependem do frontend.
--
-- Regra central: o banco é a fonte da verdade da autorização. Um BARBER
-- só enxerga a própria agenda; um OWNER só a sua barbearia; a página
-- pública lê apenas dados públicos (barbearia ativa + dados de exibição).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Helpers de segurança
-- ---------------------------------------------------------------------

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

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy profiles_select on public.profiles
  for select
  using (id = auth.uid() or public.is_superadmin());

create policy profiles_update on public.profiles
  for update
  using (id = auth.uid() or public.is_superadmin())
  with check (
    public.is_superadmin()
    or (id = auth.uid() and is_superadmin = (select p.is_superadmin from public.profiles p where p.id = auth.uid()))
  );

-- ---------------------------------------------------------------------
-- barbershops
-- ---------------------------------------------------------------------
alter table public.barbershops enable row level security;

create policy barbershops_select on public.barbershops
  for select
  using (
    public.is_superadmin()
    or public.is_member_of(id)
    or is_active = true
  );

create policy barbershops_insert on public.barbershops
  for insert
  with check (public.is_superadmin());

create policy barbershops_update on public.barbershops
  for update
  using (public.is_superadmin() or public.current_role(id) = 'owner');

create policy barbershops_delete on public.barbershops
  for delete
  using (public.is_superadmin());

-- ---------------------------------------------------------------------
-- members
-- ---------------------------------------------------------------------
alter table public.members enable row level security;

create policy members_select on public.members
  for select
  using (
    public.is_superadmin()
    or public.is_member_of(barbershop_id)
    or (
      is_active = true
      and role = 'barber'
      and public.barbershop_is_active(barbershop_id)
    )
  );

create policy members_insert on public.members
  for insert
  with check (public.is_superadmin() or public.current_role(barbershop_id) = 'owner');

create policy members_update on public.members
  for update
  using (
    public.is_superadmin()
    or public.current_role(barbershop_id) = 'owner'
    or user_id = auth.uid()
  )
  with check (
    public.is_superadmin()
    or public.current_role(barbershop_id) = 'owner'
    or (user_id = auth.uid() and barbershop_id = public.current_member_id(barbershop_id) or user_id = auth.uid())
  );

create policy members_delete on public.members
  for delete
  using (public.is_superadmin() or public.current_role(barbershop_id) = 'owner');

-- ---------------------------------------------------------------------
-- services
-- ---------------------------------------------------------------------
alter table public.services enable row level security;

create policy services_select on public.services
  for select
  using (
    public.is_superadmin()
    or public.is_member_of(barbershop_id)
    or (is_active = true and public.barbershop_is_active(barbershop_id))
  );

create policy services_insert on public.services
  for insert
  with check (public.is_superadmin() or public.current_role(barbershop_id) = 'owner');

create policy services_update on public.services
  for update
  using (public.is_superadmin() or public.current_role(barbershop_id) = 'owner');

create policy services_delete on public.services
  for delete
  using (public.is_superadmin() or public.current_role(barbershop_id) = 'owner');

-- ---------------------------------------------------------------------
-- business_hours (horário de funcionamento é público)
-- ---------------------------------------------------------------------
alter table public.business_hours enable row level security;

create policy business_hours_select on public.business_hours
  for select
  using (true);

create policy business_hours_insert on public.business_hours
  for insert
  with check (public.is_superadmin() or public.current_role(barbershop_id) = 'owner');

create policy business_hours_update on public.business_hours
  for update
  using (public.is_superadmin() or public.current_role(barbershop_id) = 'owner');

create policy business_hours_delete on public.business_hours
  for delete
  using (public.is_superadmin() or public.current_role(barbershop_id) = 'owner');

-- ---------------------------------------------------------------------
-- barber_hours (disponibilidade individual NÃO é pública)
-- ---------------------------------------------------------------------
alter table public.barber_hours enable row level security;

create policy barber_hours_select on public.barber_hours
  for select
  using (public.is_superadmin() or public.is_member_of(barbershop_id));

create policy barber_hours_insert on public.barber_hours
  for insert
  with check (
    public.is_superadmin()
    or public.current_role(barbershop_id) = 'owner'
    or (public.current_role(barbershop_id) = 'barber' and member_id = public.current_member_id(barbershop_id))
  );

create policy barber_hours_update on public.barber_hours
  for update
  using (
    public.is_superadmin()
    or public.current_role(barbershop_id) = 'owner'
    or (public.current_role(barbershop_id) = 'barber' and member_id = public.current_member_id(barbershop_id))
  );

create policy barber_hours_delete on public.barber_hours
  for delete
  using (
    public.is_superadmin()
    or public.current_role(barbershop_id) = 'owner'
    or (public.current_role(barbershop_id) = 'barber' and member_id = public.current_member_id(barbershop_id))
  );

-- ---------------------------------------------------------------------
-- blocked_times (bloqueios não são públicos — a disponibilidade é
-- calculada exclusivamente pela RPC get_available_slots)
-- ---------------------------------------------------------------------
alter table public.blocked_times enable row level security;

create policy blocked_times_select on public.blocked_times
  for select
  using (public.is_superadmin() or public.is_member_of(barbershop_id));

create policy blocked_times_insert on public.blocked_times
  for insert
  with check (
    public.is_superadmin()
    or public.current_role(barbershop_id) = 'owner'
    or (
      public.current_role(barbershop_id) = 'barber'
      and member_id = public.current_member_id(barbershop_id)
      and member_id is not null
    )
  );

create policy blocked_times_update on public.blocked_times
  for update
  using (
    public.is_superadmin()
    or public.current_role(barbershop_id) = 'owner'
    or (
      public.current_role(barbershop_id) = 'barber'
      and member_id = public.current_member_id(barbershop_id)
    )
  );

create policy blocked_times_delete on public.blocked_times
  for delete
  using (
    public.is_superadmin()
    or public.current_role(barbershop_id) = 'owner'
    or (
      public.current_role(barbershop_id) = 'barber'
      and member_id = public.current_member_id(barbershop_id)
    )
  );

-- ---------------------------------------------------------------------
-- clients
-- ---------------------------------------------------------------------
alter table public.clients enable row level security;

create policy clients_select on public.clients
  for select
  using (public.is_superadmin() or public.is_member_of(barbershop_id));

create policy clients_insert on public.clients
  for insert
  with check (public.is_superadmin() or public.current_role(barbershop_id) = 'owner');

create policy clients_update on public.clients
  for update
  using (public.is_superadmin() or public.current_role(barbershop_id) = 'owner');

create policy clients_delete on public.clients
  for delete
  using (public.is_superadmin() or public.current_role(barbershop_id) = 'owner');

-- ---------------------------------------------------------------------
-- appointments
-- ---------------------------------------------------------------------
alter table public.appointments enable row level security;

create policy appointments_select on public.appointments
  for select
  using (
    public.is_superadmin()
    or (
      public.is_member_of(barbershop_id)
      and (
        public.current_role(barbershop_id) = 'owner'
        or member_id = public.current_member_id(barbershop_id)
      )
    )
  );

create policy appointments_insert on public.appointments
  for insert
  with check (public.is_superadmin() or public.current_role(barbershop_id) = 'owner');

create policy appointments_update on public.appointments
  for update
  using (
    public.is_superadmin()
    or public.current_role(barbershop_id) = 'owner'
    or (
      public.is_member_of(barbershop_id)
      and member_id = public.current_member_id(barbershop_id)
    )
  )
  with check (
    public.is_superadmin()
    or public.current_role(barbershop_id) = 'owner'
    or (
      public.is_member_of(barbershop_id)
      and member_id = public.current_member_id(barbershop_id)
    )
  );

create policy appointments_delete on public.appointments
  for delete
  using (public.is_superadmin() or public.current_role(barbershop_id) = 'owner');

-- ---------------------------------------------------------------------
-- settings (apenas SUPERADMIN)
-- ---------------------------------------------------------------------
alter table public.settings enable row level security;

create policy settings_select on public.settings
  for select
  using (public.is_superadmin());

create policy settings_insert on public.settings
  for insert
  with check (public.is_superadmin());

create policy settings_update on public.settings
  for update
  using (public.is_superadmin());

create policy settings_delete on public.settings
  for delete
  using (public.is_superadmin());

-- =====================================================================
-- Triggers de proteção de campos sensíveis
-- =====================================================================

-- ---------------------------------------------------------------------
-- members: barbeiro só pode editar os próprios dados pessoais (foto,
-- bio, availidade) — nunca o vínculo com a barbearia, papel ou status.
-- ---------------------------------------------------------------------
create or replace function public.protect_member_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
       new.barbershop_id is distinct from old.barbershop_id
    or new.user_id      is distinct from old.user_id
    or new.role         is distinct from old.role
    or new.is_active    is distinct from old.is_active
  )
  and not public.is_superadmin()
  and public.current_role(old.barbershop_id) <> 'owner' then
    raise exception 'Você não tem permissão para alterar este vínculo.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_member_fields on public.members;
create trigger trg_protect_member_fields
  before update on public.members
  for each row execute procedure public.protect_member_fields();

-- ---------------------------------------------------------------------
-- barber_hours: barbeiro não pode apontar a disponibilidade para outro.
-- ---------------------------------------------------------------------
create or replace function public.protect_barber_hours()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
       new.member_id      is distinct from old.member_id
    or new.barbershop_id is distinct from old.barbershop_id
  )
  and not public.is_superadmin()
  and public.current_role(old.barbershop_id) <> 'owner' then
    raise exception 'Você não tem permissão para alterar este registro.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_barber_hours on public.barber_hours;
create trigger trg_protect_barber_hours
  before update on public.barber_hours
  for each row execute procedure public.protect_barber_hours();

-- ---------------------------------------------------------------------
-- blocked_times: barbeiro só cria bloqueio para si mesmo.
-- ---------------------------------------------------------------------
create or replace function public.protect_blocked_times()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_superadmin()
     and public.current_role(new.barbershop_id) <> 'owner'
     and (new.member_id is null or new.member_id <> public.current_member_id(new.barbershop_id)) then
    raise exception 'Você só pode bloquear seus próprios horários.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_blocked_times on public.blocked_times;
create trigger trg_protect_blocked_times
  before insert or update on public.blocked_times
  for each row execute procedure public.protect_blocked_times();

-- ---------------------------------------------------------------------
-- appointments: barbeiro não pode adulterar dados do agendamento
-- (profissional, serviço, horário, valor) — apenas o status.
-- ---------------------------------------------------------------------
create or replace function public.protect_appointment_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := public.current_role(old.barbershop_id);
begin
  if not public.is_superadmin()
     and v_role <> 'owner'
     and (
          new.service_id   is distinct from old.service_id
       or new.member_id    is distinct from old.member_id
       or new.barbershop_id is distinct from old.barbershop_id
       or new.start_at     is distinct from old.start_at
       or new.client_name  is distinct from old.client_name
       or new.price        is distinct from old.price
       or new.client_whatsapp is distinct from old.client_whatsapp
     ) then
    raise exception 'Você não tem permissão para alterar estes dados do agendamento.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_appointment_changes on public.appointments;
create trigger trg_protect_appointment_changes
  before update on public.appointments
  for each row execute procedure public.protect_appointment_changes();