// Stripe webhook — verifies signature, fulfils checkout.session.completed.
// Emails the customer (welcome), notifies the owner of the sale, and alerts the
// owner if fulfilment fails so a paid order is never silently lost.
// Idempotency + replay protection use the OADIO_KV binding when present (graceful
// without it). Always returns 200 on handled events so Stripe doesn't retry-storm.
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });

const ctEqual = (a, b) => {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
};

// Best-effort internal alert to the site owner via Resend.
const notifyOwner = (env, subject, text) =>
  fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: env.RESEND_FROM || "Oadio <hello@oadio.com>",
      to: env.CONTACT_TO || "topeav@gmail.com",
      subject,
      text,
    }),
  });

export async function onRequestPost({ request, env }) {
  const secret = env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return json({ error: "Webhook not configured" }, 503);

  const sig = request.headers.get("stripe-signature") || "";
  const body = await request.text();

  const pairs = {};
  const v1s = [];
  sig.split(",").forEach((pair) => {
    const idx = pair.indexOf("=");
    if (idx < 0) return;
    const k = pair.slice(0, idx).trim();
    const v = pair.slice(idx + 1).trim();
    if (k === "v1") v1s.push(v);
    else pairs[k] = v;
  });

  if (!pairs.t || v1s.length === 0) return json({ error: "Invalid signature" }, 400);

  // replay protection: reject signatures older than 5 minutes. One-sided — a
  // small future skew (clock drift) is tolerated, far-future timestamps are not.
  const age = Math.floor(Date.now() / 1000) - Number(pairs.t);
  if (isNaN(age) || age > 300 || age < -30) return json({ error: "Stale signature" }, 400);

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(`${pairs.t}.${body}`));
  const hex = Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("");

  if (!v1s.some((v) => ctEqual(hex, v))) return json({ error: "Invalid signature" }, 400);

  let event;
  try { event = JSON.parse(body); } catch { return json({ error: "Invalid JSON" }, 400); }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    // Idempotency: Stripe guarantees at-least-once delivery, so the same event
    // can arrive more than once. Skip if we've already handled this event id.
    // Mark-before-process so a retry can't re-send the welcome email.
    if (env.OADIO_KV) {
      if (await env.OADIO_KV.get(`evt:${event.id}`)) return json({ received: true });
      await env.OADIO_KV.put(`evt:${event.id}`, "1", { expirationTtl: 259200 }); // 3 days
    }

    if (env.STRIPE_SECRET_KEY && env.RESEND_API_KEY) {
      try {
        const sreq = await fetch(`https://api.stripe.com/v1/checkout/sessions/${session.id}`, {
          headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
        });
        const sdata = await sreq.json();
        const customerEmail = (sdata.customer_details && sdata.customer_details.email) || sdata.customer_email;
        const amount = sdata.amount_total != null
          ? `${(sdata.amount_total / 100).toFixed(2)} ${(sdata.currency || "").toUpperCase()}`
          : "unknown";

        if (customerEmail) {
          const cres = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
            body: JSON.stringify({
              from: env.RESEND_FROM || "Oadio <hello@oadio.com>",
              to: customerEmail,
              subject: "Welcome to Oadio",
              text: "Thanks for your order — this confirms your purchase. We'll be in touch very shortly with the next steps to get you set up.",
            }),
          });
          if (!cres.ok) throw new Error(`welcome email rejected (${cres.status})`);
        }

        // Notify the owner that a sale happened.
        await notifyOwner(env, "New Oadio sale", `Order: ${session.id}\nCustomer: ${customerEmail || "unknown"}\nAmount: ${amount}`);
      } catch (e) {
        console.error("webhook fulfilment failed:", e && e.message);
        // Alert the owner so a paid-but-not-fulfilled order is never silently lost.
        try {
          await notifyOwner(env, "⚠ Oadio fulfilment FAILED", `Event: ${event.id}\nSession: ${session && session.id}\nError: ${e && e.message}\n\nThe customer has paid — follow up manually.`);
        } catch (_) { /* nothing more we can do */ }
      }
    }
  }

  return json({ received: true });
}
