// =====================================================================
// scripts/seed-dev.mjs
// Seed de DESENVOLVIMENTO: cria contas de auth para o dono e os
// barbeiros da barbearia BLACK DIAMOND e as vincula aos membros
// criados pela migration 0006 (placeholders).
//
// Pré-requisitos:
//   1. migrations aplicadas no Supabase (inclui 0006_seed_development).
//   2. .env com SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.
//
// Uso: npm run seed:dev
//
// A service role key é usada APENAS neste script local, nunca no front.
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
const url = process.env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("[seed] Define SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env (service role key, apenas local).");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { autoRefreshToken: false } });

const SHOP_SLUG = env.SEED_SHOP_SLUG || "black-diamond";

const owner = {
  full_name: "João",
  email: env.SEED_OWNER_EMAIL || "joao@blackdiamond.local",
  password: env.SEED_OWNER_PASSWORD || "joao@2026",
  role: "owner",
};

let barberEmails = [];
try {
  barberEmails = JSON.parse(env.SEED_BARBER_EMAILS || "[]");
} catch {
  barberEmails = [];
}
if (barberEmails.length === 0) barberEmails = ["carlos@blackdiamond.local", "pedro@blackdiamond.local"];

const barbers = barberEmails.map((email) => ({
  full_name: email.split("@")[0].charAt(0).toUpperCase() + email.split("@")[0].slice(1),
  email,
  password: env.SEED_BARBER_PASSWORD || "barber@2026",
  role: "barber",
}));

async function userFor(email, password, fullName) {
  const { data: list } = await admin.auth.admin.listUsers();
  const found = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (found) return found;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) throw error;
  return data.user;
}

try {
  const { data: shop, error: shopErr } = await admin
    .from("barbershops")
    .select("id, name")
    .eq("slug", SHOP_SLUG)
    .single();
  if (shopErr || !shop) {
    console.error(`[seed] Barbearia "${SHOP_SLUG}" não encontrada. Rode primeiro o seed SQL (migration 0006).`);
    process.exit(1);
  }
  console.log(`[seed] Barbearia: ${shop.name} (${shop.id})`);

  for (const person of [owner, ...barbers]) {
    const user = await userFor(person.email, person.password, person.full_name);
    const { data: members } = await admin
      .from("members")
      .select("id, full_name, user_id")
      .eq("barbershop_id", shop.id)
      .eq("full_name", person.full_name);
    const member = members?.[0];

    if (!member) {
      const { data: created, error: cErr } = await admin
        .from("members")
        .insert({
          barbershop_id: shop.id,
          user_id: user.id,
          role: person.role,
          full_name: person.full_name,
          is_active: true,
        })
        .select("id")
        .single();
      if (cErr) throw cErr;
      console.log(`[seed] ${person.full_name}: membro criado e vinculado (${created.id})`);
      continue;
    }

    if (member.user_id && member.user_id !== user.id) {
      console.error(`[seed] ${person.full_name}: membro já vinculado a outro usuário.`);
      continue;
    }

    const { error: uErr } = await admin
      .from("members")
      .update({ user_id: user.id, role: person.role })
      .eq("id", member.id);
    if (uErr) throw uErr;
    console.log(`[seed] ${person.full_name}: membro vinculado (${member.id})`);
  }

  console.log("[seed] OK. Contas: owner e barbeiros prontos para login em /login.");
} catch (err) {
  console.error("[seed] erro:", err.message ?? err);
  process.exit(1);
}