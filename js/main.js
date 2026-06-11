// Oadio — nav, scroll reveals, sample player.
(function () {
  // ---- mobile nav ----
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    links.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') links.classList.remove('open');
    });
  }

  // ---- scroll reveals ----
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  // ---- sample player (one track at a time) ----
  var audio = new Audio();
  var current = null;

  function reset(btn) {
    btn.classList.remove('playing');
    btn.querySelector('.track-play').textContent = '▶'; // ▶
  }

  document.querySelectorAll('.track').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var src = btn.getAttribute('data-src');
      var icon = btn.querySelector('.track-play');

      if (current === btn && !audio.paused) {     // pause active
        audio.pause(); reset(btn); return;
      }
      if (current) reset(current);

      audio.src = src;
      audio.play().then(function () {
        btn.classList.add('playing');
        icon.textContent = '❚❚';        // ❚❚
      }).catch(function () {
        icon.textContent = '—';              // — sample missing in MVP
      });
      current = btn;
    });
  });

  audio.addEventListener('ended', function () {
    if (current) reset(current);
    current = null;
  });
})();
