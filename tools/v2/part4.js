
/* ================= THE DIVE (rebuilt) ================= */
// The game draws at a small fixed pixel size and the browser scales it up whole, so sprites
// stay crisp and nothing shimmers. World units are those pixels.
const dcv=$("v2dcv"),dx=dcv.getContext("2d");let IW=360,IH=200,ZS=3;
function fitD(){const r=dcv.getBoundingClientRect();if(!r.width)return;ZS=r.width<520?Math.max(1,Math.round(r.width/210)):Math.max(2,Math.round(r.width/340));const w=Math.round(r.width/ZS),h=Math.round(r.height/ZS);if(w===IW&&h===IH&&dcv.width===w)return;IW=w;IH=h;dcv.width=IW;dcv.height=IH;dx.imageSmoothingEnabled=false}
new ResizeObserver(fitD).observe(dcv);
const DUR=180,BOSS_AT=140,MAXEN=170;
const svgImg=(inner,vb,w,h)=>{const i=new Image();i.src="data:image/svg+xml;utf8,"+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${w}" height="${h}" shape-rendering="crispEdges">${inner}</svg>`);return i};
let minerImg=null,wyrmImg=null;
function sprites(){if(!minerImg)minerImg=svgImg(miner(3,2,"",S.profile.shirt||"#f1e6d2",S.profile.hat||"#f3b24a",PICK_LOOK[Math.max(1,S.pick||1)]),"0 0 22 38",44,76);if(!wyrmImg)wyrmImg=svgImg(wyrm(2,2),"0 0 78 52",156,104)}
const nrm=(x,y)=>{const l=Math.hypot(x,y);return l<1e-6?[0,0,0]:[x/l,y/l,l]};
const MAPS={
 crawler:{m:["...aaaa...","..abbbba..",".abbbbbba.","abrbbbbrba","abbbbbbbba",".aaaaaaaa.","l.l.l.l.l."],p:{a:"#58647a",b:"#97a5bb",r:"#ff5252",l:"#3a4458"}},
 skitter:{m:[".aaaaa.","abrbrba","abbbbba",".aaaaa.","l.l.l.l"],p:{a:"#3f7a52",b:"#7fd09a",r:"#ffe35a",l:"#2c4a36"}},
 hollow:{m:["..aaaaa..",".abbbbba.","abbbbbbba","abrbbbrba","abbbbbbba","abbbbbbba","abbaabbba","abaa.aaba","aa.....aa"],p:{a:"#5a3a8a",b:"#a98be0",r:"#ffffff"}},
 brute:{m:["..aaaaaaaa..",".abbbbbbbba.","abbbbbbbbbba","abrrbbbbrrba","abbbbbbbbbba","abbbaaaabbba","abbbbbbbbbba",".aabbbbbbaa.","..la....al..","..ll....ll.."],p:{a:"#7a3a2c",b:"#c9674f",r:"#ffd23c",l:"#3a1a14"}}};
const ED={crawler:{hp:12,spd:30,dmg:5,xp:2,s:2,r:6},skitter:{hp:5,spd:56,dmg:3,xp:1,s:2,r:4},hollow:{hp:18,spd:21,dmg:5,xp:4,s:2,r:7,range:true},brute:{hp:70,spd:22,dmg:12,xp:12,s:2,r:10}};
function drawMap(m,pal,x,y,s,flip,white){const w=m[0].length,h=m.length;dx.save();dx.translate(Math.round(x),Math.round(y));if(flip)dx.scale(-1,1);
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){const c=m[j][i];if(c===".")continue;dx.fillStyle=white?"#fff":pal[c];dx.fillRect(Math.round((i-w/2)*s),(j-h)*s,s,s)}dx.restore()}
// the world: deterministic scenery in 48-pixel cells, so walking feels like going somewhere
const hash2=(a,b)=>{let h=a*374761393+b*668265263;h=(h^(h>>13))*1274126177;return ((h^(h>>16))>>>0)/4294967296};
function floorTile(){const c=document.createElement("canvas");c.width=c.height=64;const t=c.getContext("2d"),R=rnd(21);t.fillStyle="#262833";t.fillRect(0,0,64,64);
  for(let i=0;i<26;i++){const x=R()*64,y=R()*64,w=6+R()*12,h=4+R()*5;t.fillStyle=["#2f323f","#353947","#2a2d39","#3a3f4f"][Math.floor(R()*4)];t.fillRect(x,y,w,h);t.fillStyle="rgba(255,255,255,.05)";t.fillRect(x,y,w,1);t.fillStyle="rgba(0,0,0,.3)";t.fillRect(x,y+h-1,w,1)}
  for(let i=0;i<6;i++){t.fillStyle="rgba(0,0,0,.35)";t.fillRect(R()*64,R()*64,2+R()*5,1)}return c}
