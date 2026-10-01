"""Builds public/v2/index.html: the v2 sandbox.

It wraps the real game page (public/index.html) in a sandbox and adds the v2 tabs on top.
Run from the repo root:  python3 tools/v2/build.py

The sandbox keeps the real game's scripts away from real saves: fetch to /api/ is refused and
localStorage is an in-memory stand-in, so nothing here can read or write anyone's account.
The output is a frozen copy: changing public/index.html later does not change /v2 until you rebuild.
"""
import re, pathlib
here = pathlib.Path(__file__).parent
root = here.parents[1]
src = (root / "public/index.html").read_text()
head = src[src.index("<head>")+6:src.index("</head>")]
body = src[src.index("<body>")+6:src.rindex("</body>")]
for pat in [r'<meta charset[^>]*>', r'<meta name="viewport"[^>]*>', r'<meta name="theme-color"[^>]*>', r'<meta name="apple-[^>]*>',
            r'<link rel="manifest"[^>]*>', r'<link rel="apple-touch-icon"[^>]*>', r'<link rel="icon"[^>]*>', r'<link rel="preconnect"[^>]*>',
            r'<link[^>]*tabler[^>]*>', r'<title>.*?</title>', r'<meta name="description"[^>]*>']:
    head = re.sub(pat, '', head, flags=re.S)
css = (here/"v2.css").read_text()
tabs = (here/"tabs.html").read_text(); panels = (here/"panels.html").read_text(); mine = (here/"mine.html").read_text()
m = re.search(r'<div class="tabs"><div class="wrap">.*?</div></div>', body, flags=re.S); assert m
body = body[:m.start()] + tabs + '<div id="v2strip" class="v2-strip"></div>' + body[m.end():]
k = body.index('<div class="panel" id="tab-upgrades">'); body = body[:k] + panels + "\n" + body[k:]
k = body.index('<div class="panel on" id="tab-mine">') + len('<div class="panel on" id="tab-mine">'); body = body[:k] + mine + body[k:]
eng = (root/"public/drain/mine.js").read_text()
# sandbox-only hooks: Terms and relics scale the economy, and a cave-in can block a shaft
eng = eng.replace("export const rate = (st, i) => baseRate(i) * mult(st.levels[i].L) * TIERS[st.levels[i].mgr].m * emb(st);",
  "export const LAWX = { shaft: 1, lift: 1, sell: 1, speed: 1, cost: 1 };\nexport const rate = (st, i) => baseRate(i) * mult(st.levels[i].L) * TIERS[st.levels[i].mgr].m * emb(st) * (st.levels[i].pm || 1) * LAWX.shaft;")
eng = eng.replace("Math.pow(TIERS[cfg.mgr].m, .6);", "Math.pow(TIERS[cfg.mgr].m, .6) * (cfg.pm || 1) * LAWX.speed * (cfg.lift ? LAWX.lift : 1);")
eng = eng.replace("    const r = rt.lv[i];\n", "    const r = rt.lv[i];\n    if (r.blocked) return;\n", 1)
assert "LAWX.shaft" in eng and "cfg.lift" in eng and "r.blocked" in eng
names = re.findall(r'^export (?:const|function|class) (\w+)', eng, flags=re.M) + ['LOAD_T', 'WH_T', 'LV_T']
eng = re.sub(r'^export ', '', eng, flags=re.M)
engine = "const CampE=(function(){\n" + eng + "\nreturn {" + ",".join(names) + "};\n})();\n"
sandbox = """<script>
// v2 is a sandbox. It never touches real saves: no /api calls, and an in-memory localStorage.
(function(){
  try{delete Navigator.prototype.serviceWorker}catch(e){}
  var mem={};var ls={getItem:function(k){return Object.prototype.hasOwnProperty.call(mem,k)?mem[k]:null},setItem:function(k,v){mem[k]=String(v)},removeItem:function(k){delete mem[k]},clear:function(){mem={}},key:function(i){return Object.keys(mem)[i]||null},get length(){return Object.keys(mem).length}};
  try{Object.defineProperty(window,"localStorage",{value:ls,configurable:true})}catch(e){}
  try{Object.defineProperty(window,"sessionStorage",{value:ls,configurable:true})}catch(e){}
  var of=window.fetch;window.fetch=function(u){var s=typeof u==="string"?u:(u&&u.url)||"";if(s.indexOf("/api/")===0||s.indexOf(location.origin+"/api/")===0)return Promise.reject(new Error("v2 sandbox: no network"));return of.apply(this,arguments)};
  if(navigator.sendBeacon)navigator.sendBeacon=function(){return false};
})();
</script>
"""
js = "".join((here/f).read_text() for f in ["part1.js","part2.js","campx.js","campx2.js","part4.js","part6.js","part7.js","part5.js"])
out = ('<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
       '<meta name="theme-color" content="#0d1017">\n<title>Idle Depths II (preview)</title>\n<meta name="robots" content="noindex">\n'
       + head + "<style>\n" + css + "</style>\n</head>\n<body>\n" + sandbox + body + "\n<script>\n" + engine + "</script>\n<script>\n" + js + "\n</script>\n</body>\n</html>\n")
(root/"public/v2").mkdir(exist_ok=True)
(root/"public/v2/index.html").write_text(out)
print("wrote public/v2/index.html", len(out))
