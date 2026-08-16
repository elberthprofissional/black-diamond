// Auditoria responsiva das páginas ADMIN autenticadas (mobile)
// Uso: BASE_URL=http://localhost:5174 node scripts/audit-responsive-admin.mjs
import { chromium } from 'playwright';
import { writeFileSync, readFileSync } from 'fs';

const BASE = process.env.BASE_URL || 'http://localhost:5174';
const EMAIL = 'elberthmayan2007@gmail.com';
const PASSWORD = 'mayan123';
const VIEWPORTS = [
  { w: 320, h: 700, label: '320px' },
  { w: 360, h: 800, label: '360px' },
  { w: 390, h: 844, label: '390px' },
];

const ROUTES = [
  { path: '/admin', name: 'Dashboard' },
  { path: '/admin/weekly', name: 'Semanal' },
  { path: '/admin/clients', name: 'Clientes' },
  { path: '/admin/reports', name: 'Relatórios' },
  { path: '/admin/notifications', name: 'Notificações' },
  { path: '/admin/settings', name: 'Configurações' },
];

const browser = await chromium.launch();

// ── 1. Login via UI e captura do storageState ──
console.log('Fazendo login admin...');
const loginCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const loginPage = await loginCtx.newPage();
await loginPage.goto(BASE + '/admin/login', { waitUntil: 'networkidle', timeout: 25000 });
await loginPage.fill('[data-testid="input-email"]', EMAIL);
await loginPage.fill('[data-testid="input-password"]', PASSWORD);
await loginPage.click('[data-testid="btn-login"]');
try {
  await loginPage.waitForURL('**/admin', { timeout: 15000 });
  console.log('Login OK');
} catch {
  console.log('LOGIN FALHOU (rate limit? senha?) — body:', (await loginPage.textContent('body')).slice(0, 200));
  process.exit(1);
}
await loginPage.waitForTimeout(2500);
const storage = await loginCtx.storageState();
writeFileSync('/tmp/admin-storage.json', JSON.stringify(storage));
await loginCtx.close();

// ── 2. Scan das rotas admin ──
for (const vp of VIEWPORTS) {
  console.log(`\n===== VIEWPORT ${vp.label} =====`);
  const ctx = await browser.newContext({
    viewport: { width: vp.w, height: vp.h },
    isMobile: true,
    hasTouch: true,
    storageState: '/tmp/admin-storage.json',
  });
  const page = await ctx.newPage();

  for (const route of ROUTES) {
    const problems = [];
    try {
      await page.goto(BASE + route.path, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await page.waitForTimeout(3500);
    } catch (e) {
      console.log(`[${route.name}] ERRO ao carregar: ${e.message.split('\n')[0]}`);
      continue;
    }

    // redirecionou pro login? (sessão inválida)
    if (page.url().includes('/login')) {
      console.log(`[${route.name}] REDIRECIONOU pro login (sessão inválida)`);
      continue;
    }

    const data = await page.evaluate(() => {
      const out = { clipped: [], tiny: [], wide: [], edge: [] };
      const vw = window.innerWidth;
      const isClipped = (el) => {
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) return false;
        const ov = cs.overflowX === 'hidden' || cs.overflow === 'hidden' || cs.textOverflow === 'ellipsis';
        if (!ov) return false;
        if (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2) {
          let p = el.parentElement;
          while (p && p !== document.body) {
            const pcs = getComputedStyle(p);
            if (pcs.overflowX === 'auto' || pcs.overflowX === 'scroll') return false;
            p = p.parentElement;
          }
          return true;
        }
        return false;
      };
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        // texto cortado
        if (el.children.length === 0 && el.textContent.trim().length > 0 && isClipped(el)) {
          out.clipped.push({ tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 60), text: el.textContent.trim().slice(0, 35) });
        }
        // fonte minúscula em texto com 3+ chars
        if (el.children.length === 0 && el.textContent.trim().length >= 3) {
          const fs = parseFloat(getComputedStyle(el).fontSize);
          if (fs > 0 && fs < 10) {
            out.tiny.push({ fs, cls: String(el.className).slice(0, 50), text: el.textContent.trim().slice(0, 25) });
          }
        }
        // elemento mais largo que a viewport (qualquer, não só body)
        if (r.width > vw + 2 && !el.closest('[data-no-wide-check]') && getComputedStyle(el).position !== 'fixed' && getComputedStyle(el).position !== 'absolute') {
          out.wide.push({ tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 55), w: Math.round(r.width), vw });
        }
      }
      return out;
    });

    if (data.clipped.length) problems.push(`CLIPPED(${data.clipped.length}) ex: "${data.clipped[0].text}" [${data.clipped[0].cls}]`);
    if (data.tiny.length) problems.push(`TINY(<10px ${data.tiny.length}) ex: ${data.tiny[0].fs}px "${data.tiny[0].text}" [${data.tiny[0].cls}]`);
    if (data.wide.length) problems.push(`WIDE(${data.wide.length}) ex: ${data.wide[0].tag}.${data.wide[0].cls} ${data.wide[0].w}px > ${data.wide[0].vw}px`);
    if (data.edge.length) problems.push(`EDGE(${data.edge.length})`);

    console.log(`[${route.name}] ${problems.length ? problems.join('  ||  ') : 'OK'}`);
  }
  await ctx.close();
}
await browser.close();
console.log('\nFIM');
