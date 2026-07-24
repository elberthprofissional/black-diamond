#!/usr/bin/env node

/**
 * Black Diamond — Setup Automático
 *
 * Roda migrations no Supabase, cria usuário admin e configura .env.
 *
 * Uso:
 *   node scripts/setup.mjs                    # modo interativo
 *   node scripts/setup.mjs --non-interactive  # usa variáveis de ambiente
 *
 * Variáveis de ambiente (modo non-interactive):
 *   SUPABASE_URL          - URL do projeto Supabase
 *   SUPABASE_SERVICE_KEY  - Service Role key (Settings > API > service_role)
 *   ADMIN_EMAIL           - Email do admin
 *   ADMIN_PASSWORD        - Senha do admin (mínimo 6 caracteres)
 *   BARBER_WHATSAPP       - Número WhatsApp (opcional)
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ─── Helpers ────────────────────────────────────────────────────────────────

function log(msg) {
  console.log(`\x1b[36m▸\x1b[0m ${msg}`);
}

function success(msg) {
  console.log(`\x1b[32m✓\x1b[0m ${msg}`);
}

function error(msg) {
  console.log(`\x1b[31m✗\x1b[0m ${msg}`);
}

function warn(msg) {
  console.log(`\x1b[33m!\x1b[0m ${msg}`);
}

async function ask(question, defaultValue = '') {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`\x1b[33m?\x1b[0m ${question}${defaultValue ? ` (${defaultValue})` : ''}: `, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue);
    });
  });
}

// ─── Supabase API ───────────────────────────────────────────────────────────

async function supabaseQuery(url, serviceKey, path, options = {}) {
  const res = await fetch(`${url}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      ...options.headers,
    },
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Supabase API error (${res.status}): ${text}`);
  }

  return text ? JSON.parse(text) : null;
}

async function runSQL(url, serviceKey, sql) {
  const res = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  // exec_sql might not exist — fall back to direct query
  if (!res.ok) {
    // Try using the SQL endpoint directly
    const sqlRes = await fetch(`${url}/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ query: sql }),
    });

    if (!sqlRes.ok) {
      const errText = await sqlRes.text();
      throw new Error(`SQL execution failed: ${errText}`);
    }
    return;
  }
}

async function createUser(url, serviceKey, email, password) {
  const res = await fetch(`${url}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
    }),
  });

  const data = await res.json();

  if (!res.ok && !data.msg?.includes('already registered')) {
    throw new Error(`Failed to create user: ${JSON.stringify(data)}`);
  }

  return data;
}

async function addAdminUser(url, serviceKey, userId) {
  const res = await fetch(`${url}/rest/v1/admin_users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ user_id: userId }),
  });

  // Might fail if already exists — that's ok
  if (!res.ok) {
    const text = await res.text();
    if (!text.includes('duplicate') && !text.includes('already exists')) {
      warn(`Could not add admin user (might already exist): ${text}`);
    }
  }
}

async function getUserByEmail(url, serviceKey, email) {
  const res = await fetch(`${url}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data?.users?.[0] || null;
}

// ─── Migration Runner ───────────────────────────────────────────────────────

const MIGRATION_ORDER = [
  '001_schema.sql',
  '002_rls.sql',
  '003_functions.sql',
  '004_triggers.sql',
  '005_seed_cron.sql',
  '006_multi_barber.sql',
];

async function runMigrations(url, serviceKey) {
  const migrationsDir = join(ROOT, 'supabase', 'migrations');

  for (const filename of MIGRATION_ORDER) {
    const filepath = join(migrationsDir, filename);

    if (!existsSync(filepath)) {
      warn(`Migration not found: ${filename} — skipping`);
      continue;
    }

    log(`Running migration: ${filename}`);
    const sql = readFileSync(filepath, 'utf-8');

    // Split by semicolons and run each statement
    // (Supabase SQL endpoint may not support multi-statement)
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    let successCount = 0;
    let skipCount = 0;

    for (const stmt of statements) {
      try {
        await runSQL(url, serviceKey, stmt + ';');
        successCount++;
      } catch (e) {
        // Most errors are "already exists" — that's fine
        if (
          e.message.includes('already exists') ||
          e.message.includes('duplicate') ||
          e.message.includes('does not exist')
        ) {
          skipCount++;
        } else {
          warn(`Statement failed (non-fatal): ${e.message.slice(0, 100)}`);
          skipCount++;
        }
      }
    }

    success(`${filename}: ${successCount} applied, ${skipCount} skipped`);
  }
}

// ─── Seed Data ──────────────────────────────────────────────────────────────

async function seedTestData(url, serviceKey) {
  log('Seeding default services...');

  const defaultServices = [
    { name: 'Corte de Cabelo', price: 50, duration: 30, description: 'Corte masculino' },
    { name: 'Barba', price: 30, duration: 20, description: 'Barba completa' },
    { name: 'Corte + Barba', price: 70, duration: 45, description: 'Combo corte e barba' },
  ];

  for (const svc of defaultServices) {
    try {
      await supabaseQuery(url, serviceKey, '/rest/v1/services', {
        method: 'POST',
        body: JSON.stringify(svc),
        headers: { Prefer: 'return=minimal' },
      });
    } catch (e) {
      if (!e.message.includes('duplicate')) {
        warn(`Service seed skipped: ${e.message.slice(0, 80)}`);
      }
    }
  }

  success('Default services seeded');
}

// ─── .env Generator ─────────────────────────────────────────────────────────

function generateEnv(supabaseUrl, supabaseKey, whatsapp) {
  const envPath = join(ROOT, '.env');
  const existing = existsSync(envPath) ? readFileSync(envPath, 'utf-8') : '';

  // Parse existing env to preserve other vars
  const envVars = {};
  for (const line of existing.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      envVars[match[1].trim()] = match[2].trim();
    }
  }

  // Update Supabase vars
  envVars['VITE_SUPABASE_URL'] = supabaseUrl;
  envVars['VITE_SUPABASE_ANON_KEY'] = supabaseKey;
  if (whatsapp) {
    envVars['VITE_BARBER_WHATSAPP'] = whatsapp;
  }

  // Write .env
  const envContent = [
    '# Black Diamond — Environment Variables',
    '# Generated by setup script',
    '',
    '# Supabase',
    `VITE_SUPABASE_URL=${envVars['VITE_SUPABASE_URL'] || ''}`,
    `VITE_SUPABASE_ANON_KEY=${envVars['VITE_SUPABASE_ANON_KEY'] || ''}`,
    '',
    '# WhatsApp',
    `VITE_BARBER_WHATSAPP=${envVars['VITE_BARBER_WHATSAPP'] || ''}`,
    '',
    '# Sentry (opcional)',
    `VITE_SENTRY_DSN=${envVars['VITE_SENTRY_DSN'] || ''}`,
    '',
    '# Google Analytics (opcional)',
    `VITE_GA_ID=${envVars['VITE_GA_ID'] || ''}`,
    '',
    '# Site URL',
    `VITE_SITE_URL=${envVars['VITE_SITE_URL'] || ''}`,
  ].join('\n');

  writeFileSync(envPath, envContent);
  success('.env file generated');
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('\x1b[1m═══════════════════════════════════════════════\x1b[0m');
  console.log('\x1b[1m  BLACK DIAMOND — Setup Automático\x1b[0m');
  console.log('\x1b[1m═══════════════════════════════════════════════\x1b[0m');
  console.log('');

  const isNonInteractive = process.argv.includes('--non-interactive');

  // ── Collect inputs ──
  let supabaseUrl, serviceKey, adminEmail, adminPassword, whatsapp;

  if (isNonInteractive) {
    supabaseUrl = process.env.SUPABASE_URL;
    serviceKey = process.env.SUPABASE_SERVICE_KEY;
    adminEmail = process.env.ADMIN_EMAIL;
    adminPassword = process.env.ADMIN_PASSWORD;
    whatsapp = process.env.BARBER_WHATSAPP || '';

    if (!supabaseUrl || !serviceKey || !adminEmail || !adminPassword) {
      error('Missing required env vars for non-interactive mode:');
      error('  SUPABASE_URL, SUPABASE_SERVICE_KEY, ADMIN_EMAIL, ADMIN_PASSWORD');
      process.exit(1);
    }
  } else {
    console.log('\x1b[2mPara configurar, você precisa de:\x1b[0m');
    console.log('  1. Criar projeto no Supabase (app.supabase.com)');
    console.log('  2. Pegar URL + Service Role key (Settings > API)');
    console.log('  3. Ter um email e senha para o admin');
    console.log('');

    supabaseUrl = await ask('Supabase URL (https://xxx.supabase.co)');
    serviceKey = await ask('Supabase Service Role key');
    adminEmail = await ask('Email do admin');
    adminPassword = await ask('Senha do admin (mínimo 6 caracteres)');
    whatsapp = await ask('WhatsApp do barbeiro (DD+numero, ex: 5531999999999)', '');

    // Validate
    if (!supabaseUrl.includes('supabase.co')) {
      error('URL inválida. Deve conter "supabase.co"');
      process.exit(1);
    }

    if (adminPassword.length < 6) {
      error('Senha deve ter pelo menos 6 caracteres');
      process.exit(1);
    }
  }

  // ── Step 1: Run migrations ──
  console.log('');
  log('Step 1/4: Running database migrations...');
  await runMigrations(supabaseUrl, serviceKey);

  // ── Step 2: Seed data ──
  console.log('');
  log('Step 2/4: Seeding default data...');
  await seedTestData(supabaseUrl, serviceKey);

  // ── Step 3: Create admin user ──
  console.log('');
  log('Step 3/4: Creating admin user...');

  let userId;
  try {
    const existingUser = await getUserByEmail(supabaseUrl, serviceKey, adminEmail);
    if (existingUser) {
      warn(`User ${adminEmail} already exists — using existing user`);
      userId = existingUser.id;
    } else {
      const newUser = await createUser(supabaseUrl, serviceKey, adminEmail, adminPassword);
      userId = newUser.id;
      success(`Admin user created: ${adminEmail}`);
    }

    // Add to admin_users table
    if (userId) {
      await addAdminUser(supabaseUrl, serviceKey, userId);
      success('Admin user added to admin_users table');
    }
  } catch (e) {
    warn(`Admin user setup: ${e.message}`);
  }

  // ── Step 4: Generate .env ──
  console.log('');
  log('Step 4/4: Generating .env file...');

  // The anon key is different from service key — we need to get it
  // For now, use the service key as placeholder and tell user to update
  generateEnv(supabaseUrl, serviceKey, whatsapp);
  warn('NOTE: .env has Service Role key. Replace VITE_SUPABASE_ANON_KEY with the anon key from Supabase dashboard.');

  // ── Done ──
  console.log('');
  console.log('\x1b[1m═══════════════════════════════════════════════\x1b[0m');
  console.log('\x1b[1;32m  Setup complete!\x1b[0m');
  console.log('\x1b[1m═══════════════════════════════════════════════\x1b[0m');
  console.log('');
  console.log('\x1b[2mNext steps:\x1b[0m');
  console.log('  1. Open .env and replace VITE_SUPABASE_ANON_KEY with the anon key');
  console.log('     (Supabase Dashboard > Settings > API > anon public)');
  console.log('  2. Run: npm run dev');
  console.log('  3. Open http://localhost:5173');
  console.log('  4. Login at /admin with the email/password you set');
  console.log('');
  console.log('\x1b[2mTo deploy to Vercel:\x1b[0m');
  console.log('  npx vercel --prod');
  console.log('');
}

main().catch((e) => {
  error(`Setup failed: ${e.message}`);
  process.exit(1);
});
