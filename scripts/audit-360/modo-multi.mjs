// Liga o modo MULTI-BARBEIRO no banco:
//   1. single_barber_mode = false  (o app passa a mostrar escolha de barbeiro)
//   2. Remove a chave fantasma multi_barber_enabled (nenhum código a lê)
// Uso: node scripts/audit-360/modo-multi.mjs <PAT>
const TOKEN = process.argv[2];
if (!TOKEN) {
  console.error('Passe o PAT: node scripts/audit-360/modo-multi.mjs sbp_...');
  process.exit(1);
}

const API = 'https://api.supabase.com/v1/projects/dbukdhycfaibdshxnatt/database/query';

async function q(sql) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) return { error: text.slice(0, 400) };
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

console.log('=== ANTES ===');
console.log(JSON.stringify(await q("SELECT key, value FROM settings WHERE key IN ('single_barber_mode','multi_barber_enabled') ORDER BY key;")));

console.log('\n=== 1. single_barber_mode -> false ===');
const r1 = await q("UPDATE settings SET value = 'false' WHERE key = 'single_barber_mode';");
console.log(r1.error ? 'ERRO: ' + r1.error : 'OK');

console.log('\n=== 2. remove chave fantasma multi_barber_enabled ===');
const r2 = await q("DELETE FROM settings WHERE key = 'multi_barber_enabled';");
console.log(r2.error ? 'ERRO: ' + r2.error : 'OK');

console.log('\n=== DEPOIS ===');
console.log(JSON.stringify(await q("SELECT key, value FROM settings WHERE key IN ('single_barber_mode','multi_barber_enabled') ORDER BY key;")));
