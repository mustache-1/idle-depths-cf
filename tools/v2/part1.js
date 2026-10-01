(function(){
"use strict";
const $=id=>document.getElementById(id);
const el=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e};
const rr=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const pick=a=>a[Math.floor(Math.random()*a.length)];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const E=CampE,LAWX=E.LAWX;
const money=n=>fmt(n);
const vis=id=>$("tab-"+id).classList.contains("on");

// tabler is blocked in the preview, so use the glyphs the game already carries
document.querySelectorAll("i.ti[data-fb]").forEach(i=>{i.classList.remove("ti");i.classList.add("fb");i.textContent=i.dataset.fb});

/* ---------- shared state, the season's Terms and what relics do ---------- */
const V={shards:120,pushes:0,relicsBought:0,claimed:{},base:{swings:0},seen:0,forge:{},st:{dives:0,kills:0,bestLevel:0,boss:0,bestScore:0,planted:0,wins:0},tier:1,maxTier:1,lastScore:0};
const GCOL=["#ffb01f","#3d9bff","#2ee6d6","#a970ff"],GN=["Lampwrights","Tallymen","Salt Court","The Unpaid"];
const TERMS=[
  {n:"Blue Lamps",d:"Camp lifts move 40% faster, shafts mine 15% slower. In a dive you see further and your lamp aura is 25% wider.",ic:"lamp"},
  {n:"Salted Wages",d:"Camp sales and dive gold pay +10%, but camp upgrades cost 10% more and dive XP is 10% lower.",ic:"coin"},
  {n:"The Quiet Floor",d:"Fewer foes spawn in a dive, but the Wyrm has 25% more health.",ic:"shield"}];
LAWX.lift=1.4;LAWX.shaft=.85;LAWX.sell=1.1;LAWX.cost=1.1;
const LAWD={lamp:1.25,gold:1.1,xp:.9,floorSpawn:1/.85};
const RX={sell:1,speed:1,push:1,boss:1,hp:0,shrine:false,set:1};

/* ---------- pixel art ---------- */
const px=(x,y,w,h,f,o)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}"${o?` opacity="${o}"`:""}/>`;
function pix(map,pal,s,ox,oy){let g="";map.forEach((row,y)=>{for(let x=0;x<row.length;x++){const c=row[x];if(c!=="."&&pal[c])g+=`<rect x="${(ox||0)+x*s}" y="${(oy||0)+y*s}" width="${s}" height="${s}" fill="${pal[c]}"/>`}});return g}
const IC={
 seal:["..ooooo..",".oaaaaao.","oabbbbbao","oabcccbao","oabbbcbao","oabcccbao","oabbbbbao",".oaaaaao.","..ooooo.."],
 whistle:[".........","..ooooo..",".oaaaaaoo","oabbbbbao","oabcccbao",".oaaaaaoo","..ooooo..",".........","........."],
 pick:[".oooooo..","oaabbbao.",".occoaao.","....obo..","...obo...","..obo....",".obo.....","obo......","oo......."],
 tooth:["..ooooo..",".obbbbbo.",".obbbbao.",".oabbaao.","..oabaoo.","..oaaao..","...oaao..","...oao...","....o...."],
 lantern:["...ooo...","..o...o..",".ooooooo.",".oabbbao.",".obbbbbo.",".obbbbbo.",".oabbbao.",".ooooooo.","..occco.."],
 coin:["..ooooo..",".oaaaaao.","oabbbbbao","oabooobao","oabo.obao","oabooobao","oabbbbbao",".oaaaaao.","..ooooo.."],
 charm:["oo.....oo","oaoooooao",".oaaaaao.","..obbbo..","..obbbo..","..obbbo..",".oaaaaao.","oaoooooao","oo.....oo"],
 sheet:[".ooooooo.",".obbbbbo.",".obcccbo.",".obbbbbo.",".obcccbo.",".obbbbbo.",".obcccbo.",".obbbbbo.",".ooooooo."],
 lamp:["...ooo...","..oaao...",".ooooooo.",".oabbbao.",".obbbbbo.",".oabbbao.",".ooooooo.","..occco..","........."],
 shield:["ooooooooo","oabbbbbao","oabbbbbao","oabcccbao","oabcccbao",".oabbbao.","..oabao..","...oao...","....o...."],
};
const ICP={seal:{o:"#14100c",a:"#b5811f",b:"#ffd873",c:"#7a4f10"},whistle:{o:"#14100c",a:"#8a96a4",b:"#d6dde5",c:"#4a5560"},pick:{o:"#14100c",a:"#8a5a2b",b:"#c9ccd2",c:"#5d6670"},tooth:{o:"#14100c",a:"#b9b3a0",b:"#f4efe0",c:"#7a7462"},lantern:{o:"#14100c",a:"#b5811f",b:"#ffcf7a",c:"#6b4310"},coin:{o:"#14100c",a:"#7a4fb5",b:"#c48cff",c:"#4a2a78"},charm:{o:"#14100c",a:"#5ec9b6",b:"#e9fff9",c:"#2c8a7c"},sheet:{o:"#14100c",a:"#bbb39a",b:"#f1ead2",c:"#8a8268"},lamp:{o:"#14100c",a:"#3d9bff",b:"#a9d6ff",c:"#1f5d9c"},shield:{o:"#14100c",a:"#7a4fb5",b:"#c48cff",c:"#4a2a78"}};
const icon=(n,s)=>`<svg viewBox="0 0 ${9*(s||1)} ${9*(s||1)}" shape-rendering="crispEdges">${pix(IC[n],ICP[n],s||1,0,0)}</svg>`;

