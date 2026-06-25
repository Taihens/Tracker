// ═══════════════════════════════════════════════════════════════
//  LEVEL UP — Wizard (pages 0/1/2 + apply)
// ═══════════════════════════════════════════════════════════════
import { parseMod, dvMax, parseAtt, fmtAtt, isPrestige, capCost } from '../cof-classes.js';
import { setPmAttrPref } from '../storage.js';
import { state, appMode } from '../state.js';
import { save } from '../firebase.js';
import { pendingLvlUps, fbSavePendingLvlUp } from './pending.js';

export let lvlUpCharId=null, lvlUpPage=0, lvlUpSelected=[], lvlUpPmGain=0;

export function prevRankOk(voie, rang){
  const r=parseInt(rang.replace('R',''));
  if(r===1) return true;
  const prev=voie.caps.find(c=>c.r==='R'+(r-1));
  if(!prev) return false;
  if(prev.ok) return true;
  return lvlUpSelected.some(s=>s.voieNom===voie.nom&&s.rang===prev.r);
}
export function capLocked(voie, cap, niveau){
  const r=parseInt(cap.r.replace('R',''));
  if(cap.ok) return 'already';
  if(!prevRankOk(voie,cap.r)) return 'prev';
  // COF rule: rang available if niveau >= rang (e.g. R3 needs niveau >= 3)
  // At niveau 8 all ranks R1-R5 should be accessible
  if(r>niveau) return 'level';
  return null;
}

export function openLvlUp(id){
  const c=state.chars.find(x=>x.id===id); if(!c)return;
  lvlUpCharId=id; lvlUpPage=0; lvlUpSelected=[]; lvlUpPmGain=0;
  // ensure att fields exist
  if(!c.attContact) c.attContact=c.att||'+0';
  if(!c.attDistance) c.attDistance=c.att||'+0';
  if(!c.attMagique) c.attMagique=c.att||'+0';
  document.getElementById('lu-title').textContent=`↑ Level Up — ${c.name} (Niv. ${c.niveau} → ${c.niveau+1})`;
  lvlUpGoPage(0);
  document.getElementById('lvlup-overlay').classList.add('show');
}
export function closeLvlUp(){
  document.getElementById('lvlup-overlay').classList.remove('show');
  lvlUpCharId=null;
}
export function lvlUpGoPage(p){
  lvlUpPage=p;
  document.querySelectorAll('.lu-page').forEach((el,i)=>el.classList.toggle('active',i===p));
  document.querySelectorAll('.lu-step').forEach((el,i)=>{
    el.classList.toggle('active',i===p);
    el.classList.toggle('done',i<p);
  });
  document.getElementById('lu-btn-back').style.display=p>0?'':'none';
  document.getElementById('lu-btn-next').textContent=p===2?'✓ Confirmer':'Suivant →';
  const c=state.chars.find(x=>x.id===lvlUpCharId); if(!c)return;
  if(p===0) buildLvlPage0(c);
  if(p===1) buildLvlPage1(c);
  if(p===2) buildLvlPage2(c);
}
export function lvlUpNext(){
  const c=state.chars.find(x=>x.id===lvlUpCharId); if(!c)return;
  if(lvlUpPage===0){ lvlUpGoPage(1); return; }
  if(lvlUpPage===1){
    const pts=lvlUpSelected.reduce((s,sel)=>s+capCost(sel.rang,sel.voieNom),0);
    if(pts<2&&c.voies.length>0){
      if(!confirm(`Il reste ${2-pts} point(s) non dépensé(s). Continuer quand même ?`))return;
    }
    lvlUpGoPage(2); return;
  }
  if(lvlUpPage===2){ applyLvlUp(c); return; }
}
export function lvlUpBack(){ if(lvlUpPage>0) lvlUpGoPage(lvlUpPage-1); }

