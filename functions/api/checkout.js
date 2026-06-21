// POST /api/checkout  { sku }  ->  { url }
// Creates a Stripe Checkout Session server-side and returns the hosted URL.
// Secret key comes from the STRIPE_SECRET_KEY Pages secret — never shipped to the client.
import { SKUS, TAX_RATE } from "../_skus.js";

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" },
  });

export async function onRequestPost({ request, env }) {
  const secret = env.STRIPE_SECRET_KEY;
  if (!secret) return json({ error: "Checkout not configured" }, 503);

  // Lightweight per-IP rate limit so this public endpoint can't be scripted to
  // spam Stripe session creation. Graceful — only active when OADIO_KV is bound.
  // For robust protection also add a Cloudflare Rate Limiting rule on this path.
  if (env.OADIO_KV) {
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const rlKey = `rl:checkout:${ip}`;
    const n = Number(await env.OADIO_KV.get(rlKey)) || 0;
    if (n >= 10) return json({ error: "Too many requests — try again shortly." }, 429);
    await env.OADIO_KV.put(rlKey, String(n + 1), { expirationTtl: 60 });
  }

  let sku;
  try {
    ({ sku } = await request.json());
  } catch {
    return json({ error: "Bad request" }, 400);
  }

  const item = SKUS[sku];
  if (!item || !item.price) return json({ error: "Unknown product" }, 404);

  const origin = new URL(request.url).origin;

  // Return a cancelled checkout to the page the buyer came from (e.g. /radio)
  // rather than always dumping them on the home page.
  let cancelPath = "/";
  try {
    const ref = new URL(request.headers.get("Referer") || "");
    if (ref.origin === origin) cancelPath = ref.pathname;
  } catch { /* no/invalid referer — fall back to home */ }

  const form = new URLSearchParams();
  form.set("mode", item.mode); // "subscription" | "payment"
  form.set("line_items[0][price]", item.price);
  form.set("line_items[0][quantity]", "1");
  if (TAX_RATE) form.set("line_items[0][tax_rates][0]", TAX_RATE);
  form.set("billing_address_collection", "required");
  form.set("allow_promotion_codes", "true");
  form.set("success_url", `${origin}/?checkout=success`);
  form.set("cancel_url", `${origin}${cancelPath}?checkout=cancelled`);
  if (item.mode === "payment") form.set("customer_creation", "always");

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: form,
  });
  const session = await res.json();
  if (!res.ok) {
    return json({ error: session.error?.message || "Stripe error" }, 502);
  }
  return json({ url: session.url });
}
