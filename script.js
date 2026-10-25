/*
 * Váltópont 2.0 – két kis funkció, külső könyvtár nélkül:
 * 1. Beúszó kártyák és kirajzolódó lépésvonalak görgetéskor.
 *    A kártya akkor indul, amikor kb. 80%-a a ténylegesen látható sávban van; mobilon a látszó
 *    sticky sáv alatti rész nem számít láthatónak (a sáv megjelenésekor a határ újraszámolódik). A sávnál magasabb elemeknél arányos, méretérzékeny
 *    küszöb érvényes, így ezek is biztosan megjelennek. Az egyszerre induló elemek között rövid
 *    lépcsőzés van, felfelé görgetéskor az elem felülről érkezik. Minden elem csak egyszer animál.
 *    A tartalom JS nélkül, hiba esetén és csökkentett mozgásnál is látható marad.
 * 2. Mobilos sticky CTA: akkor jelenik meg, ha sem a hero, sem a záró CTA nem látszik
 *    (az élő oldal script.js-ével azonos logika).
 */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;
  var sticky = document.getElementById('sticky-cta');

  /* 1. Beúszó elemek */
  var KUSZOB = 0.8;    // az elem ennyi része legyen a látható sávban
  var MAX_SAV = 0.35;  // magas elemnél legfeljebb a látható sáv ennyi részét kell kitöltenie
  var LEPCSO = 70;     // ms az egyszerre induló elemek között
  var ELTOLAS = 16;    // px: a rejtett kártya ennyivel lejjebb áll (style.css: --reveal-y)
  var items = Array.prototype.slice.call(document.querySelectorAll('.reveal, .draw'));

  // bármilyen szkripthiba esetén minden tartalom animáció nélkül látható
  function mindentMutat() {
    root.classList.remove('reveal-ready');
  }

  // a látszó mobilos sticky sáv magassága; ha rejtve van (vagy asztali nézetben), 0
  function alsoTakaras() {
    return sticky && sticky.classList.contains('is-visible') && getComputedStyle(sticky).display !== 'none'
      ? sticky.offsetHeight : 0;
  }

  // a sticky sáv állapotváltozásakor hívódik (lásd lent); a beúszás itt frissíti a sávhatárt
  var savValtozott = function () {};

  if (hasIO && !reduce && items.length) {
    window.addEventListener('error', mindentMutat);

    var takaras = alsoTakaras();
    var lathatoAlja = (window.innerHeight || root.clientHeight) - takaras;

    // ami betöltéskor akár részben is látszik, azonnal (animáció nélkül) látható
    items.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < lathatoAlja && r.bottom > 0) el.classList.add('is-visible');
    });

    var lepcsok = [];
    for (var i = 0; i <= 20; i++) lepcsok.push(i / 20);

    var megfigyelo;

    var indit = function (entries) {
      try {
        var indulo = entries.filter(function (entry) {
          if (!entry.isIntersecting) return false;
          var rb = entry.rootBounds || { top: 0, bottom: lathatoAlja, height: lathatoAlja };
          var b = entry.boundingClientRect;
          // a kártya végleges (eltolás nélküli) helyéből számolunk, nem a lejjebb tolt rejtett dobozból
          var el = entry.target.classList.contains('reveal') ? ELTOLAS : 0;
          var lathato = Math.min(b.bottom - el, rb.bottom) - Math.max(b.top - el, rb.top);
          var kell = Math.min(b.height * KUSZOB, rb.height * MAX_SAV);
          return lathato + 0.5 >= kell;
        });

        indulo.sort(function (a, b) {
          return (a.boundingClientRect.top - b.boundingClientRect.top) ||
            (a.boundingClientRect.left - b.boundingClientRect.left);
        });

        indulo.forEach(function (entry, n) {
          var el = entry.target;
          megfigyelo.unobserve(el);
          if (entry.rootBounds && entry.boundingClientRect.top < entry.rootBounds.top) {
            // felfelé görgetéskor felülről, enyhén lefelé ereszkedve érkezik
            el.style.transition = 'none';
            el.style.setProperty('--reveal-y', '-14px');
            el.getBoundingClientRect();
            el.style.transition = '';
          }
          el.style.setProperty('--reveal-delay', Math.min(n, 3) * LEPCSO + 'ms');
          el.classList.add('is-visible');
        });
      } catch (e) {
        mindentMutat();
      }
    };

    var megfigyel = function () {
      if (megfigyelo) megfigyelo.disconnect();
      megfigyelo = new IntersectionObserver(indit, {
        rootMargin: '0px 0px -' + takaras + 'px 0px',
        threshold: lepcsok
      });
      items.forEach(function (el) {
        if (!el.classList.contains('is-visible')) megfigyelo.observe(el);
      });
    };

    megfigyel();

    // a sticky sáv megjelenésekor/eltűnésekor, illetve méret- vagy tájolásváltáskor új sávhatár
    savValtozott = function () {
      var uj = alsoTakaras();
      if (uj !== takaras) {
        takaras = uj;
        lathatoAlja = (window.innerHeight || root.clientHeight) - takaras;
        megfigyel();
      }
    };

    var idozito;
    window.addEventListener('resize', function () {
      clearTimeout(idozito);
      idozito = setTimeout(savValtozott, 200);
    });

    root.classList.add('reveal-ready');
  }

  /* 2. Mobilos sticky CTA */
  var watched = [document.getElementById('hero-cta'), document.getElementById('final-cta')];

  if (sticky && hasIO) {
    var visible = new Set();
    var link = sticky.querySelector('a');

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      });

      var show = visible.size === 0;
      sticky.classList.toggle('is-visible', show);
      sticky.setAttribute('aria-hidden', show ? 'false' : 'true');
      link.tabIndex = show ? 0 : -1;
      savValtozott();
    });

    watched.forEach(function (el) {
      if (el) observer.observe(el);
    });
  }
})();
