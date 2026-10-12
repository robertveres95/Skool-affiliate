/*
 * Egyetlen funkció: a mobilos, alul rögzített CTA sáv akkor jelenik meg,
 * ha a hero CTA és a záró CTA sem látszik a képernyőn.
 * Ha a JavaScript nem fut, az oldal teljesen használható marad (a sáv rejtve van).
 */
(function () {
  var sticky = document.getElementById('sticky-cta');
  var watched = [document.getElementById('hero-cta'), document.getElementById('final-cta')];

  if (!sticky || !('IntersectionObserver' in window)) return;

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
  });

  watched.forEach(function (el) {
    if (el) observer.observe(el);
  });
})();
