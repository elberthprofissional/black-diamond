#!/usr/bin/env node

/**
 * 🚀 INSTALAR CLIENTE — Black Diamond 💈
 * 
 * Uso:  node instalar-cliente.mjs
 * 
 * O que faz:
 *   1. Pede seus dados (email, nome da barbearia)
 *   2. Cria um projeto Supabase via API (ou modo manual)
 *   3. Roda o universal.sql no banco
 *   4. Cria o usuário admin
 *   5. Gera o .env
 *   6. (Opcional) Deploy na Vercel
 * 
 * Pré-requisitos:
 *   - Node.js 18+
 *   - Uma conta no Supabase (criar em https://supabase.com)
 *   - Supabase Access Token (Settings → API → Access Token)
 */

import { createInterface } from 'readline';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((r) => rl.question(q, (a) => r(a.trim())));

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RED = '\x1b[31m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

const logo = `
${YELLOW}╔══════════════════════════════════════════════════╗${RESET}
${YELLOW}║${RESET}   ${BOLD}💈 BLACK DIAMOND — Instalação Automática${RESET}   ${YELLOW}║${RESET}
${YELLOW}║${RESET}   Modo Preguiçoso Ativado 🛌                      ${YELLOW}║${RESET}
${YELLOW}╚══════════════════════════════════════════════════╝${RESET}
`;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function step(text) {
  console.log(`\n${CYAN}▸ ${text}${RESET}`);
}

function ok(text) {
  console.log(`  ${GREEN}✅ ${text}${RESET}`);
}

function warn(text) {
  console.log(`  ${YELLOW}⚠️  ${text}${RESET}`);
}

function fail(text) {
  console.log(`  ${RED}❌ ${text}${RESET}`);
}