const TILE=floorTile();
const WEAP={swing:{n:"Pickaxe",d:"Swings at the nearest enemy.",ic:"pick"},thrown:{n:"Thrown Picks",d:"Hurls picks that pierce.",ic:"whistle"},aura:{n:"Lamp Aura",d:"Burns everything close to you.",ic:"lantern"},dyn:{n:"Dynamite",d:"Lobs charges that blow up crowds.",ic:"coin"},orbit:{n:"Orbiting Picks",d:"Picks circle you and cut.",ic:"tooth"}};
const PASSV={hp:{n:"Iron Lungs",d:"+20 max health and heal 20.",ic:"shield"},spd:{n:"Quick Boots",d:"+8% move speed.",ic:"whistle"},dmg:{n:"Sharpening",d:"+10% damage.",ic:"pick"},mag:{n:"Magnet",d:"+25% pickup range.",ic:"coin"},xp:{n:"Studious",d:"+10% experience.",ic:"sheet"},reg:{n:"Second Wind",d:"Regenerate health.",ic:"charm"}};
let run=null,keys={},joy=null,shakeT=0,lastT=performance.now(),snd=null,hudT=0,dashHeld=false;
const sndOn=()=>V.sound!==false;
function beep(f,d,v){if(!sndOn())return;try{if(!snd)snd=new (window.AudioContext||window.webkitAudioContext)();const o=snd.createOscillator(),g=snd.createGain();o.type="square";o.frequency.value=f;g.gain.setValueAtTime(v||.03,snd.currentTime);g.gain.exponentialRampToValueAtTime(.0001,snd.currentTime+d);o.connect(g).connect(snd.destination);o.start();o.stop(snd.currentTime+d)}catch(e){}}
const forgeMul=(id,per)=>1+fl(id)*per,tierMul=()=>1+(V.tier-1)*.55;
const viewR=()=>Math.hypot(IW,IH)/2;
function newRun(){
  recomputeRX();sprites();
  const hpMax=Math.round((100+RX.hp)*forgeMul("hp",.08));
  run={t:0,hp:hpMax,hpMax,x:0,y:0,vx:0,vy:0,face:1,inv:0,lvl:1,xp:0,need:6,gold:0,kills:0,paused:false,userPause:false,over:false,boss:null,bossDone:false,revived:false,
    en:[],gems:[],golds:[],heals:[],veins:[],shots:[],fx:[],txt:[],orbs:[],bombs:[],spawnT:.5,veinT:0,walk:0,dash:0,dashCd:0,
    w:{swing:1},p:{hp:0,spd:0,dmg:0,mag:0,xp:0,reg:0},cd:{swing:.3,thrown:.6,dyn:1.5},auraT:0,bossShot:3,bossWarn:0,tier:V.tier,done:null};
  keys={};joy=null;
  for(let i=0;i<8;i++)spawnVein(true);
  for(let i=0;i<8;i++)spawnEnemy("crawler",null,rr(90,170));
  wl();
}
const dmgMul=()=>forgeMul("dmg",.06)*(1+run.p.dmg*.1)*RX.dmg*guildBuff("dmg");
function wl(){const h=$("v2dwl");h.innerHTML="";Object.keys(run.w).forEach(k=>h.append(el("span","",WEAP[k].n+" "+run.w[k])))}
function spawnVein(init){const a=Math.random()*6.28,d=init?rr(50,viewR()):rr(viewR()+10,viewR()+70);run.veins.push({x:run.x+Math.cos(a)*d,y:run.y+Math.sin(a)*d,hp:5+Math.floor(run.t/30)})}
function spawnEnemy(type,ang,dist){
  if(run.en.length>=MAXEN)return;
  const d=ED[type],tm=tierMul()*(1+run.t/110),a=ang==null?Math.random()*6.28:ang,r=dist||(viewR()+rr(14,50));
  run.en.push({type,x:run.x+Math.cos(a)*r,y:run.y+Math.sin(a)*r,hp:d.hp*tm,max:d.hp*tm,spd:d.spd*(.9+Math.random()*.25),fl:0,shoot:Math.random()*2,wob:Math.random()*6,kx:0,ky:0,atk:0});
}
function spawnTick(dt){
  const t=run.t;run.spawnT-=dt;
  if(run.spawnT<=0){run.spawnT=Math.max(.12,.6-t/260)*guildBuff("spawn");
    const n=1+Math.floor(t/50)+(Math.random()<.3?1:0);
    for(let i=0;i<n;i++){const roll=Math.random();let ty="crawler";
      if(t>25&&roll<.35)ty="skitter";if(t>60&&roll>.82)ty="hollow";if(t>95&&roll>.93)ty="brute";spawnEnemy(ty)}
    if(t>20&&Math.random()<.07){const a=Math.random()*6.28;for(let i=0;i<4+Math.floor(t/30);i++)spawnEnemy("skitter",a+(Math.random()-.5)*.5)}}
  run.veinT-=dt;if(run.veinT<=0&&run.veins.length<10){run.veinT=4;spawnVein()}
  if(t>=BOSS_AT&&!run.boss&&!run.bossDone){const hp=480*tierMul()*1.25*(1+(V.tier-1)*.2);run.boss={x:run.x+viewR()*.8,y:run.y,hp,max:hp,fl:0,t:0};run.fx.push({k:"banner",t:0,txt:"THE WYRM"});beep(80,.5,.06);$("v2dboss").hidden=false}
}
function nearest(list,x,y,maxd){let b=null,bd=maxd*maxd;for(const e of list){const d=(e.x-x)**2+(e.y-y)**2;if(d<bd){bd=d;b=e}}return b}
function addTxt(x,y,s,c){if(run.txt.length<12)run.txt.push({x,y,t:0,s,c})}
function hurtEnemy(e,d,col,kx,ky,quiet){e.hp-=d;e.fl=.09;if(!quiet&&(d>=14||e.type==='brute'))addTxt(e.x,e.y-12,Math.round(d),col||"#fff");if(kx!=null){e.kx+=kx;e.ky+=ky}
  if(run.fx.length<70&&Math.random()<.5)run.fx.push({k:"spark",x:e.x,y:e.y,vx:rr(-50,50),vy:rr(-60,10),t:0,c:"#ffd873"})}
function killEnemy(e){run.kills++;const d=ED[e.type];
  run.gems.push({x:e.x,y:e.y,v:d.xp});if(Math.random()<.04)run.heals.push({x:e.x,y:e.y});
  if(Math.random()<.32+(e.type==="brute"?.7:0))run.golds.push({x:e.x+rr(-4,4),y:e.y+rr(-4,4),v:e.type==="brute"?10:3});
  if(run.fx.length<70)for(let i=0;i<3;i++)run.fx.push({k:"spark",x:e.x,y:e.y,vx:rr(-60,60),vy:rr(-60,40),t:0,c:MAPS[e.type].p.b});
  beep(220+Math.random()*60,.04,.015)}
function dmgPlayer(d){
  if(run.inv>0||run.over||run.dash>0)return;
  run.hp-=d;run.inv=.45;shakeT=.2;run.fx.push({k:"flash",t:0});addTxt(run.x,run.y-24,Math.round(d),"#ff6a6a");beep(110,.1,.04);
  if(run.hp<=0){
    if(RX.revive&&!run.revived){run.revived=true;run.hp=Math.round(run.hpMax*.4);run.inv=1.6;run.fx.push({k:"banner",t:0,txt:"THE COIN PAYS"});for(const e of run.en){const [nx,ny,l]=nrm(e.x-run.x,e.y-run.y);if(l<110){e.x+=nx*90;e.y+=ny*90}}}
    else endRun(false)}}
