-- =====================================================================
-- BLACK DIAMOND — 0005_functions.sql
-- RPCs públicas do sistema.
--
--  _find_slots        (privado) cálculo de disponibilidade no servidor
--  get_available_slots          retorna horários livres para o cliente
--  book_appointment             agenda com revalidação no banco
--  admin_invite_member          cria conta + vínculo (OWNER/Superadmin)
--  get_my_memberships           papéis do usuário atual nas barbearias
--
-- IMPORTANTE: toda a lógica de conflito/horário é verificada AQUI, no
-- PostgreSQL (SECURITY DEFINER), nunca apenas no navegador.
-- =====================================================================

-- ---------------------------------------------------------------------
-- _find_slots — motor de disponibilidade.
-- Considera: horário da barbearia, horário do barbeiro, duração do
-- serviço, agendamentos existentes, bloqueios, dia fechado e agora().
-- ---------------------------------------------------------------------
create or replace function public._find_slots(
  p_barbershop_id uuid,
  p_service_id    uuid,
  p_member_id     uuid,
  p_date          date,
  p_timezone      text default 'America/Sao_Paulo'
) returns setof timestamptz
language plpgsql
security definer
set search_path = public
volatile
as $$
declare
  v_shop      public.barbershops%rowtype;
  v_service   public.services%rowtype;
  v_member    public.members%rowtype;
  v_bh        public.business_hours%rowtype;
  v_mh        public.barber_hours%rowtype;
  v_dow       int;
  v_open      time;
  v_close     time;
  v_duration  int;
  v_cursor    time;
  v_slot      timestamptz;
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
    raise exception 'Serviço inválido para esta barbearia.' using errcode = 'P0001';
  end if;
  if not v_service.is_active then
    raise exception 'Serviço indisponível.' using errcode = 'P0001';
  end if;

  select * into v_member from public.members where id = p_member_id and barbershop_id = p_barbershop_id;
  if not found then
    raise exception 'Profissional inválido para esta barbearia.' using errcode = 'P0001';
  end if;
  if not v_member.is_active then
    raise exception 'Profissional indisponível.' using errcode = 'P0001';
  end if;

  v_dow := extract(dow from p_date)::int;

  select * into v_bh from public.business_hours
    where barbershop_id = p_barbershop_id and weekday = v_dow;
  if not found then
    return; -- dia sem horário de funcionamento configurado
  end if;
  if v_bh.is_closed then
    return; -- barbearia fechada no dia
  end if;

  select * into v_mh from public.barber_hours
    where member_id = p_member_id and weekday = v_dow;
  if found and v_mh.is_closed then
    return; -- folga do profissional
  end if;

  -- Sem barber_hours para o dia, vale o horário da barbearia.
  v_open  := greatest(v_bh.open_time, coalesce(v_mh.open_time, v_bh.open_time));
  v_close := least(v_bh.close_time, coalesce(v_mh.close_time, v_bh.close_time));
  v_duration := v_service.duration_minutes;

  v_cursor := v_open;
  while v_cursor + (v_duration || ' minutes')::interval <= v_close loop
    v_slot := (p_date::timestamp + v_cursor) at time zone p_timezone;

    -- O horário deve estar no futuro, sem conflito com agendamento ativo
    -- e sem conflito com bloqueio (da barbearia ou do profissional).
    if v_slot >= now()
       and not exists (
         select 1 from public.appointments a
         where a.member_id = p_member_id
           and a.status <> 'cancelado'
           and a.start_at < v_slot + (v_duration || ' minutes')::interval
           and a.end_at   > v_slot
       )
       and not exists (
         select 1 from public.blocked_times bt
         where bt.barbershop_id = p_barbershop_id
           and (bt.member_id is null or bt.member_id = p_member_id)
           and bt.start_at < v_slot + (v_duration || ' minutes')::interval
           and bt.end_at   > v_slot
       ) then
      return next v_slot;
    end if;

    v_cursor := v_cursor + interval '15 minutes';
  end loop;

  return;
end;
$$;

-- ---------------------------------------------------------------------
-- get_available_slots — pendência pública dos horários livres.
-- ---------------------------------------------------------------------
create or replace function public.get_available_slots(
  p_barbershop_id uuid,
  p_service_id    uuid,
  p_member_id     uuid,
  p_date          date,
  p_timezone      text default 'America/Sao_Paulo'
) returns table (start_at timestamptz)
language sql
security definer
set search_path = public
volatile
as $$
  select s
  from public._find_slots(p_barbershop_id, p_service_id, p_member_id, p_date, p_timezone) as s
  order by s;
$$;

