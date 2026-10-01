
/* ---- foremen are people, not tiers ---- */
const CAND=[
 {n:"Quick Pip",pm:1.35,disc:1.10,q:"Fast hands, always wants a raise."},
 {n:"Haggler Moll",pm:1.05,disc:.85,q:"Gets you 15% off every upgrade."},
 {n:"Old Bess",pm:1.2,disc:1,q:"Steady. Never drops a crate."},
 {n:"Greedy Hob",pm:1.5,disc:1.25,q:"Works like a demon, costs like one."},
 {n:"Calm Tamsin",pm:1.15,disc:.95,q:"Quiet, careful, cheap to keep."},
 {n:"Tobias the Unpaid",pm:1.3,disc:.9,q:"Died on the job. Still on shift."},
 {n:"Marl",pm:1.1,disc:.8,q:"Knows a man who knows a discount."},
 {n:"Skipper Dane",pm:1.25,disc:1.05,q:"Loud, quick, a little reckless."}];
const modal=el("div","v2-modal");modal.innerHTML=`<div class="card"><h3 id="v2mh" style="font-size:19px"></h3><p class="note" id="v2ms"></p><div class="v2-cands" id="v2mc"></div><button class="big" id="v2mx" style="margin-top:14px">Not now</button></div>`;document.body.append(modal);
$("v2mx").onclick=()=>modal.classList.remove("on");modal.onclick=e=>{if(e.target===modal)modal.classList.remove("on")};
const shirts=["#3aa0c8","#c0553c","#4f9e7a","#c7a2e8","#e0b84a","#d8d8e0"];
const cfgOf=(k,i)=>k==="lv"?cs.levels[i]:k==="el"?cs.elev:cs.wh;
const dm=c=>LAWX.cost*(c.disc||1);
const costOf=(k,i,n)=>{const c=cfgOf(k,i);return E.upCost(k,i,c.L,n)*dm(c)};
function buyN(k,i){const c=cfgOf(k,i);return qty==="max"?Math.max(1,E.maxBuy(k,i,c.L,S.cash/dm(c))):qty}
const areaName=(k,i)=>k==="lv"?"Shaft "+(i+1):k==="el"?"the Lift":"the Warehouse";
function hire(k,i){
  const c=cfgOf(k,i),t=c.mgr+1;if(t>3)return;const cost=E.foreCost(k,i,t);if(S.cash<cost)return;
  const cands=[...CAND].sort(()=>Math.random()-.5).slice(0,3);
  $("v2mh").textContent="Hire a "+E.TIERS[t].n+" foreman for "+areaName(k,i);$("v2ms").textContent="Three came to the gate. Each is good at something and bad at something else. Pick one.";
  const box=$("v2mc");box.innerHTML="";
  cands.forEach((p,j)=>{const b=el("button","v2-cand");
    b.innerHTML=`<svg viewBox="0 0 20 38" shape-rendering="crispEdges">${miner(1,1,"",shirts[(j+i+t)%6],["#f3b24a","#e8e8ee","#ff6a6a"][j%3],null)}</svg><b>${p.n}</b><span class="pk">+${Math.round((p.pm-1)*100)}% speed</span><span class="tr">Upgrades ${p.disc<1?Math.round((1-p.disc)*100)+"% cheaper":p.disc>1?Math.round((p.disc-1)*100)+"% dearer":"cost the same"}</span><small>${p.q}</small>`;
    b.onclick=()=>{if(S.cash<cost)return;S.cash-=cost;c.mgr=t;c.pm=p.pm;c.disc=p.disc;c.fname=p.n;modal.classList.remove("on");toast(p.n+" takes over "+areaName(k,i)+".");confetti(14);sysUpdate();stripUpdate()};box.append(b)});
  modal.classList.add("on");
}
function upg(k,i){const c=cfgOf(k,i),n=buyN(k,i),cost=costOf(k,i,n);if(S.cash<cost)return;S.cash-=cost;const was=E.ms(c.L);c.L+=n;
  if(E.ms(c.L)>was){toast("Milestone! That link's output doubled.");confetti(18);cp.txt.push({x:240,y:SURF+40,s:"OUTPUT ×2",c:"#2bef8b",t:0,big:true})}
  if(k==="lv"&&Math.floor(c.L/25)>Math.floor((c.L-n)/25))rowArt[i]=null;sysUpdate()}
function unlock(){const n=cs.levels.length,cost=E.unlockCost(n)*LAWX.cost;if(S.cash<cost||n>=E.MAX_LV)return;S.cash-=cost;cs.levels.push({L:1,mgr:0});E.ensureRT(cs,rt);toast("Shaft "+(n+1)+" opened. Deeper rock pays more.");confetti(20);fitC();sysBuild();sysUpdate()}

