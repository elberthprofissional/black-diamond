// Auditoria responsiva: texto cortado + fonte minúscula + conteúdo na borda
// Uso: BASE_URL=http://localhost:5174 node scripts/audit-responsive-text.mjs
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://localhost:5174';
const VIEWPORTS = [
  { w: 320, h: 700, label: '320px' },
  { w: 360, h: 800, label: '360px' },
  { w: 390, h: 844, label: '390px' },
];

const ROUTES = [
  { path: '/', name: 'Home' },
  { path: '/agendar', name: 'Agendar' },
  { path: '/entrar', name: 'Entrar' },
  { path: '/cancelar', name: 'Cancelar' },
  { path: '/admin/login', name: 'Admin Login' },
  { path: '/admin', name: 'Admin Dashboard' },
];

// fontes consideradas minúsculas demais para leitura em mobile
const TINY_FONT_MAX = 10;
const TINY_FONT_EXCLUDE_SRC = '(aria|icon|badge|dot|bullet|pixel|sparkle)';

const browser = await chromium.launch();
for (const vp of VIEWPORTS) {
  console.log(`\n===== VIEWPORT ${vp.label} =====`);
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();

  for (const route of ROUTES) {
    const problems = [];
    try {
      await page.goto(BASE + route.path, { waitUntil: 'networkidle', timeout: 25000 });
      await page.waitForTimeout(1200);
    } catch (e) {
      console.log(`[${route.name}] ERRO ao carregar: ${e.message.split('\n')[0]}`);
      continue;
    }

    const data = await page.evaluate(({ TINY_FONT_MAX, TINY_FONT_EXCLUDE_SRC }) => {
      const TINY_FONT_EXCLUDE = new RegExp(TINY_FONT_EXCLUDE_SRC, 'i');
      function isClippedText(el) {
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) return false;
        const hasOverflow = cs.overflowX === 'hidden' || cs.overflowY === 'hidden' || cs.overflow === 'hidden' || cs.textOverflow === 'ellipsis';
        if (!hasOverflow) return false;
        const sw = el.scrollWidth, cw = el.clientWidth;
        const sh = el.scrollHeight, ch = el.clientHeight;
        if (sw > cw + 2 || sh > ch + 2) {
          let p = el.parentElement;
          while (p && p !== document.body) {
            const pcs = getComputedStyle(p);
            if (pcs.overflowX === 'auto' || pcs.overflowX === 'scroll') return false;
            p = p.parentElement;
          }
          return true;
        }
        return false;
      }
      const out = { clipped: [], tiny: [], edge: [] };
      const all = document.querySelectorAll('body *');
      const vw = window.innerWidth;
      for (const el of all) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        // 1. texto cortado
        if (el.children.length === 0 && el.textContent.trim().length > 0) {
          if (isClippedText(el)) {
            out.clipped.push({
              tag: el.tagName.toLowerCase(),
              cls: (el.className && String(el.className).slice(0, 70)) || '',
              text: el.textContent.trim().slice(0, 40),
              w: Math.round(r.width), cw: el.clientWidth, sw: el.scrollWidth,
            });
          }
          // 2. fonte minúscula
          const fs = parseFloat(getComputedStyle(el).fontSize);
          const txt = el.textContent.trim();
          if (fs > 0 && fs <= TINY_FONT_MAX && txt.length >= 3 && !TINY_FONT_EXCLUDE.test(el.className + ' ' + el.id)) {
            out.tiny.push({ fs, cls: String(el.className).slice(0, 60), text: txt.slice(0, 30) });
          }
        }
        // 3. conteúdo colado na borda (elementos visíveis tocando a borda)
        if (r.width > 0 && r.height > 0) {
          const nearLeft = r.left <= 1 && r.right > 40;
          const nearRight = r.right >= vw - 1 && r.left < vw - 40;
          if ((nearLeft || nearRight) && !el.closest('[data-no-edge-check]')) {
            // ignora backgrounds/overlays full-width
            const cs = getComputedStyle(el);
            if (r.width < vw * 0.98 && (r.width > 45 || r.height > 45) && cs.position !== 'fixed' && cs.position !== 'absolute') {
              out.edge.push({ side: nearLeft ? 'L' : 'R', tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 60) });
            }
          }
        }
      }
      return out;
    }, { TINY_FONT_MAX, TINY_FONT_EXCLUDE_SRC });

    if (data.clipped.length) {
      problems.push(`CLIPPED ${data.clipped.length}: ${data.clipped.slice(0, 3).map(c => `${c.tag}.${c.cls} "${c.text}" (${c.cw}/${c.sw}px)`).join(' | ')}`);
    }
    if (data.tiny.length) {
      problems.push(`TINY_FONT ${data.tiny.length}: ${[...new Set(data.tiny.map(t => t.fs + 'px'))].join(',')}px ex: "${data.tiny[0].text}" [${data.tiny[0].cls}]`);
    }
    if (data.edge.length) {
      problems.push(`EDGE ${data.edge.length}: ${[...new Set(data.edge.map(e => e.tag + '.' + e.cls))].slice(0, 4).join(' | ')}`);
    }

    if (problems.length) {
      console.log(`[${route.name}] ${problems.join('  ||  ')}`);
    } else {
      console.log(`[${route.name}] OK`);
    }
  }
  await ctx.close();
}
await browser.close();
console.log('\nFIM');
