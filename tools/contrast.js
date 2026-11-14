/* Measures what the accessibility section on the home page says was measured.

     node tools/contrast.js            every page, at 390 and 1440 wide
     node tools/contrast.js index.html

   For each page it:
   - checks nothing scrolls sideways (at 320 wide as well, which is what 400% zoom comes to)
   - photographs the page with every letter made invisible, so the picture is only what is
     BEHIND the text, then compares each piece of text's colour with the worst pixel behind
     it. 4.5:1 for ordinary text, 3:1 for large (24px, or 18.66px bold), as WCAG 2.2 AA asks.
   - checks every link and button is at least 24 by 24 pixels and has a name
   - checks there is one h1 and that heading levels do not skip downwards

   Headlines and stickers are measured standing straight, on the ground they sit on.
   Decorative text marked aria-hidden (the marker notes and the newspaper cutting, which only
   repeat what the page says in ordinary words) is left out. Needs Playwright. Exits 1 if
   anything fails. wrapped.html is not checked: it is the app's page, not the site's. */
'use strict';
const path = require('path'), fs = require('fs');
const { pathToFileURL } = require('url');
const { chromium } = require('playwright');
const SITE = path.resolve(__dirname, '..');
const PAGES = process.argv.slice(2).length ? process.argv.slice(2)
  : ['index.html', 'changelog.html', 'feedback.html', 'review.html', 'gift.html', 'license.html'];

const collect = () => {
  const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
  const out = { texts:[], small:[], unnamed:[], h1:document.querySelectorAll('h1').length, skips:[] };
  const hidden = e => { if (e.checkVisibility && !e.checkVisibility({ contentVisibilityAuto:true })) return true; for (let a = e; a; a = a.parentElement) { if (a.getAttribute && a.getAttribute('aria-hidden') === 'true') return true; const s = getComputedStyle(a); if (s.display === 'none' || s.visibility === 'hidden') return true; } return false; };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  for (let n; (n = walker.nextNode());) {
    if (!n.nodeValue.trim()) continue;
    const e = n.parentElement;
    if (hidden(e) || ['SCRIPT','STYLE','NOSCRIPT','TEXTAREA','OPTION'].includes(e.tagName)) continue;
    if (e.closest('.sr, .sr-only, .skiplink')) continue;
    const range = document.createRange(); range.selectNodeContents(n);
    const cs = getComputedStyle(e);
    const m = cs.color.match(/[\d.]+/g).map(Number);
    if (m.length > 3 && m[3] < 1) continue;   // see-through text is judged by eye, not here
    const size = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight, 10) >= 700;
    for (const r of range.getClientRects()) {
      if (r.width < 2 || r.height < 2) continue;
      // a line's box is as tall as the typeface, which for tight headlines is taller than the
      // line itself and reaches into whatever is above; only the middle of it holds letters
      const cut = r.height > size * 1.05 ? (r.height - size * .8) / 2 : 0;
      out.texts.push({ x:r.left + scrollX, y:r.top + scrollY + cut, w:r.width, h:r.height - 2 * cut, L:lum(m), rgb:m.slice(0,3),
        need:(size >= 24 || (size >= 18.66 && bold)) ? 3 : 4.5, what:e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : '') + ' "' + n.nodeValue.trim().slice(0, 40) + '"' });
    }
  }
  for (const e of document.querySelectorAll('a[href], button, input, textarea, summary')) {
    if (hidden(e) || e.closest('.skiplink')) continue;
    const r = e.getBoundingClientRect(); if (!r.width || getComputedStyle(e).opacity === '0') continue;   // a hidden radio is pressed through its label
    const inline = e.tagName === 'A' && getComputedStyle(e).display === 'inline';   // links in a sentence are exempt
    if (!inline && (r.width < 24 || r.height < 24)) out.small.push(e.tagName.toLowerCase() + ' ' + Math.round(r.width) + 'x' + Math.round(r.height) + ' "' + (e.textContent || '').trim().slice(0, 30) + '"');
    const name = (e.getAttribute('aria-label') || e.textContent || e.getAttribute('placeholder') || e.getAttribute('title') || '').trim()
      || (e.labels && e.labels.length ? 'label' : '') || (e.closest('label') ? 'label' : '') || (e.getAttribute('aria-labelledby') || '');
    if (!name) out.unnamed.push(e.outerHTML.slice(0, 80));
  }
  let last = 0;
  for (const h of document.querySelectorAll('h1,h2,h3,h4,h5,h6')) {
    if (hidden(h)) continue;
    const l = +h.tagName[1]; if (last && l > last + 1) out.skips.push(h.tagName + ' after H' + last + ': ' + h.textContent.trim().slice(0, 30)); last = l;
  }
  return out;
};

