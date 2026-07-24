-- =========================================================================
-- BLACK DIAMOND - SEED DE DEPOIMENTOS
-- =========================================================================
-- 6 melhores depoimentos selecionados das avaliações do Google
-- Inseridos como is_active = true pra aparecerem no slider
-- =========================================================================

-- Remove depoimentos antigos do seed/google pra evitar duplicatas ao rodar de novo
DELETE FROM testimonials WHERE source IN ('seed', 'google');

INSERT INTO testimonials (name, rating, text, is_active, sort_order, source) VALUES
  ('Maia Studio', 5, 'Viemos hoje prestigiar a inauguração da barbearia do Tato e não poderíamos estar mais felizes. Ele foi o único profissional que conseguiu cortar o cabelo do meu filho com paciência, respeito e excelência, ganhando a nossa total confiança.', true, 1, 'seed'),
  ('Giovanna Cardoso', 5, 'Profissional agradável, super atencioso, trabalho impecável e corte perfeito. Super recomendo!!!', true, 2, 'seed'),
  ('Guilherme Henrique', 5, 'Ótimo profissional, lugar aconchegante e trabalho impecável!', true, 3, 'seed'),
  ('Matheus', 5, 'Tato é bom demais, cara sabe como cuidar de um cabelo', true, 4, 'seed'),
  ('YP TATTOO', 5, 'Barbearia super confortável, ambiente agradável, higiênico, profissional super qualificado e atencioso... Parabéns, vai explodir!', true, 5, 'seed'),
  ('Helbert Henrique', 5, 'Venezuelano mais fera de BH!! Tem o macete', true, 6, 'seed');
