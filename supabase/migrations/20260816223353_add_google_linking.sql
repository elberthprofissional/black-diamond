-- RPC para buscar cliente por email via Auth (Google Login)
-- Permite que um usuário logado com Google recupere seus dados pelo email sem precisar da senha.

CREATE OR REPLACE FUNCTION public.buscar_cliente_por_email_auth(p_email TEXT)
RETURNS TABLE (id UUID, name TEXT, phone TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Apenas retorna se houver um usuário logado com o Google (auth.uid() não é nulo)
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: não autenticado no Supabase Auth.';
  END IF;

  RETURN QUERY
  SELECT c.id, c.name, c.phone
  FROM public.clients c
  WHERE c.email = p_email
  LIMIT 1;
END;
$$;