/* ---- the pipeline strip: shafts, lift, warehouse, and which one is the slowest ---- */
function flows(){
  const n=cs.levels.length,sh=cs.levels.reduce((a,_,i)=>a+E.rate(cs,i),0),v=E.EL_V*E.spd(cs.elev),trip=2*n/v+(n+1)*E.LOAD_T/E.spd(cs.elev);
  return [sh,E.elCap(cs.elev)/trip,E.whCap(cs.wh)/(2*E.WH_T/E.spd(cs.wh))];
}
function stripUpdate(){
  const f=flows(),mn=Math.min(...f),names=["Shafts","Lift","Warehouse"],bi=f.indexOf(mn),icons=["pick","whistle","seal"];
  const host=$("v2pipe");if(!host.children.length){names.forEach((nm,i)=>{const d=el("div","pn");d.id="pn"+i;host.append(d);if(i<2){const a=el("div","pa");a.innerHTML="<i></i><i></i><i></i>";host.append(a)}})}
  names.forEach((nm,i)=>{const d=$("pn"+i);d.className="pn"+(i===bi?" bn":"");d.innerHTML=`${icon(icons[i],3)}<div><small>${nm}</small><b>${money(f[i]*LAWX.sell)}/s</b></div>`});
  [...host.querySelectorAll(".pa i")].forEach(x=>x.style.animationDuration=Math.max(.5,2.4-Math.log10(mn+10)*.35)+"s");
  $("v2pmsg").innerHTML=bi===0?`<b style="color:var(--green)">Healthy.</b> The shafts are the slowest link, so any upgrade pays.`:`<b style="color:var(--lamp2)">${names[bi]} is the bottleneck.</b> ${bi===1?"The lift can't carry what the shafts mine.":"The warehouse can't sell what the lift brings."} Fix that first.`;
  $("v2inc2").textContent=money(mn*LAWX.sell*RX.sell*RX.set)+"/s";$("v2bal").textContent=money(S.cash);
}
/* ---- system cards ---- */
let sysRows=null,sysN=-1;
const mkBtn=(cls,fn,txt)=>{const b=el("button",cls,txt);b.onclick=fn;return b};
function sysBuild(){
  const host=$("v2sys");host.innerHTML="";sysRows=[];sysN=cs.levels.length;
  const mk=(k,i,name,ic,parent)=>{const r=el("div","v2-sy"),h=el("div","v2-syh");h.innerHTML=icon(ic,4)+`<div class="tt"><b>${name}</b><small class="sub"></small></div>`;const sub=h.querySelector(".sub");
    const bar=el("div","v2-bar");bar.style.cssText="margin:6px 0 8px";const bi=el("i");bar.append(bi);
    const bt=el("div","v2-sb"),f=mkBtn("f",()=>hire(k,i)),u=mkBtn("u",()=>upg(k,i));bt.append(f,u);r.append(h,bar,bt);parent.append(r);sysRows.push({k,i,sub,bi,f,u,pill:null,r})};
  const g1=el("div","card v2-card"),g2=el("div","card v2-card"),g3=el("div","card v2-card");
  g1.append(el("h3","","Shafts"));g2.append(el("h3","","Lift"));g3.append(el("h3","","Warehouse"));
  cs.levels.forEach((_,i)=>mk("lv",i,"Shaft "+(i+1),"pick",g1));
  const nr=el("div","v2-sy"),nh=el("div","v2-syh");nh.innerHTML=icon("coin",4)+`<div class="tt"><b>New shaft</b><small>Deeper rock pays far more.</small></div>`;const nb=mkBtn("buy",unlock);nb.style.minWidth="110px";nh.append(nb);nr.append(nh);g1.append(nr);sysRows.unlock=nb;
  mk("el",0,"The Lift","whistle",g2);mk("wh",0,"The Warehouse","seal",g3);
  host.append(g2,g3,g1);
}
const nmTxt=(c,k)=>c.mgr?`${c.fname?c.fname+" · ":""}${E.TIERS[c.mgr].n}`:"tap to run";
function sysUpdate(){
  if(sysN!==cs.levels.length)sysBuild();
  sysRows.forEach(r=>{const c=cfgOf(r.k,r.i),nx=c.mgr<3?E.TIERS[c.mgr+1]:null,nm=E.nextMile(c.L),prev=[0,...E.MILE].filter(m=>m<=c.L).pop();
    r.sub.textContent=`Lv ${c.L} · ${nmTxt(c)}`+(nm?` · ×2 at ${nm}`:"");r.bi.style.width=nm?(c.L-prev)/(nm-prev)*100+"%":"100%";
    const n=buyN(r.k,r.i),cost=costOf(r.k,r.i,n);r.u.innerHTML=`<span>Upgrade ×${n}</span><small>${money(cost)}</small>`;r.u.disabled=S.cash<cost;
    if(nx){const fc=E.foreCost(r.k,r.i,c.mgr+1);r.f.innerHTML=`<span>${c.mgr?"Promote":"Hire foreman"}</span><small>${money(fc)}</small>`;r.f.disabled=S.cash<fc}else{r.f.innerHTML="<span>Legend</span><small>maxed</small>";r.f.disabled=true}});
  const n=cs.levels.length,uc=E.unlockCost(n)*LAWX.cost;sysRows.unlock.textContent="Open · "+money(uc);sysRows.unlock.disabled=S.cash<uc||n>=E.MAX_LV;
  stripUpdate();
}
$("tab-camp").querySelectorAll(".v2-qty button").forEach(b=>b.onclick=()=>{qty=b.dataset.q==="max"?"max":+b.dataset.q;$("tab-camp").querySelectorAll(".v2-qty button").forEach(x=>x.classList.toggle("on",x===b));sysUpdate()});
setInterval(()=>{if(vis("camp"))sysUpdate()},300);
sysBuild();sysUpdate();

