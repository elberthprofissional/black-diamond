/**
 * Consolida 13 migrations em 7 arquivos lógicos + move originais.
 * Cria também a migration 007 corrigida (com a lógica mensal certa).
 */
import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = resolve(__dirname, '..', 'supabase', 'migrations');

console.log('='.repeat(60));
console.log('  CONSOLIDANDO MIGRATIONS (13 → 7)');
console.log('='.repeat(60));

function read(name) {
  const p = resolve(MIGRATIONS_DIR, name);
  if (!existsSync(p)) { console.log(`   ⚠️  ${name} não encontrado`); return ''; }
  return readFileSync(p, 'utf-8');
}

function unifiedFile(name, parts) {
  const header = `-- =========================================================================\n-- BLACK DIAMOND - ${name}\n-- =========================================================================\n-- Consolidado de: ${parts.join(', ')}\n-- =========================================================================\n\n`;
  const body = parts.map(p => {
    const content = read(p);
    // Pula linhas de comentário header dos arquivos originais
    const lines = content.split('\n').filter(l => !l.startsWith('-- =====') && !l.startsWith('-- BLACK DIAMOND'));
    return lines.join('\n').trim();
  }).filter(Boolean).join('\n\n');
  return header + body;
}

// Cria subpasta para originals se não existir
const legacyDir = resolve(MIGRATIONS_DIR, '_originals');
if (!existsSync(legacyDir)) mkdirSync(legacyDir);

// 1. Schema + RLS
const f1 = unifiedFile('001 - SCHEMA + RLS', ['001_schema.sql', '002_rls.sql']);
writeFileSync(resolve(MIGRATIONS_DIR, '001_schema_rls.sql'), f1);
console.log('   ✅ 001_schema_rls.sql (001 + 002)');

// 2. Funções + Triggers
const f2 = unifiedFile('002 - FUNÇÕES + TRIGGERS', ['003_functions.sql', '004_triggers.sql']);
writeFileSync(resolve(MIGRATIONS_DIR, '002_functions_triggers.sql'), f2);
console.log('   ✅ 002_functions_triggers.sql (003 + 004)');

// 3. Seed + Cron
const f3 = unifiedFile('003 - SEED + CRON', ['005_seed_cron.sql']);
writeFileSync(resolve(MIGRATIONS_DIR, '003_seed_cron.sql'), f3);
console.log('   ✅ 003_seed_cron.sql (005)');

// 4. Multi-barber + Mensalista + Auto-complete
const f4 = unifiedFile('004 - FEATURES', ['006_multi_barber.sql', '007_mensalista_reborn.sql', '008_auto_complete_2h_buffer.sql']);
writeFileSync(resolve(MIGRATIONS_DIR, '004_features.sql'), f4);
console.log('   ✅ 004_features.sql (006 + 007 + 008)');

// 5. Fixes (no-show + rpc + notification)
const f5 = unifiedFile('005 - FIXES', ['009_remove_no_show_block.sql', '010_fix_rpc_functions.sql', '010_fix_notification_format.sql']);
writeFileSync(resolve(MIGRATIONS_DIR, '005_fixes.sql'), f5);
console.log('   ✅ 005_fixes.sql (009 + 010_rpc + 010_notification)');

// 6. Assinaturas (tabelas + RPCs originais)
const f6 = unifiedFile('006 - ASSINATURAS (BASE)', ['011_subscriptions.sql']);
writeFileSync(resolve(MIGRATIONS_DIR, '006_subscriptions.sql'), f6);
console.log('   ✅ 006_subscriptions.sql (011)');

// 7. Modelo mensal CORRIGIDO (com a lógica IF/ELSE)
const f7 = unifiedFile('007 - ASSINATURA MENSAL (CORRIGIDO)', ['012_monthly_subscriptions.sql']);
writeFileSync(resolve(MIGRATIONS_DIR, '007_monthly_subscriptions.sql'), f7);
console.log('   ✅ 007_monthly_subscriptions.sql (012 corrigido)');

// Move originals para subpasta
const originals = [
  '001_schema.sql', '002_rls.sql', '003_functions.sql', '004_triggers.sql',
  '005_seed_cron.sql', '006_multi_barber.sql', '007_mensalista_reborn.sql',
  '008_auto_complete_2h_buffer.sql', '009_remove_no_show_block.sql',
  '010_fix_rpc_functions.sql', '010_fix_notification_format.sql',
  '011_subscriptions.sql', '012_monthly_subscriptions.sql',
];

for (const f of originals) {
  const src = resolve(MIGRATIONS_DIR, f);
  const dst = resolve(legacyDir, f);
  if (existsSync(src)) {
    renameSync(src, dst);
    console.log(`   📦 Movido: ${f} → _originals/`);
  }
}

// Remove CONSOLIDADAS.md se existir (o markdown de plano)
const planFile = resolve(MIGRATIONS_DIR, 'CONSOLIDADAS.md');
if (existsSync(planFile)) renameSync(planFile, resolve(legacyDir, 'PLANO_CONSOLIDACAO.md'));

console.log('\n' + '='.repeat(60));
console.log('  CONSOLIDAÇÃO CONCLUÍDA!');
console.log('  13 → 7 arquivos 🎯');
console.log('='.repeat(60));
console.log('\n📋 Agora só falta rodar o 007_monthly_subscriptions.sql no SQL Editor!');
console.log('   (os outros 6 já foram aplicados no banco)');
