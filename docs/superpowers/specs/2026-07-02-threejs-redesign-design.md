# three.js site redesign — design spec

**Date:** 2026-07-02
**Goal:** Redesign oadio.com as a modern, scroll-driven three.js experience (style/technique reference: `/home/x/Projects/form-3d`), replacing the current dark "Liquid Glass" re-skin as the production look. Every page gets a real 3D presence. Ship without regressing the WCAG AA pass, the local-SEO uplift, or the live conversion funnel (contact/checkout/Turnstile Functions).

## Decisions (locked)

- **Scope:** all 16 HTML pages get a full scroll-driven three.js narrative, including funnel-adjacent pages (contact, and every page carrying a Stripe checkout button) and local landing pages — confirmed explicitly by user after risk was flagged once.
- **Build tooling: no-build.** three r185 + GSAP + Lenis loaded via `<script type="importmap">` CDN ESM — the form-3d technique without form-3d's Vite step. `wrangler.toml` (`pages_build_output_dir = "."`) and `deploy.sh` stay exactly as they are; this remains a static-file Cloudflare Pages deploy.
- **Glass re-skin is retired**, same as it retired cream `style.css` before it: `css/glass.css` / `js/glass.js` and the light/dark toggle are removed. One deliberate dark 3D aesthetic, no light variant.
- **Brand identity is not being redesigned** — name, logo mark (circular dial icon), color identity (`--amber:#d9531c`, `--gold:#e0a23a`, `--teal:#1f5e54`), and the 5-service copy balance ([[oadio-brand-copy-balance]] memory) all carry over. Only the visual/technical medium changes.
- **Content stays in crawlable HTML, always.** three.js is a progressive-enhancement layer over the DOM, never the thing that renders text/links/schema. Protects the local-SEO work ([[2026-06-30-local-seo-design]]).
- **Funnel is untouched at the data layer.** `functions/api/*.js`, form fields, Turnstile embed, Stripe links — logic and markup survive; only presentation changes.

## Phase roadmap

Each phase is its own spec → plan → implementation cycle. This document details Phase 1 only; phases 2–5 get a paragraph each now and a full spec when their turn comes.

1. **Foundation + Homepage** (detailed below) — the no-build three.js harness, shared modules, fallback strategy, and `index.html`'s full narrative. Defines the visual language (typography, color-in-3D, material, motion grammar) every later phase reuses.
2. **Core service pages** — `radio.html`, `in-store.html`, `consulting.html`, `builds.html`, `websites.html`, `faq.html` (6 pages). Each gets its own scroll narrative built on Phase 1's shared dial-mark object and page-shell system. Note: there is no separate checkout page — `functions/api/checkout.js` returns a Stripe-hosted Checkout URL that buy buttons on these (and the local landing) pages redirect to. Those buy buttons ship as ordinary DOM elements in this phase; the redirect target itself (Stripe's hosted page) is out of scope.
3. **Funnel pages** — `contact.html` (1 page). Same shared system; extra care that the form/Turnstile embed remains fully usable at every scroll position and under reduced motion.
4. **Local landing pages** — `web-design-{dunstable,london,luton,milton-keynes,st-albans}.html` (5 pages). One shared 3D template/choreography, per-town copy swapped in, `LocalBusiness`/`FAQPage` schema untouched, buy buttons handled as in Phase 2.
5. **Legal/utility** — `privacy.html`, `terms.html`, `404.html` (3 pages). Recommendation carried into that phase's spec: `privacy`/`terms` keep normal linear document scroll (no Lenis hijack, no scrub choreography) since long-form legal text needs to stay readable/searchable-in-page — they still get the shared nav, palette, and a single static 3D hero moment. `404.html` gets one self-contained (non-scrolling) 3D moment, not a multi-panel story.

## Phase 1 design

### Stack

