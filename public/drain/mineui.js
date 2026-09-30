// The Drain, tycoon mode: the controls. Owns the mine state, runs the simulation, draws the
// overlay buttons on top of the canvas, and saves.
import * as M from "./mine.js";
import { MineView, TOP, LV0, LVH, levelY, totalH, W } from "./minescene.js";
import { Sfx } from "./scene.js";

const $ = id => document.getElementById(id);
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const money = n => "$" + M.fmt(n);

export function initMine({ api, getMe }) {
  let st = M.newState(), rt = M.makeRT(st), view, mode = 1, dirty = false, lastTick = Date.now(), lastSave = 0, shown = true, s = 1;
  let rows = [], ctl = {}, builtFor = 0, lastCoin = 0;
  const scroller = $("mScroll"), content = $("mContent"), ui = $("mUI"), cv = $("mCv");
  view = new MineView(cv);
  const toast = (m) => { const t = $("mToast"); t.textContent = m; t.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("on"), 2600); };
  const GUEST = "drain_mine_guest";
  const read = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };

  // ---- load and offline earnings ----
  async function load() {
    let saved = null, away = 0;
    const me = getMe();
    if (me) { try { const r = await api("mine"); saved = r.mine; away = Math.max(0, (r.now - r.at) / 1000); } catch {} }
    else { const g = read(GUEST); if (g) { saved = g.st; away = Math.max(0, (Date.now() - g.at) / 1000); } }
    if (saved && M.validState(saved)) { st = saved; if (st.odCharges == null) { st.odCharges = 1; st.odAt = Date.now(); } }
    rt = M.makeRT(st);
    if (saved && away > 30) offline(away, true);
    build(); refresh(); resize();
    if (!saved) toast("Tap a shaft, the elevator and the warehouse to move ore. Hire foremen to automate.");
  }
  function offline(secs, fromLoad) {
    secs = Math.min(secs, 36000);
    const gain = M.steady(st) * secs * 0.75;
    if (gain <= 0) { if (fromLoad && secs > 600) toast("Your foremen weren't hired yet, so the mine sat idle."); return; }
    st.cash += gain; st.lifetime += gain; st.lifeAll += gain; dirty = true;
    const m = $("mWelcome"); m.innerHTML = "";
    m.append(el("h3", "", "Welcome back"), el("p", "note", `The mine ran for ${secs >= 3600 ? (secs / 3600).toFixed(1) + " hours" : Math.round(secs / 60) + " minutes"} while you were away.`), el("b", "big", "+" + money(gain)));
    const b = el("button", "primary", "Collect"); b.onclick = () => m.classList.remove("on"); m.append(b); m.classList.add("on");
  }

  // ---- save ----
  async function save(force) {
    const now = Date.now();
    if (!dirty && !force) return; if (now - lastSave < 40000 && !force) return; lastSave = now; dirty = false;
    st.t = now;
    const me = getMe();
    if (!me) { try { localStorage.setItem(GUEST, JSON.stringify({ st, at: now })); } catch {} return; }
    try { await fetch("/api/drain/mine/save", { method: "POST", keepalive: true, headers: { "content-type": "application/json" }, body: JSON.stringify({ st }) }).then(async r => {
      if (r.ok) return; const j = await r.json().catch(() => ({}));
      if (j.mine) { st = j.mine; rt = M.makeRT(st); build(); toast(j.error || "Save rejected. Mine restored."); } else toast(j.error || "Couldn't save.");
    }); } catch {}
  }
  document.addEventListener("visibilitychange", () => { if (document.hidden) save(true); else { const away = (Date.now() - lastTick) / 1000; if (away > 10) offline(away, false); lastTick = Date.now(); } });
  window.addEventListener("pagehide", () => save(true));

  // ---- actions ----
  const cfgOf = (kind, i) => kind === "lv" ? st.levels[i] : kind === "el" ? st.elev : st.wh;
  const buyN = (kind, i) => { const L = cfgOf(kind, i).L; if (mode === "max") { const n = M.maxBuy(kind, i, L, st.cash); return Math.max(1, n); } return mode; };
  function upgrade(kind, i) {
    const cfg = cfgOf(kind, i), n = buyN(kind, i), cost = M.upCost(kind, i, cfg.L, n);
    if (st.cash < cost) return; st.cash -= cost; const was = M.ms(cfg.L); cfg.L += n; dirty = true; Sfx.init(); Sfx.click();
    if (M.ms(cfg.L) > was) { Sfx.coin(); toast(`${kind === "lv" ? "Shaft " + (i + 1) : kind === "el" ? "Elevator" : "Warehouse"} milestone: output doubled!`); }
    refresh();
  }
  function hire(kind, i) {
    const cfg = cfgOf(kind, i), t = cfg.mgr + 1; if (t > 3) return; const cost = M.foreCost(kind, i, t);
    if (st.cash < cost) return; st.cash -= cost; cfg.mgr = t; dirty = true; Sfx.init(); Sfx.coin(); refresh();
  }
  function unlock() {
    const n = st.levels.length, cost = M.unlockCost(n); if (n >= M.MAX_LV || st.cash < cost) return;
    st.cash -= cost; st.levels.push({ L: 1, mgr: 0 }); M.ensureRT(st, rt); dirty = true; Sfx.init(); Sfx.coin(); build(); refresh();
  }
  function tap(kind, i) {
    Sfx.init();
    if (kind === "lv") { const r = rt.lv[i]; if (!r.run) r.run = true; }
    else if (kind === "el") { if (rt.el.state === "idle") rt.el.run = true; }
    else if (rt.wh.state === "idle") rt.wh.run = true;
  }

  // ---- overlay ----
  function mkBtn(cls, fn) { const b = el("button", cls); b.onclick = fn; return b; }
  function row(top, h) { const d = el("div", "mrow"); d.style.top = top + "px"; d.style.height = h + "px"; ui.append(d); return d; }
  function tapZone(x, y, w, h, kind, i) { const d = el("div", "mtap"); d.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px`; d.onpointerdown = () => tap(kind, i); ui.append(d); }
  function build() {
    ui.innerHTML = ""; rows = []; ctl = {}; builtFor = st.levels.length;
    const n = st.levels.length;
    content.style.height = totalH(n) * s + "px"; ui.style.setProperty("--s", s);
    // elevator and warehouse control strip
    for (const [kind, label, top] of [["el", "Elevator", TOP + 6], ["wh", "Warehouse", TOP + 60]]) {
      const r = row(top, 46); r.classList.add("ctl");
      const info = el("div", "minfo"); const t = el("b", "", label); const sub = el("small");
      info.append(t, sub);
      const f = mkBtn("mfore", () => hire(kind, 0)), u = mkBtn("mup", () => upgrade(kind, 0));
      r.append(info, f, u); ctl[kind] = { t, sub, f, u };
    }
    tapZone(14, 36, 56, TOP - 36 + 4, "el", 0); tapZone(76, 34, 126, TOP - 34 - 4, "wh", 0);
    for (let i = 0; i < n; i++) {
      const y = levelY(i);
      tapZone(100, y + 36, 296, 40, "lv", i);
      const r = row(y + 7, 26); r.classList.add("lvr");
      const info = el("div", "minfo"); const t = el("b", "", "Shaft " + (i + 1)), sub = el("small");
      info.append(t, sub); const f = mkBtn("mfore", () => hire("lv", i)), u = mkBtn("mup", () => upgrade("lv", i));
      r.append(info, f, u); rows.push({ t, sub, f, u });
    }
    if (n < M.MAX_LV) {
      const y = levelY(n), b = mkBtn("munlock", unlock); b.style.top = y + 22 + "px"; b.style.left = "96px"; ui.append(b); ctl.unlock = b;
    } else ctl.unlock = null;
  }
  function setBtn(b, label, cost, enabled, sub) {
    b.innerHTML = ""; b.append(el("span", "", label)); if (cost != null) b.append(el("small", "", cost)); b.disabled = !enabled;
  }
  function areaText(kind, i) {
    const cfg = cfgOf(kind, i), nm = M.nextMile(cfg.L);
    return `Lv ${cfg.L}` + (nm ? ` · ×2 at ${nm}` : "");
  }
  function refresh() {
    const n = st.levels.length; if (n !== builtFor) build();
    $("mCash").textContent = money(st.cash);
    const inc = M.steady(st); $("mInc").textContent = money(inc) + "/s";
    $("mEmb").textContent = st.embers ? `${st.embers} embers · +${(st.embers * M.EMBER_BONUS * 100).toFixed(0)}%` : "No embers yet";
    const bn = M.bottleneck(st); $("mBottle").textContent = inc === 0 ? "Hire foremen to earn while away" : "Slowest: " + bn; $("mBottle").dataset.k = bn;
    const g = M.emberGain(st); const pb = $("mPrest"); pb.textContent = g > 0 ? `Descend · +${g} embers` : "Descend"; pb.disabled = g < 1;
    $("mOd").textContent = rt.od > 0 ? `Overdrive ${Math.ceil(rt.od)}s` : `Overdrive ×2 · ${st.odCharges}`; $("mOd").disabled = rt.od > 0 || st.odCharges < 1;
    for (const b of $("mMode").children) b.classList.toggle("on", String(b.dataset.m) === String(mode));
    for (const kind of ["el", "wh"]) {
      const c = ctl[kind], cfg = cfgOf(kind, 0), tier = M.TIERS[cfg.mgr], nx = cfg.mgr < 3 ? M.TIERS[cfg.mgr + 1] : null;
      c.sub.textContent = areaText(kind, 0) + (tier.auto ? " · " + tier.n : " · tap to run");
      const cost = M.upCost(kind, 0, cfg.L, buyN(kind, 0)); setBtn(c.u, "Upgrade ×" + buyN(kind, 0), money(cost), st.cash >= cost);
      if (nx) { const fc = M.foreCost(kind, 0, cfg.mgr + 1); setBtn(c.f, "Hire " + nx.n, money(fc), st.cash >= fc); } else setBtn(c.f, "Legend", null, false);
    }
    st.levels.forEach((lv, i) => {
      const c = rows[i], tier = M.TIERS[lv.mgr], nx = lv.mgr < 3 ? M.TIERS[lv.mgr + 1] : null;
      c.sub.textContent = areaText("lv", i) + (tier.auto ? "" : " · tap to dig");
      const cost = M.upCost("lv", i, lv.L, buyN("lv", i)); setBtn(c.u, "×" + buyN("lv", i), money(cost), st.cash >= cost);
      if (nx) { const fc = M.foreCost("lv", i, lv.mgr + 1); setBtn(c.f, nx.n, money(fc), st.cash >= fc); } else setBtn(c.f, "Legend", null, false);
    });
    if (ctl.unlock) { const cost = M.unlockCost(n); setBtn(ctl.unlock, "Unlock Shaft " + (n + 1), money(cost), st.cash >= cost); }
  }

  // ---- HUD wiring ----
  $("mMode").onclick = e => { const b = e.target.closest("button"); if (!b) return; mode = b.dataset.m === "max" ? "max" : +b.dataset.m; refresh(); };
  $("mOd").onclick = () => { if (rt.od > 0 || st.odCharges < 1) return; st.odCharges--; st.odAt = Date.now(); rt.od = 60; dirty = true; Sfx.init(); Sfx.fanfare(); refresh(); };
  $("mPrest").onclick = () => {
    const m = $("mPrompt"); m.innerHTML = ""; const g = M.emberGain(st);
    m.append(el("h3", "", "Descend?"), el("p", "note", `Your mine is sealed and you start again from the first shaft. You keep your embers: you'll earn ${g} more, for a total bonus of +${((st.embers + g) * M.EMBER_BONUS * 100).toFixed(0)}% on everything.`));
    const y = el("button", "primary", "Seal the mine"), no = el("button", "ghost", "Not yet");
    y.onclick = () => { M.prestige(st); rt = M.makeRT(st); dirty = true; scroller.scrollTop = 0; Sfx.init(); Sfx.fanfare(); m.classList.remove("on"); build(); refresh(); save(true); toast("The shaft reopens. Everything pays more."); };
    no.onclick = () => m.classList.remove("on"); m.append(y, no); m.classList.add("on");
  };

  // ---- loop ----
  function resize() {
    const w = scroller.clientWidth, h = scroller.clientHeight; if (!w) return;
    s = w / W; ui.style.transform = `scale(${s})`; content.style.height = totalH(st.levels.length) * s + "px";
    cv.style.height = h + "px"; view.fit(w, h);
  }
  new ResizeObserver(resize).observe(scroller);
  let acc = 0, last = performance.now(), frame = 0;
  setInterval(() => {
    const now = Date.now(), dt = Math.min(.5, (now - lastTick) / 1000); lastTick = now;
    if (document.hidden) return;
    if (st.odCharges < 3 && now - st.odAt >= 900000) { st.odCharges++; st.odAt = now; dirty = true; }
    for (let left = dt; left > 0; left -= .1) M.step(st, rt, Math.min(.1, left));
    if (rt.ev.length) { for (const e of rt.ev) if (e.t === "sell" && now - lastCoin > 500) { lastCoin = now; Sfx.coin(); dirty = true; } view.feed(rt.ev); rt.ev.length = 0; }
    if (!(++frame % 3)) refresh(); save(false);
  }, 100);
  function raf(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (cv.offsetParent !== null && view.k) view.draw(st, rt, dt, scroller.scrollTop / s, rt.od > 0);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
  window.drainMine = { get st() { return st; }, get rt() { return rt; }, refresh, build };
  return { load, resize, refresh, reload: async () => { await load(); } };
}
