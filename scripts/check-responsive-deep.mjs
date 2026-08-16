#!/usr/bin/env node
/**
 * check-responsive-deep.mjs — Varredura profunda de responsivo
 * =========================================================================
 * Percorre FLUXOS completos (wizard de agendamento, interações admin) e
 * verifica overflow/clipping em CADA passo — pega o que a checagem de
 * primeira tela não vê.
 *
 * Gera uma sessão admin via service key (do .env) para as páginas /admin.
 *
 * Uso: node scripts/check-responsive-deep.mjs
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const BASE = process.env.BASE_URL || 'http://localhost:5173';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'elberthmayan2007@gmail.com';

// ── Bootstrap de sessão admin via service key ──
const env = readFileSync('.env', 'utf8');
const get = (k) => env.match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1]?.trim();
const URL = get('VITE_SUPABASE_URL');
const SERVICE = get('SUPABASE_SERVICE_KEY');

async function getAdminBootstrap() {
  if (!URL || !SERVICE) return null;
  try {
    const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: ADMIN_EMAIL,
    });
    if (error) return null;
    const { data: sess } = await admin.auth.verifyOtp({
      token_hash: data.properties.hashed_token,
      type: 'magiclink',
    });
    if (!sess?.session) return null;
    const ref = URL.replace('https://', '').split('.')[0];
    return { ref, session: sess.session };
  } catch {
    return null;
  }
}

async function injectSession(page, bootstrap) {
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ ref, session }) => {
    localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(session));
  }, bootstrap);
}

async function analyze(page, label) {
  const issues = await page.evaluate(() => {
    const isContained = (el) => {
      let node = el.parentElement;
      while (node && node !== document.body) {
        const style = getComputedStyle(node);
        if (style.overflowX !== 'visible' || style.overflow !== 'visible') return true;
        node = node.parentElement;
      }
      return false;
    };
    const vw = window.innerWidth;
    const docW = document.documentElement.scrollWidth;
    const out = [];
    if (docW > vw + 2) out.push({ type: 'PAGE_OVERFLOW', detail: `doc ${docW}px > viewport ${vw}px` });
    const seen = new Set();
    for (const el of document.querySelectorAll('body *')) {
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      const r = el.getBoundingClientRect();
      if (r.right > vw + 2 && r.width > 30 && !isContained(el)) {
        const cls = (el.className && typeof el.className === 'string' ? el.className : '').slice(0, 100);
        const key = cls + '|' + Math.round(r.width);
        if (!seen.has(key)) {
          seen.add(key);
          out.push({
            type: 'OFFENDER',
            tag: el.tagName.toLowerCase(),
            cls,
            width: Math.round(r.width),
            right: Math.round(r.right),
            text: (el.textContent || '').trim().slice(0, 50),
          });
        }
      }
    }
    return out;
  });
  if (issues.length === 0) {
    console.log(`   ✅ ${label}`);
  } else {
    for (const i of issues) {
      if (i.type === 'PAGE_OVERFLOW') console.log(`   🔴 ${label} → ${i.detail}`);
      else
        console.log(`   🔴 ${label} → <${i.tag} class="${i.cls.slice(0, 70)}"> w=${i.width} right=${i.right} "${i.text}"`);
    }
  }
}

const bootstrap = await getAdminBootstrap();
console.log(`🔍 VARREDURA PROFUNDA — ${BASE} @375px${bootstrap ? ' (admin logado)' : ' (sem sessão admin)'}\n`);

const browser = await chromium.launch();

// ── 1. Wizard de agendamento completo ──
const ctx = await browser.newContext({ viewport: { width: 375, height: 667 } });
const page = await ctx.newPage();
try {
  await page.goto(BASE + '/agendar', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(1000);
  await analyze(page, 'Agendar — início (dados)');

  // Preenche dados
  const nameInput = page.locator('[data-testid="input-name"]').first();
  if (await nameInput.isVisible().catch(() => false)) {
    await nameInput.fill('Teste Responsivo');
    await page.locator('[data-testid="input-phone"]').first().fill('43999112233');
    await analyze(page, 'Agendar — dados preenchidos');
  }

  // Avança pelos passos, selecionando o que aparecer (NUNCA clica confirm-booking)
  for (let i = 0; i < 10; i++) {
    const nextBtn = page.locator('[data-testid="next-step"]:visible').last();
    if (!(await nextBtn.isVisible().catch(() => false))) break;
    await nextBtn.click();
    await page.waitForTimeout(900);
    const stepTitle =
      (await page.locator('h1, h2').first().textContent().catch(() => ''))?.trim() || '?';
    await analyze(page, `Agendar — passo: ${stepTitle.slice(0, 30)}`);

    const barber = page.locator('[data-testid="barber-card"]').first();
    if (await barber.isVisible().catch(() => false)) {
      await barber.click();
      await analyze(page, 'Agendar — barbeiro selecionado');
      continue;
    }
    const service = page.locator('[data-testid="service-card"]').first();
    if (await service.isVisible().catch(() => false)) {
      await service.click();
      await analyze(page, 'Agendar — serviço selecionado');
      continue;
    }
    const slot = page.locator('[data-testid="time-slot"]').first();
    if (await slot.isVisible().catch(() => false)) {
      await slot.click();
      await analyze(page, 'Agendar — horário selecionado');
      continue;
    }
    // Etapa de data/horário: clica numa data até achar um slot disponível
    const dateBtns = page.locator('[data-testid="date-picker"]');
    const dayCount = Math.min(await dateBtns.count().catch(() => 0), 14);
    for (let d = 0; d < dayCount; d++) {
      await dateBtns.nth(d).click();
      await page.waitForTimeout(400);
      const s = page.locator('[data-testid="time-slot"]').first();
      if (await s.isVisible().catch(() => false)) {
        await analyze(page, 'Agendar — data escolhida');
        await s.click();
        await analyze(page, 'Agendar — horário selecionado');
        break;
      }
    }
  }
} catch (e) {
  console.log(`   ⚠️ Wizard: ${e.message.slice(0, 100)}`);
}
await ctx.close();

// ── 2. Admin — interações chave (com sessão válida) ──
if (bootstrap) {
  const adminCtx = await browser.newContext({ viewport: { width: 375, height: 667 } });
  const ap = await adminCtx.newPage();
  await injectSession(ap, bootstrap);
  await ap.reload({ waitUntil: 'domcontentloaded' });
  await ap.waitForTimeout(1200);

  const nav = [
    { path: '/admin', label: 'Admin Dashboard' },
    { path: '/admin/weekly', label: 'Admin Semanal' },
    { path: '/admin/clients', label: 'Admin Clientes' },
    { path: '/admin/reports', label: 'Admin Relatórios' },
    { path: '/admin/notificacoes', label: 'Admin Notificações' },
  ];
  for (const { path, label } of nav) {
    try {
      await ap.goto(BASE + path, { waitUntil: 'domcontentloaded' });
      await ap.waitForTimeout(1200);
      const redirected = !ap.url().includes(path);
      await analyze(ap, `${label}${redirected ? ' (⚠️ redirect: ' + ap.url().replace(BASE, '') + ')' : ''}`);
    } catch (e) {
      console.log(`   ⚠️ ${label}: ${e.message.slice(0, 80)}`);
    }
  }

  // Perfil → seções de configuração (mobile: lista → seção)
  try {
    await ap.goto(BASE + '/admin/profile', { waitUntil: 'domcontentloaded' });
    await ap.waitForTimeout(1200);
    await analyze(ap, 'Admin Perfil — inicial');
    // Mobile: a tela "Meu perfil" abre as configurações pelo botão "Todas as configurações"
    const allSettingsBtn = ap.locator('button:visible:has-text("Todas as configurações")').first();
    if (await allSettingsBtn.isVisible().catch(() => false)) {
      await allSettingsBtn.click();
      await ap.waitForTimeout(900);
      await analyze(ap, 'Admin Perfil — lista de configurações');
    }
    const sections = ['Serviços', 'Horários', 'Barbeiros', 'Controle de Faltas', 'Fidelidade', 'Cupons', 'Mensalista', 'Galeria', 'Depoimentos'];
    for (const s of sections) {
      const item = ap.locator(`button:visible:has-text("${s}")`).first();
      if (await item.isVisible().catch(() => false)) {
        await item.click();
        await ap.waitForTimeout(900);
        await analyze(ap, `Admin Perfil — seção ${s}`);
        const back = ap.locator('button[aria-label="Voltar"]:visible').first();
        if (await back.isVisible().catch(() => false)) {
          await back.click();
          await ap.waitForTimeout(700);
          const backToList = await ap
            .locator('button:visible:has-text("Todas as configurações")')
            .count()
            .catch(() => 0);
          const listVisible = await ap
            .locator('button:visible:has-text("Controle de Faltas")')
            .isVisible()
            .catch(() => false);
          if (!listVisible) {
            console.log(`   ⚠️ ${s}: voltar não retornou à lista (backToList=${backToList})`);
            break;
          }
        } else {
          console.log(`   ⚠️ ${s}: botão Voltar não encontrado`);
          break;
        }
      } else {
        console.log(`   ⚪ Admin Perfil — seção ${s} não encontrada`);
      }
    }
  } catch (e) {
    console.log(`   ⚠️ Admin Perfil: ${e.message.slice(0, 80)}`);
  }

  await adminCtx.close();
}

await browser.close();
console.log('\n✅ Varredura profunda concluída.');