- **three.js r185**, `FontLoader`/`ExtrudeGeometry`/`RoomEnvironment`/`PMREMGenerator` — same primitives form-3d uses.
- **GSAP + ScrollTrigger** for the scrub timeline; **Lenis** for smooth scroll.
- Loaded via native `<script type="importmap">` pointing at a CDN (jsDelivr/esm.sh) ESM build of each package, pinned to exact versions. No bundler, no `node_modules` in the deploy path.
- **Font pipeline:** one-time offline conversion script (`opentype.js`, modeled on form-3d's `tools/convert-font.mjs`) turns the chosen display face into three.js typeface JSON. Output is committed to `fonts/` at the repo root (sibling to existing `css/`, `js/`); nothing runs this at request time or deploy time.

### Typography / material for the 3D wordmark

- Try **Fraunces Black (900)** first for the extruded "OADIO" wordmark — it's the brand's existing display face, and opentype.js conversion doesn't care about weight. Validate bevel/extrude quality at build time (thin serif tips can self-intersect); if it doesn't hold up, fall back to a bold geometric companion face used only for this one 3D asset, body/heading type elsewhere is unaffected either way.
- Material: `MeshPhysicalMaterial`, light ink base color, amber/gold used as key/rim light colors (not baked into the material itself) so the same geometry can be lit differently per page/beat — mirrors form-3d's `key`/`rim` two-light rig, but with oadio's palette instead of blueprint-navy/yellow.
- Ground/background: dark neutral (near the current `--ink:#20180f` family, not pure black) so amber/gold/teal read as accent light rather than clashing with a colder navy like form-3d's `#0d1b2e`.

### Shared 3D asset strategy

- **Homepage-only, one-time build:** extrude the literal "OADIO" wordmark. This is the flagship asset — highest fidelity, most animation budget.
- **Every other page (Phases 2–5), shared asset:** the existing circular dial/knob brand-mark, modeled as real extruded/beveled geometry once, reused across all 17 remaining pages. Each page only supplies its own GSAP choreography (rotation/position/scatter targets) and copy — not a new mesh. This is what keeps Phases 2–4 cheap relative to 15 unique word-extrusions.
- Both assets share one `scene.js`-equivalent module (camera/lighting/renderer/responsive-layout setup), parameterized by which object it loads — mirrors form-3d's `createScene(canvas)` shape.

### Homepage narrative (4 beats, mapped to existing sections)

Reuses `index.html`'s current structure — no new sections invented, no copy rewritten beyond what the visual reflow requires:

| Beat | Existing section | 3D behavior |
|------|------------------|-------------|
| fig.00 | Hero (`eyebrow`/`h1`/`lede`/CTAs + receipt calculator) | Wordmark whole, camera close, resting pose |
| fig.01 | Services grid (5 cards) | Wordmark fractures into pieces as the 5 service cards scroll in — cards remain real HTML in a column beside/below the canvas |
| fig.02 | "Why Oadio" booth (stats + ticker) | Pieces reassemble into the whole wordmark — visual payoff for "5 services, one supplier" landing exactly where the copy already makes that claim |
| fig.03 | CTA band + footer | Wordmark settles front-facing, final CTA |

This reuses form-3d's fracture→reassemble technique but gives it meaning specific to oadio's pitch, and only touches the "one supplier" message at the same three spots [[oadio-brand-copy-balance]] already sanctions (hero, receipt, why-section) — no new repetition of that line.

### DOM / non-3D layer

- Nav, receipt calculator (checkbox → running total), forms, footer stay real DOM — layered over the fixed canvas exactly like form-3d's `.panel` (`pointer-events: none` on the panel, `pointer-events: auto` on interactive children).
- Canvas is `position: fixed; inset: 0; z-index: 0`; content sits at `z-index: 1+`, same layering form-3d already proves out.
- No content, link, price, or schema exists only inside WebGL. Crawlers and screen readers see the same DOM as always minus glass.css's visual layer.

### Accessibility / fallback (stricter than form-3d's baseline)

- `prefers-reduced-motion: reduce` → **Lenis disabled** (native scroll) **and** the GSAP scrub timeline's continuous rotation/scatter is replaced with simple opacity/scale cross-fades keyed to `IntersectionObserver`, not continuous scroll-position scrubbing. (form-3d only zeroes Lenis's duration; that still lets the object spin continuously off scroll input, which is not full compliance.)
- **No-WebGL / save-data / small-viewport-and-reduced-motion-combined heuristic** → three.js module is never imported (capability check runs before the dynamic `import()`, not after). Fallback renders a static poster image per page in plain CSS, canvas element is never created.
- Focus order, skip-link, and `:focus-visible` treatment carry over from the current WCAG AA pass; new interactive 3D-adjacent controls (if any, e.g. a scroll-progress readout) get the same focus treatment as form-3d's `.nav-readout`.

### What's out of scope for this spec

- Phases 2–5 page content/choreography — roadmap only, above.
- Any change to `functions/api/*`, Stripe/Turnstile config, KV bindings, or `deploy.sh`.
- Brand rename, logo redesign, copy rewrite, or pricing changes.
