// GET /api/turnstile-key -> { sitekey } — public key for client-side Turnstile widget.
export async function onRequestGet({ env }) {
  const sitekey = env.TURNSTILE_SITE_KEY || "";
  return new Response(JSON.stringify({ sitekey }), {
    headers: { "content-type": "application/json" },
  });
}