export function buildLvlPage0(c){
  const conMod=parseMod(c.attrs?.CON||0);
  const pvGain=dvMax(c.dv)+conMod;
  const attCurC=parseAtt(c.attContact||c.att||'0');
  const attCurD=parseAtt(c.attDistance||c.att||'0');
  const attCurM=parseAtt(c.attMagique||c.att||'0');
  const pmGain=window.calcPmGainAtLvlUp(c);
  lvlUpPmGain=pmGain;

  document.getElementById('lu-page-0').innerHTML=`
    <div class="lu-section">Gains automatiques</div>
    <div class="lu-stat-row"><span class="lu-stat-l">Niveau</span><span class="lu-stat-v up">${c.niveau} → ${c.niveau+1}</span></div>
    <div class="lu-stat-row"><span class="lu-stat-l">PV Max (${c.dv} max + CON ${conMod>=0?'+':''}${conMod})</span><span class="lu-stat-v up">${c.pvMax} → ${c.pvMax+pvGain} <span style="font-size:10px;color:var(--grn3)">(+${pvGain})</span></span></div>
    <div class="lu-stat-row"><span class="lu-stat-l">Attaque au contact</span><span class="lu-stat-v up">${fmtAtt(attCurC)} → ${fmtAtt(attCurC+1)}</span></div>
    <div class="lu-stat-row"><span class="lu-stat-l">Attaque à distance</span><span class="lu-stat-v up">${fmtAtt(attCurD)} → ${fmtAtt(attCurD+1)}</span></div>
    <div class="lu-stat-row"><span class="lu-stat-l">Attaque magique</span><span class="lu-stat-v up">${fmtAtt(attCurM)} → ${fmtAtt(attCurM+1)}</span></div>
    <div class="lu-stat-row"><span class="lu-stat-l">Initiative</span><span class="lu-stat-v" style="color:var(--txt2)">Inchangée</span></div>
    ${pmGain>0?`
    <div class="lu-section" style="margin-top:14px">Points de Mana</div>
    <div class="lu-stat-row"><span class="lu-stat-l">Gain PM (règle classe)</span><span class="lu-stat-v up">${c.pmMax} → ${c.pmMax+pmGain} <span style="font-size:10px;color:var(--blu3)">(+${pmGain}/niveau)</span></span></div>
    `:'<p style="font-size:11px;color:var(--txt3);margin-top:8px">Ce personnage n\'utilise pas de PM.</p>'}
  `;
}
export function updatePmCalc(charId, pmBase){
  const sel=document.getElementById('lu-pm-attr');if(!sel)return;
  const attr=sel.value;
  setPmAttrPref(charId,attr);
  const c=state.chars.find(x=>x.id===charId);if(!c)return;
  const mod=parseMod((c.attrs||{})[attr]||0);
  lvlUpPmGain=pmBase>0?Math.max(0,pmBase+mod):0;
  const disp=document.getElementById('lu-pm-display');
  if(disp)disp.innerHTML=`${c.pmMax} → ${c.pmMax+lvlUpPmGain} <span style="font-size:10px;color:var(--blu3)">(+${lvlUpPmGain})</span>`;
}

