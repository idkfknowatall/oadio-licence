# In-Store Radio Sell Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "In-Store Radio" offering to oadio.com — a £13.99/mo branded royalty-free venue station (no PPL PRS licence needed), sold via the existing Stripe checkout, with an AI-promo add-on. Sales path only; stations delivered by hand in AzuraCast.

**Architecture:** Static Cloudflare Pages site. A new homepage `<section>` with the existing pricing-card + bill-toggle markup drives the existing `data-sku` checkout flow (`js/main.js` → `POST /api/checkout` → Stripe). New SKUs are added to `functions/_skus.js`; FAQ entries and JSON-LD are extended. No new JS or API logic.

**Tech Stack:** HTML/CSS (existing brutalist OADIO theme), vanilla JS (`js/main.js`, unchanged), Cloudflare Pages Functions, Stripe Checkout, Stripe CLI, Node 24 (for verification asserts), Wrangler (local smoke test).

## Global Constraints

- Base price: **£13.99/mo per venue**, ex-VAT (20% UK VAT added at checkout — handled by existing `TAX_RATE` in `_skus.js`, do not add per-price tax).
- Annual: **£125.91/yr** (= 9× monthly, "3 months free"); works out £10.49/mo.
- Promo add-on: **£49 one-off**, up to 6 promos.
- Currency: **GBP**. Amounts in Stripe are in pence (1399 / 12591 / 4900).
- Legal copy guardrail (MUST hold everywhere): only claim *"no licence needed to play our station."* NEVER "you'll never pay PPL PRS again." Always pair with the caveat that commercial radio/TV/Spotify/live music in the venue still need TheMusicLicence.
- Brand voice: honest, plain-English, no jargon. Match existing markup classes exactly (`section`, `kicker cat`, `bill-toggle`, `prices`, `price`, `amount`, `amt-mo`/`amt-yr`, `ticks`, `btn btn-solid`).
- SKU keys: `shopradio`, `shopradio_yr`, `shopradio_promos`. Button wiring is by `data-sku` (+ `data-annual="1"` to auto-append `_yr` when annual is toggled) — no JS edits.
- Spec: `docs/superpowers/specs/2026-06-20-in-store-radio-design.md`.
- Work on branch `feat/in-store-radio` (already checked out).

---

### Task 1: Create Stripe prices + add SKUs to `_skus.js`

**Files:**
- Modify: `functions/_skus.js` (append three SKU entries to the `SKUS` object)
- Test: `/tmp/skus_check.mjs` (throwaway Node assertion)

**Interfaces:**
- Consumes: existing `SKUS` object shape `{ [sku]: { price: "price_…", mode: "subscription"|"payment" } }` and exported `TAX_RATE`.
- Produces: SKU keys `shopradio` (subscription), `shopradio_yr` (subscription), `shopradio_promos` (payment), each with a live Stripe `price_…` id. `functions/api/checkout.js` consumes these unchanged.

- [ ] **Step 1: Create the Stripe products and prices**

Requires the Stripe secret key for the account. Use **test mode first** (`sk_test_…`). Run with the key exported as `STRIPE_API_KEY` or pass `--api-key`:

```bash
# In-Store Radio product + monthly + annual prices
stripe products create --name "OADIO In-Store Radio"
# -> note the prod_… id, then:
stripe prices create --product prod_XXXX --currency gbp --unit-amount 1399 --recurring interval=month --nickname "shopradio monthly"
stripe prices create --product prod_XXXX --currency gbp --unit-amount 12591 --recurring interval=year --nickname "shopradio annual"

# AI Promo Pack product + one-off price
stripe products create --name "OADIO AI Promo Pack"
# -> note the prod_… id, then:
stripe prices create --product prod_YYYY --currency gbp --unit-amount 4900 --nickname "shopradio promo pack"
```

Record the three returned `price_…` ids.

- [ ] **Step 2: Write the failing assertion**

Create `/tmp/skus_check.mjs`:

