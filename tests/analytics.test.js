/*
 * Váltópont – automatikus böngészős tesztek a hozzájárulás-kezeléshez, a GA4-méréshez
 * és az affiliate CTA-khoz.
 *
 * Futtatás (nincs package.json, a már telepített Playwrightot használja):
 *   NODE_PATH=$(npm root -g) node --test tests/*.test.js
 *
 * FONTOS: a tesztek a Google-kéréseket HELYETTESÍTIK. A gtag.js helyett egy kis szkript fut,
 * amely a dataLayer parancsait a valódi gtag.js-hez hasonlóan értelmezi, és "collect"
 * kéréseket küld, amelyeket a teszt elfog. Ez a saját kódunk viselkedését igazolja,
 * a valódi Google-adatgyűjtést NEM. Azt a GA4 DebugView-ban kell kézzel ellenőrizni.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const BASE = 'https://valtopont.github.io/Skool-affiliate/';
const AFF = 'https://www.skool.com/szabaduszo-affiliate/about?ref=9f8501e9ce73465b9c9ea3abf13c00f2';
const MOBILE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 900 };
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'application/javascript' };

// A valódi gtag.js helyettesítője: tiszteletben tartja a consent állapotot és a ga-disable jelzőt.
const GTAG_STUB = `(function () {
  var dl = window.dataLayer = window.dataLayer || [];
  var consent = {}, page = {}, id = null;
  function off() { return consent.analytics_storage !== 'granted' || (id && window['ga-disable-' + id] === true); }
  function send(en, params) {
    if (off()) return;
    var q = new URLSearchParams({ v: '2', tid: id, en: en });
    Object.keys(params || {}).forEach(function (k) {
      if (k !== 'transport_type' && params[k] !== undefined) q.set(k, String(params[k]));
    });
    fetch('https://region1.google-analytics.com/g/collect?' + q.toString(), { method: 'POST', keepalive: true, mode: 'no-cors' });
  }
  function handle(a) {
    a = Array.prototype.slice.call(a);
    if (a[0] === 'consent') Object.assign(consent, a[2] || {});
    else if (a[0] === 'set') Object.assign(page, a[1] || {});
    else if (a[0] === 'config') {
      id = a[1];
      if (!off()) {
        document.cookie = '_ga=GA1.1.111.222; path=/; max-age=63072000';
        document.cookie = '_ga_' + id.slice(2) + '=GS1.1.333; path=/; max-age=63072000';
      }
      var cfg = a[2] || {};
      if (cfg.send_page_view !== false) send('page_view', Object.assign({}, page, cfg));
    } else if (a[0] === 'event') send(a[1], Object.assign({}, page, a[2] || {}));
  }
  dl.forEach(handle);
  var push = dl.push;
  dl.push = function () { for (var i = 0; i < arguments.length; i++) handle(arguments[i]); return push.apply(dl, arguments); };
})();`;

let browser;
before(async () => { browser = await chromium.launch(); });
after(async () => { await browser.close(); });

/*
 * active=true: a teszt az analytics-config.js-ben kitölti a privacyUrl-t (csak a tesztben!),
 * hogy az analitika aktív legyen. active=false: a repository változatlan konfigurációja.
 */
async function setup({ active = true, viewport = MOBILE } = {}) {
  const ctx = await browser.newContext({ viewport });
  const s = { ctx, external: [], collects: [], errors: [] };
  await ctx.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === 'valtopont.github.io' && url.pathname.startsWith('/Skool-affiliate/')) {
      const rel = url.pathname.slice('/Skool-affiliate/'.length) || 'index.html';
      const file = path.resolve(ROOT, rel);
      if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
        return route.fulfill({ status: 404, body: '' });
      }
      let body = fs.readFileSync(file, 'utf8');
      if (rel === 'analytics-config.js' && active) {
        assert.ok(body.includes("privacyUrl: ''"), 'a repository konfigurációjában a privacyUrl üres');
        body = body.replace("privacyUrl: ''", "privacyUrl: 'privacy.html'");
      }
      return route.fulfill({ contentType: TYPES[path.extname(file)] || 'text/plain', body });
    }
    s.external.push(url.href);
    if (url.hostname === 'www.googletagmanager.com' && url.pathname === '/gtag/js') {
      return route.fulfill({ contentType: 'application/javascript', body: GTAG_STUB });
    }
    if (url.hostname.endsWith('google-analytics.com')) {
      s.collects.push({ raw: url.search, ...Object.fromEntries(url.searchParams) });
      return route.fulfill({ status: 204, body: '' });
    }
    if (url.hostname === 'www.skool.com') {
      return route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Skool</title>' });
    }
    return route.abort();
  });
  ctx.on('page', (p) => {
    p.on('pageerror', (e) => s.errors.push(e.message));
    p.on('console', (m) => { if (m.type() === 'error') s.errors.push(m.text()); });
  });
  s.page = await ctx.newPage();
  s.events = (name) => s.collects.filter((c) => c.en === name);
  s.cookies = async () => (await ctx.cookies()).map((c) => c.name);
  s.googleRequests = () => s.external.filter((u) => /google(tagmanager|-analytics)\.com/.test(u));
  s.close = async () => {
    assert.deepEqual(s.errors, [], 'nincs JavaScript-hiba');
    await ctx.close();
  };
  return s;
}