export function buildLvlPage1(c){
  if(!c.voies||c.voies.length===0){
    document.getElementById('lu-page-1').innerHTML=`<p style="color:var(--txt2);font-style:italic;font-size:13px;text-align:center;padding:20px">Ce personnage n'a aucune voie définie.<br>Ajoutez-en via le bouton Éditer.</p>`;
    return;
  }
  const spent=()=>lvlUpSelected.reduce((s,sel)=>s+capCost(sel.rang,sel.voieNom),0);
  const render=()=>{
    const pts=spent();
    const html=`<div class="lu-pts">Points disponibles : <span>${2-pts}</span> / 2</div>`+
    c.voies.map(v=>`
      <div class="lu-voie">
        <div class="lu-voie-title">${v.nom}${isPrestige(v.nom)?' <span style="font-size:9px;color:var(--gold3)">(Prestige — 2pts/rang)</span>':''}</div>
        ${v.caps.map(cap=>{
          const lock=capLocked(v,cap,c.niveau);
          const isSel=lvlUpSelected.some(s=>s.voieNom===v.nom&&s.rang===cap.r);
          const cost=capCost(cap.r,v.nom);
          const canAfford=2-pts>=cost||isSel;
          let cls='lu-cap';
          let costTxt=cost+'pt'+(cost>1?'s':'');
          let title='';
          if(lock==='already'){cls+=' already-ok';costTxt='✓ acquis';}
          else if(lock==='prev'){cls+=' locked';title='Rang précédent requis';}
          else if(lock==='level'){cls+=' locked';title=`Niveau ${parseInt(cap.r.replace('R',''))} requis`;}
          else if(isSel){cls+=' available selected';}
          else if(!canAfford){cls+=' locked';title='Points insuffisants';}
          else{cls+=' available';}
          const safeVoie=v.nom.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
          const onclick=(lock||(!canAfford&&!isSel))?'':`onclick="toggleLuCap('${safeVoie}','${cap.r}',${cost})"`;
          const cursorStyle=onclick?'cursor:pointer':'cursor:not-allowed';
          return`<div class="${cls}" ${onclick} title="${title}" style="${cursorStyle}">
            <span class="lu-cap-rank">${cap.r}</span>
            <span class="lu-cap-name">${cap.nom}<span style="font-size:10px;color:var(--txt2);margin-left:6px">${cap.desc.slice(0,50)}${cap.desc.length>50?'…':''}</span></span>
            <span class="lu-cap-cost">${costTxt}</span>
          </div>`;
        }).join('')}
      </div>`).join('');
    document.getElementById('lu-page-1').innerHTML=html;
  };
  window.toggleLuCap=(voieNom,rang,cost)=>{
    const idx=lvlUpSelected.findIndex(s=>s.voieNom===voieNom&&s.rang===rang);
    if(idx>=0){ lvlUpSelected.splice(idx,1); }
    else {
      const pts=spent();
      if(pts+cost>2){ window.toast('Plus assez de points','t-w'); return; }
      lvlUpSelected.push({voieNom,rang});
    }
    render();
  };
  render();
}

export function buildLvlPage2(c){
  const conMod=parseMod(c.attrs?.CON||0);
  const pvGain=dvMax(c.dv)+conMod;
  const attCurC=parseAtt(c.attContact||c.att||'0');
  const attCurD=parseAtt(c.attDistance||c.att||'0');
  const attCurM=parseAtt(c.attMagique||c.att||'0');
  const caps=lvlUpSelected.map(sel=>{
    const v=c.voies.find(v=>v.nom===sel.voieNom);
    const cap=v?.caps.find(cap=>cap.r===sel.rang);
    return`<div class="lu-confirm-row"><span class="arrow">+</span>${sel.rang} — ${cap?.nom||'?'} <span style="color:var(--txt2);font-size:11px">(${capCost(sel.rang,sel.voieNom)}pt)</span></div>`;
  }).join('')||'<div class="lu-confirm-row" style="color:var(--txt3);font-style:italic">Aucune capacité choisie</div>';
  document.getElementById('lu-page-2').innerHTML=`
    <div class="lu-confirm-block">
      <div class="lu-confirm-title">Gains automatiques</div>
      <div class="lu-confirm-row"><span class="arrow">+</span>Niveau ${c.niveau} → <strong style="color:var(--gold2)">${c.niveau+1}</strong></div>
      <div class="lu-confirm-row"><span class="arrow">+</span>PV Max : ${c.pvMax} → <strong style="color:var(--grn3)">${c.pvMax+pvGain}</strong> (+${pvGain})</div>
      <div class="lu-confirm-row"><span class="arrow">+</span>PV Actuels : ${c.pvActuel} → <strong style="color:var(--grn3)">${c.pvActuel+pvGain}</strong></div>
      <div class="lu-confirm-row"><span class="arrow">+</span>Att. contact : ${fmtAtt(attCurC)} → <strong style="color:var(--grn3)">${fmtAtt(attCurC+1)}</strong></div>
      <div class="lu-confirm-row"><span class="arrow">+</span>Att. distance : ${fmtAtt(attCurD)} → <strong style="color:var(--grn3)">${fmtAtt(attCurD+1)}</strong></div>
      <div class="lu-confirm-row"><span class="arrow">+</span>Att. magique : ${fmtAtt(attCurM)} → <strong style="color:var(--grn3)">${fmtAtt(attCurM+1)}</strong></div>
      ${lvlUpPmGain>0?`<div class="lu-confirm-row"><span class="arrow">+</span>PM Max : ${c.pmMax} → <strong style="color:var(--blu3)">${c.pmMax+lvlUpPmGain}</strong></div>`:''}
    </div>
    <div class="lu-confirm-block">
      <div class="lu-confirm-title">Capacités débloquées</div>
      ${caps}
    </div>
    <p style="font-size:12px;color:var(--txt2);text-align:center;margin-top:6px">Clique sur Confirmer pour appliquer le level up.</p>
  `;
}