```js
import { SKUS } from "/home/x/oadio-site/functions/_skus.js";
const want = {
  shopradio: "subscription",
  shopradio_yr: "subscription",
  shopradio_promos: "payment",
};
for (const [k, mode] of Object.entries(want)) {
  const s = SKUS[k];
  if (!s) throw new Error(`missing SKU: ${k}`);
  if (s.mode !== mode) throw new Error(`${k} mode ${s.mode} != ${mode}`);
  if (!/^price_/.test(s.price || "")) throw new Error(`${k} price not a real price_ id: ${s.price}`);
}
console.log("OK: all 3 shop-radio SKUs present with valid price ids");
```

- [ ] **Step 3: Run it to verify it fails**

Run: `node /tmp/skus_check.mjs`
Expected: FAIL — `missing SKU: shopradio` (entries not added yet).

- [ ] **Step 4: Add the SKU entries**

In `functions/_skus.js`, inside the `SKUS = { … }` object, after the existing `consulting_retainer_yr` entry (keep the trailing structure valid), add:

```js
  "shopradio": {
    "price": "price_PASTE_MONTHLY",
    "mode": "subscription"
  },
  "shopradio_yr": {
    "price": "price_PASTE_ANNUAL",
    "mode": "subscription"
  },
  "shopradio_promos": {
    "price": "price_PASTE_PROMO",
    "mode": "payment"
  }
```

Replace the three `price_PASTE_…` placeholders with the real ids from Step 1. (The file header says "generated by reprice script" — adding these by hand is acceptable for this product; if the reprice script is later re-run, fold these in there too.)

- [ ] **Step 5: Run the assertion to verify it passes**

Run: `node /tmp/skus_check.mjs`
Expected: PASS — `OK: all 3 shop-radio SKUs present with valid price ids`

- [ ] **Step 6: Commit**

```bash
git add functions/_skus.js
git commit -m "feat: add In-Store Radio + AI promo pack SKUs"
```

---

### Task 2: Add the `#shop-radio` homepage section (+ nav, meta, schema)

**Files:**
- Modify: `index.html` — insert section after `</section>` of `#radio` (currently line 167, before `#web-design` at line 169); add nav link (after line 71); add footer link (line 312); update meta description (line 7) and JSON-LD description (line 46)
- Test: structural `grep` assertions + Wrangler visual smoke

**Interfaces:**
- Consumes: SKU keys from Task 1 via `data-sku` button attributes; existing CSS classes; existing `js/main.js` checkout handler (unchanged).
- Produces: a `#shop-radio` anchor target used by the nav/footer links.

- [ ] **Step 1: Write the failing structural check**

Run (expect NO output / non-match before the edit):

```bash
grep -c 'id="shop-radio"' index.html
```
Expected: `0`

- [ ] **Step 2: Insert the section**

In `index.html`, immediately after the `</section>` that closes `#radio` (line 167) and before `<section class="section section-warm" id="web-design">` (line 169), insert:

