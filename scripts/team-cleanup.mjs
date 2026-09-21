// =====================================================================
// scripts/team-cleanup.mjs
// Gerenciamento da equipe via service role (apenas local/terminal).
//
// Uso:
//   node scripts/team-cleanup.mjs list                      -> somente leitura
//   node scripts/team-cleanup.mjs remove --names "Joao,Carlos,Pedro" [--delete-auth] [--force]
//   node scripts/team-cleanup.mjs add --name Elberth --email e@x.com --password senha [--specialty "..."]
// =====================================================================

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";

function loadEnv() {
  const path = ".env";
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
  console.error("[team-cleanup] defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env (local).");
  process.exit(1);
}
const admin = createClient(url, key, { auth: { autoRefreshToken: false } });

function args() {
  const a = process.argv.slice(2);
  const out = { _: [] };
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith("--")) {
      out[a[i].slice(2)] = a[i + 1] && !a[i + 1].startsWith("--") ? a[i + 1] : "true";
      if (a[i + 1] && !a[i + 1].startsWith("--")) i++;
    } else out._.push(a[i]);
  }
  return out;
}

async function list() {
  const { data: shops, error } = await admin.from("barbershops").select("id, name, slug, is_active").order("name");
  if (error) throw error;
  for (const shop of shops) {
    const { data: members } = await admin.from("members").select("id, full_name, role, is_active, user_id, specialty").eq("barbershop_id", shop.id).order("role").order("full_name");
    console.log(`\n## ${shop.name} [${shop.slug}] (${shop.id}) ativa=${shop.is_active}`);
    for (const m of members ?? []) {
      const { count: appts } = await admin.from("appointments").select("id", { count: "exact", head: true }).eq("member_id", m.id);
      const { count: hours } = await admin.from("barber_hours").select("id", { count: "exact", head: true }).eq("member_id", m.id);
      console.log(
        `  - ${m.full_name} | ${m.role} | ativo=${m.is_active} | user=${m.user_id ? "SIM" : "sem"} | agendamentos=${appts ?? 0} | barber_hours=${hours ?? 0}`
      );
    }
  }
}

async function remove() {
  const a = args();
  const names = (a.names ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (names.length === 0) throw new Error("informe --names \"A,B,C\"");
  await list();
  console.log("\n--- removendo ---");
  for (const name of names) {
    const { data: members } = await admin
      .from("members")
      .select("id, barbershop_id, full_name, role, is_active, user_id")
      .ilike("full_name", `%${name}%`);
    const targets = (members ?? []).filter((m) => m.full_name.toLowerCase() === name.toLowerCase());
    if (targets.length === 0) {
      console.log(`  ! ${name}: não encontrado`);
      continue;
    }
    for (const m of targets) {
      const { count: appts } = await admin.from("appointments").select("id", { count: "exact", head: true }).eq("member_id", m.id);
      if ((appts ?? 0) > 0) {
        if (a.force !== "true") {
          console.log(`  ! ${m.full_name} (${m.id}): tem ${appts} agendamentos — use --force para deletar mesmo assim.`);
          continue;
        }
        const { error: ae } = await admin.from("appointments").delete().eq("member_id", m.id);
        if (ae) throw ae;
        console.log(`  ✓ ${appts} agendamento(s) de ${m.full_name} apagado(s).`);
      }
      const { error } = await admin.from("members").delete().eq("id", m.id);
      if (error) throw error;
      console.log(`  ✓ ${m.full_name} (${m.role}) removido da equipe.`);
      if (a["delete-auth"] === "true" && m.user_id) {
        const { error: ue } = await admin.auth.admin.deleteUser(m.user_id);
        if (ue) console.log(`  ! auth de ${m.full_name}: ${ue.message}`);
        else console.log(`  ✓ conta de acesso de ${m.full_name} removida.`);
      }
    }
  }
}

async function add() {
  const a = args();
  const name = (a.name ?? "").trim();
  const email = (a.email ?? "").trim().toLowerCase();
  const password = a.password ?? "";
  if (!name || !email || password.length < 6) throw new Error("informe --name, --email e --password (>=6).");
  const role = a.role === "owner" ? "owner" : "barber";

  const { data: eusers } = await admin.auth.admin.listUsers();
  let user = eusers.users.find((u) => u.email?.toLowerCase() === email);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: name } });
    if (error) throw error;
    user = data.user;
    console.log(`  ✓ usuário ${email} criado.`);
  } else {
    console.log(`  · usuário ${email} já existia.`);
  }

  const { data: member } = await admin.from("members").select("id, full_name").eq("user_id", user.id).maybeSingle();
  if (member) {
    console.log(`  · membro já existe: ${member.full_name} (${member.id}). Nada a criar.`);
    return;
  }

  const { data: members } = await admin.from("members").select("id").ilike("full_name", `%${name}%`);
  const place = members?.[0];
  if (place) {
    const { error: up } = await admin.from("members").update({ user_id: user.id, role, full_name: name, is_active: true }).eq("id", place.id);
    if (up) throw up;
    console.log(`  ✓ membro placeholder "${name}" vinculado (${place.id}).`);
  } else {
    const { data: shop } = await admin.from("barbershops").select("id").limit(1).single();
    if (!shop) throw new Error("nenhuma barbearia encontrada.");
    const { data: created, error: ins } = await admin
      .from("members")
      .insert({ barbershop_id: shop.id, user_id: user.id, role, full_name: name, is_active: true })
      .select("id")
      .single();
    if (ins) throw ins;
    console.log(`  ✓ ${name} criado na barbearia ${shop.id} (${created.id}).`);
  }
}

const cmd = args()._[0];
try {
  if (cmd === "add") await add();
  else if (cmd === "remove") await remove();
  else await list();
} catch (err) {
  console.error("[team-cleanup] erro:", err.message ?? err);
  process.exit(1);
}