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

  // ---- pricing toggle ----
  var prices = document.querySelector('.prices');
  var billBtns = document.querySelectorAll('.bill-toggle button');
  billBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      billBtns.forEach(function (o) {
        o.setAttribute('aria-pressed', o === b ? 'true' : 'false');
      });
      prices.classList.toggle('yearly', b.getAttribute('data-bill') === 'yr');
    });
  });

  // ---- sticky mobile CTA (after hero, hidden near the form) ----
  var mcta = document.querySelector('.mobile-cta');
  var hero = document.querySelector('.hero');
  var trial = document.getElementById('trial');
  if (mcta && hero && trial && 'IntersectionObserver' in window) {
    var heroGone = false, trialSeen = false;
    var updateCta = function () {
      mcta.classList.toggle('show', heroGone && !trialSeen);
    };
    new IntersectionObserver(function (es) {
      heroGone = !es[0].isIntersecting; updateCta();
    }).observe(hero);
    new IntersectionObserver(function (es) {
      trialSeen = es[0].isIntersecting; updateCta();
    }).observe(trial);
  }

  // ---- sample player (one track at a time) ----
  var audio = new Audio();
  var current = null;
  var deck = document.querySelector('.deck');

  function reset(btn) {
    btn.classList.remove('playing');
    btn.querySelector('.track-play').textContent = '▶'; // ▶
    var bar = btn.querySelector('.track-progress');
    if (bar) bar.style.width = '0';
    if (deck) deck.classList.remove('live');
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
        if (deck) deck.classList.add('live');
      }).catch(function () {
        icon.textContent = '—';              // — sample missing in MVP
      });
      current = btn;
    });
  });

  audio.addEventListener('timeupdate', function () {
    if (!current || !audio.duration) return;
    var bar = current.querySelector('.track-progress');
    if (bar) bar.style.width = (audio.currentTime / audio.duration * 100) + '%';
  });

  audio.addEventListener('ended', function () {
    if (current) reset(current);
    current = null;
  });
})();
