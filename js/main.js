// Oadio — nav, scroll reveals, cookie consent, contact form.
(function () {
  var toggle = document.querySelector('.nav-toggle')
  var links = document.querySelector('.nav-links')
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open')
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false')
    })
    links.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        links.classList.remove('open')
        toggle.setAttribute('aria-expanded', 'false')
      }
    })
  }

  var reveals = document.querySelectorAll('.reveal')
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target) }
      })
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' })
    reveals.forEach(function (el) { io.observe(el) })
  } else {
    reveals.forEach(function (el) { el.classList.add('in') })
  }

  document.querySelectorAll('.bill-toggle').forEach(function (toggle) {
    var section = toggle.closest('section')
    var pricesEl = section ? section.querySelector('.prices') : null
    var btns = toggle.querySelectorAll('button')
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        btns.forEach(function (o) {
          o.setAttribute('aria-pressed', o === b ? 'true' : 'false')
        })
        if (pricesEl) pricesEl.classList.toggle('yearly', b.getAttribute('data-bill') === 'yr')
      })
    })
  })

  var mcta = document.querySelector('.mobile-cta')
  var hero = document.querySelector('.hero')
  var contactSec = document.getElementById('contact')
  if (mcta && hero && 'IntersectionObserver' in window) {
    var heroGone = false, contactSeen = false
    var updateCta = function () {
      mcta.classList.toggle('show', heroGone && !contactSeen)
    }
    new IntersectionObserver(function (es) {
      heroGone = !es[0].isIntersecting; updateCta()
    }).observe(hero)
    if (contactSec) new IntersectionObserver(function (es) {
      contactSeen = es[0].isIntersecting; updateCta()
    }).observe(contactSec)
  }

  // ---- Tawk.to live chat, gated behind cookie consent ----
  var TAWK_SRC = 'https://embed.tawk.to/6a326d4916fcef1d436fa2d4/1jraflpo5'
  var chatLoaded = false
  var loadChat = function () {
    if (chatLoaded || !TAWK_SRC) return
    chatLoaded = true
    window.Tawk_API = window.Tawk_API || {}
    window.Tawk_LoadStart = new Date()
    var ts = document.createElement('script')
    ts.async = true; ts.src = TAWK_SRC; ts.charset = 'UTF-8'
    ts.setAttribute('crossorigin', '*')
    document.head.appendChild(ts)
  }

  // ---- cookie consent banner ----
  var cb = document.querySelector('.cookie-banner')
  if (cb) {
    try {
      var consent = localStorage.getItem('cookieConsent')
      if (!consent) {
        setTimeout(function () { cb.classList.add('show') }, 1200)
      } else if (consent === 'full') {
        loadChat()
      }
    } catch (e) { cb.classList.add('show') }
    cb.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-consent]')
      if (!btn) return
      var type = btn.getAttribute('data-consent')
      try { localStorage.setItem('cookieConsent', type) } catch (e) {}
      cb.classList.remove('show')
      if (type === 'full') loadChat()
    })
  }

  // ---- contact form (POST /api/contact -> Resend; mailto fallback) ----
  var cform = document.querySelector('.contact form')
  if (cform) {
    // prefill from URL params (?service=...&budget=...) set by services-page CTAs
    var params = new URLSearchParams(location.search)
    var svc = params.get('service')
    var bud = params.get('budget')
    var svcEl = cform.querySelector('#contact-service')
    var msgEl = cform.querySelector('#contact-message')
    if (svc && svcEl && !svcEl.value) {
      for (var i = 0; i < svcEl.options.length; i++) {
        if (svcEl.options[i].value === svc) { svcEl.value = svc; break }
      }
    }
    if (bud && msgEl && !msgEl.value) {
      msgEl.value = 'Interested in: ' + (svc || 'services') + ' (budget ~' + bud + '). '
    }

    // ---- Turnstile (loads only if a site key is configured) ----
    var turnstileSlot = document.getElementById('turnstile-slot')
    if (turnstileSlot) {
      fetch('/api/turnstile-key')
        .then(function (r) { return r.json() })
        .then(function (data) {
          if (data.sitekey) {
            var s = document.createElement('script')
            s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
            s.async = true; s.defer = true
            document.head.appendChild(s)
            var w = document.createElement('div')
            w.className = 'cf-turnstile'
            w.setAttribute('data-sitekey', data.sitekey)
            w.setAttribute('data-theme', 'light')
            turnstileSlot.appendChild(w)
          }
        })
        .catch(function () {})
    }

    var showMsg = function (text, good, email) {
      var m = cform.querySelector('.form-msg')
      if (!m) {
        m = document.createElement('p')
        m.className = 'form-msg'
        m.setAttribute('role', 'status')
        m.style.cssText = 'margin-top:14px;font-weight:700'
        cform.appendChild(m)
      }
      m.textContent = text
      if (email) {
        m.appendChild(document.createTextNode(' '))
        var a = document.createElement('a')
        a.href = 'mailto:' + email
        a.textContent = email
        a.style.textDecoration = 'underline'
        m.appendChild(a)
      }
      m.style.color = good ? 'var(--teal)' : 'var(--amber-2)'
    }
    var val = function (id) { var el = cform.querySelector('#' + id); return el ? el.value.trim() : '' }

    cform.addEventListener('submit', function (e) {
      e.preventDefault()
      var btn = cform.querySelector('button[type=submit]')
      var orig = btn.textContent
      var hp = cform.querySelector('[name=company]')
      var turnstile = cform.querySelector('[name=cf-turnstile-response]')
      var data = {
        name: val('contact-name'),
        email: val('contact-email'),
        service: val('contact-service'),
        message: val('contact-message'),
        company: hp ? hp.value : '',
        token: turnstile ? turnstile.value : ''
      }
      btn.disabled = true; btn.textContent = 'Sending…'
      fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data)
      })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d } }) })
        .then(function (res) {
          if (res.ok && res.d.ok) {
            cform.reset()
            showMsg('Thanks — message sent. We\'ll be in touch within a few hours.', true)
            btn.disabled = false; btn.textContent = orig
          } else { throw new Error((res.d && res.d.error) || 'failed') }
        })
        .catch(function (err) {
          btn.disabled = false; btn.textContent = orig
          var serverMsg = err && err.message && err.message !== 'failed' ? err.message : ''
          if (serverMsg) {
            showMsg(serverMsg, false)
          } else {
            showMsg('Sorry — couldn\'t send just now. Please try again or email us at', false, 'hello@oadio.com')
          }
        })
    })
  }

  // ---- Stripe checkout buttons (services page) ----
  document.querySelectorAll('[data-sku]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var label = btn.textContent
      var sku = btn.getAttribute('data-sku')
      if (btn.getAttribute('data-annual')) {
        var pr = btn.closest('.prices')
        if (pr && pr.classList.contains('yearly')) sku += '_yr'
      }
      btn.disabled = true; btn.textContent = 'One sec…'
      fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sku: sku })
      })
        .then(function (r) { return r.json() })
        .then(function (d) {
          if (d.url) { window.location.href = d.url }
          else { throw new Error(d.error || 'unavailable') }
        })
        .catch(function () {
          btn.disabled = false; btn.textContent = label
          window.location.href = 'mailto:hello@oadio.com?subject=' +
            encodeURIComponent('Order: ' + btn.getAttribute('data-sku'))
        })
    })
  })

  // ---- checkout return banner ----
  var cs = new URLSearchParams(location.search).get('checkout')
  if (cs === 'success' || cs === 'cancelled') {
    var banner = document.createElement('div')
    banner.setAttribute('role', 'status')
    banner.textContent = cs === 'success'
      ? 'Thanks — your order is confirmed. Check your email for next steps.'
      : 'Checkout cancelled — no charge made. Email hello@oadio.com if you need a hand.'
    banner.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:200;padding:14px 18px;text-align:center;font-family:"Hanken Grotesk",sans-serif;font-weight:700;color:#fff;background:' + (cs === 'success' ? '#1f5e54' : '#a8380f') + ';'
    document.body.appendChild(banner)
    setTimeout(function () { banner.remove() }, 8000)
  }
})()
