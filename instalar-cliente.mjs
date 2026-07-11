#!/usr/bin/env node

/**
 * ══════════════════════════════════════════════════════════════
 * BLACK DIAMOND — Instalador Automatizado
 * ══════════════════════════════════════════════════════════════
 *
 * Como usar:
 *   node instalar-cliente.mjs
 *
 * O que este script faz (tudo automatico):
 *   1. Coleta dados da barbearia (nome, email, senha, WhatsApp)
 *   2. Valida todos os dados
 *   3. Cria projeto no Supabase via API
 *   4. Roda o schema do banco (universal.sql)
 *   5. Cria o usuario admin no Supabase Auth
 *   6. Gera o arquivo .env com as credenciais
 *   7. Faz deploy na Vercel
 *
 * Pre-requisitos (tudo gratuito):
 *   - Node.js 18+ (https://nodejs.org)
 *   - Conta no Supabase (https://supabase.com) — plano free
 *   - Conta na Vercel (https://vercel.com) — plano free
 *   - Supabase Access Token (veja como criar abaixo)
 *
 * Como criar o Supabase Access Token:
 *   1. Acesse https://supabase.com/dashboard
 *   2. Clique no seu avatar (canto superior direito)
 *   3. Va em "Access Tokens"
 *   4. Clique "Generate new token"
 *   5. Cole o token aqui no script
 *
 * Duvidas? WhatsApp do desenvolvedor: (31) 98015-9559
 */

import { createInterface } from 'readline';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rl = createInterface({ input: process.stdin, output: process.stdout });

// ─── Cores do terminal ────────────────────────────────
const C = {
  green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
  red: '\x1b[31m', bold: '\x1b[1m', dim: '\x1b[2m',
  reset: '\x1b[0m', white: '\x1b[37m',
};

// ─── Helpers ──────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ask = (q) => new Promise((r) => rl.question(q, (a) => r(a.trim())));

async function askPassword(label) {
  console.log(`  ${C.dim}(a senha nao aparece enquanto voce digita)${C.reset}`);
  const cleanup = () => process.stdin.setRawMode?.(false);
  process.on('SIGINT', cleanup);

  const read = () => new Promise((resolve) => {
    const buf = [];
    process.stdin.setRawMode?.(true);
    const onData = (chunk) => {
      const input = chunk.toString();
      if (input === '\r' || input === '\n') {
        process.stdin.removeListener('data', onData);
        cleanup();
        resolve(buf.join(''));
      } else if (input === '\x7f' || input === '\b') {
        buf.pop();
        process.stdout.write('\b \b');
      } else {
        buf.push(input);
        process.stdout.write('*');
      }
    };
    process.stdin.on('data', onData);
  });

  const senha = await read();
  process.removeListener('SIGINT', cleanup);
  console.log('');
  return senha;
}

function validateEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
function validatePhone(phone) { const d = phone.replace(/\D/g, ''); return d.length >= 10 && d.length <= 15; }
function slugify(text) { return text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 48); }

// ─── Interface visual ─────────────────────────────────
function banner() {
  console.log('');
  console.log(`${C.yellow}  ╔══════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.yellow}  ║${C.reset}${C.bold}         BLACK DIAMOND — Instalador Automatico       ${C.reset}${C.yellow}║${C.reset}`);
  console.log(`${C.yellow}  ║${C.reset}    Sistema de agendamento para barbearias           ${C.yellow}║${C.reset}`);
  console.log(`${C.yellow}  ║${C.reset}    by Elberth Mayan — (31) 98015-9559              ${C.yellow}║${C.reset}`);
  console.log(`${C.yellow}  ╚══════════════════════════════════════════════════════╝${C.reset}`);
  console.log('');
}

function step(n, total, text) {
  console.log(`\n${C.cyan}  ── Passo ${n}/${total} ${'─'.repeat(40)}${C.reset}`);
  console.log(`${C.bold}  ${text}${C.reset}`);
}

function ok(text) { console.log(`  ${C.green}  OK  ${C.reset} ${text}`); }
function warn(text) { console.log(`  ${C.yellow}  !!  ${C.reset} ${text}`); }
function fail(text) { console.log(`  ${C.red} ERRO ${C.reset} ${text}`); }
function info(text) { console.log(`  ${C.dim}      ${text}${C.reset}`); }
function link(text) { console.log(`  ${C.cyan}  ->  ${C.reset} ${text}`); }

function progress(pct, text) {
  const bar = 30;
  const filled = Math.round(bar * pct / 100);
  const empty = bar - filled;
  const barStr = '█'.repeat(filled) + '░'.repeat(empty);
  process.stdout.write(`\r  ${C.cyan}${barStr}${C.reset} ${pct}% ${text}    `);
}

