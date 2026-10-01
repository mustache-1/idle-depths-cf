
/* ================= GUILDS: a claim map, a raid, a feed ================= */
const GT=["light and speed","coin and ledgers","keep and preserve","the dead run the lifts"],DN=["The Cutting","Rustveins","The Coalworks","Ironjaw Hollow","Silvergrave"];
let me=0,energy=6,selG=0,raid=null,raidNext=Date.now()+25000;
const D=DN.map(()=>[rr(10,30),rr(10,30),rr(10,30),rr(10,30)]);
const FEED=[];
function feed(t){FEED.unshift(t);if(FEED.length>40)FEED.pop();if(vis("guilds"))drawFeed()}
GN.forEach((n,i)=>{const b=el("button",i===me?"on":"");b.innerHTML=n+"<small>"+GT[i]+"</small>";b.style.borderTop=`3px solid ${GCOL[i]}`;b.onclick=()=>{me=i;[...$("v2gp").children].forEach((x,k)=>x.classList.toggle("on",k===i));feed("<b>You</b> swear to the "+n+".");drawG()};$("v2gp").append(b)});
function holder(d){const m=Math.max(...d);const idx=d.indexOf(m);return d.filter(v=>v===m).length>1?-1:idx}
function drawFeed(){const f=$("v2gfeed");f.innerHTML=FEED.slice(0,12).map(x=>"<div>"+x+"</div>").join("")||"<div>Quiet. For now.</div>"}
function drawMap(){
  const s=$("v2gmap");let g=`<defs><linearGradient id="v2gk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14182a"/><stop offset="1" stop-color="#c8693a"/></linearGradient></defs><rect width="340" height="40" fill="url(#v2gk)"/><path d="M0 40 L0 24 L50 14 L110 22 L170 10 L240 20 L300 12 L340 22 L340 40z" fill="#1c1730"/>`;
  D.forEach((d,i)=>{const y0=40+i*42,p=PAL[Math.min(i+1,PAL.length-1)],h=holder(d),tot=d.reduce((a,b)=>a+b,0),sel=i===selG;
    g+=`<g data-g="${i}" style="cursor:pointer"><rect x="0" y="${y0}" width="340" height="42" fill="${p.wall[2]}"/>`+stones(0,0,y0,340,42,p,.1,i+5,.12)+`<rect x="30" y="${y0+6}" width="300" height="30" fill="#0b0908" opacity=".88"/>`;
    // control bar made of the four guilds' colours
    let x=36;d.forEach((v,k)=>{const w=v/tot*288;g+=`<rect x="${x}" y="${y0+26}" width="${w}" height="6" fill="${GCOL[k]}"/>`;x+=w});
    g+=`<text x="38" y="${y0+20}" fill="#f3f1ec" font-size="9" font-weight="700">${DN[i]}</text><text x="326" y="${y0+20}" fill="${h<0?"#98a2b8":GCOL[h]}" font-size="8.5" font-weight="700" text-anchor="end">${h<0?"CONTESTED":GN[h].toUpperCase()}</text>`;
    // the flag on the left wall
    g+=px(10,y0+6,2,32,"#5a3f26")+`<path d="M12 ${y0+6} L26 ${y0+10} L22 ${y0+14} L26 ${y0+18} L12 ${y0+20}z" fill="${h<0?"#555":GCOL[h]}"/>`;
    if(sel)g+=`<rect x="1" y="${y0+1}" width="338" height="40" fill="none" stroke="#ffb01f" stroke-width="2"/>`;
    g+=`</g>`});
  s.setAttribute("viewBox",`0 0 340 ${40+D.length*42}`);s.innerHTML=g;
  s.querySelectorAll("[data-g]").forEach(n=>n.onclick=()=>{selG=+n.dataset.g;drawG()});
}
function drawSel(){
  const d=D[selG],tot=d.reduce((a,b)=>a+b,0),h=holder(d),box=$("v2gsel");box.innerHTML="";
  box.append(el("h3","",DN[selG]),el("p","",h<0?"Nobody holds it. Whoever pushes next takes the lead.":GN[h]+" holds this gallery."));
  GN.forEach((n,k)=>{const r=el("div","meta");r.style.padding="3px 0";const a=el("span","",(k===me?"▸ ":"")+n);a.style.color=GCOL[k];r.append(a,el("span","",Math.round(d[k])+" pts"));box.append(r)});
  const st=el("div","v2-stk");d.forEach((v,k)=>{const x=el("i","g"+k);x.style.width=v/tot*100+"%";st.append(x)});box.append(st);
  const pts=Math.round(9*RX.push*RX.set);
  const b=el("button","buy","Push for the "+GN[me]+" (+"+pts+" pts, 2 energy)");b.style.cssText="width:100%;margin-top:10px";b.disabled=energy<2;
  b.onclick=()=>{if(energy<2)return;energy-=2;d[me]+=pts;V.pushes++;feed("<b>You</b> pushed "+DN[selG]+" for the "+GN[me]+" (+"+pts+").");drawG()};box.append(b);
  box.append(el("p","note","Energy "+energy+"/10. It refills while you're away, so check in."));
}
function drawSquad(){const sq=$("v2sq");sq.innerHTML="";[["You",V.pushes*9],["Mara",rr(30,90)],["Teo",rr(20,70)],["Bex",rr(10,60)]].forEach(x=>{const r=el("div","meta");r.style.padding="4px 0";r.append(el("span","",x[0]),el("span","",x[1]+" pts"));sq.append(r)});sq.append(el("p","note","Crews fight inside their Guild. Every push a member makes counts for the squad."))}
function drawG(){drawMap();drawSel();drawSquad();drawFeed();raidRender()}
/* a raid: a rival Guild hits a gallery yours leads. Defend it or lose ground. */
function raidRender(){
  const h=$("v2raid");if(!raid){h.innerHTML="";return}
  const left=Math.max(0,Math.ceil((raid.until-Date.now())/1000));
  h.innerHTML=`<div class="v2-raid"><div><b>The ${GN[raid.by]} are raiding ${DN[raid.g]}!</b><div class="note">Defend it: tap ${raid.need} times before the timer runs out.</div></div><div class="rb"><div class="v2-bar"><i style="width:${raid.taps/raid.need*100}%;background:var(--red)"></i></div></div><b>${left}s</b><button class="buy" id="v2rd">Defend (${raid.taps}/${raid.need})</button></div>`;
  $("v2rd").onclick=()=>{if(!raid)return;raid.taps++;if(raid.taps>=raid.need){D[raid.g][me]+=14;feed("<b>You</b> held "+DN[raid.g]+" against the "+GN[raid.by]+".");toast("Raid beaten. "+DN[raid.g]+" is yours.");confetti(20);raid=null;raidNext=Date.now()+rr(40000,70000);drawG()}else raidRender()};
}
setInterval(()=>{
  const now=Date.now();
  // rival Guilds are always doing something
  if(energy<10)energy++;
  const g=rr(0,4),k=rr(0,3),v=rr(3,8);if(k!==me)D[g][k]+=v;D.forEach(x=>{for(let j=0;j<4;j++)x[j]=Math.max(1,x[j]*.985)});
  if(Math.random()<.5){const who=pick(["Mara","Teo","Bex","Nan","Joss","Old Fen"]),kk=pick([0,1,2,3]);feed("<b>"+who+"</b> ("+GN[kk]+") pushed "+DN[g]+" +"+v+".")}
  if(raid&&now>raid.until){const l=Math.round(D[raid.g][me]*.4);D[raid.g][me]-=l;D[raid.g][raid.by]+=l;feed("The "+GN[raid.by]+" took "+Math.round(l)+" pts of "+DN[raid.g]+" from you.");toast("You lost ground in "+DN[raid.g]+".");raid=null;raidNext=now+rr(40000,70000)}
  else if(!raid&&now>raidNext){const mine=D.map((d,i)=>holder(d)===me?i:-1).filter(i=>i>=0);if(mine.length&&vis("guilds")){const gg=pick(mine),by=pick([0,1,2,3].filter(x=>x!==me));raid={g:gg,by,taps:0,need:10,until:now+9000};toast("Raid on "+DN[gg]+"!")}else raidNext=now+15000}
  if(vis("guilds")){if(raid)raidRender();drawG()}
},2500);
setInterval(()=>{if(raid&&vis("guilds"))raidRender()},1000);
drawG();

