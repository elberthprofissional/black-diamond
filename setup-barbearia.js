/**
 * 🚀 Setup Barbearia — Script de configuração para novas instâncias
 *
 * Uso: node setup-barbearia.js
 *
 * Este script guia você na preparação do sistema para uma nova barbearia,
 * gerando automaticamente o arquivo .env e um resumo do que precisa ser alterado.
 */

const { writeFileSync } = require('fs');
const { createInterface } = require('readline');
const path = require('path');

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (question) =>
  new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });

console.log(`
╔══════════════════════════════════════════════════╗
║   🚀 SETUP — Sistema de Agendamento Barbearia   ║
║   Preencha os dados abaixo para preparar o       ║
║   projeto para uma nova barbearia.               ║
╚══════════════════════════════════════════════════╝
`);

async function main() {
  // ── Dados da Barbearia ──
  const nome = await ask('🏪 Nome da barbearia: ');
  const endereco = await ask('📍 Endereço completo: ');
  const instagram = await ask('📸 Instagram (sem @): ');
  const whatsapp = await ask('📱 WhatsApp (com DDD, só números): ');
  const adminEmail = await ask('✉️  E-mail do admin: ');

  // ── Credenciais Supabase ──
  console.log('\n--- Credenciais do Supabase (crie o projeto antes) ---');
  const supabaseUrl = await ask('🔗 Supabase Project URL: ');
  const supabaseKey = await ask('🔑 Supabase Anon Key: ');

  // ── Gerar .env ──
  const envContent = `# Configuração gerada pelo setup-barbearia.js
# Barbearia: ${nome || '(não informado)'}

VITE_SUPABASE_URL=${supabaseUrl}
VITE_SUPABASE_ANON_KEY=${supabaseKey}
VITE_ADMIN_EMAIL=${adminEmail}
`;

  const envPath = path.join(__dirname, '.env');
  writeFileSync(envPath, envContent, 'utf-8');
  console.log(`\n✅ Arquivo .env gerado em: ${envPath}`);

  // ── Gerar resumo ──
  const resumo = `
╔══════════════════════════════════════════════════╗
║   ✅ SETUP CONCLUÍDO                             ║
╚══════════════════════════════════════════════════╝

📋 CHECKLIST DE EDIÇÃO MANUAL NECESSÁRIA:

1️⃣  src/components/Location.tsx
    □ Alterar iframe do Google Maps
    □ Alterar endereço para: ${endereco || '(pendente)'}

2️⃣  src/components/Footer.tsx
    □ Alterar Instagram para: @${instagram || '(pendente)'}
    □ Alterar endereço para: ${endereco || '(pendente)'}

3️⃣  src/components/Hero.tsx (opcional)
    □ Trocar imagem de fundo se desejar

4️⃣  /public/assets/ (opcional)
    □ Trocar logo.webp
    □ Trocar hero-bg.webp
    □ Trocar foto do barbeiro (ou fazer upload pelo painel)

5️⃣  Supabase (já tem as credenciais no .env)
    □ Rodar estrutura_barbearia.sql no SQL Editor
    □ Criar usuário admin com email: ${adminEmail || '(pendente)'}

6️⃣  Vercel
    □ Fazer deploy (as env vars já estão no .env)
    □ Configurar domínio

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 CUSTOS:
  • Vercel:   GRÁTIS
  • Supabase: GRÁTIS
  • Domínio:  ~R$40/ano (barbeiro paga)
  • Seu tempo: ~30 min (você cobra)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

  const resumoPath = path.join(__dirname, 'setup-resumo.txt');
  writeFileSync(resumoPath, resumo, 'utf-8');
  console.log(`📄 Resumo salvo em: ${resumoPath}`);
  console.log(resumo);

  rl.close();
}

main().catch((err) => {
  console.error('Erro:', err);
  rl.close();
  process.exit(1);
});
