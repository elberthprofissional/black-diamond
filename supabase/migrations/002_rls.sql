-- =========================================================================
-- BLACK DIAMOND - POLITICAS RLS CONSOLIDADO
-- =========================================================================
-- Todas as politicas de Row Level Security + is_admin() + storage policies.
-- Estado final consolidado de todas as migrations anteriores.
-- =========================================================================

-- =========================================================================
-- FUNCAO is_admin()
-- =========================================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =========================================================================
-- POLICIAS POR TABELA
-- =========================================================================

-- SERVICOS: leitura publica, escrita admin
DROP POLICY IF EXISTS "Servicos leitura publica" ON services;
CREATE POLICY "Servicos leitura publica" ON services FOR SELECT USING (true);

DROP POLICY IF EXISTS "Servicos gerenciamento admin" ON services;
CREATE POLICY "Servicos gerenciamento admin" ON services FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- CLIENTES: apenas admin
DROP POLICY IF EXISTS "Clientes gerenciamento admin" ON clients;
CREATE POLICY "Clientes gerenciamento admin" ON clients FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- AGENDAMENTOS: admin full + leitura publica para consulta
DROP POLICY IF EXISTS "Agendamentos gerenciamento admin" ON bookings;
CREATE POLICY "Agendamentos gerenciamento admin" ON bookings FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Leitura publica agendamentos" ON bookings;
CREATE POLICY "Leitura publica agendamentos" ON bookings FOR SELECT
USING (
    (status IN ('pending', 'confirmed') AND booking_date >= CURRENT_DATE)
    OR status = 'completed'
);

-- CONFIGURACOES: leitura publica, escrita admin
DROP POLICY IF EXISTS "Configuracoes leitura publica" ON settings;
CREATE POLICY "Configuracoes leitura publica" ON settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Configuracoes gerenciamento admin" ON settings;
CREATE POLICY "Configuracoes gerenciamento admin" ON settings FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- MENSALISTA PLANS: leitura publica, escrita admin
DROP POLICY IF EXISTS "Mensalista plans leitura publica" ON mensalista_plans;
CREATE POLICY "Mensalista plans leitura publica" ON mensalista_plans FOR SELECT USING (true);

DROP POLICY IF EXISTS "Mensalista plans admin" ON mensalista_plans;
CREATE POLICY "Mensalista plans admin" ON mensalista_plans FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- PUSH SUBSCRIPTIONS: apenas admin
DROP POLICY IF EXISTS "Push subscriptions admin" ON push_subscriptions;
CREATE POLICY "Push subscriptions admin" ON push_subscriptions FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- GALLERY: admin gerencia, publico leitura
DROP POLICY IF EXISTS "Admin can manage gallery" ON gallery_images;
CREATE POLICY "Admin can manage gallery" ON gallery_images
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Anyone can read gallery" ON gallery_images;
CREATE POLICY "Anyone can read gallery" ON gallery_images
    FOR SELECT TO anon USING (true);

-- AUDIT LOGS: apenas admin
DROP POLICY IF EXISTS "Admin can read audit logs" ON audit_logs;
CREATE POLICY "Admin can read audit logs" ON audit_logs
    FOR SELECT TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;
CREATE POLICY "System can insert audit logs" ON audit_logs
    FOR INSERT TO authenticated WITH CHECK (is_admin());

-- BOOKING TOKENS: apenas admin
DROP POLICY IF EXISTS "Admin can read booking tokens" ON booking_tokens;
CREATE POLICY "Admin can read booking tokens"
    ON booking_tokens FOR SELECT TO authenticated USING (is_admin());

-- NOTIFICATIONS: dono ve as proprias
DROP POLICY IF EXISTS "Users see own notifications" ON notifications;
CREATE POLICY "Users see own notifications"
    ON notifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can insert own notifications" ON notifications;
CREATE POLICY "Admins can insert own notifications"
    ON notifications FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can mark own as read" ON notifications;
CREATE POLICY "Users can mark own as read"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
CREATE POLICY "Users can delete own notifications"
    ON notifications FOR DELETE USING (auth.uid() = user_id);

