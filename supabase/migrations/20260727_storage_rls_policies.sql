-- =========================================================================
-- BLACK DIAMOND 💈 - Storage RLS Policies
-- =========================================================================
-- Protege os buckets do Supabase Storage:
--   avatars: público lê, admin insere/deleta
--   gallery: público lê, admin insere/deleta
-- =========================================================================

-- 1. POLICIES PARA O BUCKET gallery

-- Público pode listar e ver arquivos
CREATE POLICY "Gallery: public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'gallery');

-- Autenticado (admin) pode fazer upload
CREATE POLICY "Gallery: authenticated insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'gallery');

-- Autenticado (admin) pode deletar
CREATE POLICY "Gallery: authenticated delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'gallery');

-- Autenticado (admin) pode atualizar
CREATE POLICY "Gallery: authenticated update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'gallery')
WITH CHECK (bucket_id = 'gallery');

-- 2. POLICIES PARA O BUCKET avatars

-- Público pode ver avatares
CREATE POLICY "Avatars: public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Autenticado pode gerenciar avatares
CREATE POLICY "Avatars: authenticated all"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'avatars')
WITH CHECK (bucket_id = 'avatars');