async function choose(s, label) {
  await s.page.getByRole('button', { name: label, exact: true }).click();
  await s.page.waitForTimeout(400);
}

// Affiliate link kattintása; az új lapot (Skool) megvárja és bezárja.
async function clickCta(s, locator) {
  const [popup] = await Promise.all([s.ctx.waitForEvent('page'), locator.click()]);
  await popup.waitForLoadState().catch(() => {});
  const url = popup.url();
  await popup.close();
  await s.page.waitForTimeout(300);
  return url;
}

const CTAS = [
  { name: 'fejléc', selector: '.site-header a.btn', location: 'header' },
  { name: 'hero-cta', selector: '#hero-cta', location: 'hero' },
  { name: 'ismerd-meg', selector: '#ismerd-meg a.btn', location: 'ismerd-meg' },
  { name: 'final-cta', selector: '#final-cta', location: 'zaro' },
  { name: 'mobilos sticky CTA', selector: '#sticky-cta a', location: 'sticky_mobile' },
];

test('0. biztonsági zár: üres privacyUrl mellett az analitika nem aktív', async () => {
  const s = await setup({ active: false });
  await s.page.goto(BASE);
  await s.page.waitForTimeout(800);
  assert.equal(await s.page.locator('#consent-banner').count(), 0, 'nincs hozzájárulási sáv');
  assert.equal(await s.page.locator('.consent-settings').count(), 0, 'nincs Süti-beállítások gomb');
  assert.equal(await s.page.locator('a[href="privacy.html"]').count(), 0, 'nincs link a nem létező tájékoztatóra');
  assert.deepEqual(s.googleRequests(), []);
  assert.deepEqual(await s.cookies(), []);
  await s.close();
});

test('1. új látogató, döntés előtt: nincs Google-kérés, süti vagy tárolás', async () => {
  const s = await setup();
  await s.page.goto(BASE);
  await s.page.waitForTimeout(1200);
  assert.ok(await s.page.locator('#consent-banner').isVisible(), 'a sáv látszik');
  assert.deepEqual(s.googleRequests(), []);
  assert.deepEqual(await s.cookies(), []);
  assert.equal(await s.page.evaluate(() => localStorage.length), 0);
  assert.equal(await s.page.locator('script[src*="googletagmanager"]').count(), 0);
  // a két gomb kinézete azonos, és billentyűzettel elérhető
  const styles = await s.page.$$eval('.consent-btn', (bs) => bs.map((b) => {
    const c = getComputedStyle(b); const r = b.getBoundingClientRect();
    return [c.backgroundColor, c.color, c.fontSize, c.fontWeight, c.borderColor, Math.round(r.height), b.tabIndex];
  }));
  assert.equal(styles.length, 2);
  assert.deepEqual(styles[0], styles[1], 'Elfogadom és Elutasítom egyforma');
  assert.ok(styles[0][5] >= 44, 'a gombok legalább 44 px magasak (mobilon érinthetők)');
  await s.page.keyboard.press('Tab');
  const seen = [];
  for (let i = 0; i < 40 && seen.length < 2; i++) {
    const t = await s.page.evaluate(() => document.activeElement && document.activeElement.textContent);
    if ((t === 'Elfogadom' || t === 'Elutasítom') && !seen.includes(t)) seen.push(t);
    await s.page.keyboard.press('Tab');
  }
  assert.deepEqual(seen.sort(), ['Elfogadom', 'Elutasítom'], 'mindkét gomb elérhető Tab-bal');
  await s.close();
});