-- ADMIN USERS: apenas admin gerencia
DROP POLICY IF EXISTS "Admin users apenas admin" ON admin_users;
CREATE POLICY "Admin users apenas admin" ON admin_users FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- WHATSAPP TEMPLATES: apenas admin gerencia
DROP POLICY IF EXISTS "WhatsApp templates admin" ON whatsapp_templates;
CREATE POLICY "WhatsApp templates admin"
ON whatsapp_templates FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- TESTIMONIALS: publico le ativos, admin faz tudo
DROP POLICY IF EXISTS "Public can read active testimonials" ON testimonials;
CREATE POLICY "Public can read active testimonials"
  ON testimonials FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admin full access to testimonials" ON testimonials;
CREATE POLICY "Admin full access to testimonials"
  ON testimonials FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- COUPONS: apenas admin
DROP POLICY IF EXISTS "Admin can manage coupons" ON coupons;
CREATE POLICY "Admin can manage coupons"
  ON coupons FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- LOYALTY MILESTONES: apenas admin
DROP POLICY IF EXISTS "Admin manage loyalty_milestones" ON loyalty_milestones;
CREATE POLICY "Admin manage loyalty_milestones"
  ON loyalty_milestones FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- CLIENT MILESTONES: admin le, sistema insere
DROP POLICY IF EXISTS "Admin read client_milestones" ON client_milestones;
CREATE POLICY "Admin read client_milestones"
  ON client_milestones FOR SELECT TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "System insert client_milestones" ON client_milestones;
CREATE POLICY "System insert client_milestones"
  ON client_milestones FOR INSERT TO authenticated WITH CHECK (is_admin());

-- RATE LIMITS: nenhuma politica de acesso direto
-- Apenas SECURITY DEFINER functions acessam (bypass RLS)

-- SUBSCRIPTION PLANS: leitura publica (planos ativos)
DROP POLICY IF EXISTS "Plans are viewable by everyone" ON subscription_plans;
CREATE POLICY "Plans are viewable by everyone" ON subscription_plans
    FOR SELECT USING (is_active = true);

-- SUBSCRIPTIONS: usuario ve as proprias
DROP POLICY IF EXISTS "Users view own subscription" ON subscriptions;
CREATE POLICY "Users view own subscription" ON subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- SUBSCRIPTIONS: usuarios podem criar trial
DROP POLICY IF EXISTS "Users can create trial subscription" ON subscriptions;
CREATE POLICY "Users can create trial subscription" ON subscriptions
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND plan_id IS NULL
        AND status = 'trialing'
        AND trial_ends_at IS NOT NULL
    );

-- PAYMENTS: usuario ve pagamentos das proprias assinaturas
DROP POLICY IF EXISTS "Users view own payments" ON payments;
CREATE POLICY "Users view own payments" ON payments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM subscriptions
            WHERE subscriptions.id = payments.subscription_id
            AND subscriptions.user_id = auth.uid()
        )
    );

-- =========================================================================
-- STORAGE POLICIES
-- =========================================================================

-- Gallery bucket: leitura publica, escrita apenas admin
DROP POLICY IF EXISTS "Gallery: public read" ON storage.objects;
CREATE POLICY "Gallery: public read"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'gallery');

DROP POLICY IF EXISTS "Gallery: admin insert" ON storage.objects;
CREATE POLICY "Gallery: admin insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'gallery' AND is_admin());

DROP POLICY IF EXISTS "Gallery: admin delete" ON storage.objects;
CREATE POLICY "Gallery: admin delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'gallery' AND is_admin());

DROP POLICY IF EXISTS "Gallery: admin update" ON storage.objects;
CREATE POLICY "Gallery: admin update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'gallery' AND is_admin())
WITH CHECK (bucket_id = 'gallery' AND is_admin());

-- Avatars bucket: leitura publica, escrita apenas admin
DROP POLICY IF EXISTS "Avatars: public read" ON storage.objects;
CREATE POLICY "Avatars: public read"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Avatars: admin all" ON storage.objects;
CREATE POLICY "Avatars: admin all"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'avatars' AND is_admin())
WITH CHECK (bucket_id = 'avatars' AND is_admin());