const measure = async ({ png, texts }) => {
  const img = new Image(); img.src = png; await img.decode();
  const lum = (r, g, b) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
  const bad = []; let worst = 99;
  // the picture is drawn a strip at a time: a whole phone page is taller than a canvas may be
  const STRIP = 4000, cv = document.createElement('canvas'); cv.width = img.width; cv.height = STRIP;
  const g = cv.getContext('2d', { willReadFrequently:true });
  for (let top = 0; top < img.height; top += STRIP) {
    g.clearRect(0, 0, cv.width, STRIP); g.drawImage(img, 0, -top);
    for (const t of texts) {
      if (t.y < top || t.y >= top + STRIP) continue;
      const x = Math.max(0, Math.floor(t.x)), y = Math.floor(t.y - top), w = Math.min(cv.width - x, Math.ceil(t.w)), h = Math.min(STRIP - y, Math.ceil(t.h));
      if (w < 1 || h < 1) continue;
      const d = g.getImageData(x, y, w, h).data; let min = 99;
      for (let i = 0; i < d.length; i += 4 * 3) { const L = lum(d[i], d[i+1], d[i+2]); const c = (Math.max(L, t.L) + .05) / (Math.min(L, t.L) + .05); if (c < min) min = c; }
      if (min < worst) worst = min;
      if (min < t.need) bad.push(min.toFixed(2) + ':1 (needs ' + t.need + ') ' + t.what);
    }
  }
  return { bad:[...new Set(bad)], worst };
};

(async () => {
  const browser = await chromium.launch(process.env.CHROME ? { executablePath:process.env.CHROME } : {});
  let failed = 0;
  for (const name of PAGES) {
    for (const width of [320, 390, 1440]) {
      const ctx = await browser.newContext({ viewport:{ width, height:900 }, deviceScaleFactor:1, reducedMotion:'reduce' });
      await ctx.route('https://**', r => r.abort());
      const page = await ctx.newPage();
      await page.goto(pathToFileURL(path.join(SITE, name)).href);
      await page.evaluate(async () => { const im = [...document.images]; im.forEach(i => { i.loading = 'eager'; }); await Promise.all(im.map(i => i.decode().catch(() => 0))); await document.fonts.ready; });
      const problems = [];
      const sw = await page.evaluate(() => document.documentElement.scrollWidth);
      if (sw > width) problems.push('scrolls sideways: ' + sw + ' wide in a ' + width + ' window');
      let worst = null;
      if (width !== 320) {
        // Tipped-over text is stood up straight first. A rotated line's box takes in whatever is
        // beside it, and would be measured against its neighbour and not its own ground.
        await page.addStyleTag({ content:'*{ transform:none !important; }' });
        const info = await page.evaluate(collect);
        await page.addStyleTag({ content:'*,*::before,*::after{ color:transparent !important; text-shadow:none !important; -webkit-text-fill-color:transparent !important; caret-color:transparent !important; } ::placeholder{ color:transparent !important; } .newlist li::before,.about li::before{ visibility:visible; }' });
        const png = 'data:image/png;base64,' + (await page.screenshot({ fullPage:true })).toString('base64');
        const blank = await ctx.newPage();
        const res = await blank.evaluate(measure, { png, texts:info.texts });
        await blank.close();
        worst = res.worst;
        problems.push(...res.bad.map(b => 'contrast ' + b));
        problems.push(...info.small.map(s => 'small target: ' + s), ...info.unnamed.map(s => 'no name: ' + s), ...info.skips.map(s => 'heading skips: ' + s));
        if (info.h1 !== 1) problems.push(info.h1 + ' h1 elements');
      }
      console.log((problems.length ? 'FAIL ' : 'ok   ') + name + ' @' + width + (worst ? '  lowest contrast ' + worst.toFixed(2) + ':1' : ''));
      for (const p of problems.slice(0, 40)) console.log('       ' + p);
      failed += problems.length;
      await ctx.close();
    }
  }
  await browser.close();
  console.log(failed ? '\n' + failed + ' problem' + (failed === 1 ? '' : 's') : '\nAll clear');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
