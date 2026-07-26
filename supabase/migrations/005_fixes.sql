-- =========================================================================
-- BLACK DIAMOND - 005 - FIXES
-- =========================================================================
-- Consolidado de: 009_remove_no_show_block.sql, 010_fix_rpc_functions.sql, 010_fix_notification_format.sql
-- =========================================================================

-- Ao inves de BLOQUEAR o cliente quando atinge o limite de faltas,
-- o sistema apenas NOTIFICA o barbeiro com um atalho pra chamar o
-- cliente no WhatsApp. O barbeiro decide se quer conversar ou nao.
-- Cliente bloqueado = cliente perdido. Melhor recuperar do que punir.

-- Remove o bloqueio na funcao de criacao de agendamento
CREATE OR REPLACE FUNCTION check_client_no_show_block(p_client_id uuid)
RETURNS void AS $$
BEGIN
    -- Nao bloqueia mais o cliente automaticamente.
    -- Apenas notifica o barbeiro via checkAndNotifyNoShowLimit (frontend).
    -- O barbeiro decide se quer conversar com o cliente no WhatsApp.
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Remove a funcao de verificacao de bloqueio (nao usada em mais nada)
CREATE OR REPLACE FUNCTION is_client_blocked_by_no_show(p_client_id uuid)
RETURNS boolean AS $$
BEGIN
    -- Sempre retorna false — nao bloqueamos mais clientes por falta
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Corrige 3 bugs críticos:
-- 1. save_loyalty_milestones - não existia, quebrava o salvamento de metas
-- 2. increment_client_visits (plural) - frontend chamava plural mas só existia singular
-- 3. log_reminder_sent - não existia, quebrava o log de lembretes

-- 1. RPC: save_loyalty_milestones
-- Substitui atomicamente todas as milestones ativas pelas novas.
-- Recebe array de { visits_required, reward_service_id } e faz replace completo.
CREATE OR REPLACE FUNCTION save_loyalty_milestones(
    p_milestones JSONB
)
RETURNS void AS $$
DECLARE
    v_milestone JSONB;
    v_visits INTEGER;
    v_service_id UUID;
    v_existing_id UUID;
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Apenas administradores podem gerenciar metas de fidelidade';
    END IF;

    -- Desativa todas as milestones existentes
    UPDATE loyalty_milestones SET is_active = false WHERE is_active = true;

    -- Itera sobre as novas milestones
    FOR v_milestone IN SELECT * FROM jsonb_array_elements(p_milestones)
    LOOP
        v_visits := (v_milestone->>'visits_required')::INTEGER;
        v_service_id := (v_milestone->>'reward_service_id')::UUID;

        -- Verifica se já existe uma milestone com essas visitas
        SELECT id INTO v_existing_id FROM loyalty_milestones
        WHERE visits_required = v_visits AND reward_service_id = v_service_id
        LIMIT 1;

        IF v_existing_id IS NOT NULL THEN
            -- Reativa a existente
            UPDATE loyalty_milestones SET is_active = true WHERE id = v_existing_id;
        ELSE
            -- Cria nova
            INSERT INTO loyalty_milestones (visits_required, reward_service_id, is_active)
            VALUES (v_visits, v_service_id, true);
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. RPC: log_reminder_sent
-- Registra o envio de um lembrete na tabela reminder_logs.
CREATE OR REPLACE FUNCTION log_reminder_sent(
    p_client_id UUID,
    p_template_name TEXT DEFAULT NULL,
    p_message_preview TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Tenta obter o usuário autenticado
    BEGIN
        v_user_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL;
    END;

    INSERT INTO reminder_logs (client_id, template_name, message_preview, user_id)
    VALUES (p_client_id, p_template_name, p_message_preview, v_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RPC: increment_client_visits (alias - plural)
-- O frontend chama 'increment_client_visits' (plural).
-- O backend já tem 'increment_client_visit' (singular).
-- Este alias garante compatibilidade sem precisar alterar o frontend.
CREATE OR REPLACE FUNCTION increment_client_visits(p_client_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_visits INTEGER;
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Acesso negado.';
    END IF;

    UPDATE clients SET historical_visits = COALESCE(historical_visits, 0) + 1
    WHERE id = p_client_id
    RETURNING COALESCE(historical_visits, 0) INTO v_visits;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cliente nao encontrado.';
    END IF;

    RETURN v_visits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Converte notificações no formato pipe-separado (legado) para o formato
-- JSON padronizado. Também padroniza os títulos "Novo Agendamento! 💈"
-- para "Novo Agendamento!" e "Agendamento Cancelado ❌" para 
-- "Agendamento Cancelado".

-- Função auxiliar: converte body pipe-separado para JSON
CREATE OR REPLACE FUNCTION _convert_notification_body_to_json()
RETURNS void AS $$
DECLARE
    v_notif RECORD;
    v_parts text[];
    v_client_name text;
    v_services text;
    v_date_time text;
    v_total_price text;
    v_client_phone text;
    v_manage_url text;
    v_json_body text;
    v_count integer := 0;
BEGIN
    -- Busca notificações com body no formato pipe-separado (não JSON)
    FOR v_notif IN 
        SELECT id, title, body, tag 
        FROM notifications 
        WHERE body NOT LIKE '{%'  -- não começa com { (não é JSON)
          AND body NOT LIKE 'Se você vê%'  -- não é teste
    LOOP
        BEGIN
            -- Tenta fazer o parse do body antigo
            -- Formato antigo: "Nome | Serviços | Data às Hora | R$ XX,XX | Telefone | URL"
            v_parts := string_to_array(v_notif.body, ' | ');
            
            IF array_length(v_parts, 1) >= 6 THEN
                v_client_name := trim(v_parts[1]);
                v_services := trim(v_parts[2]);
                v_date_time := trim(v_parts[3]);
                v_total_price := trim(v_parts[4]);
                v_client_phone := trim(v_parts[5]);
                v_manage_url := trim(v_parts[6]);
                
                -- Se for cancelamento, a URL é "Cancelado"
                -- Se for agendamento novo, a URL é um link
                
                -- Constrói o JSON
                v_json_body := jsonb_build_object(
                    'clientName', v_client_name,
                    'services', v_services,
                    'dateTime', v_date_time,
                    'totalPrice', v_total_price,
                    'clientPhone', v_client_phone,
                    'manageUrl', v_manage_url,
                    'isMensalista', false
                )::text;
                
                -- Padroniza o título (remove emojis antigos)
                UPDATE notifications 
                SET body = v_json_body,
                    title = CASE 
                        WHEN title LIKE 'Novo Agendamento%' THEN 'Novo Agendamento!'
                        WHEN title LIKE 'Agendamento Cancelado%' THEN 'Agendamento Cancelado'
                        ELSE title
                    END
                WHERE id = v_notif.id;
                
                v_count := v_count + 1;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- Se falhar, pula essa notificação
            NULL;
        END;
    END LOOP;
    
    RAISE NOTICE 'Convertidas % notificações para formato JSON.', v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Executa a conversão
SELECT _convert_notification_body_to_json();

-- Remove a função auxiliar (não precisa mais)
DROP FUNCTION IF EXISTS _convert_notification_body_to_json();