```html
        <section class="section section-warm" id="shop-radio">
            <div style="max-width: var(--maxw); margin: 0 auto; padding: 0 24px;">
                <p class="kicker cat reveal">In-store radio</p>
                <h2 class="reveal d1">Your own radio station. No music-licence fees.</h2>
                <p class="section-lede reveal d2">Branded background radio for your venue — royalty-free music, 24/7, on our global network. Cheaper than the big background-music services, with your own AI presenter on call.</p>

                <div class="bill-toggle reveal d2" role="group" aria-label="Billing period">
                    <button type="button" aria-pressed="true" data-bill="mo">Monthly</button>
                    <button type="button" aria-pressed="false" data-bill="yr">Annual <span class="save">3 months free</span></button>
                </div>

                <div class="prices" style="grid-template-columns:repeat(2,1fr); max-width:760px; margin-left:auto; margin-right:auto;">
                    <article class="price featured reveal d1">
                        <span class="tag">No PPL PRS</span>
                        <h3>In-Store</h3>
                        <p class="amount"><span class="amt-mo">£13.99<span class="per">/mo +VAT</span></span><span class="amt-yr">£125.91<span class="per">/yr +VAT</span></span></p>
                        <p class="amount-alt"><span class="amt-mo">Per venue</span><span class="amt-yr">3 months free · works out £10.49/mo</span></p>
                        <ul class="ticks">
                            <li>Branded station, your name</li>
                            <li>Royalty-free music 24/7</li>
                            <li>No TheMusicLicence for our station*</li>
                            <li>Global CDN · low latency</li>
                            <li>Plays on any browser + your speakers</li>
                            <li>Run &amp; kept online by us</li>
                        </ul>
                        <button class="btn btn-solid" data-sku="shopradio" data-annual="1">Start your station</button>
                    </article>

                    <article class="price reveal d2">
                        <h3>AI Promo Pack</h3>
                        <p class="amount">£49<span class="per"> +VAT</span></p>
                        <p class="amount-alt">One-off · up to 6 promos</p>
                        <ul class="ticks">
                            <li>Your offers, in an AI voice</li>
                            <li>Baked into your stream</li>
                            <li>Up to 6 spots, one voice</li>
                            <li>Weekly refresh or extra voices — just ask</li>
                        </ul>
                        <button class="btn btn-solid" data-sku="shopradio_promos">Add promos</button>
                    </article>
                </div>
                <p class="reveal d3" style="margin-top:26px;font-size:.92rem;line-height:1.6;color:var(--ink-2);max-width:64ch;"><strong>* About licensing:</strong> TheMusicLicence (PPL PRS) is required to play commercial music — FM/DAB radio, Spotify, CDs or live performances. Our station plays only royalty-free music we licence for the job, so you don't need TheMusicLicence to play <em>it</em>. If you also play commercial radio, TV with sound, or live music in your venue, those still need their own licence.</p>
            </div>
        </section>
```

- [ ] **Step 3: Add the nav + footer links**

After `index.html` line 71 (`<li><a href="#radio">Radio</a></li>`) add:

```html
                <li><a href="#shop-radio">In-Store</a></li>
```

In the footer Services block (line 312), after `<p><a href="#radio">Radio hosting</a></p>` add:

```html
<p><a href="#shop-radio">In-store radio</a></p>
```

- [ ] **Step 4: Update meta + schema description**

Replace `index.html` line 7 meta description content with:

```html
    <meta name="description" content="Honest, no-nonsense pricing for radio hosting, in-store venue radio, web design, custom builds and consulting. Get your business online and on air — no hidden costs, no jargon.">
```

Replace the JSON-LD description on line 46 with:

```html
      "description": "Radio hosting, in-store venue radio, web design, custom builds and consulting for growing businesses.",
```

- [ ] **Step 5: Run structural checks to verify they pass**

```bash
grep -c 'id="shop-radio"' index.html          # expect 1
grep -c 'data-sku="shopradio"' index.html       # expect 1
grep -c 'data-sku="shopradio_promos"' index.html # expect 1
grep -c 'href="#shop-radio"' index.html         # expect 2 (nav + footer)
grep -c 'No PPL PRS' index.html                  # expect 1
```
Expected: `1`, `1`, `1`, `2`, `1`.

- [ ] **Step 6: Visual smoke test**

Run: `npx wrangler pages dev . --port 8788` (Ctrl-C when done). Open `http://localhost:8788/#shop-radio`. Confirm: section renders in OADIO style; Monthly/Annual toggle flips the In-Store card price between £13.99/mo and £125.91/yr; the £49 promo card price does NOT change on toggle; licence footnote visible.

- [ ] **Step 7: Commit**

```bash
git add index.html
git commit -m "feat: add In-Store Radio homepage section, nav + meta"
```

---

### Task 3: Add In-Store Radio FAQ group + JSON-LD entries

**Files:**
- Modify: `faq.html` — add a visible `<details>` group after the "Radio hosting" group (line 94, before "Websites" `<h2>` at line 96); add 3 Q&As to the JSON-LD `mainEntity` array (line 40)
- Test: Node `JSON.parse` of the ld+json block + `grep` for the questions

