-- =========================================================================
-- BLACK DIAMOND - FIX NOTIFICATION FORMAT (v3.27.2)
-- =========================================================================
-- Converte notificações no formato pipe-separado (legado) para o formato
-- JSON padronizado. Também padroniza os títulos "Novo Agendamento! 💈"
-- para "Novo Agendamento!" e "Agendamento Cancelado ❌" para 
-- "Agendamento Cancelado".
-- =========================================================================

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
