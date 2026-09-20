-- =====================================================================
-- BLACK DIAMOND — 0006_seed_development.sql
--
-- SEED DE DESENVOLVIMENTO. NÃO é necessário/produção — serve apenas
-- para o ambiente local e para a primeira execução do projeto.
--
-- Cria a primeira barbearia (BLACK DIAMOND), o dono João e os
-- profissionais Carlos e Pedro. Os vínculos de conta (auth) são feitos
-- por scripts/seed-dev.mjs ou pela tela "Equipe" do painel.
-- =====================================================================

-- ------------------------------------------------ barbearia
insert into public.barbershops (
  slug, name, description, about, address, phone, whatsapp, instagram,
  logo_url, hero_image_url, primary_color, is_active, settings
) values (
  'black-diamond',
  'BLACK DIAMOND',
  'Barbearia com cortes clássicos, modernos e atendimento de verdade.',
  'A BLACK DIAMOND nasceu para unir o estilo clássico das barbearias tradicionais com um ambiente moderno e confortável. Cadeira, navalha e conversa de quem entende.',
  'Av. Basílio da Gama, 139 - Tupi, Belo Horizonte - MG, 31842-610, Brasil',
  '+55 11 99999-0000',
  '5511999990000',
  'blackdiamond.barber',
  null,
  null,
  '#c2a878',
  true,
  '{
    "show_address": true,
    "show_instagram": true,
    "show_whatsapp": true,
    "show_credits": true,
    "credits_text": "BLACK DIAMOND",
    "barberflow_branding": false
  }'::jsonb
)
on conflict (slug) do nothing;

-- ------------------------------------------------ horários da barbearia
insert into public.business_hours (barbershop_id, weekday, open_time, close_time, is_closed)
select b.id, v.weekday, v.open_time, v.close_time, v.is_closed
from public.barbershops b,
  (values
    (0, '08:00'::time, '18:00'::time, true),
    (1, '08:00'::time, '18:00'::time, false),
    (2, '08:00'::time, '18:00'::time, false),
    (3, '08:00'::time, '18:00'::time, false),
    (4, '08:00'::time, '18:00'::time, false),
    (5, '08:00'::time, '18:00'::time, false),
    (6, '08:00'::time, '18:00'::time, false)
  ) as v(weekday, open_time, close_time, is_closed)
where b.slug = 'black-diamond'
on conflict (barbershop_id, weekday) do nothing;

-- ------------------------------------------------ serviços
-- Garante o índice único (arbiter) do ON CONFLICT mesmo se o banco
-- foi criado antes desta constraint existir no schema (0002).
create unique index if not exists services_barbershop_id_name_key
  on public.services (barbershop_id, name);

insert into public.services (barbershop_id, name, description, price, duration_minutes, is_active)
select b.id, v.name, v.description, v.price, v.duration, true
from public.barbershops b,
  (values
    ('Barba',                'Modelagem, toalha quente e acabamento.',         27.00, 20),
    ('Barba com Toalha Quente', 'Barba com toalha quente e cuidado completo.', 30.00, 25),
    ('Corte de Cabelo',      'Corte personalizado com acabamento.',            35.00, 30),
    ('Pezinho',              'Acabamento simples do pezinho.',                 15.00, 15),
    ('Sobrancelha',          'Alinhamento e limpeza da sobrancelha.',          15.00, 15)
  ) as v(name, description, price, duration)
where b.slug = 'black-diamond'
on conflict (barbershop_id, name) do nothing;

-- ------------------------------------------------ equipe (primeira versão: placeholders)
insert into public.members (barbershop_id, user_id, role, is_active, full_name, specialty, bio, avatar_url)
select b.id, null, v.role::public.member_role, true, v.full_name, v.specialty, v.bio, null
from public.barbershops b,
  (values
    ('João',   'owner',  'Cortes e gestão',      'Dono da casa. Todos os cortes, do clássico ao moderno.'),
    ('Carlos', 'barber', 'Especialista em Fade', 'Mais de 10 anos de navalha e tesoura. Se não ficou bom, não cobro.'),
    ('Pedro',  'barber', 'Cortes Clássicos',     'Barbeiro pela tradição, com atenção aos detalhes de quem respeita o ofício.')
  ) as v(full_name, role, specialty, bio)