**Interfaces:**
- Consumes: existing FAQ markup pattern (`<h2 class="reveal" style="font-size:1.6rem;margin:50px 0 0;">` + `<div class="faq reveal" …>` with `<details><summary>…</summary><p>…</p></details>`), and the single-line `application/ld+json` FAQPage array.
- Produces: nothing consumed downstream.

- [ ] **Step 1: Write the failing check**

```bash
grep -c "TheMusicLicence" faq.html
```
Expected before edit: `0`.

- [ ] **Step 2: Add the visible FAQ group**

In `faq.html`, after the Radio hosting group's closing `</div>` (line 94) and before `<h2 …>Websites</h2>` (line 96), insert:

```html
                <h2 class="reveal" style="font-size:1.6rem;margin:50px 0 0;">In-store radio</h2>
                <div class="faq reveal" style="margin-left:0;margin-top:14px;">
                    <details>
                        <summary>Do I need a PPL PRS "TheMusicLicence" to play this?</summary>
                        <p>Not for our station. TheMusicLicence is required when you play commercial music — FM/DAB radio, Spotify, CDs, or live performances. Our station plays only royalty-free music we licence for this purpose, so as long as it's the only music in your venue, you don't need TheMusicLicence to play it. If you also run commercial radio, a TV with sound, or live music, those still need their own licence.</p>
                    </details>
                    <details>
                        <summary>What do I need to play it in my venue?</summary>
                        <p>Just an internet connection, any device with a web browser — an old tablet behind the till, a laptop, or a smart-speaker setup — and your existing speakers. We give you a private link: open it and play. No special hardware.</p>
                    </details>
                    <details>
                        <summary>What's included, and can I cancel?</summary>
                        <p>£13.99/month per venue (ex-VAT) gets you a branded royalty-free station streaming 24/7 on our global network, run and kept online by us. Pay annually and get three months free. Cancel anytime — you keep access to the end of the period you've paid for. Spoken promos in your own AI voice are an optional add-on.</p>
                    </details>
                </div>
```

- [ ] **Step 3: Add the JSON-LD entries**

In the `mainEntity` array on line 40, insert these three objects immediately before the closing `]}` (after the last existing question object, comma-separated):

```json
,{"@type":"Question","name":"Do I need a PPL PRS \"TheMusicLicence\" to play Oadio in-store radio?","acceptedAnswer":{"@type":"Answer","text":"Not for our station. TheMusicLicence is required when you play commercial music — FM/DAB radio, Spotify, CDs, or live performances. Our station plays only royalty-free music we licence for this purpose, so as long as it's the only music in your venue, you don't need TheMusicLicence to play it. If you also run commercial radio, a TV with sound, or live music, those still need their own licence."}},{"@type":"Question","name":"What do I need to play in-store radio in my venue?","acceptedAnswer":{"@type":"Answer","text":"Just an internet connection, any device with a web browser — an old tablet behind the till, a laptop, or a smart-speaker setup — and your existing speakers. We give you a private link: open it and play. No special hardware."}},{"@type":"Question","name":"What's included with in-store radio, and can I cancel?","acceptedAnswer":{"@type":"Answer","text":"£13.99/month per venue (ex-VAT) gets you a branded royalty-free station streaming 24/7 on our global network, run and kept online by us. Pay annually and get three months free. Cancel anytime — you keep access to the end of the period you've paid for. Spoken promos in your own AI voice are an optional add-on."}}
```

- [ ] **Step 4: Verify the JSON-LD still parses**

Create `/tmp/ldjson_check.mjs`:

```js
import { readFileSync } from "node:fs";
const html = readFileSync("/home/x/oadio-site/faq.html", "utf8");
const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
if (!m) throw new Error("no ld+json block found");
const data = JSON.parse(m[1].trim());
const n = data.mainEntity.length;
if (n < 20) throw new Error(`expected >=20 questions, got ${n}`);
console.log(`OK: ld+json valid, ${n} questions`);
```

Run: `node /tmp/ldjson_check.mjs`
Expected: PASS — `OK: ld+json valid, 20 questions`

- [ ] **Step 5: Verify the visible questions are present**

