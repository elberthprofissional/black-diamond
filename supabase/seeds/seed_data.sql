-- Seed data for mensalista_plans and coupons
-- Run this in Supabase SQL Editor when needed

-- ─── Mensalista Plans ───
INSERT INTO mensalista_plans (id, name, price, included_service_ids, allowed_days, duration_days, is_active, is_default, sort_order)
VALUES
  (
    gen_random_uuid(),
    'Plano Básico',
    80,
    ARRAY['ce6b4bd7-6a5f-4631-82a5-e81a92383442']::text[],
    ARRAY[1,2,3,4,5,6]::int[],
    30,
    true,
    true,
    0
  ),
  (
    gen_random_uuid(),
    'Plano Completo',
    120,
    ARRAY['ce6b4bd7-6a5f-4631-82a5-e81a92383442', '10c297d5-beb4-41cf-a747-183c8b9306d2']::text[],
    ARRAY[1,2,3,4,5,6]::int[],
    30,
    true,
    false,
    1
  ),
  (
    gen_random_uuid(),
    'Plano Premium',
    150,
    ARRAY['ce6b4bd7-6a5f-4631-82a5-e81a92383442', '10c297d5-beb4-41cf-a747-183c8b9306d2', '426ab8c0-4460-483b-9c3d-897a9d81b4d9']::text[],
    ARRAY[1,2,3,4,5,6]::int[],
    30,
    true,
    false,
    2
  )
ON CONFLICT DO NOTHING;

-- ─── Coupons ───
INSERT INTO coupons (id, code, description, discount_type, discount_value, valid_from, valid_until, max_uses, current_uses, is_active, applicable_service_ids)
VALUES
  (
    gen_random_uuid(),
    'BEMVINDO10',
    'Primeira vez na Black Diamond? 10% de desconto!',
    'percentage',
    10,
    '2026-07-01',
    '2026-12-31',
    50,
    0,
    true,
    ARRAY[]::text[]
  ),
  (
    gen_random_uuid(),
    'CORTEGRATIS',
    'Corte de Cabelo Grátis na 5ª visita!',
    'free',
    0,
    '2026-07-01',
    '2026-12-31',
    20,
    0,
    true,
    ARRAY['ce6b4bd7-6a5f-4631-82a5-e81a92383442']::text[]
  ),
  (
    gen_random_uuid(),
    'INDICA10',
    'Indique um amigo e ganhe R$10 de desconto!',
    'fixed',
    10,
    '2026-07-01',
    NULL,
    100,
    0,
    true,
    ARRAY[]::text[]
  )
ON CONFLICT DO NOTHING;
