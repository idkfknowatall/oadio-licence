# OADIO In-Store Radio — Design Spec

**Date:** 2026-06-20
**Status:** Approved (design); pending implementation plan
**Scope:** Sell page only. New product offering on oadio.com. Delivery is manual in AzuraCast — no automation built in this work.

## 1. Overview

Add a new productised offering to OADIO Services: **branded background radio for physical venues** (shops, gyms, cafes, pubs). The hook: a custom royalty-free station that needs **no PPL PRS "TheMusicLicence"**, priced to undercut commercial background-music services.

Positioning: "kill the licence tax" — best converts margin-sensitive venue operators (pub landlords, independent cafes, gyms).

This work delivers the **sales path only**: site section, pricing, Stripe SKUs, FAQ. Each customer's station and promos are built by hand in AzuraCast after purchase.

## 2. Locked decisions

| Decision | Choice |
|---|---|
| Build scope | Sell page only; manual delivery in AzuraCast |
| Base price | £13.99/mo per venue (ex-VAT; 20% UK VAT added at checkout, matching existing plans) |
| Annual | 3 months free → £125.91/yr (9× monthly), matching existing plans |
| Music | Royalty-free / licence-free catalogue OADIO supplies; client needs no PPL PRS for our station |
| Base includes | Branded station, royalty-free music 24/7 on AzuraCast + CDN |
| AI-voice promos | NOT in base — add-on (manual labour can't be carried at £13.99 base) |
| Promo add-on | One-off pack: £49 / up to 6 promos. Optional monthly refresh £19/mo (defer unless wanted now) |

## 3. Pricing / SKUs

`functions/_skus.js` — add:

| SKU | Mode | Price | Notes |
|---|---|---|---|
| `shopradio` | subscription | £13.99/mo | base station |
| `shopradio_yr` | subscription | £125.91/yr | 3 months free |
| `shopradio_promos` | payment | £49 | one-off promo pack (up to 6) |

Real Stripe `price_…` ids generated via the existing reprice script / Stripe dashboard before go-live. `TAX_RATE` already applied site-wide.

(Monthly promo-refresh SKU `shopradio_promos_mo` @ £19/mo — optional, only if user wants it at build time.)

## 4. Page / file changes

- **`index.html`** — new section `#shop-radio` placed under the existing Radio block. Structure: eyebrow, H2, subhead, 4 benefit bullets (one with licence footnote), CTA button → `checkout('shopradio')`. Follow existing section markup/reveal classes.
- **`faq.html`** — add 3 Q&As under a "In-store radio" group (content in §6).
- **`functions/_skus.js`** — 2–3 new SKUs (§3).
- **Nav (optional)** — add "In-Store" anchor link in header/footer nav lists.
- **Checkout** — `functions/api/checkout.js` already resolves SKU→price from `_skus.js`; new SKUs work with no logic change. `js/main.js` CTA wiring mirrors existing buttons.
- **Schema/meta** — extend the page/FAQ JSON-LD to include the new offering (match existing pattern).

## 5. Homepage section copy (final)

> **EYEBROW:** IN-STORE RADIO
> **H2:** Your own radio station. No music-licence fees.
> **SUBHEAD:** Branded background radio for your venue — royalty-free music, 24/7, on our global network. £13.99/month per venue.
>
> **BULLETS:**
> - **No PPL PRS for our station** — we supply a 100% royalty-free catalogue, so playing it needs no TheMusicLicence.*
> - **Cheaper than the big background-music services** — flat £13.99/mo, no per-user meters, no hardware.
> - **Add your own AI presenter** — send your offers, we voice them into the stream (promo add-on).
> - **Run by us** — stream stays online, music curated, nothing for you to manage.
>
> **CTA:** Start your station
>
> _* Footnote near bullet:_ Applies to our station only. If you also play commercial radio, TV, Spotify or live music in your venue, you still need TheMusicLicence for those.

## 6. FAQ content (final)

**Q: Do I need a PPL PRS "TheMusicLicence" to play this?**
A: Not for our station. TheMusicLicence is required when you play commercial music — FM/DAB radio, Spotify, CDs, or live performances. Our station plays only royalty-free music we licence for this purpose, so as long as it's the only music in your venue, you don't need TheMusicLicence to play it. If you also run commercial radio, TV with sound, or live music, those still need their own licence.

**Q: What do I need to play it in my venue?**
A: Just an internet connection, any device with a web browser (an old tablet behind the till, a laptop, a smart-speaker setup), and your existing speakers. We give you a private link — open it and play. No special hardware.

**Q: What's included, and can I cancel?**
A: £13.99/month per venue (ex-VAT) gets you a branded royalty-free station streaming 24/7 on our global network, run and kept online by us. Pay annually and get three months free. Cancel anytime — you keep access to the end of the period you've paid for. Spoken promos in your own AI voice are an optional add-on.

## 7. Legal guardrail (must hold in all copy)

- **Never** state "you'll never pay PPL PRS again" or "this cancels your licence."
- **Only** claim: "no licence needed to play our station."
- Always pair the licence-free claim with the caveat that other commercial music/TV/live performance in the venue still requires TheMusicLicence.
- Footnote in §5 + FAQ in §6 satisfy this.

## 8. Operational prerequisite (not code, but blocks go-live)

A genuinely **licence-exempt / royalty-free catalogue must be sourced** (buyout library or B2B royalty-free service whose terms permit commercial in-venue playout) before any station is delivered. The "no PPL PRS" claim is only true if the catalogue is actually licence-exempt. This is a business task, tracked separately from the page build.

## 9. Acceptance criteria

- [ ] `#shop-radio` section renders on index.html in OADIO style; CTA opens Stripe checkout for `shopradio`.
- [ ] `shopradio`, `shopradio_yr`, `shopradio_promos` exist in `_skus.js` with live Stripe price ids.
- [ ] Checkout completes end-to-end for the monthly SKU (test mode).
- [ ] 3 FAQ entries present, including the honest licence answer; JSON-LD updated.
- [ ] All licence copy obeys §7 guardrail (footnote + caveat present).
- [ ] VAT handled by existing checkout (ex-VAT display, 20% at checkout).

## 10. Out of scope (YAGNI)

- No automation/delivery engine (promo generation, scheduling into AzuraCast).
- No self-serve promo portal.
- No AI music generation.
- No multi-venue/chain billing logic.

## 11. Open items for user

- Confirm promo add-on price (£49 pack) and whether to add monthly refresh SKU (£19/mo) now.
- Provide/confirm royalty-free catalogue source (§8).
