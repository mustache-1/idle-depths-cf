// Cold Call Cove: the caller's brain. POST /api/scam/talk takes one line from the player and
// returns one line from a fictional townsperson. With an ANTHROPIC_API_KEY secret and a
// logged-in player the line comes from Claude; otherwise a scripted fallback answers, so the
// game always works. The persona prompt lives here, never in the page.
import { json } from "./_session.js";
import { CALLERS, PRODUCTS, TONES, TURNS } from "../public/scam/callers.js";

const MODEL = "claude-haiku-4-5-20251001";
const rate = new Map();   // per-isolate, best effort: id -> { n, minute }
const DAILY = 400;
const allowed = id => {
  const now = Date.now(), minute = Math.floor(now / 60000), day = Math.floor(now / 864e5);
  const r = rate.get(id) || { n: 0, minute, day, d: 0 };
  if (r.day !== day) { r.day = day; r.d = 0; }
  if (r.minute !== minute) { r.minute = minute; r.n = 0; }
  r.n++; r.d++; rate.set(id, r);
  if (rate.size > 5000) rate.clear();
  return r.n <= 14 && r.d <= DAILY;
};

const clip = (s, n) => String(s == null ? "" : s).replace(/[\u0000-\u001f]/g, " ").slice(0, n);

function systemPrompt(c, prod) {
  return `You are ${c.name}, a ${c.job} in Cold Call Cove, a fictional comedy town in a video game. A cold-call salesperson from "Bilge & Sons Debt Relief" has phoned you. They are pitching "${prod.name}" (${prod.pitch}), listed at ${prod.price} doubloons. Doubloons are the game's pretend money.

Your character: ${c.bio} You have ${c.purse} doubloons you could spend. You respond well to ${c.weak} and badly to ${c.hates}.

Rules:
- Stay in character. Be funny and brief: one to three short sentences.
- Everything is fiction. Use only made-up names and places. Never mention real brands, real people, real money, real accounts, passwords or card numbers. If the salesperson asks for real personal information, play confused and make a joke.
- You are not easily won over. Trust starts low and rises only if the pitch actually fits you. Silly or vague pitches can still delight you if that suits your character.
- You may agree to buy only when you have genuinely warmed up. Never pay more than your purse. You may haggle.
- If you are annoyed or bored, you may hang up.
- Reply with ONLY a JSON object, no other text: {"say": "<what you say>", "trust_delta": <integer -15 to 15>, "deal": <null or the doubloon amount you agree to pay>, "hangup": <true or false>}`;
}

function aiMessages(c, history, text, tone, trust) {
  const msgs = [
    { role: "user", content: "(The call connects. Greet the salesperson in character.)" },
    { role: "assistant", content: JSON.stringify({ say: c.greet, trust_delta: 0, deal: null, hangup: false }) },
  ];
  for (const h of history) {
    if (h.r === "p") msgs.push({ role: "user", content: clip(h.t, 300) });
    else msgs.push({ role: "assistant", content: JSON.stringify({ say: clip(h.t, 300), trust_delta: 0, deal: null, hangup: false }) });
  }
  // two user turns in a row would be rejected, so the opening line may need to follow the greeting
  msgs.push({ role: "user", content: `[tone: ${tone}] ${clip(text, 300)}\n(Your current trust in this salesperson: ${trust}/100.)` });
  const out = [];
  for (const m of msgs) { const last = out[out.length - 1]; if (last && last.role === m.role) last.content += "\n" + m.content; else out.push(m); }
  return out;
}

async function askClaude(env, c, prod, history, text, tone, trust) {
  const r = await fetch((env.ANTHROPIC_BASE || "https://api.anthropic.com") + "/v1/messages", {
    method: "POST",
    headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: 220, temperature: 1, system: systemPrompt(c, prod), messages: aiMessages(c, history, text, tone, trust) }),
  });
  if (!r.ok) throw new Error("ai " + r.status);
  const j = await r.json();
  const raw = (j.content || []).map(b => b.text || "").join("");
  const a = raw.indexOf("{"), b = raw.lastIndexOf("}");
  let o = null; try { o = JSON.parse(raw.slice(a, b + 1)); } catch {}
  if (!o || typeof o.say !== "string") o = { say: raw.trim().slice(0, 240) || "...", trust_delta: 0, deal: null, hangup: false };
  return o;
}

// no key, no login, or the API failed: answer from the script
function scripted(c, prod, text, tone, trust, turn) {
  let d = 0; const t = text.toLowerCase();
  if (tone === c.weak) d += 12; else if (tone === c.hates) d -= 14; else d += 2;
  if (/please|thank|sorry/.test(t)) d += 2;
  if (/guarantee|limited|exclusive|secret|sale|discount|free/.test(t)) d += 2;
  if (text.trim().length < 8) d -= 3;
  if (/!!!|now now now/.test(t)) d -= 2;
  d += Math.floor(Math.random() * 5) - 2;
  const nt = Math.max(0, Math.min(100, trust + d));
  let deal = null, say = c.lines[Math.floor(Math.random() * c.lines.length)], hangup = false;
  if (nt >= 62 && (turn >= 2)) { deal = Math.min(c.purse, Math.round(prod.price * (0.8 + Math.random() * 0.5))); say = `Oh, all right. ${deal} doubloons. Don't make me regret it.`; }
  else if (nt <= 0 || (d < -8 && trust < 12)) { hangup = true; say = "That's quite enough. *click*"; }
  else if (d >= 8) say = "Hm. You may have something there. Keep talking.";
  else if (d <= -8) say = "I don't like your tone, young one.";
  return { say, trust_delta: d, deal, hangup };
}

export async function handleScam(request, env, s) {
  if (request.method !== "POST") return json({ error: "POST only" }, 405);
  const b = await request.json().catch(() => null);
  const c = b && CALLERS[b.caller], prod = b && PRODUCTS[b.product];
  if (!c || !prod || typeof b.text !== "string" || !TONES.includes(b.tone)) return json({ error: "bad call" }, 400);
  const turn = Math.max(0, Math.min(TURNS, Math.floor(Number(b.turn) || 0)));
  const trust = Math.max(0, Math.min(100, Math.floor(Number(b.trust) || 0)));
  const text = clip(b.text, 300);
  const history = (Array.isArray(b.history) ? b.history : []).slice(-12).filter(h => h && (h.r === "p" || h.r === "c") && typeof h.t === "string");
  let mode = "script", o;
  if (env.ANTHROPIC_API_KEY && s && env.SCAM_AI !== "off" && allowed(s.id)) {
    try { o = await askClaude(env, c, prod, history, text, b.tone, trust); mode = "ai"; } catch { o = null; }
  }
  if (!o) o = scripted(c, prod, text, b.tone, trust, turn);
  let deal = Number(o.deal); deal = Number.isFinite(deal) && deal > 0 ? Math.min(c.purse, Math.round(deal)) : null;
  const delta = Math.max(-15, Math.min(15, Math.round(Number(o.trust_delta) || 0)));
  if (deal && trust + delta < 55) deal = null;            // a deal has to be earned, not asked for
  return json({ say: clip(o.say, 300), trust_delta: delta, deal, hangup: !!o.hangup && !deal, mode });
}