function bannerDescent(){const p=PAL[1];let g=`<rect width="700" height="56" fill="${p.sky}"/>`+stones(0,0,0,700,56,p,.12,3,.12);
  g+=`<path d="M290 0 L410 0 L402 56 L298 56z" fill="#070605"/><rect y="46" width="700" height="10" fill="${p.floor}"/><rect y="46" width="700" height="1" fill="#fff" opacity=".15"/>`;
  g+=beam(286,0,6,50)+beam(408,0,6,50)+beam(282,0,136,5)+`<circle cx="350" cy="30" r="30" fill="#ffcf7a" opacity=".12"/>`;
  g+=`<g transform="scale(.9)">`+miner(130,14,"crewman","#3aa0c8","#f3b24a",PICK_LOOK[2])+miner(560,14,"crewman","#c0553c","#f3b24a",PICK_LOOK[1])+miner(470,14,"crewman","#4f9e7a","#e8e8ee",PICK_LOOK[3])+`</g>`;
  for(let i=0;i<10;i++)g+=px(318+i*7,36+(i%3)*3,2,2,"#2ee6d6",.9);return g}
function bannerGuilds(){let g=`<defs><linearGradient id="v2gs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14182a"/><stop offset="1" stop-color="#c8693a"/></linearGradient></defs><rect width="700" height="56" fill="url(#v2gs)"/>`;
  g+=`<path d="M0 56 L0 38 L80 26 L170 36 L260 22 L360 34 L450 20 L560 34 L640 24 L700 34 L700 56z" fill="#1c1730"/>`;
  GCOL.forEach((c,i)=>{const x=90+i*150;g+=px(x,8,2.5,42,"#5a3f26")+`<path d="M${x+2.5} 8 L${x+36} 12 L${x+26} 18 L${x+36} 24 L${x+2.5} 28z" fill="${c}"><animate attributeName="d" dur="${2+i*.3}s" repeatCount="indefinite" values="M${x+2.5} 8 L${x+36} 12 L${x+26} 18 L${x+36} 24 L${x+2.5} 28z;M${x+2.5} 8 L${x+33} 14 L${x+28} 18 L${x+33} 22 L${x+2.5} 28z;M${x+2.5} 8 L${x+36} 12 L${x+26} 18 L${x+36} 24 L${x+2.5} 28z"/></path>`+px(x-3,48,9,3,"#3a3a40")});return g}
function bannerRelics(){let g=`<rect width="700" height="56" fill="#0e0a18"/>`;for(let i=0;i<60;i++)g+=px((i*97)%700,(i*29)%40,1,1,"#c48cff",.5);
  g+=`<ellipse cx="350" cy="56" rx="260" ry="14" fill="#a970ff" opacity=".18"/>`;[[210,"lantern"],[350,"tooth"],[490,"seal"]].forEach(([x,n])=>{g+=px(x-18,44,36,12,"#2a2538")+px(x-18,44,36,2,"#4a4560")+`<circle cx="${x}" cy="26" r="22" fill="#c48cff" opacity=".12"/><svg x="${x-13}" y="12" width="26" height="26" viewBox="0 0 9 9" shape-rendering="crispEdges">${pix(IC[n],ICP[n],1,0,0)}</svg>`});return g}
function bannerAudit(){let g=`<rect width="700" height="56" fill="#0c0f16"/>`+px(0,44,700,12,"#3a2716")+px(0,44,700,2,"#6b4a2c");
  g+=px(420,32,56,12,"#5a3f26")+px(424,26,48,8,"#f1ead2")+px(428,28,40,1,"#8a8268")+px(428,31,32,1,"#8a8268")+px(448,26,1,8,"#8a8268");
  g+=`<path d="M200 56 L200 24 Q200 6 222 6 Q244 6 244 24 L244 56z" fill="#1c1730"/><rect x="212" y="20" width="20" height="14" fill="#0a0810"/>`+px(215,25,4,3,"#5ec9b6")+px(225,25,4,3,"#5ec9b6")+`<circle cx="222" cy="27" r="22" fill="#5ec9b6" opacity=".07"/>`;
  g+=`<text x="270" y="30" fill="#ffd873" font-size="11" font-weight="700" letter-spacing="2" opacity=".95">PAID IN FULL</text><text x="270" y="43" fill="#98a2b8" font-size="7">The books are never closed.</text>`;return g}

