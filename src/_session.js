// Signed cookie session (HMAC-SHA256 via WebCrypto — Workers have no node:crypto)
const enc = new TextEncoder();
const b64 = s => btoa(String.fromCharCode(...enc.encode(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64 = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0)));

async function sign(data, secret) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function makeSession(user, secret) {
  const data = b64(JSON.stringify({ id: user.id, name: user.global_name || user.username, exp: Date.now() + 90 * 864e5 }));
  return `${data}.${await sign(data, secret)}`;
}

export async function readSession(request, secret) {
  const m = (request.headers.get("cookie") || "").match(/(?:^|;\s*)idledepths=([^;]+)/);
  if (!m) return null;
  const [data, sig] = m[1].split(".");
  if (!data || !sig || (await sign(data, secret)) !== sig) return null;
  try { const s = JSON.parse(unb64(data)); return s.exp > Date.now() ? s : null; } catch { return null; }
}

export const cookieHeader = value =>
  `idledepths=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${value ? 90 * 86400 : 0}`;

export const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...headers } });
