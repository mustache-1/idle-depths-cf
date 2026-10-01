
/* ================= THE CAMP, REBUILT ================= */
const cs=E.newState();let rt=E.makeRT(cs),qty=1;
cs.levels=JSON.parse(JSON.stringify(CAMP0.levels));cs.elev=JSON.parse(JSON.stringify(CAMP0.elev));cs.wh=JSON.parse(JSON.stringify(CAMP0.wh));
const CW=480,SURF=128,RH=86;
const ccv=$("v2ccv"),cc=ccv.getContext("2d");let CK=1;
const cH=()=>SURF+Math.min(cs.levels.length+1,E.MAX_LV)*RH+8;
let cShown=-1;
function fitC(){const r=ccv.getBoundingClientRect();if(!r.width)return;const h=cH();ccv.style.aspectRatio=CW+"/"+h;const r2=ccv.getBoundingClientRect();CK=Math.min(2.5,(window.devicePixelRatio||1)*r2.width/CW);ccv.width=Math.round(CW*CK);ccv.height=Math.round(h*CK);cShown=cs.levels.length}
new ResizeObserver(()=>fitC()).observe(ccv);
const cpal=i=>PAL[Math.min(i+1,PAL.length-1)];
const mkCv=(w,h)=>{const c=document.createElement("canvas");c.width=w*2;c.height=h*2;const g=c.getContext("2d");g.scale(2,2);return [c,g]};
function beamC(g,x,y,w,h){g.fillStyle="#5a3f26";g.fillRect(x,y,w,h);g.fillStyle="#8a6a4a";g.fillRect(x,y,w,Math.min(3,h));g.fillStyle="#2c1d10";g.fillRect(x,y,Math.min(2,w),h);g.fillStyle="rgba(0,0,0,.4)";g.fillRect(x+w-1.5,y,1.5,h)}
/* static art, drawn once and cached */
let surfArt=null;const rowArt={};
function buildSurf(){
  const [c,g]=mkCv(CW,SURF),R=rnd(9);
  g.fillStyle="#12142a";g.beginPath();g.moveTo(0,SURF-20);for(let x=0;x<=CW;x+=12)g.lineTo(x,SURF-44-16*Math.sin(x*.02)-9*Math.sin(x*.07));g.lineTo(CW,SURF);g.lineTo(0,SURF);g.fill();
  g.fillStyle="#1c1730";g.beginPath();g.moveTo(0,SURF-12);for(let x=0;x<=CW;x+=10)g.lineTo(x,SURF-30-11*Math.sin(x*.03+1)-6*Math.sin(x*.09));g.lineTo(CW,SURF);g.lineTo(0,SURF);g.fill();
  // ground, rails
  g.fillStyle="#4d7a38";g.fillRect(0,SURF-24,CW,6);g.fillStyle="#6b8f4a";g.fillRect(0,SURF-24,CW,2);g.fillStyle=PAL[0].floor;g.fillRect(0,SURF-18,CW,18);g.fillStyle="rgba(0,0,0,.35)";g.fillRect(0,SURF-18,CW,18);
  for(let i=0;i<70;i++){g.fillStyle="rgba(0,0,0,.22)";g.fillRect(R()*CW,SURF-16+R()*14,2+R()*8,1)}
  g.fillStyle="#3a3a40";g.fillRect(70,SURF-22,330,2);for(let x=74;x<400;x+=11){g.fillStyle="#5a3f26";g.fillRect(x,SURF-24,3,8)}
  // winch tower over the lift
  beamC(g,12,34,6,SURF-60);beamC(g,48,34,6,SURF-60);beamC(g,8,30,50,6);g.strokeStyle="#4a3016";g.lineWidth=2;g.beginPath();g.moveTo(18,40);g.lineTo(48,SURF-30);g.moveTo(48,40);g.lineTo(18,SURF-30);g.stroke();
  // foreman's hut
  g.fillStyle="#3b2c20";g.fillRect(70,SURF-52,40,30);g.fillStyle="#5a3f26";g.beginPath();g.moveTo(64,SURF-50);g.lineTo(90,SURF-68);g.lineTo(116,SURF-50);g.fill();g.fillStyle="#15110c";g.fillRect(84,SURF-40,12,18);
  // warehouse
  g.fillStyle="#4a3a2c";g.fillRect(150,SURF-78,110,56);g.fillStyle="#7a5a3a";g.fillRect(150,SURF-78,110,4);
  g.fillStyle="#5a3f26";g.beginPath();g.moveTo(142,SURF-76);g.lineTo(205,SURF-102);g.lineTo(268,SURF-76);g.fill();g.fillStyle="#8a6a4a";g.beginPath();g.moveTo(142,SURF-76);g.lineTo(205,SURF-102);g.lineTo(268,SURF-76);g.lineTo(263,SURF-76);g.lineTo(205,SURF-97);g.lineTo(147,SURF-76);g.fill();
  g.fillStyle="#15110c";g.fillRect(172,SURF-60,66,38);g.fillStyle="#6b4a2c";g.fillRect(172,SURF-60,66,3);
  g.fillStyle="#ffd873";g.font="700 8px Figtree,system-ui,sans-serif";g.textAlign="center";g.fillText("WAREHOUSE",205,SURF-84);
  g.fillStyle="#2a2018";g.fillRect(252,SURF-110,8,22);
  // market
  g.fillStyle="#3b3040";g.fillRect(370,SURF-62,92,40);for(let i=0;i<8;i++){g.fillStyle=i%2?"#efe6d2":"#d04a3f";g.fillRect(366+i*12,SURF-76,12,16)}
  g.fillStyle="#15110c";g.fillRect(388,SURF-50,56,28);g.fillStyle="#ffd873";g.fillText("MARKET",416,SURF-82);
  g.fillStyle="#7a5a3a";g.fillRect(372,SURF-34,14,12);g.fillRect(448,SURF-34,14,12);
  surfArt=c;
}
function buildRow(i){
  const [c,g]=mkCv(CW,RH),p=cpal(i),R=rnd(i*5+2);
  g.fillStyle=p.wall[2];g.fillRect(0,0,CW,RH);
  for(let y=0;y<RH;y+=10)for(let x=-8;x<CW;){const w=12+R()*20,h=8+R()*3;g.fillStyle=p.wall[Math.floor(R()*p.wall.length)];g.fillRect(x,y,w-1.5,h);g.fillStyle="rgba(255,255,255,.05)";g.fillRect(x,y,w-1.5,1.5);g.fillStyle="rgba(0,0,0,.3)";g.fillRect(x,y+h-1.5,w-1.5,1.5);if(R()<.1){g.fillStyle=p.ore;g.fillRect(x+3+R()*(w-8),y+2,3,3)}x+=w}
  g.fillStyle="#0a0806";g.fillRect(0,0,CW,3);
  // the tunnel, with timber frames
  g.fillStyle="#1a1511";g.fillRect(58,10,CW-58,RH-22);g.fillStyle="rgba(0,0,0,.3)";g.fillRect(58,10,CW-58,10);for(const x of [100,200,300,400]){const gr=g.createRadialGradient(x,34,0,x,34,70);gr.addColorStop(0,"rgba(255,190,100,.14)");gr.addColorStop(1,"rgba(255,190,100,0)");g.fillStyle=gr;g.fillRect(x-70,0,140,RH)}
  for(const x of [120,210,300,390]){beamC(g,x,10,6,RH-26);beamC(g,x-6,10,18,5)}
  g.fillStyle=p.floor;g.fillRect(58,RH-16,CW-58,6);g.fillStyle="rgba(255,255,255,.12)";g.fillRect(58,RH-16,CW-58,1.5);g.fillStyle="rgba(0,0,0,.4)";g.fillRect(58,RH-10,CW-58,10);
  g.fillStyle="#3a3a40";g.fillRect(60,RH-12,CW-60,2);
  // the ore face
  g.fillStyle=p.wall[0];g.beginPath();g.moveTo(CW-52,10);for(let y=10;y<=RH-16;y+=8)g.lineTo(CW-52+7*Math.sin(y*.4+i),y);g.lineTo(CW,RH-16);g.lineTo(CW,10);g.fill();
  for(let k=0;k<12;k++){g.fillStyle=p.ore==="#1c1c1c"?"#7ac9ff":p.ore;g.fillRect(CW-46+R()*40,14+R()*(RH-40),2+R()*3,2+R()*2)}
  // the deposit box
  g.fillStyle="#5a3f26";g.fillRect(64,RH-34,30,18);g.fillStyle="#8a6a4a";g.fillRect(64,RH-34,30,3);g.fillStyle="#2c1d10";g.fillRect(64,RH-34,2,18);
  rowArt[i]=c;
}
/* effects, state and drawing */
const cp={coins:[],txt:[],puffs:[],dust:[]};
let cIncRect=null;
function cWorker(x,y,face,t,mode,w,sack){
  if(!mMiner||!mMiner.complete)return;
  cc.save();cc.translate(Math.round(x),Math.round(y));if(face<0)cc.scale(-1,1);
  const bob=mode==="walk"?Math.abs(Math.sin(t*12+w))*1.5:0;
  cc.fillStyle="rgba(0,0,0,.4)";cc.beginPath();cc.ellipse(0,1,8,2.4,0,0,7);cc.fill();
  cc.drawImage(mMiner,-14,-50-bob,28,48);
  const ang=mode==="dig"?-1.4+Math.sin(t*9+w)*1.1:mode==="walk"?.9:.5;
  cc.save();cc.translate(8,-28-bob);cc.rotate(ang);cc.fillStyle="#7a5a3a";cc.fillRect(0,-1,16,2);cc.fillStyle="#cfd4da";cc.fillRect(14,-5,3,10);cc.restore();
  if(sack){cc.fillStyle="#8b6b3b";cc.beginPath();cc.arc(-5,-26-bob,6,0,7);cc.fill()}
  cc.restore();
}
function cagePx(y){return y<=1?lerp(SURF-52,SURF+RH-56,clamp(y,0,1)):SURF+(y-1)*RH+RH-56}
function glowC(x,y,r,c,a){const g=cc.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(${c[0]},${c[1]},${c[2]},${a})`);g.addColorStop(1,`rgba(${c[0]},${c[1]},${c[2]},0)`);cc.globalCompositeOperation="lighter";cc.fillStyle=g;cc.fillRect(x-r,y-r,r*2,r*2);cc.globalCompositeOperation="source-over"}
const mixc=(a,b,t)=>a.map((v,i)=>Math.round(lerp(v,b[i],t)));
function drawCamp(dt){
  const n=cs.levels.length,H=cH();if(cShown!==n)fitC();if(!surfArt)buildSurf();
  const t=performance.now()/1000,k=.5+.5*Math.sin(t/38);
  cc.setTransform(CK,0,0,CK,0,0);cc.imageSmoothingEnabled=false;
  // sky: dusk to night and back, with stars
  const top=mixc([20,24,52],[6,8,18],k),mid=mixc([90,50,80],[16,14,40],k),hor=mixc([214,112,62],[40,26,64],k);
  const g=cc.createLinearGradient(0,0,0,SURF-20);g.addColorStop(0,`rgb(${top})`);g.addColorStop(.6,`rgb(${mid})`);g.addColorStop(1,`rgb(${hor})`);cc.fillStyle=g;cc.fillRect(0,0,CW,SURF);
  const R=rnd(4);for(let i=0;i<36;i++){cc.fillStyle=`rgba(255,255,255,${(.2+.7*k)*(.5+.5*Math.sin(t*2+i))})`;cc.fillRect(Math.floor(R()*CW),Math.floor(R()*60),1.2,1.2)}
  const mx2=((t*3)%(CW+80))-40;cc.fillStyle=`rgba(255,255,255,${.06+.05*(1-k)})`;cc.beginPath();cc.ellipse(mx2,28,30,7,0,0,7);cc.ellipse(mx2+22,24,20,6,0,0,7);cc.fill();
  cc.fillStyle=`rgba(230,235,255,${.15+.75*k})`;cc.beginPath();cc.arc(420,24,8,0,7);cc.fill();
  cc.drawImage(surfArt,0,0,CW,SURF);
  // lit windows and lamps, brighter at night
  const win=.35+.65*k;cc.fillStyle=`rgba(255,200,110,${win})`;cc.fillRect(92,SURF-44,6,8);cc.fillRect(160,SURF-70,8,8);cc.fillRect(244,SURF-70,8,8);
  glowC(95,SURF-40,28,[255,190,90],.35*win);glowC(205,SURF-48,70,[255,190,90],.18*win);glowC(416,SURF-50,60,[255,190,90],.22*win);
  // smoke
  if(Math.random()<dt*4)cp.puffs.push({x:256,y:SURF-110,t:0});
  for(const s of cp.puffs){s.t+=dt;s.y-=dt*14;s.x+=dt*6;cc.fillStyle=`rgba(190,190,200,${.3*(1-s.t/3)})`;cc.beginPath();cc.arc(s.x,s.y,3+s.t*4,0,7);cc.fill()}cp.puffs=cp.puffs.filter(s=>s.t<3);
  // winch wheel turns with the lift
  const e=rt.el,moving=e.state==="down"||e.state==="up";cShown>=0&&(cWheel+=moving?dt*(e.state==="down"?1:-1)*5:0);
  cc.save();cc.translate(33,30);cc.rotate(cWheel);cc.strokeStyle="#8a97a2";cc.lineWidth=2;cc.beginPath();cc.arc(0,0,12,0,7);cc.moveTo(-12,0);cc.lineTo(12,0);cc.moveTo(0,-12);cc.lineTo(0,12);cc.stroke();cc.restore();
  // the hauler runs warehouse to market on its rails
  const w=rt.wh;let hx=238;if(w.state==="go")hx=lerp(238,340,clamp(w.t,0,1));else if(w.state==="back")hx=lerp(340,238,clamp(w.t,0,1));const hd=w.state==="back"?-1:1;
  cc.save();cc.translate(hx,SURF-22);cc.scale(hd,1);cc.fillStyle="rgba(0,0,0,.4)";cc.beginPath();cc.ellipse(0,1,18,3,0,0,7);cc.fill();cc.fillStyle="#ff8a2b";cc.fillRect(-16,-18,32,12);cc.fillStyle="#c95a0f";cc.fillRect(6,-24,10,8);cc.fillStyle="#ffcf7a";cc.fillRect(9,-22,5,4);
  if(w.state==="go"){cc.fillStyle="#ffd873";cc.fillRect(-14,-24,18,7);cc.fillStyle="#b5811f";cc.fillRect(-14,-20,18,2)}
  cc.fillStyle="#111";for(const wx of [-9,9]){cc.beginPath();cc.arc(wx,-4,4.4,0,7);cc.fill();cc.fillStyle="#666";cc.fillRect(wx-1,-5+Math.sin(t*14)*1,2,2);cc.fillStyle="#111"}cc.restore();
  // warehouse stock through the open door
  const fillW=clamp(w.stock/Math.max(1,E.whCap(cs.wh)*2),0,1),crates=Math.ceil(fillW*9);
  for(let i=0;i<crates;i++){const x=176+(i%5)*12,y=SURF-26-Math.floor(i/5)*11;cc.fillStyle="#7a5a3a";cc.fillRect(x,y,11,10);cc.fillStyle="#ffd873";cc.fillRect(x+2,y+2,7,2)}
  // market shoppers
  for(let i=0;i<3;i++){const x=396+i*18+Math.sin(t*.7+i*2)*4;cWorkerNPC(x,SURF-22,i,t)}
  // shafts
  for(let i=0;i<=Math.min(n,E.MAX_LV-1);i++){
    const y0=SURF+i*RH;if(!rowArt[i])buildRow(i);cc.drawImage(rowArt[i],0,y0,CW,RH);
    if(i>=n){cc.fillStyle="rgba(0,0,0,.55)";cc.fillRect(58,y0+10,CW-58,RH-22);cc.fillStyle="#98a2b8";cc.font="600 11px Figtree,system-ui,sans-serif";cc.textAlign="center";cc.fillText("Shaft "+(i+1)+" · locked",270,y0+RH/2+3);continue}
    const lv=cs.levels[i],r=rt.lv[i],floor=y0+RH-16;
    for(const lx of [165,345]){const fl=.8+.2*Math.sin(t*9+lx+i);glowC(lx,y0+26,52,[255,170,80],.22*fl);cc.fillStyle="#ffd28a";cc.fillRect(lx-2,y0+22,4,5)}
    // deposit pile
    const f=clamp((r?r.dep:0)/Math.max(1,E.elCap(cs.elev)*.5),0,1),bits=Math.ceil(f*14),pl=cpal(i);
    for(let b=0;b<bits;b++){cc.fillStyle=pl.ore==="#1c1c1c"?"#7ac9ff":pl.ore;const bx=68+(b%6)*4.5,by=y0+RH-36-Math.floor(b/6)*4;cc.fillRect(bx,by,4,3.4)}
    // the crew at work
    const wk=Math.min(4,1+Math.floor(lv.L/25));
    for(let q=0;q<wk;q++){const baseX=424-q*16,depX=104+q*10;let x=baseX,face=1,mode="dig",sack=false;
      if(r&&r.run&&!r.blocked){const ph=(r.ph+q*.17)%1;if(ph<.5){x=baseX}else if(ph<.78){x=lerp(baseX,depX,(ph-.5)/.28);face=-1;mode="walk";sack=true}else if(ph<.86){x=depX;face=-1;mode="idle"}else{x=lerp(depX,baseX,(ph-.86)/.14);mode="walk"}}
      else mode=r&&r.blocked?"idle":"dig";
      cWorker(x,floor,face,t,(r&&r.run&&!r.blocked)||mode==="idle"?mode:"idle",q,sack)}
    // name plate
    cc.fillStyle="rgba(10,8,6,.8)";cc.fillRect(62,y0+8,92,14);cc.strokeStyle="#7a5a3a";cc.lineWidth=1;cc.strokeRect(62.5,y0+8.5,91,13);cc.fillStyle="#ffd873";cc.font="700 8.5px Figtree,system-ui,sans-serif";cc.textAlign="left";cc.fillText("SHAFT "+(i+1)+(lv.fname?" · "+lv.fname:""),67,y0+18);
    // incidents in this shaft
    if(r&&r.blocked){for(const [x,yy,w2,h2] of [[190,0,26,20],[206,-8,28,26],[228,2,22,18],[244,-4,24,22],[200,4,40,12]]){cc.fillStyle=["#6b6b70","#58585e","#7a7a82"][Math.floor(x)%3];cc.beginPath();cc.moveTo(x,floor);cc.lineTo(x+3,floor-h2+yy);cc.lineTo(x+w2-3,floor-h2+yy+2);cc.lineTo(x+w2,floor);cc.fill()}cc.fillStyle="#ff8a8a";cc.font="700 9px Figtree,system-ui,sans-serif";cc.textAlign="center";cc.fillText("CAVE-IN · TAP",228,y0+36)}
    if(r&&r.vein){const a=.5+.5*Math.sin(t*8);glowC(CW-26,y0+RH/2-4,34,[46,230,214],.4+.3*a);for(const [dx,dy] of [[0,0],[9,8],[-9,10],[14,-8]]){cc.fillStyle="#7cf5e8";cc.beginPath();cc.moveTo(CW-30+dx,y0+RH/2+dy+6);cc.lineTo(CW-27+dx,y0+RH/2+dy-8);cc.lineTo(CW-24+dx,y0+RH/2+dy+6);cc.fill()}cc.fillStyle="#7cf5e8";cc.font="700 9px Figtree,system-ui,sans-serif";cc.textAlign="center";cc.fillText("RICH VEIN",CW-26,y0+16)}
    // tap hint
    if(!E.auto(lv)&&r&&!r.run&&!r.blocked&&Math.sin(t*5)>-.3){cc.fillStyle="#ffb01f";cc.font="700 10px Figtree,system-ui,sans-serif";cc.textAlign="center";cc.fillText("TAP",424,y0+RH-62)}
  }
  // the lift: shaft, cable, cage
  cc.fillStyle="#06080c";cc.fillRect(8,SURF-30,44,H-SURF+30);cc.fillStyle="#2c1d10";cc.fillRect(10,SURF-30,2,H-SURF+30);cc.fillRect(48,SURF-30,2,H-SURF+30);
  for(let y=SURF;y<H;y+=14){cc.fillStyle="rgba(255,255,255,.04)";cc.fillRect(12,y,36,1)}
  const cy=cagePx(e.y);cc.strokeStyle="#c9c4bb";cc.lineWidth=1.2;cc.beginPath();cc.moveTo(30,38);cc.lineTo(30,cy);cc.stroke();
  const cg=cc.createLinearGradient(14,0,46,0);cg.addColorStop(0,"#b5731f");cg.addColorStop(.5,"#ffa83a");cg.addColorStop(1,"#b5731f");cc.fillStyle=cg;cc.fillRect(14,cy,32,36);cc.fillStyle="#f2b24c";cc.fillRect(14,cy,32,3);cc.fillStyle="#14100c";cc.fillRect(19,cy+7,22,17);
  const ef=Math.round(clamp(e.carried/Math.max(1,E.elCap(cs.elev)),0,1)*17);cc.fillStyle="#ffd873";cc.fillRect(19,cy+24-ef,22,ef);cc.fillStyle="#6b4310";cc.fillRect(14,cy+31,32,5);
  glowC(30,cy+14,34,[255,200,120],.28);
  if(e.state==="load"||e.state==="unload"){cc.fillStyle=`rgba(255,240,180,${.35*Math.sin(t*30)**2})`;cc.fillRect(14,cy,32,36)}
  // taps
  if(!E.auto(cs.elev)&&e.state==="idle"&&rt.lv.some(q=>q.dep>0)&&Math.sin(t*5)>-.3){cc.fillStyle="#ffb01f";cc.font="700 10px Figtree,system-ui,sans-serif";cc.textAlign="center";cc.fillText("TAP",30,18)}
  if(!E.auto(cs.wh)&&w.state==="idle"&&w.stock>0&&Math.sin(t*5)>-.3){cc.fillStyle="#ffb01f";cc.font="700 10px Figtree,system-ui,sans-serif";cc.textAlign="center";cc.fillText("TAP",205,12)}
  // coins and text
  for(const c of cp.coins){c.t+=dt;c.vy+=420*dt;c.x+=c.vx*dt;c.y+=c.vy*dt;const wd=Math.abs(Math.cos(c.t*10));cc.fillStyle="#ffd873";cc.beginPath();cc.ellipse(c.x,c.y,3*wd+.6,3,0,0,7);cc.fill()}cp.coins=cp.coins.filter(c=>c.t<1.1);
  for(const x of cp.txt){x.t+=dt;const u=x.t/1.2;cc.globalAlpha=1-u*u;cc.font=`700 ${x.big?13:10}px Figtree,system-ui,sans-serif`;cc.textAlign="center";cc.lineWidth=3;cc.strokeStyle="#000";cc.strokeText(x.s,x.x,x.y-u*26);cc.fillStyle=x.c;cc.fillText(x.s,x.x,x.y-u*26);cc.globalAlpha=1}cp.txt=cp.txt.filter(x=>x.t<1.2);
  // night shade and a soft vignette
  cc.fillStyle=`rgba(0,0,12,${.05+.2*k})`;cc.fillRect(0,0,CW,SURF);
  const vg=cc.createLinearGradient(0,0,CW,0);vg.addColorStop(0,"rgba(0,0,0,.25)");vg.addColorStop(.12,"rgba(0,0,0,0)");vg.addColorStop(.88,"rgba(0,0,0,0)");vg.addColorStop(1,"rgba(0,0,0,.3)");cc.fillStyle=vg;cc.fillRect(0,0,CW,H);
}
let cWheel=0;
function cWorkerNPC(x,y,i,t){cc.fillStyle=["#c0553c","#3aa0c8","#4f9e7a"][i];cc.fillRect(x-3,y-14,6,9);cc.fillStyle="#e2ab80";cc.beginPath();cc.arc(x,y-17,3.2,0,7);cc.fill();cc.fillStyle="#2a1d13";cc.fillRect(x-3,y-5,2.4,5);cc.fillRect(x+.6,y-5,2.4,5)}
/* taps: where on the canvas, which thing */
function cTarget(lx,ly){
  if(ly<SURF){if(lx<60)return {k:"el"};if(lx>140&&lx<270)return {k:"wh"};return null}
  const i=Math.floor((ly-SURF)/RH);if(i<0||i>=cs.levels.length)return null;const y0=SURF+i*RH;
  if(lx<58)return {k:"el"};
  const r=rt.lv[i];if(r&&r.blocked&&lx>180&&lx<270)return {k:"rub",i};if(r&&r.vein&&lx>CW-60)return {k:"vein",i};
  return {k:"lv",i};
}
ccv.addEventListener("pointerdown",e=>{const b=ccv.getBoundingClientRect(),lx=(e.clientX-b.left)/b.width*CW,ly=(e.clientY-b.top)/b.height*cH(),t=cTarget(lx,ly);if(!t)return;
  if(t.k==="el"){if(rt.el.state==="idle")rt.el.run=true}else if(t.k==="wh"){if(rt.wh.state==="idle")rt.wh.run=true}
  else if(t.k==="rub")tapRubble(t.i,lx,ly);else if(t.k==="vein")tapVein(t.i,lx,ly);else if(rt.lv[t.i])rt.lv[t.i].run=true});
function cfx(lx,ly,txt,col,coin){const L=$("v2cfx"),x=lx/CW*100,y=ly/cH()*100;ft(L,x,y,txt,col);if(coin)coins(L,x,y,coin)}
let cLast=performance.now();
function cLoop(now){const dt=Math.min(.05,(now-cLast)/1000);cLast=now;if(vis("camp")&&ccv.offsetParent!==null)drawCamp(dt);requestAnimationFrame(cLoop)}
requestAnimationFrame(cLoop);

/* ---- the simulation: sales pay into the real balance, with Terms and relics applied ---- */
let campPts=0;
setInterval(()=>{
  E.step(cs,rt,.1);
  for(const ev of rt.ev){
    if(ev.t==="sell"){const k=RX.sell*RX.set*LAWX.sell*guildBuff("sell"),gain=ev.v*k;earn(gain);V.campEarned=(V.campEarned||0)+gain;campPts+=gain;
      if(campPts>=50000){const pts=Math.floor(campPts/50000);campPts-=pts*50000;D[selG][me]+=pts;if(vis("guilds"))drawG()}
      if(vis("camp")){cfx(340,SURF-44,"+"+money(gain),"#ffd873",0);for(let i=0;i<Math.min(14,4+Math.floor(Math.log10(Math.max(10,gain))));i++)cp.coins.push({x:352,y:SURF-30,vx:rr(-50,50),vy:rr(-150,-70),t:0})}}
    else if(ev.t==="unload"&&vis("camp"))cp.txt.push({x:30,y:SURF-60,s:"+"+money(ev.v),c:"#ffb01f",t:0});
    else if(ev.t==="drop"&&vis("camp")&&Math.random()<.4){const i=ev.i;if(cs.levels[i])cp.txt.push({x:96,y:SURF+i*RH+RH-48,s:"+"+money(E.rate(cs,i)*E.LV_T),c:"#9bb8d4",t:0})}
  }
  rt.ev.length=0;cs.cash=0;
},100);
