/*
 * Váltópont – GA4-mérés hozzájárulás-kezeléssel.
 *
 * Működés röviden:
 * - Ha nincs érvényes Measurement ID (analytics-config.js), semmi nem történik:
 *   nincs sáv, nincs tárolás, nincs kérés a Google felé.
 * - Ha van ID, és a látogató még nem döntött: megjelenik a hozzájárulási sáv.
 *   Döntés előtt a GA4 NEM töltődik be.
 * - Elfogadom → GA4 betölt: oldalmegtekintés + "affiliate_outbound_click" esemény.
 * - Elutasítás → GA4 nem töltődik be; ha korábban betöltött, letiltjuk és töröljük a GA-sütiket.
 * - A döntés a lábléc „Süti-beállítások” gombjával bármikor módosítható.
 * - ?valtopont_test=1 SOHA nem ad hozzájárulást; csak a GA4 DebugView-jelölést kapcsolja be,
 *   ha a látogató már maga elfogadta a mérést.
 * - A kattintást soha nem akadályozza (nincs preventDefault).
 */
(function () {
  var config = window.VALTOPONT_ANALYTICS_CONFIG || {};
  var id = String(config.ga4MeasurementId || '').trim();
  var validId = /^G-[A-Z0-9]{4,}$/.test(id);

  var CONSENT_KEY = 'valtopont_analytics_consent';
  var CONSENT_VERSION = 1;                 // ha a tájékoztató lényegesen változik, növeld → újra kérdez
  var CONSENT_MAX_AGE_DAYS = 365;          // ennyi idő után újra rákérdezünk
  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];
  var AFFILIATE_HOST = 'www.skool.com';
  var AFFILIATE_PATH = '/szabaduszo-affiliate/';

  var params = new URLSearchParams(window.location.search);
  var debugMode = params.get('valtopont_test') === '1';
  var loaded = false;
  var disabled = false;
  var memoryChoice = null;                 // ha a localStorage nem elérhető, csak erre az oldalbetöltésre emlékszünk
  var banner = null;
  var lastClick = null;

  /* ---------- hozzájárulás tárolása ---------- */

  function readChoice() {
    var raw = null;
    try { raw = window.localStorage.getItem(CONSENT_KEY); } catch (e) { return memoryChoice; }
    if (!raw) return memoryChoice;
    try {
      var data = JSON.parse(raw);
      var ageDays = (Date.now() - data.ts) / 86400000;
      if (data.v !== CONSENT_VERSION || !(ageDays >= 0 && ageDays < CONSENT_MAX_AGE_DAYS)) return null;
      return data.choice === 'granted' || data.choice === 'denied' ? data.choice : null;
    } catch (e) {
      return null;                         // régi vagy sérült formátum → újra kérdezünk
    }
  }

  function saveChoice(choice) {
    memoryChoice = choice;
    try {
      window.localStorage.setItem(CONSENT_KEY, JSON.stringify({ v: CONSENT_VERSION, choice: choice, ts: Date.now() }));
    } catch (e) { /* tárolás tiltva: a döntés csak erre az oldalbetöltésre érvényes */ }
  }

  /* ---------- UTM (csak memóriában, nincs tárolás) ---------- */

  function clean(value) {
    if (!value) return '';
    value = String(value).slice(0, 100);
    return /^[A-Za-z0-9_\-.]+$/.test(value) ? value : '';
  }

  var utm = {};
  UTM_KEYS.forEach(function (k) {
    var v = clean(params.get(k));
    if (v) utm[k] = v;
  });

  // "A", "a_ujrakezdes", "B-keszseg" → "A" / "B"; minden más → az utm_content maga.
  function adVariant() {
    var c = utm.utm_content || '';
    var m = c.match(/^([A-Za-z])(?:[_-]|$)/);
    return m ? m[1].toUpperCase() : c;
  }

  // Az oldal URL-je csak a négy engedélyezett utm_* paraméterrel (fbclid, gclid, valtopont_test,
  // utm_term, hash stb. nélkül). A UTM a kampány-hozzárendeléshez kell, minden más elhagyható.
  function cleanPageLocation() {
    var q = UTM_KEYS.filter(function (k) { return utm[k]; })
      .map(function (k) { return k + '=' + encodeURIComponent(utm[k]); }).join('&');
    return window.location.origin + window.location.pathname + (q ? '?' + q : '');
  }

  // Hivatkozó oldal: külső oldalnál csak a domain (pl. https://l.facebook.com/),
  // saját oldalnál a domain + útvonal; lekérdezési paraméter és hash soha.
  function cleanReferrer() {
    var ref = document.referrer;
    if (!ref) return '';
    try {
      var u = new URL(ref);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
      return u.origin === window.location.origin ? u.origin + u.pathname : u.origin + '/';
    } catch (e) {
      return '';
    }
  }

  // A böngésző címsorából is eltávolítjuk a nem engedélyezett paramétereket, mielőtt a gtag.js
  // betöltődik, így az se tudja kiolvasni őket a document.location-ből.
  function cleanAddressBar() {
    try {
      var clean = cleanPageLocation() + window.location.hash;
      if (clean !== window.location.href) window.history.replaceState(window.history.state, '', clean);
    } catch (e) { /* nem kritikus */ }
  }

  /* ---------- GA4 betöltése / letiltása ---------- */

  function loadGa() {
    if (loaded || !validId || readChoice() !== 'granted') return;
    loaded = true;
    disabled = false;
    window['ga-disable-' + id] = false;

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
    cleanAddressBar();
    var pageData = { page_location: cleanPageLocation(), page_referrer: cleanReferrer() };
    window.gtag('set', pageData);          // minden további eseményre (kattintás is) érvényes
    window.gtag('js', new Date());
    var gaConfig = {
      page_location: pageData.page_location,
      page_referrer: pageData.page_referrer,
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    };
    if (debugMode) gaConfig.debug_mode = true;
    window.gtag('config', id, gaConfig);

    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    document.head.appendChild(s);
  }

  function deleteGaCookies() {
    var host = window.location.hostname;
    var domains = ['', host, '.' + host];
    document.cookie.split(';').forEach(function (c) {
      var name = c.split('=')[0].trim();
      if (name === '_ga' || name.indexOf('_ga_') === 0) {
        domains.forEach(function (d) {
          document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + (d ? '; domain=' + d : '');
        });
      }
    });
  }

  function disableGa() {
    if (validId) window['ga-disable-' + id] = true;  // a gtag.js hivatalos kikapcsoló jelzője
    if (loaded && typeof window.gtag === 'function') {
      window.gtag('consent', 'update', { analytics_storage: 'denied' });
    }
    disabled = true;
    deleteGaCookies();
  }

  function setChoice(choice) {
    saveChoice(choice);
    if (choice === 'granted') {
      if (loaded) {
        disabled = false;
        window['ga-disable-' + id] = false;
        window.gtag('consent', 'update', { analytics_storage: 'granted' });
      } else {
        loadGa();
      }
    } else {
      disableGa();
    }
    hideBanner();
  }

  /* ---------- hozzájárulási sáv ---------- */

  function buildBanner() {
    var el = document.createElement('div');
    el.className = 'consent';
    el.id = 'consent-banner';
    el.setAttribute('role', 'region');
    el.setAttribute('aria-label', 'Analitikai mérés – hozzájárulás');
    el.innerHTML =
      '<div class="consent-inner">' +
        '<p class="consent-title">Mérhetem, hogyan használod az oldalt?</p>' +
        '<p class="consent-text">Ha elfogadod, a Google Analytics sütikkel méri a látogatásokat és a gombkattintásokat. ' +
        'Ha elutasítod, nem kerül analitikai adat a Google-hoz. A döntésed az oldal alján bármikor módosíthatod.</p>' +
        '<div class="consent-actions">' +
          '<button type="button" class="consent-btn" data-consent="granted">Elfogadom</button>' +
          '<button type="button" class="consent-btn" data-consent="denied">Elutasítom</button>' +
        '</div>' +
        '<a class="consent-link" href="privacy.html" target="_blank" rel="noopener">Adatkezelési tájékoztató</a>' +
      '</div>';
    el.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-consent]');
      if (btn) setChoice(btn.getAttribute('data-consent'));
    });
    document.body.appendChild(el);
    return el;
  }

  function showBanner() {
    if (!validId) return;
    if (!banner) banner = buildBanner();
    banner.hidden = false;
    document.body.classList.add('has-consent-banner');
  }

  function hideBanner() {
    if (banner) banner.hidden = true;
    document.body.classList.remove('has-consent-banner');
  }

  // „Süti-beállítások” gomb a [data-consent-settings-slot] helyekre (pl. lábléc).
  function addSettingsButtons() {
    var slots = document.querySelectorAll('[data-consent-settings-slot]');
    Array.prototype.forEach.call(slots, function (slot) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'consent-settings';
      b.textContent = 'Süti-beállítások';
      b.addEventListener('click', function () {
        showBanner();
        var first = banner && banner.querySelector('.consent-btn');
        if (first) first.focus();
      });
      slot.appendChild(b);
    });
  }

  /* ---------- affiliate kattintás ---------- */

  function ctaLocation(link) {
    if (link.closest('.site-header')) return 'header';
    if (link.closest('#sticky-cta')) return 'sticky_mobile';
    var section = link.closest('section[id]');
    return section ? section.id : 'egyeb';
  }

  function isAffiliateLink(link) {
    return link.hostname === AFFILIATE_HOST && link.pathname.indexOf(AFFILIATE_PATH) === 0;
  }

  function onClick(event) {
    var link = event.target.closest && event.target.closest('a[href]');
    if (!link || !isAffiliateLink(link)) return;

    lastClick = {
      cta_location: ctaLocation(link),
      cta_text: link.textContent.trim().slice(0, 60),
      ad_variant: adVariant() || '(nincs)',
      utm_source: utm.utm_source || '(nincs)',
      utm_medium: utm.utm_medium || '(nincs)',
      utm_campaign: utm.utm_campaign || '(nincs)',
      utm_content: utm.utm_content || '(nincs)'
    };

    if (loaded && !disabled && readChoice() === 'granted' && typeof window.gtag === 'function') {
      var payload = {};
      for (var k in lastClick) payload[k] = lastClick[k];
      payload.transport_type = 'beacon';
      window.gtag('event', 'affiliate_outbound_click', payload);
    }
  }

  document.addEventListener('click', onClick, true);
  document.addEventListener('auxclick', onClick, true); // középső egérgomb

  /* ---------- állapot (hibakereséshez, böngészőkonzolból) ---------- */

  window.valtopontAnalytics = {
    status: function () {
      return {
        measurementIdSet: validId,
        choice: readChoice(),
        active: loaded && !disabled,
        debugMode: debugMode,
        utm: utm,
        adVariant: adVariant()
      };
    },
    lastClick: function () { return lastClick; },
    openSettings: showBanner
  };

  /* ---------- indulás ---------- */

  if (!validId) {
    if (id) console.warn('[Váltópont analitika] Érvénytelen GA4 Measurement ID: "' + id + '". Az analitika nem aktív.');
    else console.info('[Váltópont analitika] Nincs GA4 Measurement ID beállítva – az analitika nem aktív.');
    return;
  }

  addSettingsButtons();
  var choice = readChoice();
  if (choice === 'granted') loadGa();
  else if (choice === 'denied') deleteGaCookies();
  else if (!document.body.hasAttribute('data-consent-no-autoshow')) showBanner(); // a tájékoztató oldalon nem ugrik fel magától
})();
