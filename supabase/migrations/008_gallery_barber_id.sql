-- >>> MIGRATION: 008_gallery_barber_id
-- Adiciona barber_id na gallery_images pra associar fotos a barbeiros

-- Coluna nullable (fotos antigas ficam sem barbeiro = "Todos")
ALTER TABLE gallery_images
  ADD COLUMN IF NOT EXISTS barber_id uuid REFERENCES barbers(id) ON DELETE SET NULL;

-- Índice pra filtrar por barbeiro rápido
CREATE INDEX IF NOT EXISTS idx_gallery_images_barber_id ON gallery_images(barber_id);

-- Comentário
COMMENT ON COLUMN gallery_images.barber_id IS 'Barbeiro dono da foto. NULL = visível em "Todos".';