/* ---- incidents: things that happen to you ---- */
let inc=null,incNext=Date.now()+14000;
function incRender(){
  const h=$("v2inc");if(!inc){h.innerHTML="";return}
  const left=Math.max(0,Math.ceil((inc.until-Date.now())/1000));
  if(inc.type==="cavein")h.innerHTML=`<div class="v2-incident bad"><b>Cave-in at Shaft ${inc.i+1}</b><span>The shaft is blocked. Tap the rubble to clear it (${inc.taps}/${inc.need}).</span></div>`;
  else if(inc.type==="vein")h.innerHTML=`<div class="v2-incident good"><b>Rich vein in Shaft ${inc.i+1}!</b><span>Tap the glowing crystals before they crumble.</span><span class="tm">${left}s</span></div>`;
  else{h.innerHTML=`<div class="v2-incident"><b>The Auditor's Inspector is at the gate</b><span>He wants to count your crates. Slip him ${money(inc.cost)}, or hide the books and hope.</span><span class="tm">${left}s</span><span style="flex:none;display:flex;gap:8px"></span></div>`;
    const row=h.querySelector("span:last-child"),b1=el("button","buy","Pay "+money(inc.cost)),b2=el("button","big","Hide the books");b2.style.cssText="width:auto;padding:0 14px;height:34px";b1.style.minWidth="120px";b1.disabled=S.cash<inc.cost;b1.onclick=()=>inspector(true);b2.onclick=()=>inspector(false);row.append(b1,b2)}
}
function incEnd(){inc=null;incNext=Date.now()+rr(25000,45000);incRender();stripUpdate()}
function startIncident(){
  const n=cs.levels.length,i=rr(0,n-1),r=rt.lv[i];let t=pick(["cavein","vein","inspector"]);if(t==="cavein"&&r.blocked)t="vein";
  if(t==="cavein"){r.blocked=true;inc={type:"cavein",i,taps:0,need:6,until:Date.now()+9e9};toast("Cave-in at Shaft "+(i+1)+"!")}
  else if(t==="vein"){r.vein=true;inc={type:"vein",i,until:Date.now()+12000};toast("A rich vein shows in Shaft "+(i+1)+".")}
  else{inc={type:"inspector",cost:Math.max(200,Math.round(S.cash*.03)),until:Date.now()+16000};toast("The Inspector is at the gate.")}
  incRender();stripUpdate();
}
function tapRubble(i,lx,ly){if(!inc||inc.type!=="cavein"||inc.i!==i)return;inc.taps++;cfx(lx,ly,"CLINK","#cfcfd6");const s=ccv;s.classList.remove("v2-shake");void s.getBoundingClientRect();s.classList.add("v2-shake");for(let q=0;q<5;q++)cp.coins.length<30&&cp.dust.push({});
  if(inc.taps>=inc.need){rt.lv[i].blocked=false;toast("Shaft "+(i+1)+" is clear.");confetti(10);incEnd()}else incRender()}
function tapVein(i,lx,ly){if(!inc||inc.type!=="vein"||inc.i!==i)return;const gain=Math.max(500,E.rate(cs,i)*50*RX.sell*RX.set);earn(gain);rt.lv[i].vein=false;cfx(lx,ly,"+"+money(gain),"#7cf5e8",16);toast("Struck it rich: +"+money(gain)+".");confetti(26);incEnd()}
function inspector(pay){if(!inc||inc.type!=="inspector")return;
  if(pay){if(S.cash<inc.cost)return;S.cash-=inc.cost;toast("The Inspector pockets it and finds nothing wrong.")}
  else if(Math.random()<.6)toast("You hid the books. He leaves, none the wiser.");
  else{const f=Math.round(S.cash*.08);S.cash-=f;toast("He found them. Fined "+money(f)+".");flash($("v2cfx"))}
  incEnd()}
setInterval(()=>{
  const now=Date.now();
  if(inc){if(inc.type==="vein"&&now>inc.until){rt.lv[inc.i].vein=false;toast("The vein crumbled before you got to it.");incEnd()}
    else if(inc.type==="inspector"&&now>inc.until){const f=Math.round(S.cash*.05);S.cash-=f;toast("You ignored him. He fined you "+money(f)+".");incEnd()}
    else if(vis("camp"))incRender()}
  else if(now>incNext&&(vis("camp")||vis("mine")))startIncident();
},1000);
$("v2law").innerHTML=`<b>Season 1 · The Reckoning</b><small>Week 3 of 8 · Auditor's Terms in force: <em style="color:var(--lamp2);font-style:normal">${TERMS.map(t=>t.n).join(" · ")}</em></small>`;
