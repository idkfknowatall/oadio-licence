# Oadio — licence-free music for UK venues

Marketing landing site for Oadio: curated, licence-free background music for
cafés, salons, gyms and shops — no PRS/PPL licence required for the library.

## Stack
Static HTML/CSS/JS. No framework, no build step.

```
index.html      landing page
css/style.css   warm analog / editorial theme, responsive, WCAG AA
js/main.js      mobile nav, scroll reveals, sample player
audio/          drop sample-*.mp3 files here (wired in the player)
```

## Run locally
```bash
python3 -m http.server 8080
# http://localhost:8080
```

## TODO before launch
- Add real `audio/sample-*.mp3` files
- Wire the trial form to a backend / Formspree
- Write `privacy.html` and `terms.html`
- Replace placeholder testimonials with real quotes (never ship fabricated reviews)
- Verify the £450.99 TheMusicLicence figure + add Companies House details once registered
