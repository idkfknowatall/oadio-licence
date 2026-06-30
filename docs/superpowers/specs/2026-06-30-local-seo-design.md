# Local SEO uplift — design spec

**Date:** 2026-06-30
**Goal:** Rank Oadio for local web-design searches across Bedfordshire + the Herts/Bucks commuter belt + London, and earn rich results (breadcrumbs, FAQ, business knowledge panel) so the site is surfaced/recommended for local intent.

## Decisions (locked)

- **Strategy:** Hybrid — dedicated unique location pages for priority towns + `LocalBusiness`/`areaServed` schema sitewide + a lighter "areas we serve" listing for minor towns.
- **Business model:** Service-area business — **no public street address**. Schema uses `addressRegion: Bedfordshire`, `addressCountry: GB`, and an `areaServed` array of towns. No `geo` pin, no fake reviews/ratings.
- **Coverage:** Bedfordshire + Hertfordshire + Buckinghamshire commuter belt + London.

## Anchor location pages (5, full, unique content)

Clean-URL slugs (served extensionless like `/websites`):

| File | URL | Primary term |
|------|-----|--------------|
| `web-design-luton.html` | `/web-design-luton` | web design Luton |
| `web-design-dunstable.html` | `/web-design-dunstable` | web design Dunstable |
| `web-design-london.html` | `/web-design-london` | web design London |
| `web-design-milton-keynes.html` | `/web-design-milton-keynes` | web design Milton Keynes |
| `web-design-st-albans.html` | `/web-design-st-albans` | web design St Albans |

Each page is **web-design-led** (the term searched locally) with one line linking to the full 5-service range — keeps service balance, no radio over-lean.

### Per-page content contract (must be genuinely unique per town — no template-fill)

1. `<head>`: identical shell to existing pages (same fonts, `css/style.css?v=22`, `css/glass.css?v=4`, icons, robots) — only `<title>`, `<meta name="description">`, `og:title/description/url`, `twitter:title/description`, `<link rel="canonical">` vary.
2. Body sections (reusing existing CSS classes — `section`, `kicker`, `reveal`, `svc-grid`, `svc-card`, `price`, `btn`):
   - **H1** local: e.g. "Web design in Luton that earns its keep."
   - **Local intro lede** — unique paragraph referencing the town/area honestly (no fabricated landmarks, client names, or stats).
   - **Why-us / approach** grid (3 cards) — angled for local businesses (found on Google locally, fixed price, hosted & looked after).
   - **Pricing** — reuse the 3-tier Landing/Business/Ecommerce block from `websites.html` (same `data-sku`, same prices).
   - **Local FAQ** (3–4 Q&A) — town-specific framing (e.g. "Do you meet clients in <town>?", "Can you help my <town> business rank locally?").
   - **Nearby areas** mini-list linking sibling location pages + `/websites`.
   - **CTA** → `/contact?service=website`.
3. JSON-LD `@graph` per page:
   - `ProfessionalService` (subtype of LocalBusiness) — `@id` `#localbusiness`, `name` Oadio, `areaServed` = that town + neighbours, `address` `{@type:PostalAddress, addressRegion:"Bedfordshire", addressCountry:"GB"}`, `priceRange:"££"`, `url`, `email hello@oadio.com`, `telephone` omitted (none).
   - `Service` scoped `areaServed` to the town, `offers` from £99 GBP.
   - `BreadcrumbList`: Home → Websites → <Town>.
   - `FAQPage` mirroring the on-page FAQ (answers must match visible text — Google requirement).

## Sitewide schema upgrade

- `index.html` `@graph`: add a `ProfessionalService`/`LocalBusiness` node alongside the existing `Organization`, with the full `areaServed` town array + `addressRegion`/`addressCountry` (no street) + `priceRange`. Existing `Organization`/`Service`/`OfferCatalog` stay.
- Existing service pages keep their schema; `areaServed:"GB"` retained (national services like radio are genuinely national).

## "Areas we serve" (lighter coverage, no full pages)

- New section on `websites.html` + footer links: a list of served towns — Houghton Regis, Leighton Buzzard, Bedford, Hemel Hempstead, Watford, Aylesbury, Hitchin, Stevenage, Harpenden, Berkhamsted, Flitwick, Ampthill, Biggleswade — anchor towns link to their pages; others are plain text (also present in schema `areaServed`).

## Plumbing

- `sitemap.xml`: add the 5 new URLs, `priority 0.8`, `changefreq monthly`, `lastmod 2026-06-30`. Bump `lastmod` on `index.html`/`websites.html` entries.
- Footer: add an "Areas" column or inline list linking the 5 anchor pages.
- `websites.html`: cross-link to anchor pages from the "areas we serve" block.
- Internal links are reciprocal (each location page links siblings + `/websites`; `/websites` links each).

## Rich-result eligibility delivered

Breadcrumbs, FAQ rich snippet, LocalBusiness/ProfessionalService (knowledge panel). **Excluded on purpose:** Review/AggregateRating (no real reviews — fabricating violates Google guidelines), sitelinks searchbox (no site search).

## Off-site (documented, not code — owner action)

- **Google Business Profile** is the single biggest local-ranking lever and schema does not replace it. Owner to create/claim a GBP as a service-area business (hide address, set service areas = the town list), use `hello@oadio.com`, link `https://oadio.com/`. Bing Places likewise.

## Build mechanism

- Each page authored by **Gemini 3.5** (`antigravity/gemini-3-flash-agent`) via the cligate proxy at `http://localhost:8081` against the per-town contract above.
- **Main thread (Claude) inspects every page** before it lands: head/header/footer match the canonical template (no drift, correct asset versions), body content is unique and factually honest (no hallucinated claims), JSON-LD is valid and FAQ answers match visible text, all internal links resolve.
- A `fusion-coord` board note logs each generation + review verdict.
- Ship via `./deploy.sh` (never bare `wrangler` — leaks `.dev.vars`).

## Out of scope

Paid ads, backlink outreach, blog/content marketing, GBP creation (owner-only), per-town pages for every minor town.
