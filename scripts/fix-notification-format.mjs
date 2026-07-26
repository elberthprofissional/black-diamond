/**
 * Migration: Converte notificações do formato pipe-separado para JSON.
 * Executa a lógica da migration 010_fix_notification_format.sql 
 * usando a API REST do Supabase (já que SQL direto não está disponível).
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dbukdhycfaibdshxnatt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidWtkaHljZmFpYmRzaHhuYXR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI5MzM0NCwiZXhwIjoyMDk2ODY5MzQ0fQ.-PsylDGBzJN3W1acv6mk80V0Yj_nHScr6hgamTw1LIQ';

const supabase = createClient(supabaseUrl, supabaseKey);

function parseOldFormat(body) {
  const parts = body.split(' | ');
  if (parts.length < 6) return null;

  const isCancelled = parts[5] === 'Cancelado';
  const isNewBooking = parts[5]?.startsWith('http');

  if (!isCancelled && !isNewBooking) return null;

  return {
    clientName: parts[0].trim(),
    services: parts[1].trim(),
    dateTime: parts[2].trim(),
    totalPrice: parts[3].trim(),
    clientPhone: parts[4].trim(),
    manageUrl: parts[5].trim(),
    isMensalista: false,
  };
}

function isJson(str) {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

async function fixNotifications() {
  console.log('🔍 Buscando notificações para corrigir...');

  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('id, title, body, tag')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Erro ao buscar notificações:', error);
    process.exit(1);
  }

  console.log(`📊 Total de notificações: ${notifications.length}`);

  let converted = 0;
  let skipped = 0;

  for (const notif of notifications) {
    // Pula se já é JSON ou é mensagem de teste
    if (isJson(notif.body) || notif.body === 'Se você vê isso, tá funcionando!') {
      skipped++;
      continue;
    }

    const parsed = parseOldFormat(notif.body);
    if (!parsed) {
      console.log(`  ⚠️ Pulando (formato desconhecido): ${notif.id} - "${notif.body.substring(0, 50)}..."`);
      skipped++;
      continue;
    }

    // Padroniza título
    let newTitle = notif.title;
    if (notif.title.startsWith('Novo Agendamento')) {
      newTitle = 'Novo Agendamento!';
    } else if (notif.title.startsWith('Agendamento Cancelado')) {
      newTitle = 'Agendamento Cancelado';
    }

    const newBody = JSON.stringify(parsed);

    const { error: updateError } = await supabase
      .from('notifications')
      .update({ body: newBody, title: newTitle })
      .eq('id', notif.id);

    if (updateError) {
      console.error(`  ❌ Erro ao atualizar ${notif.id}:`, updateError);
    } else {
      console.log(`  ✅ Convertida: ${notif.id} — "${notif.title}" → "${newTitle}"`);
      converted++;
    }
  }

  console.log(`\n✅ Conversão concluída!`);
  console.log(`   Convertidas: ${converted}`);
  console.log(`   Puladas (já JSON/teste): ${skipped}`);
}

fixNotifications().catch(console.error);