export function applyLvlUp(c){
  if(appMode==='joueur'){
    // Player mode: store as pending, wait for MJ approval
    pendingLvlUps[c.id]={selected:JSON.parse(JSON.stringify(lvlUpSelected)),pmGain:lvlUpPmGain,charId:c.id,charName:c.name,timestamp:Date.now()};
    fbSavePendingLvlUp(); // sync to Firebase
    closeLvlUp();
    // Refresh so badge appears immediately
    window.render();
    if(document.getElementById('tab-roster')?.classList.contains('active')) window.renderRoster();
    window.toast(`${c.name} — demande envoyée au MJ ↑`,'t-i');
    return;
  }
  // MJ mode: save snapshot then apply immediately
  if(!state.lvlUpHistory)state.lvlUpHistory={};
  if(!state.lvlUpHistory[c.id])state.lvlUpHistory[c.id]=[];
  state.lvlUpHistory[c.id].push(JSON.parse(JSON.stringify({niveau:c.niveau,pvMax:c.pvMax,pvActuel:c.pvActuel,pmMax:c.pmMax,pmActuel:c.pmActuel,attContact:c.attContact,attDistance:c.attDistance,attMagique:c.attMagique,att:c.att,voies:c.voies})));
  const conMod=parseMod(c.attrs?.CON||0);
  const pvGain=dvMax(c.dv)+conMod;
  c.niveau++;
  c.pvMax+=pvGain; c.pvActuel+=pvGain;
  const attCurC=parseAtt(c.attContact||c.att||'0');
  const attCurD=parseAtt(c.attDistance||c.att||'0');
  const attCurM=parseAtt(c.attMagique||c.att||'0');
  c.attContact=fmtAtt(attCurC+1);
  c.attDistance=fmtAtt(attCurD+1);
  c.attMagique=fmtAtt(attCurM+1);
  c.att=c.attContact;
  if(lvlUpPmGain>0){ c.pmMax+=lvlUpPmGain; c.pmActuel+=lvlUpPmGain; }
  lvlUpSelected.forEach(sel=>{
    const v=c.voies.find(v=>v.nom===sel.voieNom);
    if(v){ const cap=v.caps.find(cap=>cap.r===sel.rang); if(cap) cap.ok=true; }
  });
  save(); window.render();
  if(document.getElementById('tab-roster')?.classList.contains('active')) window.renderRoster();
  if(document.getElementById('tab-fiches')?.classList.contains('active')) window.renderFiche();
  closeLvlUp();
  window.toast(`${c.name} — Niveau ${c.niveau} ! 🎉`,'t-i');
}
