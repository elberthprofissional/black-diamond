/**
 * env-keys.mjs
 * =========================================================================
 * Carregamento SEGURO de credenciais do Supabase para os scripts.
 *
 * NUNCA cole chaves reais no código. Este helper:
 *   1. Carrega o arquivo .env da raiz do projeto (sem sobrescrever env já definido)
 *   2. Expõe getServiceRoleKey() / getAnonKey() / getSupabaseUrl()
 *   3. Lança erro claro e acionável se a credencial não estiver configurada
 *
 * Uso:
 *   import { getServiceRoleKey } from './lib/env-keys.mjs';
 *   const supabase = createClient(getSupabaseUrl(), getServiceRoleKey());
 *
 * Variáveis esperadas no .env:
 *   VITE_SUPABASE_URL          = https://xxx.supabase.co
 *   VITE_SUPABASE_ANON_KEY     = eyJ... (chave anon pública)
 *   SUPABASE_SERVICE_KEY       = eyJ... (chave service_role — NUNCA no frontend)
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

// ─── Carrega .env da raiz (sem sobrescrever variáveis já no ambiente) ───────
(function loadDotEnv() {
  const envPath = resolve(ROOT, '.env');
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    if (key in process.env) continue; // não sobrescreve env real
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
})();

function fail(varName) {
  throw new Error(
    `❌ ${varName} não configurada.\n` +
      `   Adicione ${varName}= ao arquivo .env da raiz do projeto.\n` +
      `   (Supabase Dashboard → Project Settings → API → keys)\n` +
      `   Depois rode: node scripts/seu-script.mjs`
  );
}

export function getServiceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key || key.includes('sua_chave') || key.includes('service_role_placeholder')) {
    fail('SUPABASE_SERVICE_KEY');
  }
  return key;
}

export function getAnonKey() {
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!key || key.includes('sua_chave_anon')) {
    fail('VITE_SUPABASE_ANON_KEY');
  }
  return key;
}

export function getSupabaseUrl() {
  const url = process.env.VITE_SUPABASE_URL;
  if (!url || url.includes('seu-projeto')) {
    fail('VITE_SUPABASE_URL');
  }
  return url;
}