```bash
grep -c "TheMusicLicence" faq.html   # expect 2+ (details + ld+json)
grep -c "In-store radio" faq.html     # expect 1+ (group heading)
```
Expected: at least `2` and `1`.

- [ ] **Step 6: Commit**

```bash
git add faq.html
git commit -m "feat: add in-store radio FAQ entries + schema"
```

---

### Task 4: End-to-end smoke + legal-copy review gate

**Files:**
- Modify: `.dev.vars` (local only, gitignored — add `STRIPE_SECRET_KEY` for the smoke test; do NOT commit)
- No source changes; this is the reviewer gate.

**Interfaces:**
- Consumes: everything from Tasks 1–3.

- [ ] **Step 1: Provide the test secret locally**

Confirm `.dev.vars` is gitignored (`grep -n dev.vars .gitignore` → present). Add the line (test-mode key matching the prices created in Task 1):

```
STRIPE_SECRET_KEY=sk_test_XXXX
```

- [ ] **Step 2: Start the local server**

Run: `npx wrangler pages dev . --port 8788` (leave running; new shell for Step 3).

- [ ] **Step 3: Smoke-test checkout for each new SKU**

```bash
for sku in shopradio shopradio_yr shopradio_promos; do
  echo -n "$sku -> "
  curl -s -X POST http://localhost:8788/api/checkout \
    -H 'content-type: application/json' -d "{\"sku\":\"$sku\"}" \
    | head -c 200; echo
done
# negative control:
curl -s -X POST http://localhost:8788/api/checkout -H 'content-type: application/json' -d '{"sku":"bogus"}'
```
Expected: each real SKU returns `{"url":"https://checkout.stripe.com/…"}`; `bogus` returns `{"error":"Unknown product"}` (404). Open one `url` in a browser and confirm the Stripe checkout shows the right product, GBP amount, and that 20% VAT is added.

- [ ] **Step 4: Legal-copy review (manual gate)**

Re-read the new copy in `index.html` and `faq.html`. Confirm the Global-Constraints guardrail holds: NO "never pay PPL PRS again" style claim anywhere; every licence-free claim is scoped to "our station" and paired with the commercial-music/TV/live caveat. Fix inline if any claim overreaches, then re-commit that file.

- [ ] **Step 5: Final commit (if any guardrail fixes were made)**

```bash
git add -A
git commit -m "fix: tighten in-store radio licence copy"
```

---

## Go-live prerequisites (outside this plan — business tasks)

1. **Royalty-free catalogue** must be genuinely licence-exempt for commercial in-venue playout before delivering any station (spec §8). The "no PPL PRS" claim is only true if the catalogue terms allow it.
2. Re-create the Stripe prices in **live mode** and swap the live `price_…` ids into `_skus.js` before deploy.
3. Deploy via `./deploy.sh` (NOT bare `wrangler pages deploy` — it would leak `.dev.vars`).

## Self-Review

- **Spec coverage:** §1 product → Task 2 copy. §2 decisions → Global Constraints + all tasks. §3 SKUs → Task 1. §4 page/file changes → Tasks 2–3 (index, faq, _skus, nav, schema). §5 copy → Task 2 Step 2. §6 FAQ → Task 3. §7 legal guardrail → Global Constraints + Task 4 Step 4. §8 catalogue prerequisite → Go-live §1. §9 acceptance criteria → Tasks 1–4 verification steps. §10 out-of-scope → not built. §11 open items → resolved (promo £49 / monthly SKU deferred). No gaps.
- **Placeholder scan:** Only intentional `price_PASTE_…` / `sk_test_XXXX` / `prod_XXXX` tokens, each with explicit "replace with real id" instructions — these are credential slots, not unfinished plan steps. No "TBD/handle edge cases/similar to Task N".
- **Type consistency:** SKU keys `shopradio` / `shopradio_yr` / `shopradio_promos` and `data-sku` values match across Tasks 1–4; `data-annual="1"` + `.yearly` toggle behaviour matches `js/main.js`; modes (`subscription`/`payment`) consistent with `checkout.js`.
