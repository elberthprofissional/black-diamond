#!/usr/bin/env node

/**
 * INSTALAR CLIENTE — Black Diamond
 *
 * Uso:  node instalar-cliente.mjs
 *
 * O que faz:
 *   1. Coleta dados da barbearia
 *   2. Valida email, senha, telefone
 *   3. Cria projeto Supabase via API (ou modo manual)
 *   4. Roda universal.sql no banco
 *   5. Cria usuario admin + cadastra na tabela admin_users
 *   6. Gera .env
 *   7. Deploy na Vercel (com retry)
 *
 * Pre-requisitos:
 *   - Node.js 18+
 *   - Conta no Supabase (https://supabase.com)
 *   - Supabase Access Token (Settings > API > Access Token)
 */

import { createInterface } from 'readline';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rl = createInterface({ input: process.stdin, output: process.stdout });

// ─── Cores ──────────────────────────────────────────────
const C = {
  green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
  red: '\x1b[31m', bold: '\x1b[1m', dim: '\x1b[2m',
  reset: '\x1b[0m', bgGreen: '\x1b[42m', bgRed: '\x1b[41m',
};

// ─── Helpers ────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ask = (q) => new Promise((r) => rl.question(q, (a) => r(a.trim())));

async function askPassword(label) {
  console.log(`  ${C.dim}(senhas nao aparecem enquanto digita)${C.reset}`);
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

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone) {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

function slugify(text) {
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 48);
}

function box(title, lines) {
  const w = 52;
  const pad = (s) => `  ${C.yellow}║${C.reset}  ${s}${' '.repeat(Math.max(0, w - 6 - s.length))}${C.yellow}║${C.reset}`;
  console.log(`${C.yellow}╔${'═'.repeat(w)}╗${C.reset}`);
  console.log(pad(`${C.bold}${title}${C.reset}`));
  console.log(`${C.yellow}╠${'═'.repeat(w)}╣${C.reset}`);
  for (const l of lines) console.log(pad(l));
  console.log(`${C.yellow}╚${'═'.repeat(w)}╝${C.reset}`);
}

function step(n, text) {
  console.log(`\n${C.cyan}── Etapa ${n} ${'─'.repeat(40)}${C.reset}`);
  console.log(`${C.bold}  ${text}${C.reset}`);
}

function ok(text) { console.log(`  ${C.green}OK ${C.reset} ${text}`); }
function warn(text) { console.log(`  ${C.yellow}!! ${C.reset} ${text}`); }
function fail(text) { console.log(`  ${C.red}ERRO ${C.reset} ${text}`); }
function info(text) { console.log(`  ${C.dim}${text}${C.reset}`); }

