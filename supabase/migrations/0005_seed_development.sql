-- =====================================================================
-- BLACK DIAMOND — 0005_seed_development.sql
--
-- SEED DE DESENVOLVIMENTO. NÃO é necessário/produção — serve apenas
-- para o ambiente local e para a primeira execução do projeto.
--
-- Cria a primeira barbearia (BLACK DIAMOND), o dono João e os
-- profissionais Carlos e Pedro. Os vínculos de conta (auth) são feitos
-- por scripts/seed-dev.mjs ou pela tela "Equipe" do painel.
--
-- NOTA: clientes e agendamentos NÃO são seedados aqui — eles são criados
-- naturalmente pela página pública de agendamento. Se você já rodou a
-- antiga migration 0006 em outra base e quer remover os clientes demo,
-- execute: delete from public.appointments where client_whatsapp in
-- ('5511988887777','5511977776666','5511966665555');
-- delete from public.clients where whatsapp in
-- ('5511988887777','5511977776666','5511966665555');
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
-- foi criado antes desta constraint existir no schema (0001).
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

-- ------------------------------------------------ equipe (placeholders)
insert into public.members (barbershop_id, user_id, role, is_active, full_name, bio, avatar_url)
select b.id, null, v.role::public.member_role, true, v.full_name, v.bio, null
from public.barbershops b,
  (values
    ('João',   'owner',  'Dono da casa. Todos os cortes, do clássico ao moderno.'),
    ('Carlos', 'barber', 'Mais de 10 anos de navalha e tesoura. Se não ficou bom, não cobro.'),
    ('Pedro',  'barber', 'Barbeiro pela tradição, com atenção aos detalhes de quem respeita o ofício.')
  ) as v(full_name, role, bio)
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

-- ------------------------------------------------ galeria (quadros vazios; dono preenche no painel)
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

-- ------------------------------------------------ cupom de exemplo (editável no painel)
insert into public.coupons (barbershop_id, code, title, discount_type, discount_value, max_uses, is_active)
select b.id, 'BLACK10', 'Primeiro corte — R$10 de desconto', 'fixed', 10.00, 5, true
from public.barbershops b
where b.slug = 'black-diamond'
  and not exists (
    select 1 from public.coupons c where c.barbershop_id = b.id and upper(c.code) = 'BLACK10'
  );