function giveXp(v){run.xp+=v*forgeMul("xp",.06)*(1+run.p.xp*.1)*LAWD.xp*guildBuff("xp");let guard=0;while(run.xp>=run.need&&guard++<3){run.xp-=run.need;run.lvl++;run.need=Math.round(4+run.lvl*3.5);levelUp();if(run.paused)break}}
function levelUp(){
  run.paused=true;keys={};dashHeld=false;beep(520,.15,.05);setTimeout(()=>beep(780,.2,.05),120);
  const bag=[];Object.keys(WEAP).forEach(k=>{const l=run.w[k]||0;if(l<5)bag.push({t:"w",k,l})});Object.keys(PASSV).forEach(k=>{if(run.p[k]<5)bag.push({t:"p",k,l:run.p[k]})});
  bag.sort(()=>Math.random()-.5);const owned2=bag.filter(c=>c.t==="w"&&c.l>0),rest=bag.filter(c=>!(c.t==="w"&&c.l>0));
  // always offer at least one weapon you already carry, so builds actually come together
  const pick3=[];if(owned2.length&&Math.random()<.8)pick3.push(owned2.shift());const more=[...owned2,...rest].sort(()=>Math.random()-.5);while(pick3.length<3&&more.length)pick3.push(more.shift());
  const ov=$("v2dlvl");ov.hidden=false;ov.innerHTML="";const box=el("div","v2-dbox");box.append(el("h2","","Level "+run.lvl),el("p","note","Pick one (1, 2 or 3). Weapons you carry get stronger."));
  const row=el("div","v2-picks");
  const choose=c=>{if(ov.hidden)return;if(c.t==="w")run.w[c.k]=(run.w[c.k]||0)+1;else{run.p[c.k]++;if(c.k==="hp"){run.hpMax+=20;run.hp=Math.min(run.hpMax,run.hp+20)}}wl();ov.hidden=true;run.paused=false;lastT=performance.now();beep(660,.08,.04)};
  pick3.forEach((c,i)=>{const d=c.t==="w"?WEAP[c.k]:PASSV[c.k],b=el("button","v2-pickc");
    b.innerHTML=icon(d.ic,5)+`<b>${d.n}</b><small>${d.d}</small><span class="nw">${c.l===0&&c.t==="w"?"New weapon":"Level "+(c.l+1)}</span><small style="opacity:.5">[${i+1}]</small>`;b.onclick=()=>choose(c);row.append(b)});
  run.choose=pick3.map(c=>()=>choose(c));
  box.append(row);ov.append(box);
}
function hurtBoss(d){const b=run.boss;if(!b)return;b.hp-=d;b.fl=.09;addTxt(b.x,b.y-40,Math.round(d),"#fff");
  if(b.hp<=0){run.fx.push({k:"boom",x:b.x,y:b.y,rad:70,t:0});shakeT=.4;beep(60,.5,.07);const g=Math.round(120*tierMul()*RX.boss*forgeMul("gold",.06));run.gold+=g;addTxt(run.x,run.y-34,"WYRM CHEST +"+g,"#ffd873");run.fx.push({k:"banner",t:0,txt:"THE WYRM FALLS"});V.st.boss++;run.boss=null;run.bossDone=true;$("v2dboss").hidden=true;for(let i=0;i<14;i++)run.golds.push({x:b.x+rr(-24,24),y:b.y+rr(-24,24),v:6})}}