// ─── Main ───────────────────────────────────────────────
async function main() {
  console.clear?.();
  box('BLACK DIAMOND — Instalacao', [
    'Sistema de agendamento para barbearias',
    'Configure uma nova instancia em minutos',
  ]);

  // ════════════════════════════════════════════════════════
  // 1. COLETA DE DADOS COM VALIDACAO
  // ════════════════════════════════════════════════════════
  step(1, 'Dados da barbearia');

  let nomeBarbearia = '';
  while (!nomeBarbearia) {
    nomeBarbearia = await ask(`  Nome da barbearia: `);
    if (!nomeBarbearia) fail('Nome e obrigatorio.');
  }

  let adminEmail = '';
  while (!adminEmail || !validateEmail(adminEmail)) {
    adminEmail = await ask(`  Email do admin: `);
    if (!validateEmail(adminEmail)) fail('Email invalido. Exemplo: admin@barbearia.com');
  }

  let adminSenha = '';
  let confirmSenha = '';
  while (adminSenha.length < 8 || adminSenha !== confirmSenha) {
    console.log(`  ${C.bold}Senha do admin:${C.reset}`);
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
    if (!validatePhone(telefone)) fail('Telefone invalido. Exemplo: 31999998888');
  }

  const telefoneFormatado = '55' + telefone.replace(/\D/g, '');
  const slug = slugify(nomeBarbearia);
  const defaultUrl = `https://${slug}.vercel.app`;
  const siteUrlInput = await ask(`  URL do site [${defaultUrl}]: `);
  const finalSiteUrl = siteUrlInput || defaultUrl;

  // ════════════════════════════════════════════════════════
  // 2. CONEXAO COM SUPABASE
  // ════════════════════════════════════════════════════════
  step(2, 'Conexao com Supabase');
  info('Precisa de um token? Crie em:');
  info('https://supabase.com/dashboard/account/tokens');

  const usarToken = await ask(`  Tem Supabase Access Token? (s/N): `);
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
          fail('Nenhuma organizacao encontrada. Crie uma em supabase.com.');
          process.exit(1);
        } else if (orgs.length === 1) {
          orgId = orgs[0].id;
          ok(`Organizacao: ${orgs[0].name}`);
        } else {
          console.log(`\n  Organizacoes disponiveis:`);
          orgs.forEach((o, i) => console.log(`    ${i + 1}. ${o.name} (${o.id})`));
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
    // 3. CRIAR PROJETO SUPABASE
    // ══════════════════════════════════════════════════════
    step(3, 'Criando projeto Supabase (~2 min)');

    const dbPass = Math.random().toString(36).slice(-12) + 'Aa1!';

    try {
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
      ok(`Projeto criado: ${projectRef}`);

      // Aguardar ficar online
      info('Aguardando banco ficar online');
      let online = false;
      for (let i = 0; i < 30; i++) {
        await sleep(5000);
        process.stdout.write('.');
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
      else warn('Projeto pode nao estar 100% pronto. Continuando...');

      // Pegar anon key
      const apiRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/api-keys`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!apiRes.ok) throw new Error('Falha ao obter chaves da API');
      const keys = await apiRes.json();
      supabaseUrl = `https://${projectRef}.supabase.co`;
      supabaseAnonKey = keys.find((k) => k.name === 'anon')?.api_key || keys[0]?.api_key;
      ok(`Supabase URL: ${supabaseUrl}`);

      // ════════════════════════════════════════════════════
      // 4. RODAR UNIVERSAL.SQL
      // ════════════════════════════════════════════════════
      step(4, 'Instalando schema do banco');

      const sqlPath = join(__dirname, 'supabase', 'universal.sql');
      if (existsSync(sqlPath)) {
        const sql = readFileSync(sqlPath, 'utf-8');
        const lines = sql.split('\n').length;
        info(`Enviando ${lines} linhas de SQL...`);

        const sqlRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: sql }),
        });

        if (sqlRes.ok) {
          ok('Schema instalado com sucesso!');
        } else {
          const errText = await sqlRes.text();
          if (errText.includes('already exists')) {
            ok('Schema ja existente (tudo certo).');
          } else {
            fail(`SQL com erros: ${errText.slice(0, 200)}`);
            warn('Execute manualmente no SQL Editor do Supabase.');
          }
        }
      } else {
        warn('universal.sql nao encontrado. Execute manualmente no SQL Editor.');
      }

      // ════════════════════════════════════════════════════
      // 5. CRIAR USUARIO ADMIN
      // ════════════════════════════════════════════════════
      step(5, 'Criando usuario admin');

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
        warn('Crie o usuario manualmente: Authentication > Users > Add user');
      }

      // Cadastrar na tabela admin_users
      if (userId) {
        info('Cadastrando na lista de administradores...');
        // Usar UUID com validacao basica pra evitar injection
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
      warn('Falha na criacao automatica. Modo manual ativado.');
      projectRef = null;
    }
  }

  // ════════════════════════════════════════════════════════
  // MODO MANUAL (fallback)
  // ════════════════════════════════════════════════════════
  if (!projectRef) {
    step('3M', 'Configuracao manual');
    supabaseUrl = await ask(`  Supabase Project URL: `);
    supabaseAnonKey = await ask(`  Supabase Anon Key: `);

    const sqlUrl = `${supabaseUrl}/project/${supabaseUrl.split('//')[1]?.split('.')[0] || 'xxx'}/sql/new`;
    console.log(`\n  ${C.yellow}Checklist:${C.reset}`);
    console.log(`  1. Abra: ${C.cyan}${sqlUrl}${C.reset}`);
    console.log(`  2. Cole o conteudo de supabase/universal.sql`);
    console.log(`  3. Clique em RUN`);
    console.log(`  4. Authentication > Users > Add user`);
    console.log(`     Email: ${adminEmail}`);
    console.log(`  5. SQL Editor — cole:`);
    console.log(`     ${C.yellow}INSERT INTO admin_users (user_id)`);
    console.log(`     SELECT id FROM auth.users WHERE email = '${adminEmail}'`);
    console.log(`     ON CONFLICT DO NOTHING;${C.reset}`);
  }

  // ════════════════════════════════════════════════════════
  // 7. GERAR .ENV
  // ════════════════════════════════════════════════════════
  step(7, 'Gerando arquivo .env');

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
  // 8. DEPLOY NA VERCEL (com retry)
  // ════════════════════════════════════════════════════════
  step(8, 'Deploy na Vercel');
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
    warn('Depois rode: npx vercel --prod');
  }

  // ════════════════════════════════════════════════════════
  // RESUMO FINAL
  // ════════════════════════════════════════════════════════
  const pendentes = [];
  if (!projectRef) {
    pendentes.push('Rodar universal.sql no SQL Editor');
    pendentes.push('Criar usuario admin em Authentication');
    pendentes.push('Rodar INSERT INTO admin_users');
  }
  if (!vapidKey) pendentes.push('Configurar VAPID key para push');
  pendentes.push('Configurar logo/fotos em /public/assets/');
  pendentes.push('Ajustar endereco no Location.tsx');
  pendentes.push('Ajustar Instagram no Footer.tsx');

  console.log('');
  box('INSTALACAO CONCLUIDA', [
    `Barbearia:  ${nomeBarbearia}`,
    `Admin:      ${adminEmail}`,
    `URL:        ${finalSiteUrl}`,
    `Supabase:   ${supabaseUrl}`,
    '',
    `Proximos passos:`,
    ...pendentes.map((p, i) => `  ${i + 1}. ${p}`),
  ]);

  console.log(`  ${C.green}Bora vender!${C.reset}\n`);
  rl.close();
}

main().catch((err) => {
  console.error(`\n${C.red}Erro fatal:${C.reset} ${err.message}`);
  rl.close();
  process.exit(1);
});
