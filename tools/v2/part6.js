
/* ================= THE MINE, REBUILT ================= */
const mcv=$("v2mcv"),mx=mcv.getContext("2d");
const MW=480,MH=270,FLOORY=214,SEAMS=4;
function fitM(){const r=mcv.getBoundingClientRect();if(!r.width)return;const k=Math.min(2.5,(window.devicePixelRatio||1)*(r.width/MW));mcv.width=Math.round(MW*k);mcv.height=Math.round(MH*k);MK=mcv.width/MW}
let MK=1;new ResizeObserver(fitM).observe(mcv);
const M={depth:0,seam:0,hp:10,hpMax:10,heat:0,heatT:0,od:0,t:0,state:"mine",st:0,sw:{on:false,t:0,hit:false,queued:false},cartV:0,cartMax:1,cartRoll:0,rockShake:0,rockSquash:0,rockIn:1,
  chunks:[],dust:[],coins:[],spark:[],txts:[],freeze:0,shake:0,flash:0,glint:null,glintT:9,combo:0,comboT:0,seed:1,cracks:[],rock:null,holdT:0,holding:false,bgKey:"",bg:null,layerCard:0,crit:0,swings:0};
let mMiner=null;
function mkMiner(){mMiner=svgImg(miner(3,2,"",S.profile.shirt||"#f1e6d2",S.profile.hat||"#f3b24a",null),"0 0 22 38",88,152)}
setTimeout(mkMiner,1400);
const layerIdx=()=>Math.min(M.depth,LAYERS.length-1);
const palM=()=>PAL[Math.min(M.depth,PAL.length-1)];
const swingVal=()=>{try{const lv=cs.levels.reduce((a,l)=>a+l.L,0);return Math.max(1,clickPower()*forgeMul("dmg",.06)*guildBuff("mine")*LAWX.sell*(1+Math.floor(lv/5)*.01))}catch(e){return 20}};
function bgBuild(){
  const key=M.depth;if(M.bgKey===key&&M.bg)return;M.bgKey=key;
  const c=document.createElement("canvas");c.width=MW*2;c.height=MH*2;const g=c.getContext("2d");g.scale(2,2);const p=palM(),R=rnd(M.depth*7+3);
  g.fillStyle=p.sky;g.fillRect(0,0,MW,MH);g.fillStyle=p.wall[2];g.fillRect(0,10,MW,FLOORY-10);
  for(let y=10;y<FLOORY;y+=11)for(let x=-8;x<MW;){const w=12+R()*20,h=9+R()*3,col=p.wall[Math.floor(R()*p.wall.length)];g.fillStyle=col;g.fillRect(x,y,w-1.5,h);g.fillStyle="rgba(255,255,255,.06)";g.fillRect(x,y,w-1.5,1.5);g.fillStyle="rgba(0,0,0,.3)";g.fillRect(x,y+h-1.5,w-1.5,1.5);
    if(R()<.12){g.fillStyle=p.ore;g.fillRect(x+3+R()*(w-9),y+2+R()*4,3,3)}x+=w}
  // the shaft opening and its timber
  g.fillStyle="#0a0806";g.fillRect(0,0,MW,12);g.fillStyle="rgba(0,0,0,.72)";g.beginPath();g.moveTo(120,44);g.lineTo(360,44);g.lineTo(344,FLOORY);g.lineTo(136,FLOORY);g.fill();
  g.fillStyle="rgba(0,0,0,.55)";g.beginPath();g.moveTo(150,70);g.lineTo(330,70);g.lineTo(322,FLOORY);g.lineTo(158,FLOORY);g.fill();
  const beam=(x,y,w,h)=>{g.fillStyle="#5a3f26";g.fillRect(x,y,w,h);g.fillStyle="#8a6a4a";g.fillRect(x,y,w,Math.min(3,h));g.fillStyle="#2c1d10";g.fillRect(x,y,Math.min(2,w),h);g.fillStyle="rgba(0,0,0,.4)";g.fillRect(x+w-1.5,y,1.5,h)};
  beam(112,46,10,FLOORY-46);beam(358,46,10,FLOORY-46);beam(104,38,272,10);beam(36,76,8,FLOORY-76);beam(436,76,8,FLOORY-76);beam(28,70,24,7);beam(428,70,24,7);
  g.fillStyle=p.floor;g.fillRect(0,FLOORY,MW,MH-FLOORY);g.fillStyle="rgba(0,0,0,.4)";g.fillRect(0,FLOORY,MW,MH-FLOORY);g.fillStyle="rgba(255,255,255,.13)";g.fillRect(0,FLOORY,MW,1.5);
  for(let i=0;i<100;i++){g.fillStyle=p.floor2;g.globalAlpha=.7;g.fillRect(R()*MW,FLOORY+4+R()*(MH-FLOORY-6),1+R()*3,1)}g.globalAlpha=1;
  // rails to the cart
  g.fillStyle="#3a3a40";g.fillRect(330,FLOORY+22,150,2);g.fillStyle="#8d8d94";g.fillRect(330,FLOORY+22,150,1);for(let x=334;x<480;x+=12){g.fillStyle="#5a3f26";g.fillRect(x,FLOORY+20,4,12)}
  M.bg=c;
}
function newRock(){
  M.seed=M.depth*11+M.seam*3+Math.floor(Math.random()*1000);const R=rnd(M.seed),n=14,pts=[];
  for(let i=0;i<n;i++){const a=i/n*Math.PI*2,r=44+R()*14;pts.push([Math.cos(a)*r*1.1,Math.sin(a)*r*.82])}
  M.rock={pts,fleck:Array.from({length:9},()=>({a:R()*6.28,d:R()*28,s:2+R()*3,ph:R()*6})),cracks:[0,1,2].map(()=>{const a=R()*6.28,l=[];let x=Math.cos(a)*5,y=Math.sin(a)*5;for(let i=0;i<6;i++){x+=Math.cos(a+(R()-.5)*1.3)*9;y+=Math.sin(a+(R()-.5)*1.3)*7;l.push([x,y])}return l})};
  M.hpMax=Math.round(10+M.depth*5+M.seam*3);M.hp=M.hpMax;M.rockIn=0;
}
function startMine(){
  M.depth=Math.max(0,Math.min(S.depth||0,LAYERS.length-1));M.seam=0;M.cartMax=swingVal()*60;M.cartV=0;
  bgBuild();newRock();layerCard(false);
}
function layerCard(show){const c=$("v2mtitle");if(!c)return;c.innerHTML=`<small>Depth ${M.depth+1}</small><b>${LAYERS[layerIdx()].name}</b>`;c.classList.remove("on");void c.offsetWidth;c.classList.add("on")}
function reqSwing(){if(M.state!=="mine")return;if(M.sw.on)M.sw.queued=true;else{M.sw.on=true;M.sw.t=0;M.sw.hit=false}}
function addText(x,y,s,c,big){M.txts.push({x,y,s,c,t:0,big})}
function doHit(){
  M.swings++;M.heatT=0;M.heat=Math.min(1,M.heat+.09);M.comboT=0;M.combo++;
  const crit=Math.random()<.1+M.heat*.15,dmg=crit?3:1,v=swingVal()*(crit?4:1)*(1+M.heat*.5)*(M.od>0?2:1);
  M.hp-=dmg;earn(v);M.cartV+=v*.5;M.rockShake=1;M.rockSquash=1;M.shake=crit?6:2;M.freeze=crit?.07:.04;M.flash=crit?.35:.12;
  const cx0=300,cy0=140,n=crit?9:5;for(let i=0;i<n;i++)M.chunks.push({x:cx0-30+rr(-10,10),y:cy0+rr(-24,24),vx:rr(-150,-30),vy:rr(-170,-40),r:rr(0,6),vr:rr(-9,9),s:rr(2,5),c:pick(palM().wall),t:0});
  for(let i=0;i<3;i++)M.dust.push({x:cx0-26,y:cy0+rr(-20,20),vx:rr(-40,-8),vy:rr(-26,6),r:rr(5,10),t:0});
  for(let i=0;i<3;i++)M.spark.push({x:cx0-28,y:cy0+rr(-10,10),vx:rr(-130,-30),vy:rr(-120,20),t:0,c:crit?"#fff3b0":"#ffd873"});
  if(Math.random()<.35||crit)M.coins.push({x:cx0-30,y:cy0,vx:rr(-80,40),vy:rr(-190,-110),t:0,g:Math.random()<.2});
  addText(250+rr(-18,18),118+rr(-8,8),(crit?"CRIT ":"+")+fmt(v),crit?"#ffe36b":"#ffd873",crit);
  if(M.combo>=5&&M.combo%5===0)addText(200,70,"×"+M.combo+" COMBO","#7cf5e8",true);
  beep(crit?520:260+Math.random()*80,.05,.03);
  if(M.heat>=1&&M.od<=0){M.od=5;M.heat=0;V.campBoostUntil=Date.now()+10000;V.ods=(V.ods||0)+1;addText(240,60,"OVERDRIVE","#ff9a4a",true);addText(240,84,"Camp ×1.5 for 10s","#ffd873",false);beep(180,.3,.05);M.shake=5}
  if(M.hp<=0)clearSeam();
}
function clearSeam(){
  const cx0=300,cy0=140;for(let i=0;i<22;i++)M.chunks.push({x:cx0+rr(-30,30),y:cy0+rr(-30,30),vx:rr(-200,160),vy:rr(-220,-30),r:rr(0,6),vr:rr(-9,9),s:rr(3,7),c:pick(palM().wall),t:0});
  for(let i=0;i<9;i++)M.coins.push({x:cx0+rr(-20,20),y:cy0+rr(-20,20),vx:rr(-120,80),vy:rr(-210,-90),t:0,g:i<2});
  const bonus=swingVal()*M.hpMax*.8*(1+M.depth*.1);earn(bonus);addText(300,100,"SEAM CLEARED +"+fmt(bonus),"#2bef8b",true);M.shake=7;M.flash=.4;M.freeze=.08;beep(120,.25,.06);confetti(14);
  V.seams=(V.seams||0)+1;rt.wh.stock+=bonus*.5;D[selG][me]+=1;addText(420,196,'to the Camp','#9bb8d4',false);M.seam++;
  if(M.seam>=SEAMS){M.state="descend";M.st=0}else newRock();
}
function updMine(dtRaw){
  let dt=dtRaw;if(M.freeze>0){M.freeze-=dt;dt*=.08}
  M.t+=dt;
  // swing animation: wind up, strike, recover. The hit lands at the end of the strike.
  if(M.sw.on){M.sw.t+=dt;if(!M.sw.hit&&M.sw.t>=.16){M.sw.hit=true;doHit()}if(M.sw.t>=.27){M.sw.on=false;if(M.sw.queued||M.holding||M.od>0){M.sw.queued=false;if(M.state==="mine"){M.sw.on=true;M.sw.t=0;M.sw.hit=false}}}}
  else if((M.holding||M.od>0)&&M.state==="mine"){M.sw.on=true;M.sw.t=0;M.sw.hit=false}
  M.heatT+=dt;if(M.heatT>.8)M.heat=Math.max(0,M.heat-dt*.35);M.comboT+=dt;if(M.comboT>1.2)M.combo=0;
  if(M.od>0)M.od=Math.max(0,M.od-dt);
  M.rockShake=Math.max(0,M.rockShake-dt*7);M.rockSquash=Math.max(0,M.rockSquash-dt*9);M.rockIn=Math.min(1,M.rockIn+dt*3.2);M.shake=Math.max(0,M.shake-dt*22);M.flash=Math.max(0,M.flash-dt*2.4);
  // the cart fills and rolls off with a bonus shipment
  if(M.cartRoll>0){M.cartRoll+=dt;if(M.cartRoll>2.4){M.cartRoll=0;M.cartV=0}}
  else if(M.cartV>=M.cartMax){M.cartRoll=.001;const b=M.cartV;earn(b);addText(385,176,"SHIPMENT +"+fmt(b),"#ffd873",true);for(let i=0;i<10;i++)M.coins.push({x:430,y:190,vx:rr(-60,60),vy:rr(-160,-80),t:0});beep(700,.12,.04)}
  // descending: the whole scene drops to the next layer
  if(M.state==="descend"){M.st+=dt;if(M.st>=.7&&!M.swapped){M.swapped=true;M.depth++;M.seam=0;S.depth=Math.min(M.depth,LAYERS.length-1);M.cartMax=swingVal()*60;bgBuild();newRock();layerCard(true);beep(90,.5,.06)}if(M.st>=1.5){M.state="mine";M.swapped=false}}
  // ambient + the glint event
  M.glintT-=dt;if(M.glintT<=0&&!M.glint&&M.state==="mine"){M.glint={x:300+rr(-34,24),y:140+rr(-30,26),t:0};M.glintT=rr(9,20)}
  if(M.glint){M.glint.t+=dt;if(M.glint.t>1.8)M.glint=null}
  for(const c of M.chunks){c.t+=dt;c.vy+=520*dt;c.x+=c.vx*dt;c.y+=c.vy*dt;c.r+=c.vr*dt;if(c.y>FLOORY+6){c.y=FLOORY+6;c.vy*=-.35;c.vx*=.6}}M.chunks=M.chunks.filter(c=>c.t<1.4);
  for(const d of M.dust){d.t+=dt;d.x+=d.vx*dt;d.y+=d.vy*dt;d.r+=dt*10}M.dust=M.dust.filter(d=>d.t<.7);
  for(const s of M.spark){s.t+=dt;s.vy+=300*dt;s.x+=s.vx*dt;s.y+=s.vy*dt}M.spark=M.spark.filter(s=>s.t<.5);
  for(const c of M.coins){c.t+=dt;c.vy+=480*dt;c.x+=c.vx*dt;c.y+=c.vy*dt;if(c.y>FLOORY+4){c.y=FLOORY+4;c.vy*=-.4}if(c.t>.7){c.x=lerp(c.x,436,Math.min(1,dt*6));c.y=lerp(c.y,FLOORY+2,Math.min(1,dt*6))}}M.coins=M.coins.filter(c=>c.t<1.4);
  for(const t of M.txts)t.t+=dt;M.txts=M.txts.filter(t=>t.t<1.1);
  if(M.od>0&&Math.random()<.6)M.spark.push({x:210+rr(-6,6),y:150+rr(-30,10),vx:rr(-30,30),vy:rr(-120,-50),t:0,c:"#ff8a2b"});
}
function drawMine(){
  const k=MK;mx.setTransform(k,0,0,k,0,0);mx.imageSmoothingEnabled=false;
  if(!M.bg)return;const t=performance.now()/1000,p=palM();
  let oy=0;if(M.state==="descend"){const u=M.st/1.5;oy=u<.47?-Math.pow(u/.47,2.2)*MH:(1-(u-.47)/.53)*MH*(1-Math.pow(1-(u-.47)/.53,2))*-1+0}
  if(M.state==="descend"){const u=M.st/1.5;oy=u<.47?-(u/.47)*(u/.47)*MH:(MH)*(1-(u-.47)/.53)*(1-(u-.47)/.53)}
  mx.save();mx.translate(rr(-M.shake,M.shake)/2,oy+rr(-M.shake,M.shake)/2);
  mx.drawImage(M.bg,0,0,MW,MH);
  // the lantern swings on its chain and lights the face
  const sw=Math.sin(t*1.7)*.18,lx=240+Math.sin(sw)*30,ly=40+Math.cos(sw)*30;
  mx.strokeStyle="#c9c4bb";mx.lineWidth=1;mx.beginPath();mx.moveTo(240,12);mx.lineTo(lx,ly);mx.stroke();mx.fillStyle="#3a3a40";mx.fillRect(lx-5,ly,10,12);mx.fillStyle="#ffd87a";mx.fillRect(lx-3,ly+2,6,8);
  glowM(lx,ly+6,150+Math.sin(t*9)*8,[255,190,100],.3);
  // cart and its load
  const cartX=M.cartRoll>0?420+Math.pow(M.cartRoll,2)*120:420;
  mx.fillStyle="rgba(0,0,0,.45)";mx.beginPath();mx.ellipse(cartX+20,FLOORY+30,26,4,0,0,7);mx.fill();
  mx.fillStyle="#4a3016";mx.beginPath();mx.moveTo(cartX,FLOORY+8);mx.lineTo(cartX+42,FLOORY+8);mx.lineTo(cartX+37,FLOORY+28);mx.lineTo(cartX+5,FLOORY+28);mx.fill();mx.fillStyle="#7a5a3a";mx.fillRect(cartX,FLOORY+8,42,3);
  const fill=clamp(M.cartV/M.cartMax,0,1);mx.fillStyle="#ffd873";mx.beginPath();mx.moveTo(cartX+4,FLOORY+9);mx.quadraticCurveTo(cartX+21,FLOORY+9-fill*20,cartX+38,FLOORY+9);mx.fill();
  mx.fillStyle="#111";for(const w of [8,34]){mx.beginPath();mx.arc(cartX+w,FLOORY+30,4.5,0,7);mx.fill()}
  // crew from the Camp, working the side tunnels
  const crew=Math.min(4,cs.levels.length+1);
  if(mMiner&&mMiner.complete)for(let i=0;i<crew;i++){const x=40+i*34,bob=Math.sin(t*5+i*1.7)*1.5,sw2=Math.sin(t*6+i*2)*.2;mx.save();mx.translate(x,FLOORY-2+bob);mx.rotate(sw2*.4);mx.globalAlpha=.9;mx.drawImage(mMiner,-8,-30,16,28);
    mx.strokeStyle="#7a5a3a";mx.lineWidth=1.5;mx.beginPath();mx.moveTo(4,-14);mx.lineTo(4+Math.cos(sw2*3-.7)*10,-14+Math.sin(sw2*3-.7)*10);mx.stroke();mx.restore()}
  // the rock face
  drawRock(t,p);
  // the glint
  if(M.glint){const g=M.glint,a=Math.sin(g.t/1.8*Math.PI),r=8+a*8;mx.fillStyle=`rgba(255,248,200,${a})`;mx.beginPath();mx.moveTo(g.x,g.y-r);mx.lineTo(g.x+r*.28,g.y-r*.28);mx.lineTo(g.x+r,g.y);mx.lineTo(g.x+r*.28,g.y+r*.28);mx.lineTo(g.x,g.y+r);mx.lineTo(g.x-r*.28,g.y+r*.28);mx.lineTo(g.x-r,g.y);mx.lineTo(g.x-r*.28,g.y-r*.28);mx.fill();glowM(g.x,g.y,26,[255,220,120],.6*a)}
  // the miner and the pick
  drawMiner(t);
  for(const d of M.dust){mx.fillStyle=`rgba(190,180,170,${.35*(1-d.t/.7)})`;mx.beginPath();mx.arc(d.x,d.y,d.r,0,7);mx.fill()}
  for(const c of M.chunks){mx.save();mx.translate(c.x,c.y);mx.rotate(c.r);mx.fillStyle=c.c;mx.fillRect(-c.s/2,-c.s/2,c.s,c.s*.8);mx.fillStyle="rgba(255,255,255,.15)";mx.fillRect(-c.s/2,-c.s/2,c.s,1);mx.restore()}
  for(const c of M.coins){mx.fillStyle=c.g?"#7cf5e8":"#ffd873";const w=Math.abs(Math.cos(c.t*10));mx.beginPath();mx.ellipse(c.x,c.y,3.2*w+.6,3.2,0,0,7);mx.fill()}
  for(const s of M.spark){mx.strokeStyle=s.c;mx.globalAlpha=1-s.t/.5;mx.lineWidth=1.5;mx.beginPath();mx.moveTo(s.x,s.y);mx.lineTo(s.x-s.vx*.03,s.y-s.vy*.03);mx.stroke();mx.globalAlpha=1}
  for(const tx of M.txts){const u=tx.t/1.1;mx.globalAlpha=1-u*u;mx.font=`700 ${tx.big?15:12}px Figtree,system-ui,sans-serif`;mx.textAlign="center";mx.lineWidth=3;mx.strokeStyle="#000";mx.strokeText(tx.s,tx.x,tx.y-u*34);mx.fillStyle=tx.c;mx.fillText(tx.s,tx.x,tx.y-u*34);mx.globalAlpha=1}
  mx.restore();
  // lighting and flash
  const g=mx.createRadialGradient(MW*.5,MH*.48,60,MW*.5,MH*.48,MW*.62);g.addColorStop(0,"rgba(0,0,0,0)");g.addColorStop(1,"rgba(0,0,0,.7)");mx.fillStyle=g;mx.fillRect(0,0,MW,MH);
  if(M.od>0){mx.fillStyle=`rgba(255,120,30,${.09+.04*Math.sin(t*20)})`;mx.fillRect(0,0,MW,MH)}
  if(M.flash>0){mx.fillStyle=`rgba(255,240,200,${M.flash*.35})`;mx.fillRect(0,0,MW,MH)}
  if(M.state==="descend"){const u=M.st/1.5,a=Math.sin(u*Math.PI);for(let i=0;i<30;i++){mx.fillStyle=`rgba(255,255,255,${.25*a})`;mx.fillRect((i*47)%MW,((t*900+i*83)%MH),1.5,10+(i%5)*6)}mx.fillStyle=`rgba(0,0,0,${.5*a})`;mx.fillRect(0,0,MW,MH)}
}
function glowM(x,y,r,c,a){const g=mx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(${c[0]},${c[1]},${c[2]},${a})`);g.addColorStop(1,`rgba(${c[0]},${c[1]},${c[2]},0)`);mx.globalCompositeOperation="lighter";mx.fillStyle=g;mx.fillRect(x-r,y-r,r*2,r*2);mx.globalCompositeOperation="source-over"}
function drawRock(t,p){
  if(!M.rock)return;const cx0=300,cy0=150,hpR=M.hp/M.hpMax,sq=M.rockSquash,sh=M.rockShake,inn=M.rockIn;
  mx.save();mx.translate(cx0+(-sh*4*Math.sin(t*60)),cy0+sh*1.5);mx.scale(inn*(1+sq*.05),inn*(1-sq*.07));
  mx.fillStyle="rgba(0,0,0,.45)";mx.beginPath();mx.ellipse(0,52,62,9,0,0,7);mx.fill();
  const body=(off,col)=>{mx.fillStyle=col;mx.beginPath();M.rock.pts.forEach(([x,y],i)=>i?mx.lineTo(x+off,y+off):mx.moveTo(x+off,y+off));mx.closePath();mx.fill()};
  body(3,"#1a1a1e");body(0,p.wall[1]);
  mx.save();mx.beginPath();M.rock.pts.forEach(([x,y],i)=>i?mx.lineTo(x,y):mx.moveTo(x,y));mx.closePath();mx.clip();
  mx.fillStyle="rgba(255,255,255,.12)";mx.fillRect(-70,-60,60,120);mx.fillStyle="rgba(0,0,0,.28)";mx.fillRect(18,-60,60,120);mx.fillStyle="rgba(255,255,255,.07)";mx.beginPath();mx.moveTo(-60,-30);mx.lineTo(60,-50);mx.lineTo(60,-40);mx.lineTo(-60,-18);mx.fill();
  for(const f of M.rock.fleck){const x=Math.cos(f.a)*f.d,y=Math.sin(f.a)*f.d*.8,tw=.5+.5*Math.sin(t*3+f.ph);mx.fillStyle=p.ore;mx.fillRect(x,y,f.s,f.s);mx.fillStyle=`rgba(255,255,255,${.5*tw})`;mx.fillRect(x,y,f.s*.5,f.s*.5)}
  const dmg=1-hpR;M.rock.cracks.forEach((cr,i)=>{if(dmg>i*.28){const n=Math.min(cr.length,Math.ceil((dmg-i*.28)/.28*cr.length));mx.strokeStyle="rgba(0,0,0,.7)";mx.lineWidth=2;mx.beginPath();mx.moveTo(0,0);for(let j=0;j<n;j++)mx.lineTo(cr[j][0],cr[j][1]);mx.stroke();mx.strokeStyle="rgba(255,200,100,.35)";mx.lineWidth=.8;mx.stroke()}});
  mx.restore();
  // its health, right under it
  mx.fillStyle="rgba(0,0,0,.7)";mx.fillRect(-34,62,68,6);mx.fillStyle=hpR>.4?"#2bef8b":"#ff8a5c";mx.fillRect(-33,63,66*hpR,4);
  mx.restore();
}
function drawMiner(t){
  if(!mMiner||!mMiner.complete)return;
  const sw=M.sw,x=212,y=FLOORY+4;let lean=0,ang=.35;
  if(sw.on){const u=sw.t;if(u<.09){const k=u/.09;ang=lerp(.35,-1.9,k*k);lean=-k*3}else if(u<.16){const k=(u-.09)/.07;ang=lerp(-1.9,.9,k*k*k);lean=lerp(-3,10,k)}else{const k=(u-.16)/.11;ang=lerp(.9,.35,k);lean=lerp(10,0,k)}}
  const bob=sw.on?0:Math.sin(t*2.2)*.8;
  mx.fillStyle="rgba(0,0,0,.5)";mx.beginPath();mx.ellipse(x,y+2,18,5,0,0,7);mx.fill();
  if(M.od>0)glowM(x+10,y-30,70,[255,130,40],.45);
  mx.save();mx.translate(x+lean,y+bob);mx.rotate(sw.on&&sw.t<.09?-.06:sw.on&&sw.t<.16?.08:0);mx.drawImage(mMiner,-22,-70,44,76);
  // the pick: a handle and a head, turning around the hand
  const hx=11,hy=-30;mx.save();mx.translate(hx,hy);mx.rotate(ang);
  const L=PICK_LOOK[Math.max(1,S.pick||1)]||PICK_LOOK[1];
  mx.fillStyle=L.h;mx.fillRect(0,-1.5,26,3);mx.fillStyle=L.s;mx.fillRect(0,.5,26,1);
  mx.fillStyle=L.e;mx.beginPath();mx.moveTo(22,-9);mx.lineTo(30,-2);mx.lineTo(30,2);mx.lineTo(22,9);mx.lineTo(25,0);mx.fill();
  if(M.od>0){glowM(28,0,26,[255,150,60],.8)}
  mx.restore();
  // the arc the head leaves behind on the strike
  if(sw.on&&sw.t>.09&&sw.t<.22){const k=(sw.t-.09)/.13;mx.strokeStyle=`rgba(255,255,255,${.7*(1-k)})`;mx.lineWidth=4;mx.beginPath();mx.arc(hx,hy,28,-1.9+k*1.2,-.2+k*1.1);mx.stroke()}
  mx.restore();
}
/* ---- input and the loop ---- */
let mLast=performance.now();
function mLoop(now){const dt=Math.min(.05,(now-mLast)/1000);mLast=now;
  if(vis("mine")&&mcv.offsetParent!==null){if(!M.rock)startMine();if(M.state)updMine(dt);drawMine()}requestAnimationFrame(mLoop)}
requestAnimationFrame(mLoop);
function ptr(e){const b=mcv.getBoundingClientRect();return {x:(e.clientX-b.left)/b.width*MW,y:(e.clientY-b.top)/b.height*MH}}
mcv.addEventListener("pointerdown",e=>{const p=ptr(e);if(M.glint&&Math.hypot(p.x-M.glint.x,p.y-M.glint.y)<26){const v=swingVal()*30;earn(v);addText(M.glint.x,M.glint.y-10,"GOLDEN VEIN +"+fmt(v),"#fff3b0",true);for(let i=0;i<14;i++)M.coins.push({x:M.glint.x,y:M.glint.y,vx:rr(-120,120),vy:rr(-200,-60),t:0,g:i%3===0});M.shake=5;M.glint=null;beep(900,.15,.05);confetti(16);return}
  M.holding=true;reqSwing();mcv.setPointerCapture(e.pointerId)});
const stopHold=()=>{M.holding=false};mcv.addEventListener("pointerup",stopHold);mcv.addEventListener("pointercancel",stopHold);mcv.addEventListener("pointerleave",stopHold);
window.addEventListener("keydown",e=>{if(vis("mine")&&(e.key===" "||e.key==="Enter")&&e.target===document.body){e.preventDefault();M.holding=true;reqSwing()}});
window.addEventListener("keyup",e=>{if(e.key===" "||e.key==="Enter")M.holding=false});
setInterval(()=>{
  if(!vis("mine"))return;
  $("v2mlayer").textContent=LAYERS[layerIdx()].name;$("v2mdepth").textContent="Depth "+(M.depth+1)+" · seam "+(Math.min(M.seam+1,SEAMS))+" of "+SEAMS;
  $("v2mps").textContent=fmt(swingVal());$("v2mcamp").textContent=fmt(E.steady(JSON.parse(JSON.stringify(Object.assign({},cs,{levels:cs.levels.map(l=>Object.assign({},l,{mgr:Math.max(1,l.mgr)})),elev:Object.assign({},cs.elev,{mgr:Math.max(1,cs.elev.mgr)}),wh:Object.assign({},cs.wh,{mgr:Math.max(1,cs.wh.mgr)})}))))*LAWX.sell*RX.sell*RX.set)+"/s";
  const h=$("v2mheat");h.style.width=(M.od>0?M.od/5*100:M.heat*100)+"%";h.parentElement.classList.toggle("od",M.od>0);$("v2mheatl").textContent=M.od>0?"OVERDRIVE":"HEAT";
  $("v2mhint").style.opacity=M.swings>3?0:1;$("v2mcart").style.width=clamp(M.cartV/M.cartMax*100,0,100)+"%";$("v2mseam").style.width=clamp((1-M.hp/M.hpMax)*100,0,100)+"%";
},100);