-- ---------------------------------------------------------------------
-- book_appointment — agendamento público. Revalida tudo no servidor e
-- usa advisory lock para evitar que dois clientes reservem o mesmo slot.
-- ---------------------------------------------------------------------
create or replace function public.book_appointment(
  p_barbershop_id  uuid,
  p_service_id     uuid,
  p_member_id      uuid,
  p_start_at       timestamptz,
  p_client_name    text,
  p_client_whatsapp text,
  p_timezone       text default 'America/Sao_Paulo'
) returns jsonb
language plpgsql
security definer
set search_path = public
volatile
as $$
declare
  v_shop     public.barbershops%rowtype;
  v_service  public.services%rowtype;
  v_member   public.members%rowtype;
  v_client_id uuid;
  v_appt     public.appointments%rowtype;
  v_whatsapp text;
  v_end      timestamptz;
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

  v_end := p_start_at + (v_service.duration_minutes || ' minutes')::interval;

  insert into public.clients (barbershop_id, name, whatsapp)
  values (p_barbershop_id, trim(p_client_name), v_whatsapp)
  on conflict (barbershop_id, whatsapp) do update set name = excluded.name
  returning id into v_client_id;

  insert into public.appointments (
    barbershop_id, service_id, member_id, client_id,
    client_name, client_whatsapp, start_at, end_at,
    status, price, created_by
  ) values (
    p_barbershop_id, p_service_id, p_member_id, v_client_id,
    trim(p_client_name), v_whatsapp, p_start_at, v_end,
    'agendado', v_service.price, auth.uid()
  )
  returning * into v_appt;

  return jsonb_build_object(
    'id',            v_appt.id,
    'barbershop_id', v_appt.barbershop_id,
    'service_id',    v_appt.service_id,
    'service_name',  v_service.name,
    'service_price', v_service.price,
    'duration_minutes', v_service.duration_minutes,
    'member_id',     v_appt.member_id,
    'member_name',   v_member.full_name,
    'client_name',   v_appt.client_name,
    'client_whatsapp', v_appt.client_whatsapp,
    'start_at',      v_appt.start_at,
    'end_at',        v_appt.end_at,
    'status',        v_appt.status::text
  );
end;
$$;

-- ---------------------------------------------------------------------
-- admin_invite_member — OWNER/Superadmin cria a conta de um profissional
-- (ou dono) e o vincula à barbearia com um papel.
-- ---------------------------------------------------------------------
create or replace function public.admin_invite_member(
  p_barbershop_id uuid,
  p_name          text,
  p_email         text,
  p_role          text,
  p_temp_password text,
  p_specialty     text default null,
  p_bio           text default null
) returns uuid
language plpgsql
security definer
set search_path = public
volatile
as $$
declare
  v_email    text := lower(trim(p_email));
  v_user_id  uuid;
  v_member_id uuid;
  v_is_owner boolean;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado.' using errcode = 'P0001';
  end if;

  v_is_owner := (public.is_superadmin() or public.current_role(p_barbershop_id) = 'owner');
  if not v_is_owner then
    raise exception 'Você não tem permissão para convidar membros.' using errcode = 'P0001';
  end if;

  if p_role not in ('owner', 'barber') then
    raise exception 'Papel inválido.' using errcode = 'P0001';
  end if;
  if p_name is null or trim(p_name) = '' then
    raise exception 'Informe o nome.' using errcode = 'P0001';
  end if;
  if v_email not similar to '%[_a-zA-Z0-9-]+(\.[_a-zA-Z0-9-]+)*@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+%' then
    raise exception 'Email inválido.' using errcode = 'P0001';
  end if;
  if p_temp_password is null or length(p_temp_password) < 6 then
    raise exception 'A senha temporária precisa ter ao menos 6 caracteres.' using errcode = 'P0001';
  end if;

  -- Uma barbearia só tem um dono ativo.
  if p_role = 'owner' and exists (
    select 1 from public.members
    where barbershop_id = p_barbershop_id and role = 'owner' and is_active
  ) then
    raise exception 'Esta barbearia já possui um dono ativo.' using errcode = 'P0001';
  end if;

  select id into v_user_id from auth.users where email = v_email;
  if not found then
    v_user_id := auth.admin_create_user(
      email         => v_email,
      password      => p_temp_password,
      email_confirm => true
    );
  end if;

  insert into public.profiles (id, full_name)
  values (v_user_id, trim(p_name))
  on conflict (id) do update set full_name = excluded.full_name;

  insert into public.members (barbershop_id, user_id, role, full_name, specialty, bio, is_active)
  values (p_barbershop_id, v_user_id, p_role::public.member_role, trim(p_name), p_specialty, p_bio, true)
  on conflict (barbershop_id, user_id) do update
    set role = excluded.role,
        full_name = excluded.full_name,
        specialty = excluded.specialty,
        bio = excluded.bio,
        is_active = true
  returning id into v_member_id;

  return v_member_id;
end;
$$;

-- ---------------------------------------------------------------------
-- get_my_memberships — papéis do usuário atual.
-- ---------------------------------------------------------------------
create or replace function public.get_my_memberships()
returns table (
  barbershop_id      uuid,
  barbershop_name    text,
  barbershop_slug    text,
  barbershop_active  boolean,
  role               text,
  member_id          uuid
)
language sql
stable
security definer
set search_path = public
as $$
  select b.id, b.name, b.slug, b.is_active, m.role::text, m.id
  from public.members m
  join public.barbershops b on b.id = m.barbershop_id
  where m.user_id = auth.uid()
    and m.is_active
$$;

-- =====================================================================
-- Permissões de execução (exigidas pelo PostgREST)
-- =====================================================================
revoke all on function public._find_slots(uuid, uuid, uuid, date, text) from public;
revoke all on function public.get_available_slots(uuid, uuid, uuid, date, text) from public;
revoke all on function public.book_appointment(uuid, uuid, uuid, timestamptz, text, text, text) from public;
revoke all on function public.admin_invite_member(uuid, text, text, text, text, text, text) from public;
revoke all on function public.get_my_memberships() from public;

grant execute on function public.get_available_slots(uuid, uuid, uuid, date, text) to anon, authenticated;
grant execute on function public.book_appointment(uuid, uuid, uuid, timestamptz, text, text, text) to anon, authenticated;
grant execute on function public.admin_invite_member(uuid, text, text, text, text, text, text) to authenticated;
grant execute on function public.get_my_memberships() to authenticated;