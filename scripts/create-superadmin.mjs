// =====================================================================
// scripts/create-superadmin.mjs
// Bootstrap do primeiro SUPERADMIN do BLACK DIAMOND.
//
// Uso:
//   npm run superadmin:create              (usa SUPABASE_SERVICE_ROLE_KEY do .env)
//   node scripts/create-superadmin.mjs admin@blackdiamond.local Senha@123
//
// Esta ferramenta é DEV/BOOTSTRAP. A chave service_role NUNCA vai para o
// frontend. Requer que .env exista com SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.
// =====================================================================

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const path = resolve(".env");
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = loadEnv();
const [emailArg, passwordArg] = process.argv.slice(2);

const email = emailArg || env.SEED_OWNER_EMAIL || "admin@blackdiamond.local";
const password = passwordArg || env.SEED_OWNER_PASSWORD || "Admin@2026";

const url = process.env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "[superadmin] Define SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env (service role key, apenas local)."
  );
  process.exit(1);
}

const admin = createClient(url, key, { auth: { autoRefreshToken: false } });

try {
  const { data: existing, error: exErr } = await admin.auth.admin.listUsers();
  if (exErr) throw exErr;

  let user = existing.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: email.split("@")[0] },
    });
    if (error) throw error;
    user = data.user;
    console.log(`[superadmin] usuário criado: ${email}`);
  } else {
    console.log(`[superadmin] usuário já existe: ${email}`);
  }

  const { data: res, error } = await admin.rpc("promote_to_superadmin", { p_email: email });
  if (error) throw error;

  console.log(`[superadmin] OK — ${email} promovido a SUPERADMIN (profile id: ${res})`);
  console.log(`[superadmin] Login em /login com a senha definida no script/.env`);
} catch (err) {
  console.error("[superadmin] erro:", err.message ?? err);
  process.exit(1);
}