where b.slug = 'black-diamond'
on conflict do nothing;

-- ------------------------------------------------ disponibilidade individual (default = horário da casa)
insert into public.barber_hours (member_id, barbershop_id, weekday, open_time, close_time, is_closed)
select m.id, m.barbershop_id, v.weekday, v.open_time, v.close_time, v.is_closed
from public.members m,
  (values
    (0, '08:00'::time, '18:00'::time, true),
    (1, '08:00'::time, '18:00'::time, false),
    (2, '08:00'::time, '18:00'::time, false),
    (3, '08:00'::time, '18:00'::time, false),
    (4, '08:00'::time, '18:00'::time, false),
    (5, '08:00'::time, '18:00'::time, false),
    (6, '08:00'::time, '18:00'::time, false)
  ) as v(weekday, open_time, close_time, is_closed)
where m.user_id is null
on conflict (member_id, weekday) do nothing;

-- ------------------------------------------------ exemplos para o desenvolvimento
do $$
declare
  v_shop   uuid := (select id from public.barbershops where slug = 'black-diamond');
  v_corte  uuid := (select id from public.services where name = 'Corte de Cabelo' and barbershop_id = v_shop);
  v_combo  uuid := (select id from public.services where name = 'Barba com Toalha Quente' and barbershop_id = v_shop);
  v_joao   uuid := (select id from public.members where full_name = 'João' and barbershop_id = v_shop);
  v_carlos uuid := (select id from public.members where full_name = 'Carlos' and barbershop_id = v_shop);
  v_pedro  uuid := (select id from public.members where full_name = 'Pedro' and barbershop_id = v_shop);
  c1 uuid; c2 uuid; c3 uuid;
begin
  insert into public.clients (barbershop_id, name, whatsapp) values
    (v_shop, 'Carlos Lima',   '5511988887777'),
    (v_shop, 'Marcos Tavares','5511977776666'),
    (v_shop, 'Rafael Nunes',  '5511966665555')
  on conflict (barbershop_id, whatsapp) do nothing;

  c1 := (select id from public.clients where whatsapp = '5511988887777' and barbershop_id = v_shop);
  c2 := (select id from public.clients where whatsapp = '5511977776666' and barbershop_id = v_shop);
  c3 := (select id from public.clients where whatsapp = '5511966665555' and barbershop_id = v_shop);

  -- Futuro (para a agenda)
  insert into public.appointments
    (barbershop_id, service_id, member_id, client_id, client_name, client_whatsapp, start_at, end_at, status, price)
  values
    (v_shop, v_combo,  v_joao,   c1, 'Carlos Lima',    '5511988887777', (now()::date + interval '1 day') + interval '9 hours',      (now()::date + interval '1 day') + interval '9 hours 25 minutes', 'agendado',   30),
    (v_shop, v_corte,  v_carlos, c2, 'Marcos Tavares', '5511977776666', (now()::date + interval '1 day') + interval '14 hours',     (now()::date + interval '1 day') + interval '14 hours 30 minutes', 'agendado',   35),
    (v_shop, v_corte,  v_carlos, c3, 'Rafael Nunes',   '5511966665555', (now()::date + interval '2 days') + interval '10 hours',    (now()::date + interval '2 days') + interval '10 hours 30 minutes','confirmado', 35);

  -- Passado concluído (para o financeiro/dashboard)
  insert into public.appointments
    (barbershop_id, service_id, member_id, client_id, client_name, client_whatsapp, start_at, end_at, status, price)
  values
    (v_shop, v_corte, v_joao,  c1, 'Carlos Lima',    '5511988887777', (now()::date - interval '1 day') + interval '14 hours', (now()::date - interval '1 day') + interval '14 hours 30 minutes', 'concluido', 35),
    (v_shop, v_corte, v_pedro, c2, 'Marcos Tavares', '5511977776666', (now()::date - interval '1 day') + interval '15 hours', (now()::date - interval '1 day') + interval '15 hours 30 minutes', 'concluido', 35);
end $$;