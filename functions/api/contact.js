// POST /api/contact  { name, email, service, message, token, company(honeypot) }  ->  { ok } | { error }
// Sends the enquiry to the site owner via Resend. Key from the RESEND_API_KEY Pages secret.
// Turnstile validation runs only if TURNSTILE_SECRET_KEY is set (graceful until enabled).
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });

export async function onRequestPost({ request, env }) {
  const key = env.RESEND_API_KEY;
  if (!key) return json({ error: "Contact form not configured yet" }, 503);

  let body;
  try { body = await request.json(); } catch { return json({ error: "Bad request" }, 400); }

  const name = String(body.name || "").trim().slice(0, 120);
  const email = String(body.email || "").trim().slice(0, 160);
  const service = String(body.service || "Unspecified").trim().slice(0, 100);
  const message = String(body.message || "").trim().slice(0, 5000);
  const honeypot = String(body.company || "").trim(); // hidden field; only bots fill it

  if (honeypot) return json({ ok: true });            // silently drop bots
  if (!name || !email || !message) return json({ error: "Please fill in every field." }, 422);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "That email address looks off." }, 422);

  if (env.TURNSTILE_SECRET_KEY) {
    const token = String(body.token || "").trim();
    if (!token) return json({ error: "Security check required" }, 422);
    const v = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: `secret=${encodeURIComponent(env.TURNSTILE_SECRET_KEY)}&response=${encodeURIComponent(token)}`,
    });
    const vr = await v.json();
    if (!vr.success) return json({ error: "Security check failed" }, 422);
  }

  const to = env.CONTACT_TO || "topeav@gmail.com";
  const from = env.RESEND_FROM || "Oadio <hello@oadio.com>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      from,
      to,
      reply_to: email,
      subject: `New enquiry from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\nService: ${service}\n\n${message}`,
    }),
  });

  if (!res.ok) return json({ error: "Couldn't send right now. Please try again." }, 502);
  return json({ ok: true });
}
