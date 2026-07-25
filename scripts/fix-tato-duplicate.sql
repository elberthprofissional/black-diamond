-- =============================================================================
-- FIX: Unificar cliente duplicado "TATO" → "Tato"
-- Trigger: Normalizar nomes automaticamente (ant-burro)
-- =============================================================================

-- =============================================================================
-- PARTE 1: Unificar TATO → Tato
-- =============================================================================

DO $$
DECLARE
  v_tato_id uuid := 'f1617259-aeb1-4675-8f54-77965354931e';  -- Tato (3 bookings)
  v_tato_dup_id uuid := 'c0844e81-d48b-425d-ba93-212651244758';  -- TATO (1 booking)
  v_reassign_count int;
BEGIN
  -- Reatribuir bookings do TATO para Tato
  UPDATE bookings
  SET client_id = v_tato_id
  WHERE client_id = v_tato_dup_id;

  GET DIAGNOSTICS v_reassign_count = ROW_COUNT;
  RAISE NOTICE 'Reatribuídos % bookings do TATO duplicado para Tato original', v_reassign_count;

  -- Deletar o cliente TATO duplicado (agora sem bookings)
  DELETE FROM clients WHERE id = v_tato_dup_id;
  RAISE NOTICE 'Cliente duplicado TATO removido';
END $$;

-- =============================================================================
-- PARTE 2: Trigger anti-burro — normalizar nome na hora de criar/editar
-- =============================================================================

CREATE OR REPLACE FUNCTION normalize_client_name()
RETURNS trigger AS $$
DECLARE
  v_words text[];
  v_word text;
  v_result text := '';
  i int;
  v_lower_words text[] := ARRAY['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o'];
BEGIN
  -- Trim e remover espaços duplicados
  NEW.name := regexp_replace(TRIM(NEW.name), '\s+', ' ', 'g');

  -- Se estiver vazio depois do trim, erro
  IF NEW.name IS NULL OR NEW.name = '' THEN
    RAISE EXCEPTION 'Nome do cliente não pode ser vazio';
  END IF;

  -- Converter para proper case: "TATO" → "Tato", "joão silva" → "João Silva"
  -- Mas respeitar preposições comuns: "da", "de", "do", "das", "dos", "e"
  v_words := string_to_array(NEW.name, ' ');

  FOR i IN 1 .. array_length(v_words, 1) LOOP
    v_word := v_words[i];

    IF i = 1 THEN
      -- Primeira palavra: sempre capitalizar
      v_word := INITCAP(v_word);
    ELSE
      -- Palavras seguintes: se for preposição, manter minúscula
      IF lower(v_word) = ANY(v_lower_words) THEN
        v_word := lower(v_word);
      ELSE
        v_word := INITCAP(v_word);
      END IF;
    END IF;

    IF i > 1 THEN
      v_result := v_result || ' ';
    END IF;
    v_result := v_result || v_word;
  END LOOP;

  NEW.name := v_result;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dropar trigger se já existir e recriar
DROP TRIGGER IF EXISTS trg_normalize_client_name ON clients;

CREATE TRIGGER trg_normalize_client_name
  BEFORE INSERT OR UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION normalize_client_name();

-- =============================================================================
-- PARTE 3: Aplicar normalização em clientes existentes
-- =============================================================================

UPDATE clients
SET name = name  -- Isso dispara o trigger que normaliza
WHERE name IS DISTINCT FROM regexp_replace(TRIM(name), '\s+', ' ', 'g')
   OR name != INITCAP(name);
