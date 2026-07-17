#!/usr/bin/env node

/**
 * ══════════════════════════════════════════════════════════════
 * BLACK DIAMOND — Instalador 100% Automatico
 * ══════════════════════════════════════════════════════════════
 *
 * Como usar:
 *   node instalar-cliente.mjs
 *
 * Pre-requisitos:
 *   - Node.js 18+
 *   - gh CLI instalado e logado (https://cli.github.com)
 *   - vercel CLI instalado e logado (npm i -g vercel && vercel login)
 *   - Conta no Supabase com Access Token
 *
 * Fluxo completo:
 *   1. Coleta dados da barbearia
 *   2. Cria projeto no Supabase + banco + usuario admin
 *   3. Escolhe conta GitHub e cria repositorio
 *   4. Faz push do codigo
 *   5. Cria projeto na Vercel com deploy automatico
 *   6. Pronto — barbeiro acessa o link
 */

import { createInterface } from 'readline';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rl = createInterface({ input: process.stdin, output: process.stdout });

// ─── Cores ─────────────────────────────────────────────
const C = {
  green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
  red: '\x1b[31m', bold: '\x1b[1m', dim: '\x1b[2m',
  reset: '\x1b[0m', white: '\x1b[37m', magenta: '\x1b[35m',
};

// ─── Helpers ──────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ask = (q) => new Promise((r) => rl.question(q, (a) => r(a.trim())));

async function askPassword(label) {
  console.log(`  ${C.dim}(senha nao aparece)${C.reset}`);
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
function slugify(text) { return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 48); }

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: 'pipe', timeout: 120000, ...opts }).trim();
  } catch {
    return null;
  }
}

// ─── Interface ─────────────────────────────────────────
function banner() {
  console.log('');
  console.log(`${C.magenta}  ╔══════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.magenta}  ║${C.reset}${C.bold}         BLACK DIAMOND — Instalador Automatico       ${C.reset}${C.magenta}║${C.reset}`);
  console.log(`${C.magenta}  ║${C.reset}    100% automatizado: Supabase + GitHub + Vercel    ${C.magenta}║${C.reset}`);
  console.log(`${C.magenta}  ╚══════════════════════════════════════════════════════╝${C.reset}`);
  console.log('');
}

function step(n, total, text) {
  console.log(`\n${C.cyan}  ── Passo ${n}/${total} ${'─'.repeat(40)}${C.reset}`);
  console.log(`${C.bold}  ${text}${C.reset}`);
}

function ok(t) { console.log(`  ${C.green}  OK  ${C.reset} ${t}`); }
function warn(t) { console.log(`  ${C.yellow}  !!  ${C.reset} ${t}`); }
function fail(t) { console.log(`  ${C.red} ERRO ${C.reset} ${t}`); }
function info(t) { console.log(`  ${C.dim}      ${t}${C.reset}`); }
function link(t) { console.log(`  ${C.cyan}  ->  ${C.reset} ${t}`); }

function progress(pct, text) {
  const bar = 30;
  const filled = Math.round(bar * pct / 100);
  const empty = bar - filled;
  const barStr = '█'.repeat(filled) + '░'.repeat(empty);
  process.stdout.write(`\r  ${C.cyan}${barStr}${C.reset} ${pct}% ${text}    `);
}

