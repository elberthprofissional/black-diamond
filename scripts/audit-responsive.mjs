#!/usr/bin/env node
/**
 * audit-responsive.mjs — Varredura 360° de responsividade
 * =========================================================================
 * Para cada viewport e rota, detecta:
 *  1. Overflow da página (scrollWidth > innerWidth)
 *  2. Elementos que estouram o container pai (flex/grid agoraps)
 *  3. Texto cortado (scrollWidth > clientWidth em elementos de texto)
 *  4. Elementos fixos que cobrem conteúdo
 *
 * Uso: node scripts/audit-responsive.mjs
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const BASE = process.env.BASE_URL || 'http://localhost:5173';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'elberthmayan2007@gmail.com';

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

/** Análise detalhada da página. Retorna lista de problemas. */
async function analyze(page) {
  return page.evaluate(() => {
    const issues = [];
    const vw = window.innerWidth;
    const docW = document.documentElement.scrollWidth;
    if (docW > vw + 2) {
      issues.push({ kind: 'PAGE', detail: `documento ${docW}px > viewport ${vw}px` });
    }

    const isDecorative = (el, s) =>
      s.position === 'absolute' &&
      (String(el.className || '').includes('blur') ||
        String(el.className || '').includes('gradient') ||
        String(el.className || '').includes('glow') ||
        String(el.className || '').includes('-z-') ||
        String(el.className || '').includes('pointer-events-none'));
    const inScrollable = (el) => {
      let node = el.parentElement;
      while (node && node !== document.documentElement) {
        const s = getComputedStyle(node);
        if (s.overflowX === 'auto' || s.overflowX === 'scroll') return true;
        node = node.parentElement;
      }
      return false;
    };
    const isFullWidthFixed = (el, s) =>
      s.position === 'fixed' && (s.left === '0px' || s.right === '0px');

    const seen = new Set();
    for (const el of document.querySelectorAll('body *')) {
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      if (isDecorative(el, style) || isFullWidthFixed(el, style)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      const isLayout = ['DIV', 'SECTION', 'UL', 'OL', 'NAV', 'MAIN', 'TABLE', 'P', 'H1', 'H2', 'H3', 'H4', 'SPAN', 'BUTTON', 'A', 'LI', 'LABEL'].includes(el.tagName);
      if (!isLayout) continue;

      // 0) Ultrapassa a VIEWPORT — conteúdo realmente cortado ou causa scroll
      if (r.width > 40 && (r.right > vw + 2 || r.left < -2) && !inScrollable(el)) {
        const key = `V:${el.tagName}:${el.className}`;
        if (!seen.has(key)) {
          seen.add(key);
          issues.push({
            kind: 'EDGE',
            tag: el.tagName.toLowerCase(),
            cls: String(el.className || '').slice(0, 90),
            right: Math.round(r.right),
            left: Math.round(r.left),
            width: Math.round(r.width),
            text: (el.textContent || '').trim().slice(0, 45),
          });
        }
      }

      // 1) Filho de FLEX sem wrap estoura o container (conteúdo espremido/overlap)
      const parent = el.parentElement;
      if (parent && parent !== document.body) {
        const ps = getComputedStyle(parent);
        const isFlexRow = ps.display === 'flex' && ps.flexDirection === 'row' && ps.flexWrap === 'nowrap';
        if (isFlexRow) {
          const pr = parent.getBoundingClientRect();
          const padR = parseFloat(ps.paddingRight) || 0;
          const overRight = r.right - (pr.right - padR);
          const padL = parseFloat(ps.paddingLeft) || 0;
          const overLeft = (pr.left + padL) - r.left;
          if (overRight > 4 && r.width > 40 && !inScrollable(el)) {
            const key = `F:${el.tagName}:${el.className}`;
            if (!seen.has(key)) {
              seen.add(key);
              issues.push({
                kind: 'FLEX_OVERFLOW',
                tag: el.tagName.toLowerCase(),
                cls: String(el.className || '').slice(0, 90),
                over: Math.round(overRight),
                width: Math.round(r.width),
                text: (el.textContent || '').trim().slice(0, 45),
              });
            }
          }
          if (overLeft > 4 && r.width > 40 && !inScrollable(el)) {
            const key = `F:${el.tagName}:${el.className}:L`;
            if (!seen.has(key)) {
              seen.add(key);
              issues.push({
                kind: 'FLEX_OVERFLOW_L',
                tag: el.tagName.toLowerCase(),
                cls: String(el.className || '').slice(0, 90),
                over: Math.round(overLeft),
                text: (el.textContent || '').trim().slice(0, 45),
              });
            }
          }
        }
      }

      // 2) Texto cortado (conteúdo maior que a caixa)
      if (['P', 'SPAN', 'H1', 'H2', 'H3', 'H4', 'BUTTON', 'A', 'LABEL'].includes(el.tagName)) {
        const overflowX = el.scrollWidth - el.clientWidth;
        if (overflowX > 4) {
          const key = `T:${el.tagName}:${el.className}:${el.textContent?.slice(0, 20)}`;
          if (!seen.has(key)) {
            seen.add(key);
            issues.push({
              kind: 'TEXT_CLIP',
              tag: el.tagName.toLowerCase(),
              cls: String(el.className || '').slice(0, 80),
              overflow: Math.round(overflowX),
              text: (el.textContent || '').trim().slice(0, 50),
            });
          }
        }
      }
    }
    return issues;
  });
}

const VIEWPORTS = [
  { w: 360, h: 740, label: '360 (SE)' },
  { w: 390, h: 844, label: '390 (12)' },
  { w: 430, h: 932, label: '430 (Pro Max)' },
  { w: 768, h: 1024, label: '768 (iPad)' },
  { w: 1024, h: 768, label: '1024 (land)' },
  { w: 1280, h: 800, label: '1280' },
];

const PUBLIC_ROUTES = [
  ['/', 'Home'],
  ['/agendar', 'Agendar'],
  ['/entrar', 'Entrar'],
  ['/admin/login', 'Admin Login'],
  ['/cancelar', 'Cancelar'],
  ['/nao-existe', '404'],
];

const ADMIN_ROUTES = [
  ['/admin', 'Dashboard'],
  ['/admin/weekly', 'Semanal'],
  ['/admin/clients', 'Clientes'],
  ['/admin/reports', 'Relatórios'],
  ['/admin/profile', 'Perfil'],
  ['/admin/notificacoes', 'Notificações'],
];

const bootstrap = await getAdminBootstrap();
console.log(`🔍 AUDITORIA RESPONSIVA — ${BASE}`);
console.log(`   Admin: ${bootstrap ? 'logado' : 'SEM sessão'}\n`);

const browser = await chromium.launch();
const totals = { PAGE: 0, EDGE_CLIPPED: 0, EDGE_SCROLLS: 0, PARENT_RIGHT: 0, PARENT_LEFT: 0, TEXT_CLIP: 0 };
const byRoute = new Map();

for (const { w, h, label } of VIEWPORTS) {
  console.log(`\n=== VIEWPORT ${w}×${h} (${label}) ===`);
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();

  for (const [path, name] of PUBLIC_ROUTES) {
    try {
      await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(900);
      const issues = await analyze(page);
      const key = `public:${name}`;
      if (!byRoute.has(key)) byRoute.set(key, []);
      for (const i of issues) {
        totals[i.kind] = (totals[i.kind] || 0) + 1;
        byRoute.get(key).push(`${w}px → ${i.kind} ${i.tag} "${i.cls}" ${i.detail || ''} ${i.text ? `"${i.text}"` : ''}`);
      }
      if (issues.length) console.log(`   🔴 ${name} — ${issues.length} problema(s)`);
    } catch (e) {
      console.log(`   ⚠️ ${name}: ${e.message.slice(0, 60)}`);
    }
  }

  if (bootstrap) {
    await injectSession(page, bootstrap);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    for (const [path, name] of ADMIN_ROUTES) {
      try {
        await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(1100);
        const issues = await analyze(page);
        const key = `admin:${name}`;
        if (!byRoute.has(key)) byRoute.set(key, []);
        for (const i of issues) {
          totals[i.kind] = (totals[i.kind] || 0) + 1;
          byRoute.get(key).push(`${w}px → ${i.kind} ${i.tag} "${i.cls}" ${i.detail || ''} ${i.text ? `"${i.text}"` : ''}`);
        }
        if (issues.length) console.log(`   🔴 ${name} — ${issues.length} problema(s)`);
      } catch (e) {
        console.log(`   ⚠️ ${name}: ${e.message.slice(0, 60)}`);
      }
    }
  }
  await ctx.close();
}

console.log(`\n════════ RESUMO POR ROTA ════════`);
for (const [route, list] of [...byRoute.entries()].sort((a, b) => b[1].length - a[1].length)) {
  if (!list.length) continue;
  console.log(`\n■ ${route} (${list.length}):`);
  for (const l of [...new Set(list)].slice(0, 8)) console.log(`   ${l}`);
}
console.log(`\nTotais: ${JSON.stringify(totals)}`);
await browser.close();
