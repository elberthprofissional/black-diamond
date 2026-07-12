-- Depoimentos dos clientes (testimonials)
CREATE TABLE IF NOT EXISTS testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  text TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: público lê ativos, admin faz tudo
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active testimonials"
  ON testimonials FOR SELECT
  USING (is_active = true);

CREATE POLICY "Authenticated users full access"
  ON testimonials FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Seed: 6 depoimentos padrão
INSERT INTO testimonials (name, rating, text, sort_order) VALUES
  ('YP TATTOO', 5, 'Barbearia super confortável, ambiente agradável, profissional qualificado e atencioso.', 1),
  ('HELBERT HENRIQUE', 5, 'Venezuelano mais fera de BH!! Tem o macete.', 2),
  ('MAIA STUDIO', 5, 'Único profissional que conseguiu cortar o cabelo do meu filho com paciência e excelência.', 3),
  ('GIOVANNA CARDOSO', 5, 'Profissional agradável, super atencioso, trabalho impecável e corte perfeito. Super recomendo!', 4),
  ('GUILHERME HENRIQUE', 5, 'Ótimo profissional, lugar aconchegante e trabalho impecável!', 5),
  ('MATHEUS', 5, 'Tato é bom demais, cara sabe como cuidar de um cabelo.', 6);