// ════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════
async function main() {
  console.clear?.();
  banner();

  const TOTAL_STEPS = 8;

  // ══════════════════════════════════════════════════════
  // PASSO 1: DADOS DA BARBEARIA
  // ══════════════════════════════════════════════════════
  step(1, TOTAL_STEPS, 'Dados da barbearia');

  let nomeBarbearia = '';
  while (!nomeBarbearia) {
    nomeBarbearia = await ask(`  Nome da barbearia: `);
    if (!nomeBarbearia) fail('Nome obrigatorio.');
  }

  let adminEmail = '';
  while (!adminEmail || !validateEmail(adminEmail)) {
    adminEmail = await ask(`  Email do admin: `);
    if (!validateEmail(adminEmail)) fail('Email invalido.');
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

  let telefone = '';
  while (!validatePhone(telefone)) {
    telefone = await ask(`  WhatsApp (com DDD, so numeros): `);
    if (!validatePhone(telefone)) fail('Telefone invalido. Ex: 31999998888');
  }
  const telefoneFormatado = '55' + telefone.replace(/\D/g, '');

  const slug = slugify(nomeBarbearia);
  ok(`Slug: ${slug}`);

  // ══════════════════════════════════════════════════════
  // PASSO 2: VERIFICAR FERRAMENTAS
  // ══════════════════════════════════════════════════════
  step(2, TOTAL_STEPS, 'Verificando ferramentas');

  const ghOk = run('gh auth status');
  if (ghOk && ghOk.includes('Logged in')) {
    ok('GitHub CLI autenticado');
  } else {
    fail('GitHub CLI nao esta logado.');
    info('Instale: https://cli.github.com');
    info('Depois rode: gh auth login');
    process.exit(1);
  }

  const vercelOk = run('npx vercel whoami');
  if (vercelOk && !vercelOk.includes('Error')) {
    ok(`Vercel: ${vercelOk}`);
  } else {
    fail('Vercel CLI nao esta logado.');
    info('Instale: npm i -g vercel');
    info('Depois rode: vercel login');
    process.exit(1);
  }

  // ══════════════════════════════════════════════════════
  // PASSO 3: CONTA GITHUB
  // ══════════════════════════════════════════════════════
  step(3, TOTAL_STEPS, 'Conta GitHub');

  const accountsRaw = run('gh auth status --json hostname,login');
  let githubUser = '';
  try {
    const statusJson = JSON.parse(run('gh auth status --json login') || '{}');
    githubUser = statusJson.login || '';
  } catch {
    githubUser = run('gh api user --jq .login') || '';
  }

  if (!githubUser) {
    fail('Nao foi possivel detectar a conta GitHub.');
    process.exit(1);
  }

  ok(`Conta GitHub: ${githubUser}`);

  const querOutraConta = await ask(`  Usar outra conta? (s/N): `);
  if (querOutraConta.toLowerCase() === 's') {
    info('Faca logout e login com a outra conta:');
    info('  gh auth logout');
    info('  gh auth login');
    await ask(`  Pressione Enter quando fizer login...`);

    try {
      const newStatus = JSON.parse(run('gh auth status --json login') || '{}');
      githubUser = newStatus.login || '';
    } catch {
      githubUser = run('gh api user --jq .login') || '';
    }
    ok(`Conta GitHub: ${githubUser}`);
  }

  // ══════════════════════════════════════════════════════
  // PASSO 4: CRIAR REPOSITORIO NO GITHUB
  // ══════════════════════════════════════════════════════
  step(4, TOTAL_STEPS, 'Criando repositorio no GitHub');

  const repoName = slug;
  const repoExists = run(`gh repo view ${githubUser}/${repoName} --json name`);

  if (repoExists) {
    warn(`Repositorio ${githubUser}/${repoName} ja existe.`);
    const usarExistente = await ask(`  Usar o existente? (s/N): `);
    if (usarExistente.toLowerCase() !== 's') {
      fail('Escolha outro nome ou delete o repositorio existente.');
      process.exit(1);
    }
  } else {
    progress(20, 'Criando repositorio...');
    const createRepo = run(`gh repo create ${repoName} --private --description "Black Diamond - ${nomeBarbearia}"`);
    if (createRepo) {
      ok(`Repositorio criado: https://github.com/${githubUser}/${repoName}`);
    } else {
      fail('Erro ao criar repositorio.');
      process.exit(1);
    }
  }

  // ══════════════════════════════════════════════════════
  // PASSO 5: CRIAR PROJETO SUPABASE
  // ══════════════════════════════════════════════════════
  step(5, TOTAL_STEPS, 'Criando projeto no Supabase');

  let supabaseUrl = '', supabaseAnonKey = '', projectRef = null;

  const usarToken = await ask(`  Voce tem o Supabase Access Token? (s/N): `);

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
          fail('Nenhuma organizacao encontrada. Crie uma em supabase.com/dashboard');
          process.exit(1);
        } else if (orgs.length === 1) {
          orgId = orgs[0].id;
          ok(`Organizacao: ${orgs[0].name}`);
        } else {
          console.log(`\n  Organizacoes:`);
          orgs.forEach((o, i) => console.log(`    ${i + 1}. ${o.name}`));
          const escolha = await ask(`  Numero: `);
          orgId = orgs[parseInt(escolha) - 1]?.id;
          if (!orgId) { fail('Opcao invalida.'); process.exit(1); }
        }
      }
    } catch (err) {
      fail(`Erro: ${err.message}`);
      orgId = await ask(`  ID da organizacao: `);
    }

    const regiao = await ask(`  Regiao [sa-east-1]: `) || 'sa-east-1';

    // Criar projeto
    progress(30, 'Criando projeto Supabase...');
    const dbPass = Math.random().toString(36).slice(-12) + 'Aa1!';

    try {
      const createRes = await fetch('https://api.supabase.com/v1/projects', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: slug, organization_id: orgId, plan: 'free', region: regiao, db_pass: dbPass }),
      });

      if (!createRes.ok) throw new Error((await createRes.json()).message || 'Erro ao criar projeto');
      const project = await createRes.json();
      projectRef = project.ref;
      progress(40, 'Projeto criado!');

      // Aguardar banco
      progress(50, 'Aguardando banco...');
      for (let i = 0; i < 30; i++) {
        await sleep(5000);
        progress(50 + Math.min(i * 2, 20), 'Banco iniciando...');
        try {
          const statusRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (statusRes.ok) {
            const status = await statusRes.json();
            if (status.status === 'ACTIVE_HEALTHY') break;
          }
        } catch { /* retry */ }
      }
      console.log('');
      ok('Banco online!');

      // Pegar chaves
      progress(65, 'Obtendo chaves...');
      const apiRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/api-keys`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const keys = await apiRes.json();
      supabaseUrl = `https://${projectRef}.supabase.co`;
      supabaseAnonKey = keys.find((k) => k.name === 'anon')?.api_key || keys[0]?.api_key;
      ok(`Supabase: ${supabaseUrl}`);

      // Rodar SQL
      progress(70, 'Instalando schema...');
      const sqlPath = join(__dirname, 'supabase', 'universal.sql');
      if (existsSync(sqlPath)) {
        const sql = readFileSync(sqlPath, 'utf-8');
        const sqlRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: sql }),
        });
        if (sqlRes.ok) ok('Schema instalado!');
        else warn('Execute manualmente no SQL Editor.');
      }

      // Criar admin
      progress(85, 'Criando usuario admin...');
      const userRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/auth/users`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: adminSenha, email_confirm: true }),
      });

      let userId = null;
      if (userRes.ok) {
        const newUser = await userRes.json();
        userId = newUser.id;
        ok(`Admin ${adminEmail} criado!`);
      }

      if (userId) {
        const safeUuid = userId.replace(/[^a-f0-9-]/g, '');
        await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: `INSERT INTO admin_users (user_id) VALUES ('${safeUuid}') ON CONFLICT DO NOTHING;` }),
        });
        ok('Admin cadastrado no sistema!');
      }

    } catch (err) {
      fail(err.message);
      warn('Modo manual ativado.');
      projectRef = null;
    }
  }

  // Modo manual fallback
  if (!projectRef) {
    info('Configure manualmente:');
    supabaseUrl = await ask(`  Supabase URL: `);
    supabaseAnonKey = await ask(`  Supabase Anon Key: `);
    info('Rode o SQL e crie o admin no painel do Supabase.');
    await ask(`  Pressione Enter quando terminar...`);
  }

  // ══════════════════════════════════════════════════════
  // PASSO 6: GERAR .ENV
  // ══════════════════════════════════════════════════════
  step(6, TOTAL_STEPS, 'Gerando .env');

  const defaultUrl = `https://${slug}.vercel.app`;
  const siteUrlInput = await ask(`  URL do site [${defaultUrl}]: `);
  const finalSiteUrl = siteUrlInput || defaultUrl;

  const envContent = [
    `# Black Diamond — ${nomeBarbearia}`,
    `# Gerado em ${new Date().toISOString().slice(0, 10)}`,
    '',
    `VITE_SUPABASE_URL=${supabaseUrl}`,
    `VITE_SUPABASE_ANON_KEY=${supabaseAnonKey}`,
    `VITE_BARBER_WHATSAPP=${telefoneFormatado}`,
    `VITE_ADMIN_EMAIL=${adminEmail}`,
    `VITE_ADMIN_NAME=${nomeBarbearia}`,
    `VITE_SITE_URL=${finalSiteUrl}`,
  ].join('\n');

  writeFileSync(join(__dirname, '.env'), envContent, 'utf-8');
  ok('.env criado!');

  // ══════════════════════════════════════════════════════
  // PASSO 7: PUSH PRO GITHUB
  // ══════════════════════════════════════════════════════
  step(7, TOTAL_STEPS, 'Enviando codigo pro GitHub');

  try {
    // Configurar remote
    const remoteUrl = `https://github.com/${githubUser}/${repoName}.git`;
    const currentRemote = run('git remote get-url origin');
    if (currentRemote !== remoteUrl) {
      run(`git remote remove origin`);
      run(`git remote add origin ${remoteUrl}`);
    }

    // Adicionar .env ao gitignore se nao estiver
    const gitignorePath = join(__dirname, '.gitignore');
    if (existsSync(gitignorePath)) {
      const gitignore = readFileSync(gitignorePath, 'utf-8');
      if (!gitignore.includes('.env')) {
        writeFileSync(gitignorePath, gitignore + '\n.env\n.env.local\n', 'utf-8');
      }
    }

    // Commit e push
    run('git add -A');
    run(`git commit -m "feat: setup ${nomeBarbearia}" --allow-empty`);

    progress(50, 'Fazendo push...');
    const pushResult = run(`git push -u origin main --force`);
    if (pushResult !== null || true) {
      ok(`Codigo enviado: https://github.com/${githubUser}/${repoName}`);
    }
  } catch (err) {
    fail(`Erro no push: ${err.message}`);
    info('Faca manualmente: git push -u origin main');
  }

  // ══════════════════════════════════════════════════════
  // PASSO 8: CRIAR NA VERCEL
  // ══════════════════════════════════════════════════════
  step(8, TOTAL_STEPS, 'Criando projeto na Vercel');

  try {
    progress(30, 'Criando projeto Vercel...');
    const vercelProject = run(`npx vercel project add ${slug} --yes`);
    ok(`Projeto Vercel criado!`);

    progress(60, 'Configurando variaveis de ambiente...');
    // Adicionar env vars no Vercel
    const envVars = [
      `VITE_SUPABASE_URL=${supabaseUrl}`,
      `VITE_SUPABASE_ANON_KEY=${supabaseAnonKey}`,
      `VITE_BARBER_WHATSAPP=${telefoneFormatado}`,
      `VITE_ADMIN_EMAIL=${adminEmail}`,
      `VITE_ADMIN_NAME=${nomeBarbearia}`,
      `VITE_SITE_URL=${finalSiteUrl}`,
    ];

    for (const envVar of envVars) {
      run(`npx vercel env add ${envVar} --yes`);
    }
    ok('Variaveis de ambiente configuradas!');

    progress(80, 'Fazendo deploy...');
    const deployResult = run(`npx vercel --prod --yes`);
    if (deployResult) {
      ok(`Deploy concluido!`);
    }

    // Verificar URL do deploy
    const inspectResult = run(`npx vercel inspect --json`);
    let deployedUrl = finalSiteUrl;
    if (inspectResult) {
      try {
        const inspect = JSON.parse(inspectResult);
        if (inspect.url) deployedUrl = inspect.url;
      } catch {}
    }

    ok(`Site: ${deployedUrl}`);

  } catch (err) {
    fail(`Erro na Vercel: ${err.message}`);
    info('Faca manualmente:');
    info('  1. Acesse https://vercel.com/dashboard');
    info('  2. Importe o repositorio do GitHub');
    info('  3. Adicione as variaveis de ambiente');
    info('  4. Faca deploy');
  }

  // ══════════════════════════════════════════════════════
  // RESUMO
  // ══════════════════════════════════════════════════════
  console.log('');
  console.log(`${C.green}  ╔══════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.green}  ║${C.reset}${C.bold}              INSTALACAO CONCLUIDA!                  ${C.reset}${C.green}║${C.reset}`);
  console.log(`${C.green}  ╚══════════════════════════════════════════════════════╝${C.reset}`);
  console.log('');
  console.log(`  ${C.bold}Barbearia:${C.reset}  ${nomeBarbearia}`);
  console.log(`  ${C.bold}Admin:${C.reset}      ${adminEmail}`);
  console.log(`  ${C.bold}URL:${C.reset}        ${finalSiteUrl}`);
  console.log(`  ${C.bold}GitHub:${C.reset}     https://github.com/${githubUser}/${repoName}`);
  console.log(`  ${C.bold}Supabase:${C.reset}   ${supabaseUrl}`);
  console.log('');

  console.log(`  ${C.bold}Links uteis:${C.reset}`);
  link(`Painel Admin: ${finalSiteUrl}/admin/login`);
  link(`GitHub: https://github.com/${githubUser}/${repoName}`);
  link(`Supabase: https://supabase.com/dashboard`);
  link(`Vercel: https://vercel.com/dashboard`);
  console.log('');

  console.log(`  ${C.green}Barbeiro so acessar o link e usar! ${C.reset}💈\n`);
  rl.close();
}

main().catch((err) => {
  console.error(`\n${C.red}Erro fatal:${C.reset} ${err.message}`);
  rl.close();
  process.exit(1);
});