/* ================= AUDIT: story, Terms, orders with rewards ================= */
const ORD=[
 {t:"Clear 8 seams in the Mine",r:"$5K",f:()=>clamp((V.seams||0)/8,0,1),pay:()=>{earn(5000)}},
 {t:"Reach level 6 in a dive",r:"60 shards",f:()=>clamp(V.st.bestLevel/6,0,1),pay:()=>{V.shards+=60}},
 {t:"Kill 150 enemies in dives",r:"$8K",f:()=>clamp(V.st.kills/150,0,1),pay:()=>{earn(8000)}},
 {t:"Plant a dive score in a gallery",r:"50 shards",f:()=>clamp(V.st.planted,0,1),pay:()=>{V.shards+=50}},
 {t:"Hire a Veteran foreman in the Camp",r:"$10K",f:()=>[...cs.levels,cs.elev,cs.wh].some(c=>c.mgr>=2)?1:0,pay:()=>{earn(10000)}},
 {t:"Kill the Wyrm",r:"120 shards",f:()=>clamp(V.st.boss,0,1),pay:()=>{V.shards+=120}}];
const TIERS_R=["30 shards","A title","A relic","A banner","A crown","Ashcombe's Heir"];
const marks=()=>Object.keys(V.claimed).length;
function drawA(){
  const t=$("v2terms");if(!t.children.length)TERMS.forEach(x=>{const d=el("div","v2-term");d.innerHTML=icon(x.ic,5)+`<div><b>${x.n}</b><small>${x.d}</small></div>`;t.append(d)});
  const h=$("v2or");h.innerHTML="";
  ORD.forEach((o,i)=>{const p=o.f(),done=V.claimed[i],r=el("div","v2-orow"+(p>=1?" done":""));const l=el("div");l.append(el("b","",o.t));const bar=el("div","v2-bar");bar.style.marginTop="5px";const bi=el("i");bi.style.width=p*100+"%";bar.append(bi);l.append(bar);l.append(el("small","","Reward: "+o.r));
    const b=el("button",p>=1&&!done?"buy":"v2-orb",done?"Claimed":p>=1?"Claim":Math.round(p*100)+"%");b.style.minWidth="84px";b.disabled=!(p>=1&&!done);
    b.onclick=()=>{o.pay();V.claimed[i]=1;toast("Order complete: "+o.r+".");confetti(28);drawA();drawF()};r.append(l,b);h.append(r)});
  const m=marks();$("v2tk").textContent=m+" / 6 marks";$("v2tb").style.width=m/6*100+"%";const tt=$("v2tt");tt.innerHTML="";TIERS_R.forEach((x,i)=>tt.append(el("div","v2-tier"+(i<m?" got":""),x)));
  const ch=$("v2ch");ch.innerHTML="";const open=Math.max(S.depth||0,0);
  [["Season 1: The Reckoning","The ledger says paid. The floor disagrees.",true]].concat(LAYERS.slice(0,Math.min(9,open+3)).map((l,i)=>[l.name,l.desc,i<=open])).forEach(c=>{const d=el("div","v2-chap"+(c[2]?"":" lock"));d.append(el("b","",c[2]?c[0]:"???"),el("p","",c[2]?c[1]:"Reach this layer to read it."));ch.append(d)});
  const rows=[["Mara Quill",4.2e9],["Teo of Tide",1.9e9],["Bex Salt",8.8e8],["Nan Lamp",3.1e8],["You",S.lifetime||0]].sort((a,b)=>b[1]-a[1]),tb=$("v2hl");tb.innerHTML="";
  rows.forEach((r,i)=>{const tr=el("tr",r[0]==="You"?"me":"");tr.append(el("td","n",i+1),el("td","",r[0]),el("td","n",fmt(r[1])));tb.append(tr)});
  const open2=ORD.filter((o,i)=>o.f()>=1&&!V.claimed[i]).length,bd=$("v2Badge");bd.textContent=open2||"";bd.classList.toggle("on",open2>0);
}
setInterval(()=>{if(vis("audit"))drawA();else{const open2=ORD.filter((o,i)=>o.f()>=1&&!V.claimed[i]).length,bd=$("v2Badge");bd.textContent=open2||"";bd.classList.toggle("on",open2>0)}},1500);
setInterval(()=>{if(vis("forge"))drawF()},700);
drawF();drawA();sysUpdate();showStart();stripUpdate2();
})();