/* ---------- floating numbers and coins ---------- */
function ft(layer,x,y,txt,col){const s=el("span","ft",txt);s.style.cssText=`left:${x}%;top:${y}%;color:${col||"#ffd873"}`;layer.appendChild(s);setTimeout(()=>s.remove(),1400)}
function coins(layer,x,y,n){for(let i=0;i<n;i++){const c=el("i","coin");c.style.cssText=`left:${x}%;top:${y}%;--dx:${rr(-60,60)}px;--dy:${rr(-70,-20)}px`;layer.appendChild(c);setTimeout(()=>c.remove(),1000)}}
function flash(layer){const f=el("div","v2-flash");layer.appendChild(f);setTimeout(()=>f.remove(),420)}

/* ---------- arrival state: a mid-game mine with something to do ---------- */
const CAMP0={levels:[{L:16,mgr:1},{L:7,mgr:0}],elev:{L:8,mgr:1,lift:true},wh:{L:7,mgr:0}};
function preset(){
  if(S.swings>30||S.lifetime>5000)return;
  try{loginNag=Infinity}catch(e){}
  S.seen=true;S.depth=2;S.rockHp=LAYERS[2].hp;S.pick=3;S.cash=48000;S.lifetime=62000;
  S.crew=S.crew.map((_,i)=>[14,8,3,1][i]||0);S.swings=140;S.profile.name="Warden";
  try{drawScene();render()}catch(e){}
  V.base.swings=S.swings;
  try{startMine()}catch(e){}
}
setTimeout(preset,1400);

/* ---------- ribbon + what changed ---------- */
(function(){
  const r=el("div","v2ribbon");r.append(el("b","","V2 preview"),el("span","","Your real UI, a different game: active dives you steer, an idle Camp that pays for them, and Guilds that fight over your scores."));
  const b=el("button","","What changed"),home=el("a","","Play the current game");home.href="/";home.style.cssText="color:var(--lamp2);font-size:12px;text-decoration:underline";r.append(b,home);document.body.prepend(r);
  const ov=el("div");ov.style.cssText="position:fixed;inset:0;background:rgba(5,7,12,.84);z-index:300;display:none;place-items:center;padding:16px";
  const box=el("div","card");box.style.cssText="max-width:600px;width:100%;padding:22px;max-height:90vh;overflow:auto";
  box.innerHTML=`<h3 style="font-size:20px;margin-bottom:6px">Why v2 is a different game</h3>
  <p class="note" style="margin-bottom:12px">v1 asked "swing or buy?" forever. People left, and one player finished it. So v2 changes what you actually do.</p>
  <p><b style="color:var(--lamp2)">You play now.</b> The Dive is a three-minute survival run. You move, your pick swings itself, and every level-up you choose a perk. Every run is different, ends in a boss, and gets harder through Debt tiers with no ceiling.</p>
  <p style="margin-top:8px"><b style="color:var(--lamp2)">The idle part still pays.</b> The Camp (shafts, a lift, a warehouse, foremen) earns while you're away. Its cash buys permanent gear in the Forge, so idling makes your next dive stronger.</p>
  <p style="margin-top:8px"><b style="color:var(--lamp2)">Nobody finishes it.</b> Seasons reset power and change the Terms. Late joiners catch up. The one who maxed v1 is Ashcombe's Heir and starts level with everyone.</p>
  <p style="margin-top:8px"><b style="color:var(--lamp2)">Social with stakes.</b> Plant your dive score in a Guild gallery. Guilds fight over galleries each week and raid each other.</p>
  <p style="margin-top:8px"><b style="color:var(--lamp2)">It all connects.</b> Mine seams load your Camp's warehouse, and Overdrive speeds the Camp up. Dive hauls become cash and fill that warehouse too. Camp cash buys Forge gear that helps every mode. Guild galleries you hold buff the Mine, Camp and Dive, and everything you do feeds the Guild war. The strip under the tabs shows what's happening elsewhere.</p>
  <p style="margin-top:8px"><b style="color:var(--lamp2)">What stays.</b> Your saves, Discord login, crews, the leaderboard, your pixel miner and the mine's look.</p>
  <p class="note" style="margin-top:12px">Preview only. Nothing here saves to your account. Dive, Camp, Forge and Guilds are all live and connected.</p>`;
  const x=el("button","big","Back to the preview");x.style.marginTop="14px";x.onclick=()=>ov.style.display="none";box.append(x);ov.append(box);document.body.append(ov);
  b.onclick=()=>ov.style.display="grid";ov.onclick=e=>{if(e.target===ov)ov.style.display="none"};
})();

/* ---------- banners ---------- */
$("v2bd").innerHTML=bannerDescent();$("v2bg").innerHTML=bannerGuilds();$("v2br").innerHTML=bannerRelics();$("v2ba").innerHTML=bannerAudit();
