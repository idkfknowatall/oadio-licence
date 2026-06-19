// Stripe webhook — verifies signature, emails customer on checkout.session.completed.
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });

const ctEqual = (a, b) => {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
};

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

  // replay protection: reject signatures older than 5 minutes
  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(pairs.t));
  if (isNaN(age) || age > 300) return json({ error: "Stale signature" }, 400);

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(`${pairs.t}.${body}`));
  const hex = Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("");

  if (!v1s.some((v) => ctEqual(hex, v))) return json({ error: "Invalid signature" }, 400);

  let event;
  try { event = JSON.parse(body); } catch { return json({ error: "Invalid JSON" }, 400); }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    if (env.STRIPE_SECRET_KEY && env.RESEND_API_KEY) {
      try {
        const sreq = await fetch(`https://api.stripe.com/v1/checkout/sessions/${session.id}`, {
          headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
        });
        const sdata = await sreq.json();
        const customerEmail = (sdata.customer_details && sdata.customer_details.email) || sdata.customer_email;
        if (customerEmail) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
            body: JSON.stringify({
              from: env.RESEND_FROM || "Oadio <hello@oadio.com>",
              to: customerEmail,
              subject: "Welcome to Oadio",
              text: "Thanks for your order — this confirms your purchase. We'll be in touch very shortly with the next steps to get you set up.",
            }),
          });
        }
      } catch (e) {
        console.error("webhook fulfilment failed:", e && e.message);
      }
    }
  }

  return json({ received: true });
}
