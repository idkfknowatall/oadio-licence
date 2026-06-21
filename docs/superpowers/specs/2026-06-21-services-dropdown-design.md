# Services dropdown + per-service pages — design

Date: 2026-06-21
Status: approved

## Problem

`index.html` is one long scroll: hero, then five full pricing blocks (Radio,
In-store, Websites, Custom builds, Consulting) stacked back to back — "buy after
buy" on the front page. There is no services menu; the nav is five flat anchor
links. Pricing has nowhere else to live.

`js/main.js` already references a "services page" and CTAs that "set" URL params
for a services page, so the architecture already anticipates pricing moving off
home.

## Goal

- Home becomes a simple landing page: hero + a "what we do" overview, no pricing
  blocks.
- A beautiful **Services dropdown** in the shared header.
- Each service gets its own focused page carrying only its packages + buy
  buttons. Dropdown links to those pages.

## Information architecture

Five new standalone pages, one per service. Clean URLs (Cloudflare Pages serves
`faq.html` at `/faq`, so `radio.html` → `/radio`).

| Page | URL | File | Replaces anchor |
|---|---|---|---|
| Radio hosting | `/radio` | `radio.html` | `#radio` |
| In-store radio | `/in-store` | `in-store.html` | `#shop-radio` |
| Websites | `/websites` | `websites.html` | `#web-design` |
| Custom builds | `/builds` | `builds.html` | `#web-dev` |
| Consulting | `/consulting` | `consulting.html` | `#consulting` |

Each page lifts its existing `<section>` content verbatim — copy, `.price`
cards, `data-sku` buttons, `.bill-toggle`, footnote. No pricing/checkout logic
is rewritten.

## Navigation — shared header (every page)

```
oadio        Services ▾   FAQ   [Contact]
```

Services is a disclosure dropdown. Open panel:

```
Radio hosting     from £9.99/mo
In-store radio    from £13.99/mo
Websites          from £149
Custom builds     from £1,200
Consulting        from £45/hr
```

- Markup: `<li class="has-dropdown">` containing
  `<button class="nav-drop-toggle" aria-expanded aria-controls="services-menu">`
  and `<div class="nav-panel" id="services-menu" role="menu">` with five
  `role="menuitem"` anchors (`<span>name</span><b>price</b>`).
- **Desktop:** panel styled as a mini receipt (card bg, dashed border, inner
  hairline, mono type, amber prices right-aligned). Opens on hover AND on
  click/Enter/Space; closes on outside-click, Escape. A transparent bridge
  covers the button→panel gap so hover doesn't drop.
- **Mobile:** inside the existing full-screen overlay nav, the panel renders
  static and inline; tapping Services expands the five links. No nested
  dead-ends.
- Current page's nav item gets `aria-current="page"`.

## Home page (`index.html`)

- **Hero:** kept. Receipt graphic stays (add an In-store line so it's complete).
  Primary CTA `See plans` → `See services` (scrolls to `#services`). `Talk to
  us` stays.
- **"What we do" section** (`#services`): `.svc-grid` of five `.svc-card`s. Each:
  category kicker (teal), Fraunces name, one-line description, mono `from £X`
  price, `See plans →` link to the service page. Hover lift + arrow nudge,
  matching `.price` cards.
- The five pricing `<section>`s are removed from home.

## Service page template

Full unique `<head>` (title, description, `<link rel=canonical>`, OG/Twitter,
JSON-LD: `Service` + `Offer` + `BreadcrumbList`) → shared header (Services item
not specially marked; it's the section) → `<section>` with kicker/h1/lede →
pricing cards (moved) → footnote → "More from Oadio" strip (`.svc-card`s linking
to the other services) → `Talk to us` CTA → shared footer.

## SEO + plumbing

- **index JSON-LD:** keep `Organization` + `WebSite` + `OfferCatalog`; repoint
  each catalog offer `url` from `#anchor` to the new page URL. Full `Service`
  schema for each offer moves onto its own page.
- **sitemap.xml:** add the five new URLs (priority ~0.8, changefreq monthly).
- **Footers (all pages):** Services column links repoint to `/radio`,
  `/in-store`, `/websites`, `/builds`, `/consulting` (list all five).
- **Other pages (faq, contact, privacy, terms, 404):** swap flat nav for the
  Services dropdown; repoint footer.
- **functions/api/checkout.js:** `cancel_url` returns to the originating page via
  same-origin `Referer` (currently hardcodes `/#sku`), so a cancelled checkout
  lands back on the service page.
- **Cache bust:** `css/style.css?v=6` → `?v=7` and `js/main.js?v=6` → `?v=7`
  on every page.

## New code

- **CSS (append to `style.css`):** `.has-dropdown`, `.nav-drop-toggle`,
  `.caret`, `.nav-panel` (+ mobile static variant in the `880px` block);
  `.svc-grid`, `.svc-card`, `.svc-price`, `.svc-link` (+ `1fr` on mobile).
- **JS (append to `main.js`):** dropdown open/close (click toggle, hover via
  CSS, Escape + outside-click close, aria-expanded sync). Existing checkout /
  bill-toggle / reveal / contact code untouched.

## Out of scope

- No change to Stripe SKUs/prices or the checkout/contact backends beyond the
  `cancel_url` referer tweak.
- No redesign of the visual identity — extend the existing system only.

## Quality floor

Responsive to mobile, visible keyboard focus, `prefers-reduced-motion`
respected, dropdown fully keyboard-operable.