/* ---- one frame of the run ---- */
function update(dt){
  const r=run;r.t+=dt;r.inv=Math.max(0,r.inv-dt);r.dash=Math.max(0,r.dash-dt);r.dashCd=Math.max(0,r.dashCd-dt);
  // movement with a little weight to it
  let ix=0,iy=0;if(keys.ArrowLeft||keys.a)ix-=1;if(keys.ArrowRight||keys.d)ix+=1;if(keys.ArrowUp||keys.w)iy-=1;if(keys.ArrowDown||keys.s)iy+=1;
  if(joy&&joy.on){ix=joy.dx;iy=joy.dy}
  const [ux,uy,ul]=nrm(ix,iy),str=Math.min(1,ul),top=58*forgeMul("spd",.04)*(1+r.p.spd*.08);
  if((dashHeld||keys[" "]||keys.Shift)&&r.dashCd<=0&&(ul>0||true)){const [dx2,dy2]=ul>0?[ux,uy]:[r.face,0];r.dash=.2;r.dashCd=2.2;r.vx=dx2*top*3.4;r.vy=dy2*top*3.4;r.inv=Math.max(r.inv,.25);beep(300,.08,.03);for(let i=0;i<6;i++)r.fx.push({k:"spark",x:r.x,y:r.y,vx:rr(-30,30),vy:rr(-30,30),t:0,c:"#cfd4da"});dashHeld=false;keys[" "]=false}
  if(r.dash<=0){const k=Math.min(1,dt*10);r.vx=lerp(r.vx,ux*top*str,k);r.vy=lerp(r.vy,uy*top*str,k)}
  r.x+=r.vx*dt;r.y+=r.vy*dt;if(Math.abs(r.vx)>6)r.face=r.vx>0?1:-1;r.walk+=dt*Math.min(12,Math.hypot(r.vx,r.vy)/6);
  if(r.p.reg)r.hp=Math.min(r.hpMax,r.hp+r.p.reg*.5*dt);
  spawnTick(dt);
  const dm=dmgMul(),light=LAWD.lamp;
  // pickaxe
  if(r.w.swing){r.cd.swing-=dt;const l=r.w.swing;if(r.cd.swing<=0){const t=nearest(r.en,r.x,r.y,40+l*3)||nearest(r.veins,r.x,r.y,34)||(r.boss&&Math.hypot(r.boss.x-r.x,r.boss.y-r.y)<70?r.boss:null);
      if(t){r.cd.swing=Math.max(.32,.8-.09*l);const ang=Math.atan2(t.y-r.y,t.x-r.x),rad=26+l*3,dmg=(11+5*l)*dm;r.fx.push({k:"swing",x:r.x,y:r.y,a:ang,rad,t:0});beep(300,.04,.02);
        for(const e of r.en){const ex=e.x-r.x,ey=e.y-r.y,d=Math.hypot(ex,ey);if(d<rad+ED[e.type].r){let da=Math.abs(Math.atan2(ey,ex)-ang);if(da>3.1416)da=6.2832-da;if(da<1.3)hurtEnemy(e,dmg,"#fff",ex/(d||1)*60,ey/(d||1)*60)}}
        if(r.boss&&Math.hypot(r.boss.x-r.x,r.boss.y-r.y)<rad+26)hurtBoss(dmg);
        for(const v of r.veins)if(Math.hypot(v.x-r.x,v.y-r.y)<rad+10)v.hp-=1}}}
  // thrown picks
  if(r.w.thrown){r.cd.thrown-=dt;const l=r.w.thrown;if(r.cd.thrown<=0){const t=nearest(r.en,r.x,r.y,150)||(r.boss&&Math.hypot(r.boss.x-r.x,r.boss.y-r.y)<170?r.boss:null);if(t){r.cd.thrown=Math.max(.4,1.2-.15*l);const n=l>=5?3:l>=3?2:1,base=Math.atan2(t.y-r.y,t.x-r.x);
      for(let i=0;i<n;i++){const a=base+(i-(n-1)/2)*.22;r.shots.push({x:r.x,y:r.y-8,vx:Math.cos(a)*150,vy:Math.sin(a)*150,d:(8+3*l)*dm,p:1+Math.floor(l/2),t:0,hit:new Set(),rot:0})}beep(420,.04,.02)}}}
  // lamp aura
  if(r.w.aura){const l=r.w.aura,rad=(22+5*l)*light;r.auraT-=dt;if(r.auraT<=0){r.auraT=.45;for(const e of r.en)if(Math.hypot(e.x-r.x,e.y-r.y)<rad+ED[e.type].r)hurtEnemy(e,(3+1.6*l)*dm,"#ffd873",null,null,true);if(r.boss&&Math.hypot(r.boss.x-r.x,r.boss.y-r.y)<rad+26)hurtBoss((3+1.6*l)*dm)}}
  // dynamite
  if(r.w.dyn){r.cd.dyn-=dt;const l=r.w.dyn;if(r.cd.dyn<=0&&r.en.length){r.cd.dyn=Math.max(1.4,3.4-.4*l);const t=r.en[rr(0,Math.min(r.en.length-1,12))],[nx,ny,ln]=nrm(t.x-r.x,t.y-r.y),d=Math.min(100,ln);r.bombs.push({x:r.x,y:r.y,tx:r.x+nx*d,ty:r.y+ny*d,t:0,dm:(32+14*l)*dm,rad:30+4*l})}}
  for(const b of r.bombs){b.t+=dt;b.x=lerp(b.x,b.tx,Math.min(1,dt*3));b.y=lerp(b.y,b.ty,Math.min(1,dt*3));
    if(b.t>=1&&!b.done){b.done=true;r.fx.push({k:"boom",x:b.x,y:b.y,rad:b.rad,t:0});shakeT=.12;beep(70,.2,.06);for(const e of r.en)if(Math.hypot(e.x-b.x,e.y-b.y)<b.rad+ED[e.type].r)hurtEnemy(e,b.dm,"#ff9a4a");if(r.boss&&Math.hypot(r.boss.x-b.x,r.boss.y-b.y)<b.rad+26)hurtBoss(b.dm)}}
  r.bombs=r.bombs.filter(b=>!b.done);
  // orbiting picks
  if(r.w.orbit){const l=r.w.orbit,n=[0,1,2,2,3,4][l],rad=24+l*1.5,spin=r.t*(2.4+l*.2);for(let i=0;i<n;i++){const a=spin+i*6.2832/n,px=r.x+Math.cos(a)*rad,py=r.y-8+Math.sin(a)*rad;
      for(const e of r.en)if(Math.hypot(e.x-px,e.y-py)<ED[e.type].r+5&&(e.oh||0)<=r.t){e.oh=r.t+.35;hurtEnemy(e,(6+2*l)*dm,"#fff",null,null,true)}
      if(r.boss&&Math.hypot(r.boss.x-px,r.boss.y-py)<30&&(r.boss.oh||0)<=r.t){r.boss.oh=r.t+.35;hurtBoss((6+2*l)*dm)}}}
  for(const s of r.shots){s.t+=dt;s.x+=s.vx*dt;s.y+=s.vy*dt;s.rot+=dt*14;
    for(const e of r.en){if(s.hit.has(e))continue;if(Math.hypot(e.x-s.x,e.y-s.y)<ED[e.type].r+4){s.hit.add(e);hurtEnemy(e,s.d);s.p--;if(s.p<=0)break}}
    if(s.p>0&&r.boss&&!s.hit.has(r.boss)&&Math.hypot(r.boss.x-s.x,r.boss.y-s.y)<28){s.hit.add(r.boss);hurtBoss(s.d);s.p--}}
  r.shots=r.shots.filter(s=>s.t<1.3&&s.p>0);
  // enemies: chase, spread out a little, bite on a timer
  const cells=new Map();for(const e of r.en){const k=Math.floor(e.x/14)+","+Math.floor(e.y/14);(cells.get(k)||cells.set(k,[]).get(k)).push(e)}
  for(const e of r.en){const d=ED[e.type],[nx,ny,dist]=nrm(r.x-e.x,r.y-e.y);e.fl=Math.max(0,e.fl-dt);e.atk=Math.max(0,e.atk-dt);e.wob+=dt*4;
    let sp=e.spd;if(d.range&&dist<110)sp=-e.spd*.4;
    let sx=0,sy=0;const cx0=Math.floor(e.x/14),cy0=Math.floor(e.y/14);for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const L=cells.get((cx0+a)+","+(cy0+b));if(!L)continue;for(const o of L){if(o===e)continue;const [ox,oy,od]=nrm(e.x-o.x,e.y-o.y);if(od<d.r+ED[o.type].r-2&&od>0){sx+=ox*(d.r*2-od);sy+=oy*(d.r*2-od)}}}
    e.kx*=Math.pow(.02,dt);e.ky*=Math.pow(.02,dt);
    e.x+=(nx*sp+sx*4+e.kx+Math.sin(e.wob)*3)*dt;e.y+=(ny*sp+sy*4+e.ky+Math.cos(e.wob*.8)*3)*dt;
    if(d.range){e.shoot-=dt;if(e.shoot<=0&&dist<170){e.shoot=2.6;r.orbs.push({x:e.x,y:e.y,vx:nx*58,vy:ny*58,t:0,d:6})}}
    if(dist<d.r+6&&e.atk<=0){e.atk=.8;dmgPlayer(d.dmg*(1+(r.tier-1)*.2))}}
  for(let i=r.en.length-1;i>=0;i--){const e=r.en[i];if(e.hp<=0){killEnemy(e);r.en.splice(i,1)}else if(Math.hypot(e.x-r.x,e.y-r.y)>viewR()*3)r.en.splice(i,1)}
  for(const o of r.orbs){o.t+=dt;o.x+=o.vx*dt;o.y+=o.vy*dt;if(Math.hypot(o.x-r.x,o.y-r.y)<7){o.t=99;dmgPlayer(o.d)}}
  r.orbs=r.orbs.filter(o=>o.t<4);
  // the Wyrm: slow, heavy, and it warns you before every volley
  if(r.boss){const b=r.boss;b.t+=dt;b.fl=Math.max(0,b.fl-dt);const [nx,ny,dist]=nrm(r.x-b.x,r.y-b.y);b.x+=nx*26*dt;b.y+=ny*26*dt;
    if(dist<30)dmgPlayer(20);r.bossShot-=dt;r.bossWarn=r.bossShot<.7&&r.bossShot>0?1:0;
    if(r.bossShot<=0){r.bossShot=2.4;const n=10,off=Math.random()*6.28;for(let i=0;i<n;i++){const a=off+i*6.2832/n;r.orbs.push({x:b.x,y:b.y,vx:Math.cos(a)*62,vy:Math.sin(a)*62,t:0,d:8})}beep(100,.15,.05)}
    $("v2dbossi").style.width=Math.max(0,b.hp/b.max*100)+"%"}
  // pickups and veins
  const mag=(36+r.p.mag*9)*forgeMul("mag",.1);
  for(const g of r.gems){const [nx,ny,d]=nrm(r.x-g.x,r.y-g.y);if(d<mag||g.pull){g.pull=true;g.x+=nx*150*dt;g.y+=ny*150*dt}if(d<7){g.dead=true;giveXp(g.v)}}
  r.gems=r.gems.filter(g=>!g.dead);
  for(const g of r.golds){const [nx,ny,d]=nrm(r.x-g.x,r.y-g.y);if(d<mag*1.1||g.pull){g.pull=true;g.x+=nx*150*dt;g.y+=ny*150*dt}if(d<7){g.dead=true;const v=Math.round(g.v*forgeMul("gold",.06)*LAWD.gold*tierMul()*guildBuff("gold"));r.gold+=v;addTxt(r.x,r.y-18,"+"+v,"#ffd873");beep(880,.04,.02)}}
  r.golds=r.golds.filter(g=>!g.dead);
  for(const h of r.heals){const [nx,ny,d]=nrm(r.x-h.x,r.y-h.y);if(d<mag*.8){h.x+=nx*110*dt;h.y+=ny*110*dt}if(d<8){h.dead=true;const v=Math.round(r.hpMax*.15);r.hp=Math.min(r.hpMax,r.hp+v);addTxt(r.x,r.y-18,"+"+v,"#2bef8b");beep(560,.08,.03)}}
  r.heals=r.heals.filter(h=>!h.dead);
  for(let i=r.veins.length-1;i>=0;i--){const v=r.veins[i];if(v.hp<=0){for(let k=0;k<3;k++)r.golds.push({x:v.x+rr(-6,6),y:v.y+rr(-6,6),v:5});for(let k=0;k<2;k++)r.gems.push({x:v.x+rr(-6,6),y:v.y+rr(-6,6),v:2});r.veins.splice(i,1)}else if(Math.hypot(v.x-r.x,v.y-r.y)>viewR()*3)r.veins.splice(i,1)}
  for(const f of r.fx){f.t+=dt;if(f.k==="spark"){f.x+=f.vx*dt;f.y+=f.vy*dt;f.vy+=140*dt}}r.fx=r.fx.filter(f=>f.t<(f.k==="banner"?2.4:f.k==="spark"?.5:.4));
  for(const t of r.txt)t.t+=dt;r.txt=r.txt.filter(t=>t.t<.8);
  shakeT=Math.max(0,shakeT-dt);
  if(r.t>=DUR)endRun(true);
}
/* ---- drawing ---- */
function draw(){
  const r=run;dx.setTransform(1,0,0,1,0,0);dx.imageSmoothingEnabled=false;dx.fillStyle="#0a0b10";dx.fillRect(0,0,IW,IH);
  const px=r?Math.round(r.x):0,py=r?Math.round(r.y):0,sh=shakeT>0?Math.round(shakeT*6):0,sx=sh?rr(-sh,sh):0,sy=sh?rr(-sh,sh):0;
  const camX=px-Math.round(IW/2)+sx,camY=py-Math.round(IH/2)-6+sy;
  // floor
  const tx=((-camX%64)+64)%64,ty=((-camY%64)+64)%64;for(let y=ty-64;y<IH;y+=64)for(let x=tx-64;x<IW;x+=64)dx.drawImage(TILE,Math.round(x),Math.round(y));
  // scenery that never changes
  const c0x=Math.floor(camX/48)-1,c1x=Math.floor((camX+IW)/48)+1,c0y=Math.floor(camY/48)-1,c1y=Math.floor((camY+IH)/48)+1;
  for(let cy=c0y;cy<=c1y;cy++)for(let cx2=c0x;cx2<=c1x;cx2++){const h=hash2(cx2,cy);if(h>.34)continue;const x=cx2*48+hash2(cy,cx2)*40-camX,y=cy*48+hash2(cx2+9,cy)*40-camY,k=Math.floor(h*30);
    if(k<5){dx.fillStyle="#1c1e26";dx.fillRect(x,y,7,4);dx.fillStyle="#2a2d38";dx.fillRect(x,y,7,1)}
    else if(k<8){dx.fillStyle="#d9d4c4";dx.fillRect(x,y,6,1);dx.fillRect(x+1,y-1,1,3);dx.fillRect(x+4,y-1,1,3)}
    else{dx.fillStyle="#1d5a4a";dx.fillRect(x,y,2,3);dx.fillStyle="#3fd0a8";dx.fillRect(x,y,2,1);dx.fillStyle="rgba(63,208,168,.12)";dx.beginPath();dx.arc(x+1,y+1,6,0,7);dx.fill()}}
  if(!r){drawDark(px,py);return}
  const t=performance.now()/1000,X=v=>Math.round(v-camX),Y=v=>Math.round(v-camY);
  for(const v of r.veins){const x=X(v.x),y=Y(v.y);dx.fillStyle="rgba(0,0,0,.4)";dx.fillRect(x-7,y+3,14,2);
    [[0,0,6],[-6,2,4],[5,2,5],[2,-4,3]].forEach(([ox,oy,h])=>{dx.fillStyle="#2ee6d6";dx.beginPath();dx.moveTo(x+ox-3,y+oy+3);dx.lineTo(x+ox,y+oy-h);dx.lineTo(x+ox+3,y+oy+3);dx.fill();dx.fillStyle="rgba(255,255,255,.6)";dx.fillRect(x+ox,y+oy-h+1,1,h-1)})}
  for(const g of r.golds){const x=X(g.x),y=Y(g.y);dx.fillStyle="#ffd873";dx.fillRect(x-2,y-2,5,5);dx.fillStyle="#fff7c8";dx.fillRect(x-2,y-2,5,1);dx.fillStyle="#b5811f";dx.fillRect(x-2,y+2,5,1)}
  for(const h of r.heals){const x=X(h.x),y=Y(h.y);dx.fillStyle="#fff";dx.fillRect(x-4,y-4,8,8);dx.fillStyle="#d63a3a";dx.fillRect(x-1,y-3,2,6);dx.fillRect(x-3,y-1,6,2)}
  for(const g of r.gems){const x=X(g.x),y=Y(g.y);dx.fillStyle="#2ee6d6";dx.beginPath();dx.moveTo(x,y-3);dx.lineTo(x+2.5,y);dx.lineTo(x,y+3);dx.lineTo(x-2.5,y);dx.fill();dx.fillStyle="rgba(255,255,255,.7)";dx.fillRect(x-1,y-2,1,2)}
  for(const b of r.bombs){const x=X(b.x),y=Y(b.y);dx.fillStyle="#7a2c2c";dx.fillRect(x-2,y-6,4,8);dx.fillStyle="#ffd873";dx.fillRect(x,y-8,1,3);if(Math.sin(b.t*30)>0){dx.fillStyle="#ff8a2b";dx.fillRect(x-1,y-10,3,2)}}
  const all=[...r.en].sort((a,b)=>a.y-b.y);
  for(const e of all){const m=MAPS[e.type],d=ED[e.type],x=X(e.x),y=Y(e.y);if(x<-30||x>IW+30||y<-30||y>IH+30)continue;
    dx.fillStyle="rgba(0,0,0,.4)";dx.fillRect(x-d.r,y,d.r*2,2);drawMap(m.m,m.p,x,y+Math.round(Math.sin(e.wob*2)),d.s,r.x<e.x,e.fl>0);
    if(e.hp<e.max){const w=Math.min(18,d.r*2+4),yy=y-m.m.length*d.s-4;dx.fillStyle="#000";dx.fillRect(x-w/2,yy,w,2);dx.fillStyle="#ff5252";dx.fillRect(x-w/2,yy,w*Math.max(0,e.hp/e.max),2)}}
  if(r.boss&&wyrmImg&&wyrmImg.complete){const b=r.boss,x=X(b.x),y=Y(b.y);dx.fillStyle="rgba(0,0,0,.45)";dx.fillRect(x-30,y+18,60,4);dx.save();dx.translate(x,y);if(r.x<b.x)dx.scale(-1,1);dx.globalAlpha=b.fl>0?.55:1;dx.drawImage(wyrmImg,-39,-34,78,52);dx.restore();
    if(r.bossWarn&&Math.floor(t*14)%2){dx.strokeStyle="rgba(255,90,90,.9)";dx.lineWidth=2;dx.beginPath();dx.arc(x,y,40,0,7);dx.stroke()}}
  // you
  const ppx=X(r.x),ppy=Y(r.y);dx.fillStyle="rgba(0,0,0,.45)";dx.fillRect(ppx-7,ppy,14,3);
  if(minerImg&&minerImg.complete){dx.save();dx.translate(ppx,ppy+Math.round(Math.abs(Math.sin(r.walk))*-1.5));if(r.face<0)dx.scale(-1,1);if(r.dash>0)dx.globalAlpha=.55;else if(r.inv>0&&Math.floor(r.inv*20)%2)dx.globalAlpha=.4;dx.rotate(Math.max(-.12,Math.min(.12,r.vx/260)));dx.drawImage(minerImg,-10,-34,20,34);dx.restore()}
  else{dx.fillStyle="#f3b24a";dx.fillRect(ppx-4,ppy-14,8,14)}
  // weapons
  if(r.w.aura){const rad=(22+5*r.w.aura)*LAWD.lamp,a=.1+.05*Math.sin(t*5);dx.fillStyle=`rgba(255,200,90,${a})`;dx.beginPath();dx.arc(ppx,ppy-8,rad,0,7);dx.fill();dx.strokeStyle="rgba(255,216,115,.4)";dx.lineWidth=1;dx.stroke()}
  if(r.w.orbit){const l=r.w.orbit,n=[0,1,2,2,3,4][l],rad=24+l*1.5,spin=r.t*(2.4+l*.2);for(let i=0;i<n;i++){const a=spin+i*6.2832/n,x=ppx+Math.cos(a)*rad,y=ppy-8+Math.sin(a)*rad;dx.save();dx.translate(x,y);dx.rotate(a+1.6);dx.fillStyle="#7a5a3a";dx.fillRect(-1,-5,2,10);dx.fillStyle="#c9ccd2";dx.fillRect(-4,-5,8,3);dx.restore()}}
  for(const s of r.shots){dx.save();dx.translate(X(s.x),Y(s.y));dx.rotate(s.rot);dx.fillStyle="#7a5a3a";dx.fillRect(-1,-5,2,10);dx.fillStyle="#d3d8dd";dx.fillRect(-4,-5,8,3);dx.restore()}
  for(const o of r.orbs){const x=X(o.x),y=Y(o.y);dx.fillStyle="#c48cff";dx.beginPath();dx.arc(x,y,3,0,7);dx.fill();dx.fillStyle="#fff";dx.fillRect(x-1,y-1,1,1)}
  for(const f of r.fx){if(f.k==="swing"){const k=f.t/.22;dx.save();dx.translate(X(f.x),Y(f.y)-8);dx.rotate(f.a);dx.strokeStyle=`rgba(255,255,255,${.85*(1-k)})`;dx.lineWidth=3;dx.beginPath();dx.arc(0,0,f.rad*.8,-1+k*.8,.6+k*.8);dx.stroke();dx.restore()}
    else if(f.k==="boom"){const k=f.t/.35;dx.fillStyle=`rgba(255,160,60,${.6*(1-k)})`;dx.beginPath();dx.arc(X(f.x),Y(f.y),f.rad*(.4+.6*k),0,7);dx.fill();dx.strokeStyle=`rgba(255,230,160,${1-k})`;dx.lineWidth=2;dx.stroke()}
    else if(f.k==="spark"){dx.fillStyle=f.c||"#ffd873";dx.fillRect(Math.round(X(f.x)),Math.round(Y(f.y)),2,2)}}
  dx.font="700 8px Figtree,system-ui,sans-serif";dx.textAlign="center";dx.lineWidth=2;dx.strokeStyle="#000";
  for(const tx2 of r.txt){const u=tx2.t/.8;dx.globalAlpha=1-u*u;const xx=X(tx2.x),yy=Math.round(Y(tx2.y)-u*14);dx.strokeText(tx2.s,xx,yy);dx.fillStyle=tx2.c;dx.fillText(tx2.s,xx,yy)}dx.globalAlpha=1;
  drawDark(px,py);
  for(const f of r.fx){if(f.k==="flash"){dx.fillStyle=`rgba(255,40,40,${.3*(1-f.t/.4)})`;dx.fillRect(0,0,IW,IH)}
    else if(f.k==="banner"){const a=Math.min(1,f.t*3)*Math.min(1,(2.4-f.t)*2);dx.globalAlpha=a;dx.font="700 20px Figtree,system-ui,sans-serif";dx.lineWidth=4;dx.strokeStyle="#000";dx.strokeText(f.txt,IW/2,IH*.3);dx.fillStyle="#ff6a6a";dx.fillText(f.txt,IW/2,IH*.3);dx.globalAlpha=1}}
  if(joy&&joy.on){dx.strokeStyle="rgba(255,255,255,.4)";dx.lineWidth=1;dx.beginPath();dx.arc(joy.x/ZS,joy.y/ZS,18,0,7);dx.stroke();dx.fillStyle="rgba(255,255,255,.35)";dx.beginPath();dx.arc(joy.x/ZS+joy.dx*14,joy.y/ZS+joy.dy*14,7,0,7);dx.fill()}
}
function drawDark(px,py){const lr=Math.max(IW,IH)*.7*LAWD.lamp,g=dx.createRadialGradient(IW/2,IH/2-6,34,IW/2,IH/2-6,lr);g.addColorStop(0,"rgba(0,0,0,0)");g.addColorStop(.6,"rgba(0,0,0,.22)");g.addColorStop(1,"rgba(0,0,0,.78)");dx.fillStyle=g;dx.fillRect(0,0,IW,IH);
  const gl=dx.createRadialGradient(IW/2,IH/2-8,0,IW/2,IH/2-8,80);gl.addColorStop(0,"rgba(255,190,90,.13)");gl.addColorStop(1,"rgba(255,190,90,0)");dx.fillStyle=gl;dx.fillRect(0,0,IW,IH)}