// ─── Main ─────────────────────────────────────────────
async function main() {
  console.clear?.();
  banner();

  const TOTAL_STEPS = 7;

  // ════════════════════════════════════════════════════════
  // PASSO 1: DADOS DA BARBEARIA
  // ════════════════════════════════════════════════════════
  step(1, TOTAL_STEPS, 'Dados da barbearia');

  let nomeBarbearia = '';
  while (!nomeBarbearia) {
    nomeBarbearia = await ask(`  Nome da barbearia: `);
    if (!nomeBarbearia) fail('Nome obrigatorio.');
  }

  let adminEmail = '';
  while (!adminEmail || !validateEmail(adminEmail)) {
    adminEmail = await ask(`  Email do admin: `);
    if (!validateEmail(adminEmail)) fail('Email invalido. Ex: admin@barbearia.com');
  }

  let adminSenha = '';
  let confirmSenha = '';
  while (adminSenha.length < 8 || adminSenha !== confirmSenha) {
    console.log(`  ${C.bold}Senha do admin (minimo 8 caracteres):${C.reset}`);
    adminSenha = await askPassword('  > ');
    if (adminSenha.length < 8) { fail('Minimo 8 caracteres.'); continue; }
    console.log(`  ${C.bold}Confirmar senha:${C.reset}`);
    confirmSenha = await askPassword('  > ');
    if (adminSenha !== confirmSenha) fail('Senhas nao coincidem.');
  }
  ok('Senha validada.');

  let telefone = '';
  while (!validatePhone(telefone)) {
    telefone = await ask(`  WhatsApp (com DDD, so numeros): `);
    if (!validatePhone(telefone)) fail('Telefone invalido. Ex: 31999998888');
  }

  const telefoneFormatado = '55' + telefone.replace(/\D/g, '');
  const slug = slugify(nomeBarbearia);
  const defaultUrl = `https://${slug}.vercel.app`;
  const siteUrlInput = await ask(`  URL do site [${defaultUrl}]: `);
  const finalSiteUrl = siteUrlInput || defaultUrl;

  // ════════════════════════════════════════════════════════
  // PASSO 2: CONEXAO COM SUPABASE
  // ════════════════════════════════════════════════════════
  step(2, TOTAL_STEPS, 'Conexao com Supabase');
  info('Para criar o token, acesse:');
  link('https://supabase.com/dashboard/account/tokens');

  const usarToken = await ask(`  Voce tem o Supabase Access Token? (s/N): `);
  let supabaseUrl, supabaseAnonKey, projectRef;

  if (usarToken.toLowerCase() === 's') {
    const token = await ask(`  Cole o Supabase Access Token: `);

    // Buscar organizacoes
    let orgId;
    try {
      const res = await fetch('https://api.supabase.com/v1/organizations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const orgs = await res.json();
        if (orgs.length === 0) {
          fail('Nenhuma organizacao encontrada.');
          info('Crie uma em: https://supabase.com/dashboard');
          process.exit(1);
        } else if (orgs.length === 1) {
          orgId = orgs[0].id;
          ok(`Organizacao: ${orgs[0].name}`);
        } else {
          console.log(`\n  Organizacoes disponiveis:`);
          orgs.forEach((o, i) => console.log(`    ${i + 1}. ${o.name}`));
          const escolha = await ask(`  Digite o numero: `);
          orgId = orgs[parseInt(escolha) - 1]?.id;
          if (!orgId) { fail('Opcao invalida.'); process.exit(1); }
        }
      }
    } catch (err) {
      fail(`Erro ao listar organizacoes: ${err.message}`);
      orgId = await ask(`  ID da organizacao: `);
    }

    const regiao = await ask(`  Regiao [sa-east-1]: `) || 'sa-east-1';

    // ══════════════════════════════════════════════════════
    // PASSO 3: CRIAR PROJETO SUPABASE
    // ══════════════════════════════════════════════════════
    step(3, TOTAL_STEPS, 'Criando projeto no Supabase (~2 min)');

    const dbPass = Math.random().toString(36).slice(-12) + 'Aa1!';

    try {
      progress(10, 'Criando projeto...');
      const createRes = await fetch('https://api.supabase.com/v1/projects', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: slug, organization_id: orgId, plan: 'free', region: regiao, db_pass: dbPass,
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.json();
        throw new Error(err.message || JSON.stringify(err));
      }

      const project = await createRes.json();
      projectRef = project.ref;
      progress(30, 'Projeto criado!');

      // Aguardar banco online
      progress(40, 'Aguardando banco online...');
      let online = false;
      for (let i = 0; i < 30; i++) {
        await sleep(5000);
        progress(40 + Math.min(i * 2, 20), 'Banco iniciando...');
        try {
          const statusRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (statusRes.ok) {
            const status = await statusRes.json();
            if (status.status === 'ACTIVE_HEALTHY') { online = true; break; }
          }
        } catch { /* retry */ }
      }
      console.log('');
      if (online) ok('Banco online!');
      else warn('Banco pode ainda estar iniciando. Continuando...');

      // Pegar anon key
      progress(65, 'Obtendo chaves da API...');
      const apiRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/api-keys`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!apiRes.ok) throw new Error('Falha ao obter chaves');
      const keys = await apiRes.json();
      supabaseUrl = `https://${projectRef}.supabase.co`;
      supabaseAnonKey = keys.find((k) => k.name === 'anon')?.api_key || keys[0]?.api_key;
      ok(`Supabase URL: ${supabaseUrl}`);

      // ════════════════════════════════════════════════════
      // PASSO 4: RODAR UNIVERSAL.SQL
      // ════════════════════════════════════════════════════
      step(4, TOTAL_STEPS, 'Instalando schema do banco de dados');

      const sqlPath = join(__dirname, 'supabase', 'universal.sql');
      if (existsSync(sqlPath)) {
        const sql = readFileSync(sqlPath, 'utf-8');
        progress(70, 'Enviando schema SQL...');
        const lines = sql.split('\n').length;

        const sqlRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: sql }),
        });

        progress(90, 'Schema instalado!');
        if (sqlRes.ok) {
          ok(`${lines} linhas de SQL executadas com sucesso!`);
        } else {
          const errText = await sqlRes.text();
          if (errText.includes('already exists')) {
            ok('Schema ja existente (tudo certo).');
          } else {
            fail(`SQL com erros: ${errText.slice(0, 200)}`);
            info('Execute manualmente no SQL Editor do Supabase.');
          }
        }
      } else {
        warn('universal.sql nao encontrado. Execute manualmente no SQL Editor.');
      }

      // ════════════════════════════════════════════════════
      // PASSO 5: CRIAR USUARIO ADMIN
      // ════════════════════════════════════════════════════
      step(5, TOTAL_STEPS, 'Criando usuario admin');

      progress(92, 'Criando usuario...');
      const userRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/auth/users`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: adminSenha, email_confirm: true }),
      });

      let userId = null;
      if (userRes.ok) {
        const newUser = await userRes.json();
        userId = newUser.id;
        ok(`Usuario ${adminEmail} criado!`);
      } else {
        warn('Crie manualmente: Authentication > Users > Add user');
      }

      if (userId) {
        progress(95, 'Cadastrando admin no sistema...');
        const safeUuid = userId.replace(/[^a-f0-9-]/g, '');
        const adminRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `INSERT INTO admin_users (user_id) VALUES ('${safeUuid}') ON CONFLICT DO NOTHING;`,
          }),
        });

        if (adminRes.ok) ok('Admin cadastrado no sistema!');
        else warn('Execute manualmente no SQL Editor.');
      }

    } catch (err) {
      fail(err.message);
      warn('Modo manual ativado.');
      projectRef = null;
    }
  }

  // ════════════════════════════════════════════════════════
  // MODO MANUAL (fallback)
  // ════════════════════════════════════════════════════════
  if (!projectRef) {
    step('3M', TOTAL_STEPS, 'Configuracao manual');
    info('Siga os passos abaixo:');
    console.log('');
    info('1. Crie um projeto em: https://supabase.com/dashboard/new');
    info('2. Va em Settings > API e copie a URL e a Anon Key');
    supabaseUrl = await ask(`  Supabase Project URL: `);
    supabaseAnonKey = await ask(`  Supabase Anon Key: `);
    console.log('');
    info('3. Abra o SQL Editor no Supabase:');
    link(`${supabaseUrl.replace('.supabase.co', '')}/sql/new`);
    info('4. Cole todo o conteudo de supabase/universal.sql e clique RUN');
    info('5. Va em Authentication > Users > Add user');
    info(`   Email: ${adminEmail}`);
    info('6. No SQL Editor, cole:');
    console.log(`     ${C.yellow}INSERT INTO admin_users (user_id)`);
    console.log(`     SELECT id FROM auth.users WHERE email = '${adminEmail}'`);
    console.log(`     ON CONFLICT DO NOTHING;${C.reset}`);
    console.log('');
    await ask(`  Pressione Enter quando terminar...`);
  }

  // ════════════════════════════════════════════════════════
  // PASSO 6: GERAR .ENV
  // ════════════════════════════════════════════════════════
  step(6, TOTAL_STEPS, 'Gerando arquivo de configuracao (.env)');

  const vapidKey = await ask(`  VAPID Public Key (Enter pra pular): `);
  const sentryDsn = await ask(`  Sentry DSN (Enter pra pular): `);
  const gaId = await ask(`  Google Analytics ID (Enter pra pular): `);

  const envContent = [
    `# Black Diamond — ${nomeBarbearia}`,
    `# Gerado em ${new Date().toISOString().slice(0, 10)}`,
    '',
    `VITE_SUPABASE_URL=${supabaseUrl}`,
    `VITE_SUPABASE_ANON_KEY=${supabaseAnonKey}`,
    `VITE_BARBER_WHATSAPP=${telefoneFormatado}`,
    `VITE_VAPID_PUBLIC_KEY=${vapidKey || ''}`,
    `VITE_ADMIN_EMAIL=${adminEmail}`,
    `VITE_ADMIN_NAME=${nomeBarbearia}`,
    `VITE_SENTRY_DSN=${sentryDsn || ''}`,
    `VITE_GA_ID=${gaId || ''}`,
    `VITE_SITE_URL=${finalSiteUrl}`,
  ].join('\n');

  writeFileSync(join(__dirname, '.env'), envContent, 'utf-8');
  ok('.env criado com sucesso!');

  // ════════════════════════════════════════════════════════
  // PASSO 7: DEPLOY NA VERCEL
  // ════════════════════════════════════════════════════════
  step(7, TOTAL_STEPS, 'Deploy na Vercel');
  info('Para fazer deploy, voce precisa:');
  info('1. Conta na Vercel: https://vercel.com/signup');
  info('2. Instalar CLI: npm i -g vercel');
  info('3. Login: vercel login');
  console.log('');

  const querDeploy = await ask(`  Fazer deploy agora? (s/N): `);

  if (querDeploy.toLowerCase() === 's') {
    let deployOk = false;
    let tentativas = 0;
    const maxTentativas = 3;

    while (!deployOk && tentativas < maxTentativas) {
      tentativas++;
      info(`Tentativa ${tentativas}/${maxTentativas}...`);
      try {
        execSync('npx vercel --prod --yes', {
          cwd: __dirname, stdio: 'inherit', timeout: 180000,
        });
        deployOk = true;
      } catch {
        if (tentativas < maxTentativas) {
          const retry = await ask(`  Deploy falhou. Tentar de novo? (s/N): `);
          if (retry.toLowerCase() !== 's') break;
        }
      }
    }

    if (deployOk) {
      ok(`Deploy concluido! Acesse: ${finalSiteUrl}`);
    } else {
      warn('Deploy manual. Rode: npx vercel --prod');
    }
  } else {
    info('Para fazer deploy depois, rode:');
    console.log(`  ${C.yellow}npx vercel --prod${C.reset}`);
  }

  // ════════════════════════════════════════════════════════
  // RESUMO FINAL
  // ════════════════════════════════════════════════════════
  console.log('');
  console.log(`${C.green}  ╔══════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.green}  ║${C.reset}${C.bold}              INSTALACAO CONCLUIDA!                  ${C.reset}${C.green}║${C.reset}`);
  console.log(`${C.green}  ╚══════════════════════════════════════════════════════╝${C.reset}`);
  console.log('');
  console.log(`  ${C.bold}Barbearia:${C.reset}  ${nomeBarbearia}`);
  console.log(`  ${C.bold}Admin:${C.reset}      ${adminEmail}`);
  console.log(`  ${C.bold}URL:${C.reset}        ${finalSiteUrl}`);
  console.log(`  ${C.bold}Supabase:${C.reset}   ${supabaseUrl}`);
  console.log('');

  console.log(`  ${C.bold}Links uteis:${C.reset}`);
  link(`Painel Admin: ${finalSiteUrl}/admin/login`);
  link(`Supabase Dashboard: https://supabase.com/dashboard`);
  link(`Vercel Dashboard: https://vercel.com/dashboard`);
  console.log('');

  const pendentes = [];
  if (!projectRef) {
    pendentes.push('Rodar universal.sql no SQL Editor do Supabase');
    pendentes.push('Criar usuario admin em Authentication > Users');
    pendentes.push('Rodar INSERT INTO admin_users no SQL Editor');
  }
  if (!vapidKey) pendentes.push('Configurar VAPID key para push notifications');
  pendentes.push('Configurar logo/fotos em /public/assets/');
  pendentes.push('Ajustar endereco no Footer.tsx');

  if (pendentes.length > 0) {
    console.log(`  ${C.bold}Proximos passos:${C.reset}`);
    pendentes.forEach((p, i) => console.log(`    ${i + 1}. ${p}`));
    console.log('');
  }

  console.log(`  ${C.green}Bora vender! ${C.reset}💈\n`);
  rl.close();
}

main().catch((err) => {
  console.error(`\n${C.red}Erro fatal:${C.reset} ${err.message}`);
  console.log(`  WhatsApp do desenvolvedor: (31) 98015-9559`);
  rl.close();
  process.exit(1);
});