test('2. elutasítás után és újratöltés után sincs GA4-mérés', async () => {
  const s = await setup();
  await s.page.goto(BASE);
  await choose(s, 'Elutasítom');
  await s.page.reload();
  await s.page.waitForTimeout(800);
  assert.ok(!(await s.page.locator('#consent-banner').isVisible().catch(() => false)), 'a sáv nem jelenik meg újra');
  await clickCta(s, s.page.locator('#hero-cta'));
  assert.deepEqual(s.googleRequests(), [], 'nincs Google-kérés');
  assert.deepEqual(await s.cookies(), [], 'nincs süti');
  const stored = JSON.parse(await s.page.evaluate(() => localStorage.getItem('valtopont_analytics_consent')));
  assert.equal(stored.choice, 'denied');
  await s.close();
});

test('3. elfogadás után oldalbetöltésenként legfeljebb egy page_view, helyes Consent Mode sorrend', async () => {
  const s = await setup();
  await s.page.goto(BASE);
  await choose(s, 'Elfogadom');
  assert.equal(s.events('page_view').length, 1, 'pontosan egy page_view');
  const consent = await s.page.evaluate(() => window.dataLayer
    .map((a) => Array.prototype.slice.call(a))
    .filter((a) => a[0] === 'consent' || a[0] === 'config')
    .map((a) => [a[0], a[1], a[2] && a[0] === 'consent' ? a[2] : null]));
  assert.deepEqual(consent[0], ['consent', 'default',
    { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' }]);
  assert.deepEqual(consent[1], ['consent', 'update', { analytics_storage: 'granted' }]);
  assert.equal(consent[2][0], 'config', 'a config a consent parancsok után jön');
  for (const c of consent) {
    if (c[2]) for (const k of ['ad_storage', 'ad_user_data', 'ad_personalization']) assert.notEqual(c[2][k], 'granted');
  }
  s.collects.length = 0;
  await s.page.reload();
  await s.page.waitForTimeout(800);
  assert.equal(s.events('page_view').length, 1, 'újratöltés után is pontosan egy page_view');
  await s.close();
});

test('4. visszavonáskor a további GA4-események leállnak', async () => {
  const s = await setup();
  await s.page.goto(BASE);
  await choose(s, 'Elfogadom');
  assert.ok((await s.cookies()).includes('_ga'), 'elfogadás után keletkezett GA-süti (helyettesítő)');
  await s.page.getByRole('button', { name: 'Süti-beállítások' }).click();
  const focused = await s.page.evaluate(() => document.activeElement.className);
  assert.equal(focused, 'consent-btn', 'a Süti-beállítások gomb a sáv első gombjára viszi a fókuszt');
  await Promise.all([s.page.waitForNavigation(), s.page.getByRole('button', { name: 'Elutasítom', exact: true }).click()]);
  await s.page.waitForTimeout(800);
  s.collects.length = 0;
  s.external.length = 0;
  assert.equal(await s.page.locator('script[src*="googletagmanager"]').count(), 0, 'újratöltés után nincs gtag.js');
  assert.deepEqual((await s.cookies()).filter((n) => n.startsWith('_ga')), [], 'a GA-sütik törlődtek');
  await clickCta(s, s.page.locator('#hero-cta'));
  assert.deepEqual(s.collects, [], 'visszavonás után nincs több esemény');
  assert.deepEqual(s.googleRequests(), []);
  await s.close();
});

test('5–7. mind az öt CTA: helyes cél, ref megmarad, kattintásonként egy affiliate_click, helyes cta_location', async () => {
  const s = await setup();
  await s.page.goto(BASE);
  await choose(s, 'Elfogadom');
  const hrefs = await s.page.$$eval('a[href*="skool.com"]', (as) => as.map((a) => a.getAttribute('href')));
  assert.equal(hrefs.length, 5, 'öt Skool-link');
  for (const h of hrefs) assert.equal(h, AFF, 'pontosan az eredeti affiliate URL');

  for (const cta of CTAS) {
    if (cta.location === 'sticky_mobile') {
      await s.page.locator('#kozosseg').scrollIntoViewIfNeeded();
      await s.page.waitForSelector('#sticky-cta.is-visible');
      await s.page.waitForTimeout(400);
    } else if (cta.location === 'header') {
      await s.page.evaluate(() => window.scrollTo(0, 0));
    } else {
      await s.page.locator(cta.selector).scrollIntoViewIfNeeded();
    }
    const before = s.events('affiliate_click').length;
    const opened = await clickCta(s, s.page.locator(cta.selector));
    assert.equal(opened, AFF, `${cta.name}: a megnyílt cél pontosan az affiliate URL`);
    const after = s.events('affiliate_click');
    assert.equal(after.length - before, 1, `${cta.name}: pontosan egy affiliate_click`);
    assert.equal(after[after.length - 1].cta_location, cta.location, `${cta.name}: cta_location`);
  }
  // jobb gombos kattintás nem számít kattintásnak
  const before = s.events('affiliate_click').length;
  await s.page.locator('#hero-cta').scrollIntoViewIfNeeded();
  await s.page.locator('#hero-cta').click({ button: 'right' });
  await s.page.waitForTimeout(300);
  assert.equal(s.events('affiliate_click').length, before, 'jobb gomb: nincs esemény');
  await s.close();
});

test('8. UTM: csak a négy engedélyezett paraméter kerül a mérésbe', async () => {
  const s = await setup();
  const q = '?utm_source=facebook&utm_medium=paid_social&utm_campaign=valtopont_teszt1&utm_content=A' +
    '&utm_term=x&fbclid=SECRETFB&gclid=SECRETG&email=teszt%40pelda.hu';
  await s.page.goto(BASE + q);
  await choose(s, 'Elfogadom');
  const clean = BASE + '?utm_source=facebook&utm_medium=paid_social&utm_campaign=valtopont_teszt1&utm_content=A';
  assert.equal(s.events('page_view')[0].page_location, clean, 'page_location csak UTM-mel');
  assert.equal(s.page.url(), clean, 'a címsorból is eltűntek a felesleges paraméterek');
  await clickCta(s, s.page.locator('#hero-cta'));
  const ev = s.events('affiliate_click')[0];
  assert.equal(ev.utm_source, 'facebook');
  assert.equal(ev.utm_medium, 'paid_social');
  assert.equal(ev.utm_campaign, 'valtopont_teszt1');
  assert.equal(ev.utm_content, 'A');
  assert.equal(ev.ad_variant, 'A');
  assert.equal(ev.cta_text, 'Kipróbálom 7 napig ingyen');
  const allowed = new Set(['v', 'tid', 'en', 'raw', 'page_location', 'page_referrer', 'allow_google_signals',
    'allow_ad_personalization_signals', 'cta_location', 'cta_text', 'ad_variant',
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_content']);
  for (const c of s.collects) {
    assert.ok(!/SECRET|teszt%40|pelda|utm_term|fbclid|gclid/.test(c.raw), 'nincs fbclid, gclid, e-mail, utm_term');
    for (const k of Object.keys(c)) assert.ok(allowed.has(k), `csak előre meghatározott paraméter: ${k}`);
  }
  await s.close();

  // érvénytelen (pl. e-mail-címet tartalmazó) UTM-érték nem kerül továbbításra
  const s2 = await setup();
  await s2.page.goto(BASE + '?utm_source=teszt%40pelda.hu&utm_content=B');
  await choose(s2, 'Elfogadom');
  await clickCta(s2, s2.page.locator('#hero-cta'));
  const ev2 = s2.events('affiliate_click')[0];
  assert.equal(ev2.utm_source, '(nincs)');
  assert.equal(ev2.ad_variant, 'B');
  await s2.close();
});

test('9. nincs Meta Pixel és GA4-en kívüli követőkód vagy külső kérés', async () => {
  for (const f of ['index.html', 'analytics.js', 'analytics-config.js', 'script.js']) {
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    assert.ok(!/fbq\(|fbevents|connect\.facebook|facebook\.com\/tr|pixel/i.test(src), `${f}: nincs Meta Pixel`);
  }
  const s = await setup();
  await s.page.goto(BASE);
  await choose(s, 'Elfogadom');
  await clickCta(s, s.page.locator('#hero-cta'));
  const hosts = [...new Set(s.external.map((u) => new URL(u).hostname))].sort();
  assert.deepEqual(hosts, ['region1.google-analytics.com', 'www.googletagmanager.com', 'www.skool.com']);
  assert.equal(await s.page.evaluate(() => typeof window.fbq), 'undefined');
  const scripts = await s.page.$$eval('script[src]', (ss) => ss.map((x) => new URL(x.src).hostname));
  assert.deepEqual([...new Set(scripts)].sort(), ['valtopont.github.io', 'www.googletagmanager.com']);
  await s.close();
});

test('10. a mobilos sticky CTA továbbra is működik', async () => {
  const s = await setup();
  await s.page.goto(BASE);
  assert.equal(await s.page.locator('#sticky-cta').evaluate((e) => getComputedStyle(e).display), 'none',
    'amíg a sáv látszik, a sticky CTA rejtve van');
  await choose(s, 'Elutasítom');
  const state = () => s.page.locator('#sticky-cta').evaluate((e) => [e.classList.contains('is-visible'), e.getAttribute('aria-hidden')]);
  // a script.js szabálya: a sáv rejtve, amíg a hero vagy a záró CTA látszik.
  // (390×844-en a hero CTA már a publikált oldalon is a hajtás alatt van, ezért a lap tetején nem ezt nézzük.)
  await s.page.locator('#hero-cta').scrollIntoViewIfNeeded();
  await s.page.waitForTimeout(400);
  assert.deepEqual(await state(), [false, 'true'], 'amíg a hero CTA látszik, rejtve');
  await s.page.locator('#kozosseg').scrollIntoViewIfNeeded();
  await s.page.waitForTimeout(400);
  assert.deepEqual(await state(), [true, 'false'], 'görgetés után megjelenik');
  await s.page.locator('#final-cta').scrollIntoViewIfNeeded();
  await s.page.waitForTimeout(400);
  assert.deepEqual(await state(), [false, 'true'], 'a záró CTA-nál ismét rejtve');
  await s.close();
});

test('11. nincs vízszintes túlcsordulás 390 px-en és asztali nézetben', async () => {
  for (const viewport of [MOBILE, DESKTOP]) {
    const s = await setup({ viewport });
    await s.page.goto(BASE);
    await s.page.waitForTimeout(300);
    const check = () => s.page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
    assert.ok(await check(), `${viewport.width}px, sávval`);
    await choose(s, 'Elutasítom');
    assert.ok(await check(), `${viewport.width}px, döntés után`);
    await s.close();
  }
});

test('12. az affiliate-közlések olvashatók és megfelelő kontrasztúak', async () => {
  const s = await setup();
  await s.page.goto(BASE);
  await choose(s, 'Elutasítom');
  const info = await s.page.evaluate(() => {
    function rgb(c) { return c.match(/[\d.]+/g).slice(0, 3).map(Number); }
    function lum(c) {
      return rgb(c).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); })
        .reduce((acc, v, i) => acc + v * [0.2126, 0.7152, 0.0722][i], 0);
    }
    function bg(el) {
      for (; el; el = el.parentElement) {
        const c = getComputedStyle(el).backgroundColor;
        if (c && !/rgba\(.*,\s*0\)$/.test(c) && c !== 'transparent') return c;
      }
      return 'rgb(255, 255, 255)';
    }
    return ['.cta-note', '.footer-disclosure'].map((sel) => {
      const el = document.querySelector(sel); const cs = getComputedStyle(el);
      const a = lum(cs.color), b = lum(bg(el));
      return { sel, text: el.textContent, size: parseFloat(cs.fontSize),
        ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05), visible: el.getBoundingClientRect().height > 0 };
    });
  });
  const [note, footer] = info;
  assert.equal(note.text, 'Ajánlói link – csatlakozás esetén jutalékot kaphatok.');
  assert.equal(footer.text, 'Az oldalon található Skool-linkek ajánlói (affiliate) linkek. Ha valaki ezeken keresztül csatlakozik, a Skool feltételeitől függően jutalékot kaphatok.');
  for (const i of info) {
    assert.ok(i.visible, `${i.sel} látható`);
    assert.ok(i.size >= 12, `${i.sel} legalább 12 px (${i.size})`);
    assert.ok(i.ratio >= 4.5, `${i.sel} kontraszt legalább 4,5:1 (${i.ratio.toFixed(2)})`);
  }
  // a CTA-közlés közvetlenül a hero CTA után áll
  assert.equal(await s.page.evaluate(() => document.getElementById('hero-cta').nextElementSibling.className), 'cta-note');
  await s.close();
});

// 13. JavaScript-hiba: minden teszt végén a setup().close() ellenőrzi, hogy nem volt
// pageerror vagy console.error. Itt külön is betöltjük asztali nézetben, döntés nélkül.
test('13. nincs JavaScript-hiba (asztali nézet, aktív és inaktív konfiguráció)', async () => {
  for (const active of [true, false]) {
    const s = await setup({ active, viewport: DESKTOP });
    await s.page.goto(BASE);
    await s.page.mouse.wheel(0, 20000);
    await s.page.waitForTimeout(500);
    await s.close();
  }
});
