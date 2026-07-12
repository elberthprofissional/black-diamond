-- =========================================================================
-- BLACK DIAMOND 💈 - SEED DATA
-- =========================================================================
-- Popula o banco com dados de exemplo para desenvolvimento/testes.
-- ATENÇÃO: Rode APENAS em ambiente de desenvolvimento!
-- =========================================================================

-- 1. Serviços (já existem, mas garantimos)
INSERT INTO services (id, name, description, price, duration)
VALUES
  ('ce6b4bd7-6a5f-4631-82a5-e81a92383442', 'Corte de Cabelo', 'Corte moderno e personalizado.', 35.00, 40),
  ('ef35372b-e06b-4f06-a431-9154b18f8382', 'Barba com Toalha Quente', 'Experiência relaxante com toalha quente.', 30.00, 30),
  ('426ab8c0-4460-483b-9c3d-897a9d81b4d9', 'Sobrancelha', 'Limpeza e design de sobrancelha.', 15.00, 10),
  ('fc62101c-4d4a-4e2a-9f47-9732d8e0c041', 'Pezinho', 'Acabamento perfeito.', 15.00, 10),
  ('10c297d5-beb4-41cf-a747-183c8b9306d2', 'Barba', 'Aparação e modelagem de barba.', 27.00, 20)
ON CONFLICT (id) DO NOTHING;

-- 2. Depoimentos de exemplo
INSERT INTO testimonials (id, name, rating, text, is_active, sort_order)
VALUES
  ('a0000001-0000-0000-0000-000000000001', 'João Silva', 5, 'Melhor barbearia da região! Atendimento nota 10 e corte impecável. Saí de lá me sentindo um novo homem.', true, 1),
  ('a0000001-0000-0000-0000-000000000002', 'Carlos Oliveira', 5, 'O Tato é um profissional incrível. Fazia tempo que não achava um barbeiro que entendesse exatamente o que eu queria.', true, 2),
  ('a0000001-0000-0000-0000-000000000003', 'Pedro Santos', 4, 'Ambiente agradável e preço justo. A barba com toalha quente é sensacional! Recomendo demais.', true, 3),
  ('a0000001-0000-0000-0000-000000000004', 'Lucas Mendes', 5, 'Virei cliente fiel! Toda semana estou lá. O corte degrade que o Tato faz é o melhor de BH.', true, 4),
  ('a0000001-0000-0000-0000-000000000005', 'Rafael Costa', 5, 'Agendei pelo site, super prático. Cheguei no horário e fui atendido na hora. Profissionalismo é o ponto forte aqui.', true, 5)
ON CONFLICT (id) DO NOTHING;

-- 3. Cupom de exemplo
INSERT INTO coupons (id, code, description, discount_type, discount_value, valid_from, valid_until, max_uses, is_active, applicable_service_ids)
VALUES
  ('b0000001-0000-0000-0000-000000000001', 'BEMVINDO', 'Desconto de R$10 na primeira visita!', 'fixed', 10.00, CURRENT_DATE, CURRENT_DATE + INTERVAL '90 days', 50, true, ARRAY['ce6b4bd7-6a5f-4631-82a5-e81a92383442', 'ef35372b-e06b-4f06-a431-9154b18f8382'])
ON CONFLICT (id) DO NOTHING;

-- 4. Milestones de fidelidade
INSERT INTO loyalty_milestones (id, visits_required, reward_service_id, is_active)
VALUES
  ('c0000001-0000-0000-0000-000000000001', 5, '426ab8c0-4460-483b-9c3d-897a9d81b4d9', true),
  ('c0000002-0000-0000-0000-000000000002', 10, '10c297d5-beb4-41cf-a747-183c8b9306d2', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Planos mensalistas
INSERT INTO mensalista_plans (id, name, price, included_service_ids, allowed_days, is_active, sort_order)
VALUES
  ('c30e5e4a-c013-45dc-b055-1559098010e2', 'Cabelo e barba', 175.99, ARRAY['ef35372b-e06b-4f06-a431-9154b18f8382', 'ce6b4bd7-6a5f-4631-82a5-e81a92383442'], ARRAY[1,2,3,4,5], true, 0),
  ('5d899fd3-85ed-4ddf-bab8-bf7a5e3efe70', 'Plano de barba', 89.90, ARRAY['ef35372b-e06b-4f06-a431-9154b18f8382'], ARRAY[1,2,3,4,5], true, 0),
  ('e449c5bf-ffe8-4eb1-9a1e-fa532e827d18', 'Cabelo', 99.90, ARRAY['ce6b4bd7-6a5f-4631-82a5-e81a92383442'], ARRAY[1,2,3,4], true, 0)
ON CONFLICT (id) DO NOTHING;

-- 6. Configurações padrão (garantir que existam)
INSERT INTO settings (key, value)
VALUES
  ('barber_name', 'Tato'),
  ('barber_phone', '4399553590'),
  ('barber_instagram', 'black.diamond.barbeariaa'),
  ('max_no_shows', '3'),
  ('mensalista_enabled', 'true'),
  ('multi_barber_enabled', 'false'),
  ('lunch_start', '12:00'),
  ('lunch_end', '13:00'),
  ('working_days', '0,1,2,3,4,5,6')
ON CONFLICT (key) DO NOTHING;