// ─── Main ───────────────────────────────────────────────
async function main() {
  console.log(logo);

  // ── 1. COLETA DE DADOS ──────────────────────────────
  step('1. Dados do cliente');
  const nomeBarbearia = await ask(`  ${BOLD}Nome da barbearia:${RESET} `);
  const adminEmail = await ask(`  ${BOLD}Email do admin:${RESET} `);

  // Oculta a digitação da senha
  console.log(`  ${YELLOW}(a senha não aparecerá enquanto digita)${RESET}`);

  // Cleanup raw mode on Ctrl+C pra não travar o terminal
  const cleanup = () => process.stdin.setRawMode?.(false);
  process.on('SIGINT', cleanup);

  const adminSenha = await new Promise((resolve) => {
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
      } else {
        buf.push(input);
      }
    };
    process.stdin.on('data', onData);
  });

  process.removeListener('SIGINT', cleanup);

  const telefone = await ask(`\n  ${BOLD}WhatsApp (só números, com DDD):${RESET} `);
  const siteUrl = await ask(`  ${BOLD}URL do site (Enter = https://meu-site.vercel.app):${RESET} `);
  const finalSiteUrl = siteUrl || `https://${nomeBarbearia.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}.vercel.app`;

  // ── 2. SUPABASE ─────────────────────────────────────
  step('2. Conexão com Supabase');

  console.log(`  Precisa de um token? Vá em: ${CYAN}https://supabase.com/dashboard/account/tokens${RESET}`);
  console.log(`  Crie um token com escopo e cole abaixo.\n`);

  const usarManual = await ask(`  ${YELLOW}Tem um Supabase Access Token? (s/N):${RESET} `);
  let supabaseUrl, supabaseAnonKey, projectRef;

  if (usarManual.toLowerCase() === 's') {
    const token = await ask(`  ${BOLD}Cole seu Supabase Access Token:${RESET} `);

    // Listar organizações pra ajudar o usuário
    let orgId;
    try {
      const orgsRes = await fetch('https://api.supabase.com/v1/organizations', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (orgsRes.ok) {
        const orgs = await orgsRes.json();
        if (orgs.length === 0) {
          fail('Nenhuma organização encontrada. Crie uma em supabase.com primeiro.');
          process.exit(1);
        } else if (orgs.length === 1) {
          orgId = orgs[0].id;
          ok(`Organização: ${orgs[0].name}`);
        } else {
          console.log(`\n  Organizações disponíveis:`);
          orgs.forEach((o, i) => console.log(`    ${i + 1}. ${o.name} (${o.id})`));
          const escolha = await ask(`  ${BOLD}Digite o número da organização:${RESET} `);
          orgId = orgs[parseInt(escolha) - 1]?.id;
          if (!orgId) {
            fail('Opção inválida.');
            process.exit(1);
          }
        }
      }
    } catch (err) {
      fail(`Erro ao listar organizações: ${err.message}`);
      orgId = await ask(`  ${BOLD}ID da organização (ver em supabase.com/settings):${RESET} `);
    }

    const regiao = await ask(`  ${BOLD}Região [sa-east-1]:${RESET} `) || 'sa-east-1';

    // ── 3. CRIAR PROJETO ─────────────────────────────
    step('3. Criando projeto Supabase (~2 min)');

    const dbPass = Math.random().toString(36).slice(-12) + 'Aa1!';
    console.log(`     Aguardando...`);

    try {
      const createRes = await fetch('https://api.supabase.com/v1/projects', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: nomeBarbearia.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          organization_id: orgId,
          plan: 'free',
          region: regiao,
          db_pass: dbPass,
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.json();
        throw new Error(err.message || JSON.stringify(err));
      }

      const project = await createRes.json();
      projectRef = project.ref;
      ok(`Projeto criado: ${projectRef}`);

      // Aguardar ficar online (até 2.5 min)
      let online = false;
      for (let i = 0; i < 30; i++) {
        await sleep(5000);
        process.stdout.write('.');
        const statusRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!statusRes.ok) continue;
        const status = await statusRes.json();
        if (status.status === 'ACTIVE_HEALTHY') {
          online = true;
          break;
        }
      }
      console.log('');
      if (online) {
        ok('Banco online!');
      } else {
        warn('Projeto pode não estar 100% pronto. Continuando...');
      }

      // Pegar anon key
      const apiRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/api-keys`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!apiRes.ok) throw new Error('Falha ao obter chaves da API');
      const keys = await apiRes.json();
      supabaseUrl = `https://${projectRef}.supabase.co`;
      supabaseAnonKey = keys.find((k) => k.name === 'anon')?.api_key;

      if (!supabaseAnonKey) {
        const keyData = keys[0];
        supabaseAnonKey = keyData?.api_key || keyData?.apiKey;
      }
      ok(`Supabase URL: ${supabaseUrl}`);

      // ── 4. RODAR UNIVERSAL.SQL ────────────────────────
      step('4. Rodando universal.sql no banco');

      const sqlPath = join(__dirname, 'supabase', 'universal.sql');
      if (existsSync(sqlPath)) {
        const universalSql = readFileSync(sqlPath, 'utf-8');
        console.log(`     Enviando ${universalSql.split('\n').length} linhas...`);

        // A API aceita SQL puro, mas precisamos escapar aspas simples duplicadas
        // e mandar como query única
        const sqlRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: universalSql }),
        });

        if (sqlRes.ok) {
          ok('Schema do banco instalado!');
        } else {
          const errText = await sqlRes.text();
          warn(`SQL rodou com avisos (alguns já existiam): ${errText.slice(0, 100)}`);
        }
      } else {
        warn('universal.sql não encontrado. Pule esta etapa.');
      }

      // ── 5. CRIAR USUÁRIO ADMIN ──────────────────────
      step('5. Criando usuário admin');
      const userRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/auth/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: adminEmail,
          password: adminSenha,
          email_confirm: true,
        }),
      });

      let userId = null;
      if (userRes.ok) {
        const newUser = await userRes.json();
        userId = newUser.id;
        ok(`Usuário ${adminEmail} criado!`);
      } else {
        warn('Crie o usuário manualmente: Authentication > Users > Add user');
      }

      // ── 6. ADICIONAR À TABELA ADMIN_USERS ───────────
      if (userId) {
        console.log('     Adicionando à lista de administradores...');
        const adminRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: `INSERT INTO admin_users (user_id) VALUES ('${userId}') ON CONFLICT DO NOTHING;`
          }),
        });

        if (adminRes.ok) {
          ok('Admin cadastrado no sistema!');
        } else {
          warn('Execute manualmente no SQL Editor:');
          console.log(`     INSERT INTO admin_users (user_id)`);
          console.log(`     SELECT id FROM auth.users WHERE email = '${adminEmail}'`);
          console.log(`     ON CONFLICT DO NOTHING;`);
        }
      }

    } catch (err) {
      fail(err.message);
      warn('Falha na criação automática. Vamos pro modo manual.');
      projectRef = null;
    }
  }

  if (!projectRef) {
    step('3. Modo manual');
    supabaseUrl = await ask(`  ${BOLD}Supabase Project URL:${RESET} `);
    supabaseAnonKey = await ask(`  ${BOLD}Supabase Anon Key:${RESET} `);

    console.log(`\n  ${YELLOW}📋 Checklist pra você não esquecer:${RESET}`);
    console.log(`  1️⃣  ${CYAN}${supabaseUrl}/project/${supabaseUrl.split('.')[0].replace('https://', '')}/sql/new${RESET}`);
    console.log(`  2️⃣  Cole o conteúdo de supabase/universal.sql`);
    console.log(`  3️⃣  Clique em RUN`);
    console.log(`  4️⃣  Authentication → Users → Add user`);
    console.log(`  5️⃣  Email: ${adminEmail} / Senha: (a que você escolheu)`);
    console.log(`  6️⃣  SQL Editor:`);
    console.log(`     ${YELLOW}INSERT INTO admin_users (user_id)`);
    console.log(`     SELECT id FROM auth.users WHERE email = '${adminEmail}'`);
    console.log(`     ON CONFLICT DO NOTHING;${RESET}`);
  }

  // ── 7. GERAR .env ─────────────────────────────────
  step('7. Gerando arquivo .env');

  console.log(`  ${YELLOW}(VAPID é necessário para notificações push funcionarem)${RESET}`);
  const vapidKey = await ask(`  ${BOLD}VAPID Public Key (Enter pra pular — push não funcionará):${RESET} `);
  const sentryDsn = await ask(`  ${BOLD}Sentry DSN (opcional — Enter pra pular):${RESET} `);
  const gaId = await ask(`  ${BOLD}Google Analytics ID (opcional — Enter pra pular):${RESET} `);

  const envContent = `# Black Diamond — ${nomeBarbearia}
# Gerado automaticamente em ${new Date().toISOString().slice(0, 10)}

VITE_SUPABASE_URL=${supabaseUrl}
VITE_SUPABASE_ANON_KEY=${supabaseAnonKey}
VITE_BARBER_WHATSAPP=55${telefone.replace(/\D/g, '')}
VITE_VAPID_PUBLIC_KEY=${vapidKey || ''}
VITE_ADMIN_EMAIL=${adminEmail}
VITE_ADMIN_NAME=${nomeBarbearia}
VITE_SENTRY_DSN=${sentryDsn || ''}
VITE_GA_ID=${gaId || ''}
VITE_SITE_URL=${finalSiteUrl}
`;

  const envPath = join(__dirname, '.env');
  writeFileSync(envPath, envContent, 'utf-8');
  ok(`.env criado em ${envPath}`);

  // ── 8. DEPLOY ──────────────────────────────────────
  step('8. Deploy na Vercel');
  const querDeploy = await ask(`  ${YELLOW}Fazer deploy agora? (s/N):${RESET} `);

  if (querDeploy.toLowerCase() === 's') {
    console.log('     ⏳ Rodando build + deploy...');
    try {
      execSync('npx vercel --prod --yes', {
        cwd: __dirname,
        stdio: 'inherit',
        timeout: 180000,
      });
      ok(`Deploy concluído! 🚀`);
      ok(`Acesse: ${finalSiteUrl}`);
    } catch {
      warn('Deploy falhou. Tente manualmente:');
      console.log(`     ${CYAN}npx vercel --prod${RESET}`);
      console.log(`  Ou conecte o repositório no GitHub na Vercel.`);
    }
  } else {
    warn('Depois rode: npx vercel --prod');
  }

  // ── RESUMO FINAL ──────────────────────────────────
  const pendentes = [];
  if (!projectRef) {
    pendentes.push('Rodar universal.sql no SQL Editor');
    pendentes.push('Criar usuário admin em Authentication');
    pendentes.push('Rodar INSERT INTO admin_users');
  }
  if (!vapidKey) pendentes.push('Configurar VAPID key para push notifications');

  console.log(`\n${YELLOW}╔══════════════════════════════════════════════════╗`);
  console.log(`║   🎉 SISTEMA PRONTO PRA VENDER!              ║`);
  console.log(`╚══════════════════════════════════════════════════╝${RESET}`);
  console.log(`
  ${BOLD}Barbearia:${RESET}  ${nomeBarbearia}
  ${BOLD}Admin:${RESET}      ${adminEmail}
  ${BOLD}URL:${RESET}        ${finalSiteUrl}
  ${BOLD}Supabase:${RESET}   ${supabaseUrl}

  ${GREEN}💰 Lucro: R$ 1.990 (ou o preço que você definir)${RESET}

  ${YELLOW}📋 PENDENTES${RESET}
${pendentes.map((p, i) => `  ${i + 1}. ${p}`).join('\n')}
  ${pendentes.length + 1}. Configurar logo/fotos em /public/assets/
  ${pendentes.length + 2}. Ajustar endereço no Location.tsx
  ${pendentes.length + 3}. Ajustar Instagram no Footer.tsx
  ${pendentes.length + 4}. Configurar domínio (se tiver)

  ${GREEN}Bora vender! 💈🔥${RESET}
`);

  rl.close();
}

main().catch((err) => {
  console.error(`\n${RED}Erro:${RESET} ${err.message}`);
  rl.close();
  process.exit(1);
});