function hud(){
  const r=run;if(!r)return;
  $("v2dhp").style.width=Math.max(0,r.hp/r.hpMax*100)+"%";$("v2dhpt").textContent=Math.max(0,Math.ceil(r.hp))+" / "+r.hpMax;
  $("v2dxp").style.width=clamp(r.xp/r.need*100,0,100)+"%";$("v2dlv").textContent="Lv "+r.lvl;
  const left=Math.max(0,DUR-r.t);$("v2dtime").textContent=Math.floor(left/60)+":"+String(Math.floor(left%60)).padStart(2,"0");
  $("v2dobj").textContent=r.boss?"Kill the Wyrm or outlast it":r.t<BOSS_AT?"Survive":"Hold on";$("v2dgold").textContent=r.gold;$("v2dkills").textContent=r.kills+" kills";
  const db=$("v2ddash");db.style.setProperty("--cd",clamp(r.dashCd/2.2,0,1));db.classList.toggle("rdy",r.dashCd<=0);
}
/* ---- the loop: never advances while paused, hidden, or choosing a perk ---- */
function loop(now){
  const dt=Math.min(.033,(now-lastT)/1000);lastT=now;
  if(vis("dive")&&dcv.offsetParent!==null){
    if(run&&!run.over&&!run.paused&&!run.userPause)update(dt);
    draw();if(run&&now-hudT>110){hudT=now;hud()}
  }else if(run&&!run.over&&!run.userPause){setPause(true)}
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
function setPause(on){if(!run||run.over)return;run.userPause=on;keys={};joy=null;dashHeld=false;$("v2dpause").hidden=!on;if(!on)lastT=performance.now()}
$("v2dpb").onclick=()=>setPause(!(run&&run.userPause));
$("v2dresume").onclick=()=>setPause(false);
$("v2dquit").onclick=()=>{if(run&&!run.over){$("v2dpause").hidden=true;endRun(false)}};
$("v2ddash").addEventListener("pointerdown",e=>{e.stopPropagation();dashHeld=true});
/* ---- input ---- */
const MOVE={ArrowLeft:"ArrowLeft",ArrowRight:"ArrowRight",ArrowUp:"ArrowUp",ArrowDown:"ArrowDown",KeyA:"a",KeyD:"d",KeyW:"w",KeyS:"s"};
window.addEventListener("keydown",e=>{
  if(!vis("dive")||!run||run.over)return;
  if(e.code==="Escape"||e.code==="KeyP"){e.preventDefault();if(!run.paused)setPause(!run.userPause);return}
  if(run.paused&&run.choose&&["Digit1","Digit2","Digit3"].includes(e.code)){const f=run.choose[+e.code.slice(5)-1];if(f){e.preventDefault();f()}return}
  if(run.paused||run.userPause)return;
  if(MOVE[e.code]){keys[MOVE[e.code]]=true;e.preventDefault()}else if(e.code==="Space"||e.code==="ShiftLeft"){keys[" "]=true;e.preventDefault()}});
window.addEventListener("keyup",e=>{if(MOVE[e.code])keys[MOVE[e.code]]=false;if(e.code==="Space"||e.code==="ShiftLeft")keys[" "]=false});
window.addEventListener("blur",()=>{keys={};if(run&&!run.over&&!run.paused)setPause(true)});
document.addEventListener("visibilitychange",()=>{if(document.hidden&&run&&!run.over&&!run.paused)setPause(true)});
dcv.addEventListener("pointerdown",e=>{if(!run||run.over||run.paused||run.userPause)return;const b=dcv.getBoundingClientRect();joy={on:true,x:e.clientX-b.left,y:e.clientY-b.top,dx:0,dy:0,id:e.pointerId};try{dcv.setPointerCapture(e.pointerId)}catch(_){}});
dcv.addEventListener("pointermove",e=>{if(!joy||!joy.on||e.pointerId!==joy.id)return;const b=dcv.getBoundingClientRect(),x=e.clientX-b.left-joy.x,y=e.clientY-b.top-joy.y,[nx,ny,d]=nrm(x,y),R=34;if(d<6){joy.dx=0;joy.dy=0;return}const k=Math.min(1,d/R);joy.dx=nx*k;joy.dy=ny*k;if(d>R*1.6){joy.x+=nx*(d-R*1.6);joy.y+=ny*(d-R*1.6)}});
const endJoy=e=>{if(joy&&e.pointerId===joy.id){joy.on=false;joy.dx=joy.dy=0}};dcv.addEventListener("pointerup",endJoy);dcv.addEventListener("pointercancel",endJoy);
/* ---- screens ---- */
function showStart(){
  recomputeRX();run=null;$("v2dhud").hidden=true;$("v2dboss").hidden=true;$("v2dwl").innerHTML="";$("v2dpause").hidden=true;$("v2dctl").hidden=true;
  const ov=$("v2dstart");ov.hidden=false;ov.innerHTML="";const box=el("div","v2-dbox");
  box.append(el("p","lbl","Debt tier"),el("h2","","The Dive"));
  const best=V.st.bestScore;box.append(el("p","note",best?"Best score "+best+" · best level "+V.st.bestLevel+" · Wyrm slain "+V.st.boss+" times":"Three minutes. A boss at 2:20. Your haul turns into cash and fills your Camp's warehouse."));
  const tr=el("div","v2-tiers");for(let i=1;i<=5;i++){const b=el("button","v2-tier2"+(i===V.tier?" on":""));b.innerHTML="Tier "+i+"<small>"+(i===1?"standard":"×"+(1+(i-1)*.55).toFixed(1)+" foes · ×"+(1+(i-1)*.55).toFixed(1)+" loot")+"</small>";b.disabled=i>V.maxTier;b.onclick=()=>{V.tier=i;showStart()};tr.append(b)}box.append(tr);
  const kit=[];FORGE.forEach(f=>{if(fl(f.id))kit.push(f.n+" "+fl(f.id))});equip.filter(x=>x!==null).forEach(i=>kit.push(RL[i].n));
  box.append(el("p","note","Your kit: "+(kit.length?kit.join(" · "):"nothing forged yet. Spend Camp cash in the Forge.")));
  const gb=guildBuffText();if(gb)box.append(el("p","note","Guild holdings: "+gb));
  box.append(el("p","note","Move: WASD, arrows, or drag. Dash: Space. Pause: Esc. Terms: Blue Lamps (more light), Salted Wages (+10% gold, -10% XP), The Quiet Floor (fewer foes, a tougher Wyrm)."));
  const go=el("button","buy","Descend");go.style.cssText="min-width:200px;height:48px;font-size:17px";go.onclick=()=>{ov.hidden=true;$("v2dend").hidden=true;newRun();$("v2dhud").hidden=false;$("v2dctl").hidden=false;$("v2dboss").hidden=true;lastT=performance.now();beep(330,.1,.04)};box.append(go);ov.append(box);
}
function endRun(win){
  const r=run;if(!r||r.over)return;r.over=true;r.paused=true;keys={};joy=null;$("v2dctl").hidden=true;$("v2dboss").hidden=true;
  const tm=tierMul(),score=Math.round(r.kills*2+r.gold*2+(r.bossDone?200:0)+r.lvl*15);
  const gv=Math.max(5,campRate()*.5),cash=Math.round(r.gold*gv*(win?1:.5)*tm),now=Math.round(cash*.6),stock=cash-now;
  earn(now);rt.wh.stock+=stock;const shards=Math.round(r.gold*(win?1:.5)*tm*.25);V.shards+=shards;
  V.st.dives++;V.st.kills+=r.kills;V.st.bestLevel=Math.max(V.st.bestLevel,r.lvl);V.st.bestScore=Math.max(V.st.bestScore,score);V.lastScore=score;if(win){V.st.wins++;if(V.tier===V.maxTier&&V.maxTier<5)V.maxTier++}
  if(win)confetti(40);
  const ov=$("v2dend");ov.hidden=false;ov.innerHTML="";const box=el("div","v2-dbox");
  box.append(el("p","lbl",win?"You climb out":"You fall"),el("h2","",win?"Back in the light":"The dark wins"));
  const sm=el("div","v2-sum");[["Score",score],["Level",r.lvl],["Kills",r.kills],["Gold",r.gold]].forEach(x=>{const d=el("div");d.append(el("small","",x[0]),el("b","",x[1]));sm.append(d)});box.append(sm);
  const L=el("div","v2-loot");L.innerHTML=`<div><small>Cash now</small><b style="color:var(--green)">+${money(now)}</b></div><div><small>In your Camp warehouse</small><b style="color:var(--lamp2)">+${money(stock)}</b></div><div><small>Relic shards</small><b style="color:var(--gem)">+${shards}</b></div>`;box.append(L);
  box.append(el("p","note",(r.bossDone?"You killed the Wyrm. ":r.boss?"The Wyrm outlasted you. ":"")+(win?"You kept it all.":"You keep half the haul.")+(win&&V.tier===V.maxTier-1&&V.maxTier>1?" Tier "+V.maxTier+" unlocked.":"")));
  const pts=Math.round(score/20*RX.push);
  const pl=el("button","buy","Plant "+score+" in "+DN[selG]+" for the "+GN[me]+" (+"+pts+" pts)");pl.style.cssText="width:100%";pl.onclick=()=>{D[selG][me]+=pts;V.st.planted++;V.pushes++;feed("<b>You</b> planted a "+score+" dive in "+DN[selG]+" for the "+GN[me]+" (+"+pts+").");toast("Planted. The "+GN[me]+" gain "+pts+" in "+DN[selG]+".");pl.disabled=true;drawG();drawA();stripUpdate2()};box.append(pl);
  const again=el("button","big","Dive again");again.style.cssText="width:100%";again.onclick=showStart;box.append(again);ov.append(box);drawF();drawA();
}
window.v2dbg={newRun,update,get run(){return run},setKeys:k=>{keys=k},levelPick:()=>{if(run&&run.choose&&run.choose[0])run.choose[0]()},endRun};
