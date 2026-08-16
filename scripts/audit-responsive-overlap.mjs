// Auditoria: sobreposição de texto + elementos colidindo visualmente
// Uso: BASE_URL=http://localhost:5174 node scripts/audit-responsive-overlap.mjs
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://localhost:5174';
const VIEWPORTS = [
  { w: 320, h: 700, label: '320px' },
  { w: 360, h: 800, label: '360px' },
];
const ROUTES = [
  { path: '/', name: 'Home' },
  { path: '/agendar', name: 'Agendar' },
  { path: '/entrar', name: 'Entrar' },
  { path: '/cancelar', name: 'Cancelar' },
];

const browser = await chromium.launch();
for (const vp of VIEWPORTS) {
  console.log(`\n===== ${vp.label} =====`);
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();

  for (const route of ROUTES) {
    try {
      await page.goto(BASE + route.path, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await page.waitForTimeout(3000);
    } catch (e) {
      console.log(`[${route.name}] ERRO: ${e.message.split('\n')[0]}`);
      continue;
    }
    const hits = await page.evaluate(() => {
      const out = [];
      const els = [...document.querySelectorAll('body *')]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          return (
            r.width > 0 && r.height > 0 &&
            cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05 &&
            !el.closest('[aria-hidden="true"]')
          );
        })
        .map((el) => {
          const r = el.getBoundingClientRect();
          const txt = el.children.length === 0 ? el.textContent.trim() : '';
          return { el, r, txt, isText: txt.length >= 2 };
        });

      // 1. texto sobre texto (texto de elementos irmãos/não-pai-filho colidindo)
      for (let i = 0; i < els.length; i++) {
        const a = els[i];
        if (!a.isText) continue;
        for (let j = i + 1; j < els.length; j++) {
          const b = els[j];
          if (!b.isText) continue;
          if (a.el === b.el || a.el.contains(b.el) || b.el.contains(a.el)) continue;
          const ra = a.r, rb = b.r;
          const ox = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
          const oy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
          if (ox > 3 && oy > 3) {
            out.push({ type: 'TEXT_OVERLAP', a: a.txt.slice(0, 30), b: b.txt.slice(0, 30) });
          }
        }
      }
      // 2. elemento de interação (botão) coberto por outro elemento
      for (const el of document.querySelectorAll('button, a, input, select, [role="button"]')) {
        const r = el.getBoundingClientRect();
        if (r.width < 10 || r.height < 10) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || +cs.opacity < 0.05) continue;
        const center = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        if (center && center !== el && !el.contains(center) && !center.contains(el)) {
          const cs2 = getComputedStyle(center);
          // só considera cobertura se o elemento do topo é opaco ou captura clique
          if (cs2.pointerEvents !== 'none' && +cs2.opacity > 0.5 && center.tagName !== 'BODY') {
            out.push({ type: 'COVERED', el: (el.tagName + '.' + String(el.className).slice(0, 40)), by: center.tagName + '.' + String(center.className).slice(0, 40) });
          }
        }
      }
      return out.slice(0, 12);
    });

    const unique = {};
    for (const h of hits) {
      const k = h.type + '|' + (h.a || h.el) + '|' + (h.b || h.by);
      unique[k] = h;
    }
    const list = Object.values(unique);
    if (list.length) {
      console.log(`[${route.name}] ${list.length} problemas:`);
      for (const h of list.slice(0, 6)) {
        console.log(`   ${h.type}: "${h.a || h.el}" × "${h.b || h.by}"`);
      }
    } else {
      console.log(`[${route.name}] OK`);
    }
  }
  await ctx.close();
}
await browser.close();
console.log('\nFIM');
