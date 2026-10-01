
/* ================= HOW THE TABS TALK TO EACH OTHER ================= */
// Guild galleries you hold give a buff in one of the other modes.
const GB={mine:0,sell:1,gold:2,xp:3,dmg:4};
const GBT=["Mine swings +10%","Camp sales +10%","Dive gold +10%","Dive XP +10%","Dive damage +10%"];
function guildBuff(k){if(k==="spawn")return 1/.85;const i=GB[k];if(i==null)return 1;return holder(D[i])===me?1.1:1}
function guildBuffText(){return D.map((d,i)=>holder(d)===me?DN[i]+": "+GBT[i]:null).filter(Boolean).join(" · ")}
const campRate=()=>Math.min(...flows())*LAWX.sell*RX.sell*RX.set;
// relics and forge gear and a Mine overdrive all push the Camp's speed
setInterval(()=>{LAWX.speed=RX.speed*(1+fl("camp")*.04)*(Date.now()<(V.campBoostUntil||0)?1.5:1)},200);
/* the status strip under the tabs: what's going on in the other modes, one tap away */
const strip=$("v2strip");
function chip(txt,tab,cls){const b=el("button","v2-chip2"+(cls?" "+cls:""),txt);b.onclick=()=>switchTab(tab);return b}
function stripUpdate2(){
  const now=Date.now(),cur=document.querySelector(".tab.on"),here=cur&&cur.dataset.tab,items=[];
  const f=flows(),mn=Math.min(...f),bi=f.indexOf(mn),nm=["Shafts","Lift","Warehouse"];
  if(here!=="camp"){items.push(chip(bi===0?"Camp "+money(campRate())+"/s":"Camp: "+nm[bi]+" is slow","camp",bi===0?"":"warn"));if(inc)items.push(chip(inc.type==="cavein"?"Cave-in!":inc.type==="vein"?"Rich vein!":"Inspector!","camp","hot"))}
  if(now<(V.campBoostUntil||0))items.push(chip("Camp ×1.5 · "+Math.ceil((V.campBoostUntil-now)/1000)+"s","camp","good"));
  if(raid&&here!=="guilds")items.push(chip("Raid on "+DN[raid.g]+" · "+Math.max(0,Math.ceil((raid.until-now)/1000))+"s","guilds","hot"));
  const ready=ORD.filter((o,i)=>o.f()>=1&&!V.claimed[i]).length;if(ready&&here!=="audit")items.push(chip(ready+" order"+(ready>1?"s":"")+" ready","audit","good"));
  const aff=FORGE.filter(x=>fl(x.id)<12&&S.cash>=fcost(x)).length;if(aff&&here!=="forge")items.push(chip(aff+" Forge upgrade"+(aff>1?"s":"")+" affordable","forge"));
  if(here!=="dive"){const gb=guildBuffText();items.push(chip(run&&!run.over?"Dive paused":"Dive · best "+V.st.bestScore,"dive",run&&!run.over?"warn":""));if(gb)items.push(chip("Guild buffs: "+gb.split(" · ").length+" active","guilds","good"))}
  strip.innerHTML="";items.slice(0,6).forEach(x=>strip.append(x));
}
setInterval(stripUpdate2,700);
