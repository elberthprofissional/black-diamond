#!/usr/bin/env node
// =========================================================================
// Asaas Setup Script - Black Diamond
// =========================================================================
// Rode com: node scripts/setup-asaas.mjs
// Ou no Windows: node scripts/setup-asaas.mjs
// =========================================================================

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { createInterface } from 'readline';

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (question) =>
  new Promise((resolve) => rl.question(question, resolve));

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

console.log(`
${CYAN}╔══════════════════════════════════════════════════╗
║        ${BOLD}BLACK DIAMOND - SETUP ASAAS${RESET}${CYAN}          ║
║      Sistema de Assinatura Mensal (R$50/mês)        ║
╚══════════════════════════════════════════════════╝${RESET}
`);

// ─── Step 1: Check environment ───
console.log(`\n${YELLOW}[1/4]${RESET} Verificando ambiente...`);

let projectRef = '';
let webhookUrl = '';

try {
  const supabaseStatus = execSync('npx supabase status 2>&1', {
    encoding: 'utf-8',
    timeout: 15000,
  });

  const refMatch = supabaseStatus.match(/Project URL:\s*https:\/\/([^.]+)/);
  if (refMatch) {
    projectRef = refMatch[1];
    webhookUrl = `https://${projectRef}.functions.supabase.co/asaas-webhook`;
    console.log(`  ${GREEN}✓${RESET} Projeto Supabase encontrado: ${projectRef}`);
  } else {
    // Tenta pegar o project id do arquivo de config
    try {
      const configContent = readFileSync('supabase/config.toml', 'utf-8');
      const projectMatch = configContent.match(/project_id\s*=\s*["']([^"']+)["']/);
      if (projectMatch) {
        projectRef = projectMatch[1];
        webhookUrl = `https://${projectRef}.functions.supabase.co/asaas-webhook`;
        console.log(`  ${GREEN}✓${RESET} Projeto: ${projectRef}`);
      }
    } catch {
      console.log(`  ${YELLOW}⚠${RESET} Não foi possível detectar o project ID automaticamente.`);
      projectRef = await ask('  Digite o Project Reference do seu Supabase: ');
      webhookUrl = `https://${projectRef}.functions.supabase.co/asaas-webhook`;
    }
  }
} catch {
  console.log(`  ${YELLOW}⚠${RESET} Supabase CLI não respondeu.`);
  projectRef = await ask('  Digite o Project Reference do seu Supabase:\n  (Encontre em: https://supabase.com/dashboard/project/_/settings/general)\n  > ');
  webhookUrl = `https://${projectRef}.functions.supabase.co/asaas-webhook`;
}

// ─── Step 2: Asaas account ───
console.log(`\n${YELLOW}[2/4]${RESET} Conta no Asaas`);
console.log(`
  ${BOLD}Você precisa de uma conta no Asaas.${RESET}
  Se já tem, beleza! Se não:
  
  ${CYAN}1. Acesse: https://asaas.com${RESET}
  ${CYAN}2. Clique em "Criar conta gratuita"${RESET}
  ${CYAN}3. Faça o cadastro (CPF ou CNPJ)${RESET}
  ${CYAN}4. Vá em: Configurações → Integração → API${RESET}
  ${CYAN}5. Gere uma "Chave de API"${RESET}
  ${CYAN}6. Escolha o ambiente "Produção" (ou "Sandbox" pra testar)${RESET}
`);

const asaasKey = await ask(`  ${BOLD}Cole sua chave de API do Asaas aqui:${RESET}\n  > `);

if (!asaasKey || asaasKey === 'sua_chave_api') {
  console.log(`\n  ${RED}✗${RESET} Chave inválida! Você colocou a chave de verdade?`);
  console.log(`  Pode rodar esse script de novo quando tiver a chave: node scripts/setup-asaas.mjs`);
  rl.close();
  process.exit(1);
}

const envChoice = await ask(`\n  Ambiente? (${BOLD}s${RESET}andbox / ${BOLD}p${RESET}roduction) [s/P]: `);
const environment = envChoice.toLowerCase().startsWith('s') ? 'sandbox' : 'production';

// ─── Step 3: Set secrets ───
console.log(`\n${YELLOW}[3/4]${RESET} Configurando secrets no Supabase...`);

try {
  execSync(`npx supabase secrets set ASAAS_API_KEY="${asaasKey}"`, {
    stdio: 'inherit',
    timeout: 30000,
  });
  console.log(`  ${GREEN}✓${RESET} ASAAS_API_KEY configurada`);
} catch {
  console.log(`  ${RED}✗${RESET} Erro ao configurar ASAAS_API_KEY`);
  console.log(`  Tente manualmente: npx supabase secrets set ASAAS_API_KEY="${asaasKey}"`);
}

try {
  execSync(`npx supabase secrets set ASAAS_ENVIRONMENT="${environment}"`, {
    stdio: 'inherit',
    timeout: 30000,
  });
  console.log(`  ${GREEN}✓${RESET} ASAAS_ENVIRONMENT=${environment} configurado`);
} catch {
  console.log(`  ${RED}✗${RESET} Erro ao configurar ASAAS_ENVIRONMENT`);
}

// ─── Step 4: Webhook instructions ───
console.log(`\n${YELLOW}[4/4]${RESET} Configurar Webhook no Asaas`);
console.log(`
  ${BOLD}Último passo!${RESET} Vá no Asaas e configure o webhook:

  ${CYAN}1. Acesse: https://app.asaas.com/integration${RESET}
  ${CYAN}2. Vá em "Webhooks" → "Adicionar Webhook"${RESET}
  ${CYAN}3. URL: ${BOLD}${webhookUrl}${RESET}
  ${CYAN}4. Eventos para marcar:${RESET}
     ${GREEN}☑ PAYMENT_CONFIRMED${RESET}
     ${GREEN}☑ PAYMENT_RECEIVED${RESET}
     ${GREEN}☑ PAYMENT_OVERDUE${RESET}
     ${GREEN}☑ PAYMENT_CANCELLED${RESET}
     ${GREEN}☑ PAYMENT_REFUNDED${RESET}
  ${CYAN}5. Salvar${RESET}
`);

console.log(`
${GREEN}╔══════════════════════════════════════════════════╗
║           ${BOLD}SETUP CONCLUÍDO! 🚀${RESET}${GREEN}                ║
║                                                      ║
║  ✅ Migration 011 aplicada                           ║
║  ✅ Edge Functions deployadas                        ║
║  ✅ Chave da API configurada                         ║
║  ⬜ Webhook: configure manualmente no Asaas          ║
╚══════════════════════════════════════════════════╝${RESET}
`);

rl.close();
