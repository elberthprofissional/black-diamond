/**
 * Migration: Assinaturas SaaS (v3.28.0)
 * Cria tabelas subscriptions, payment_logs, RPCs e triggers.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://dbukdhycfaibdshxnatt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidWtkaHljZmFpYmRzaHhuYXR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI5MzM0NCwiZXhwIjoyMDk2ODY5MzQ0fQ.-PsylDGBzJN3W1acv6mk80V0Yj_nHScr6hgamTw1LIQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('📦 Rodando migration 011_subscriptions.sql...');

  const sqlPath = 'supabase/migrations/011_subscriptions.sql';
  const sql = readFileSync(sqlPath, 'utf-8');

  // Divide em statements por ;
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  let success = 0;
  let errors = 0;

  for (const stmt of statements) {
    try {
      // Usa a RPC query do Supabase
      const { error } = await supabase.rpc('exec_sql', { query: stmt + ';' });
      if (error) {
        // Tenta executar direto via REST
        console.warn(`  ⚠️ RPC falhou, tentando via REST...`);
        const res = await fetch(`${supabaseUrl}/rest/v1/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Prefer': 'params=single-object',
          },
          body: JSON.stringify({ query: stmt }),
        });
        if (!res.ok) {
          const text = await res.text();
          // Ignora erros de "already exists" que são normais em migrations
          if (!text.includes('already exists') && !text.includes('duplicate')) {
            console.error(`  ❌ Erro: ${text.slice(0, 200)}`);
            errors++;
          } else {
            console.warn(`  ⚠️ Já existe, pulando...`);
            success++;
          }
        } else {
          success++;
        }
      } else {
        success++;
      }
    } catch (e) {
      console.error(`  ❌ Exceção: ${e.message}`);
      errors++;
    }
  }

  console.log(`\n✅ Migration concluída!`);
  console.log(`   Statements: ${success} sucesso, ${errors} erro`);
  
  // Agora salva a chave PIX do dono nas settings
  console.log('\n💳 Salvando chave PIX do proprietário...');
  const { error: pixError } = await supabase
    .from('settings')
    .upsert({ key: 'owner_pix_key', value: '70263397610' }, { onConflict: 'key' });
  
  if (pixError) {
    console.error('❌ Erro ao salvar PIX:', pixError);
  } else {
    console.log('✅ Chave PIX salva: 70263397610');
  }
}

runMigration().catch(console.error);
