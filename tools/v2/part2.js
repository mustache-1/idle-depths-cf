
/* ================= FORGE: permanent gear (cash) + relics (shards) ================= */
const RL=[
 {n:"Ashcombe's Seal",fx:"Camp sales pay +10%",set:"Ledger",ic:"seal",live:"Live in Camp"},
 {n:"Foreman's Whistle",fx:"Every foreman works 15% faster",set:"Ledger",ic:"whistle",live:"Live in Camp"},
 {n:"Debtor's Pick",fx:"All your damage in a dive +15%",set:"Ledger",ic:"pick",live:"Live in Dive"},
 {n:"Wyrm Tooth",fx:"The Wyrm's chest is doubled",set:"Deep",ic:"tooth",live:"Live in Dive"},
 {n:"Lantern of the Long Payroll",fx:"Camp pays +25%",set:"Deep",ic:"lantern",live:"Live in Camp"},
 {n:"Warm Dark Coin",fx:"Once per dive, you come back at 40% health",set:"Deep",ic:"coin",live:"Live in Dive"},
 {n:"Salt-Bone Charm",fx:"+20 max health in a dive",set:"Salt",ic:"charm",live:"Live in Dive"},
 {n:"The Unclosed Timesheet",fx:"Scores planted in Guilds count 25% more",set:"Salt",ic:"sheet",live:"Live in Guilds"}];
const owned={},equip=[null,null,null];
function recomputeRX(){
  const eq=equip.filter(x=>x!==null),has=n=>eq.some(i=>RL[i].n===n),sets={};eq.forEach(i=>sets[RL[i].set]=(sets[RL[i].set]||0)+1);
  RX.sell=(has("Ashcombe's Seal")?1.1:1)*(has("Lantern of the Long Payroll")?1.25:1);
  RX.speed=has("Foreman's Whistle")?1.15:1;
  RX.push=has("The Unclosed Timesheet")?1.25:1;RX.boss=has("Wyrm Tooth")?2:1;RX.hp=has("Salt-Bone Charm")?20:0;RX.revive=has("Warm Dark Coin");RX.dmg=has("Debtor's Pick")?1.15:1;
  RX.set=Object.keys(sets).some(k=>sets[k]>=2)?1.1:1;RX.sets=Object.keys(sets).filter(k=>sets[k]>=2);
}
const FORGE=[
 {id:"hp",n:"Iron Lungs",d:"+8% max health per level",ic:"shield",base:1200},
 {id:"dmg",n:"Sharp Edge",d:"+6% damage per level",ic:"pick",base:1500},
 {id:"spd",n:"Quick Boots",d:"+4% move speed per level",ic:"whistle",base:1000},
 {id:"mag",n:"Magnet Coil",d:"+10% pickup range per level",ic:"coin",base:900},
 {id:"xp",n:"Lucky Lamp",d:"+6% experience per level",ic:"lantern",base:1400},
 {id:"gold",n:"Deep Pockets",d:"+6% gold per level",ic:"seal",base:1800},
 {id:"camp",n:"Foreman's Tools",d:"+4% Camp speed per level",ic:"whistle",base:2200}];
const fl=id=>V.forge[id]||0,fcost=f=>Math.round(f.base*Math.pow(1.7,fl(f.id)));
function drawF(){
  recomputeRX();
  $("v2fc").textContent=money(S.cash);$("v2rs").textContent=V.shards;const eq=equip.filter(x=>x!==null);$("v2re").textContent=eq.length+"/3";$("v2rset").textContent=RX.sets.length?RX.sets.join(", "):"none";
  const fg=$("v2fg");fg.innerHTML="";
  FORGE.forEach(f=>{const r=el("div","v2-frow"),c=fcost(f),mx=fl(f.id)>=12;r.innerHTML=icon(f.ic,5)+`<div><b>${f.n} <span style="color:var(--dim);font-weight:400;font-size:12px">Lv ${fl(f.id)}</span></b><small>${f.d}</small></div>`;
    const b=el("button","buy",mx?"Max":money(c));b.disabled=mx||S.cash<c;b.onclick=()=>{if(S.cash<c)return;S.cash-=c;V.forge[f.id]=fl(f.id)+1;toast(f.n+" is now level "+V.forge[f.id]+".");drawF()};r.append(b);fg.append(r)});
  const sl=$("v2sl");sl.innerHTML="";
  equip.forEach((x,i)=>{const p=el("button","v2-pedestal"+(x!==null?" full":""));
    if(x!==null){p.innerHTML=icon(RL[x].ic,5)+`<b style="font-size:13px">${RL[x].n}</b><small style="color:var(--dim)">tap to unequip</small>`;p.onclick=()=>{equip[i]=null;drawF()}}
    else p.innerHTML=`<span style="font-size:24px;opacity:.35">◈</span><span>Empty</span>`;sl.append(p)});
  const fx=eq.map(i=>RL[i].fx);if(RX.sets.length)fx.push("Set bonus ("+RX.sets.join(", ")+"): the Camp pays +10%");
  $("v2fx").textContent=fx.length?fx.join(" · "):"Nothing equipped. Buy relics with shards from your dives.";
  const g=$("v2rl");g.innerHTML="";
  RL.forEach((r,i)=>{const isE=equip.indexOf(i)>-1,c=el("div","v2-rc"+(owned[i]?" own":"")+(isE?" eq":""));
    c.innerHTML=icon(r.ic,5)+`<b>${r.n}</b><small>${r.fx}</small><span class="tg2">${r.live} · ${r.set} set</span>`;
    const b=el("button",owned[i]?"":"buy",owned[i]?(isE?"Equipped":"Equip"):"Buy · 80 shards");b.style.width="100%";
    b.disabled=owned[i]?(isE||equip.indexOf(null)<0):V.shards<80;
    b.onclick=()=>{if(!owned[i]){if(V.shards<80)return;V.shards-=80;owned[i]=1;V.relicsBought++;toast(r.n+" is yours.")}else{const f=equip.indexOf(null);if(f<0)return;equip[f]=i}drawF()};
    c.append(b);g.append(c)});
}

