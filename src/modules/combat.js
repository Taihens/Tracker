// ═══════════════════════════════════════════════════════════════
//  COMBAT — logique métier pure (dégâts, soins, PV/PM/PC, états, tours)
//  Appels de rendu/UI via window.* (pas d'import de ui.js — R architecte)
// ═══════════════════════════════════════════════════════════════
import { state, setState, cardTypes, setCharHistory, pushHistory } from './state.js';
import { save } from './firebase.js';
import { parseMod, dvMax } from './cof-classes.js';
import { DEFAULT_CHARS, ETATS_DEFAULT } from './constants.js';

// ── COULEURS / CLASSES PV ──
export function hpClass(c){
  const p=c.pvMax>0?c.pvActuel/c.pvMax:0;
  if(c.pvActuel<=0)return'dead';if(p<.25)return'crit';if(p<.5)return'low';if(p<1)return'ok';return'full';
}
export function hpColor(c){
  const k=hpClass(c);
  return k==='dead'?'#555':k==='crit'?'#e04444':k==='low'?'#ff9800':k==='ok'?'#8bc34a':'#4a9a40';
}

// ── ACTIONS ──
export function setDmgType(id,type){
  cardTypes[id]=type;
  const tp=document.getElementById('tp-'+id),tm=document.getElementById('tm-'+id);
  if(tp)tp.className='btn-type'+(type==='Physique'?' t-phys':'');
  if(tm)tm.className='btn-type'+(type==='Magique'?' t-mag':'');
}
export function setEtat(id,val){
  const c=state.chars.find(x=>x.id===id);if(!c)return;
  c.etat=val; save(); window.render();
  if(val!=='Normal')window.toast(`${c.name} — ${val}`,'t-w');
  window.checkDeath(c);
}
export function updateCardPV(c){
  const card=document.getElementById('card-'+c.id);
  if(!card) return;
  const hpEl=card.querySelector('.hp-cur');
  if(hpEl){hpEl.textContent=c.pvActuel;hpEl.className='hp-cur '+hpClass(c);}
  const barEl=card.querySelector('.bar-fill');
  if(barEl){const pct=c.pvMax>0?Math.max(0,c.pvActuel/c.pvMax):0;barEl.style.width=(pct*100).toFixed(1)+'%';barEl.style.background=hpColor(c);}
  if(c.pvActuel<=0)card.classList.add('ko'); else card.classList.remove('ko');
}
export function applyDmg(id){
  const c=state.chars.find(x=>x.id===id);if(!c)return;
  const amt=parseInt(document.getElementById('dmg-'+id).value)||0;
  if(amt<=0){window.toast('Valeur invalide','t-w');return;}
  const src=document.getElementById('src-'+id).value||'—';
  const type=cardTypes[id]||'Physique';
  const avant=c.pvActuel;
  c.pvActuel=Math.max(0,c.pvActuel-amt);
  updateCardPV(c);
  if(c.pvActuel===0)c.etat='Inconscient';
  const entry={logId:Date.now()+Math.random(),charId:id,charName:c.name,ev:'Dégâts',val:amt,source:src,combat:document.getElementById('g-cname').value||'—',type,session:state.session,cbt:state.combat,rnd:state.round,pv:c.pvActuel,ts:Date.now()};
  state.log.push(entry);
  pushHistory(id,c.pvActuel,c.etat,entry);
  document.getElementById('dmg-'+id).value='';
  document.getElementById('src-'+id).value='';
  save(); window.render();
  if(document.getElementById('tab-log').classList.contains('active'))window.renderLog();
  if(document.getElementById('tab-recap').classList.contains('active'))window.renderRecap();
  window.toast(`${c.name} — −${amt} PV [${type}] (${avant}→${c.pvActuel})`,'t-d');
  if(c.pvActuel===0){window.toast(`☠ ${c.name} est Inconscient !`,'t-w');window.checkDeath(c);}
}
export function applyHeal(id){
  const c=state.chars.find(x=>x.id===id);if(!c)return;
  const amt=parseInt(document.getElementById('heal-'+id).value)||0;
  if(amt<=0){window.toast('Valeur invalide','t-w');return;}
  const src=document.getElementById('hsrc-'+id).value||'—';
  const avant=c.pvActuel;
  c.pvActuel=Math.min(c.pvMax,c.pvActuel+amt);
  updateCardPV(c);
  if(c.etat==='Inconscient'&&c.pvActuel>0)c.etat='Normal';
  const entry={logId:Date.now()+Math.random(),charId:id,charName:c.name,ev:'Soin',val:amt,source:src,combat:document.getElementById('g-cname').value||'—',type:'—',session:state.session,cbt:state.combat,rnd:state.round,pv:c.pvActuel,ts:Date.now()};
  state.log.push(entry);
  pushHistory(id,c.pvActuel,c.etat,entry);
  document.getElementById('heal-'+id).value='';
  document.getElementById('hsrc-'+id).value='';
  save(); window.render();
  if(document.getElementById('tab-log').classList.contains('active'))window.renderLog();
  if(document.getElementById('tab-recap').classList.contains('active'))window.renderRecap();
  window.toast(`${c.name} — +${amt} PV (${avant}→${c.pvActuel})`,'t-h');
}
export function adjPM(id,d){
  const c=state.chars.find(x=>x.id===id);if(!c)return;
  const avant=c.pmActuel;
  c.pmActuel=Math.max(0,Math.min(c.pmMax,c.pmActuel+d));
  if(c.pmActuel===avant)return;
  state.log.push({logId:Date.now()+Math.random(),charId:id,charName:c.name,ev:d<0?'PM dépensé':'PM récupéré',val:Math.abs(d),source:'—',combat:'—',type:'—',session:state.session,cbt:state.combat,rnd:state.round,pv:c.pvActuel,ts:Date.now()});
  save(); window.render();
  window.toast(`${c.name} — PM ${d<0?'-':'+'}${Math.abs(d)} (${c.pmActuel}/${c.pmMax})`,'t-pm');
}
export function recupPM(id){
  const c=state.chars.find(x=>x.id===id);if(!c)return;
  const gain=c.pmMax-c.pmActuel;if(gain<=0)return;
  c.pmActuel=c.pmMax;
  state.log.push({logId:Date.now()+Math.random(),charId:id,charName:c.name,ev:'PM récupéré',val:gain,source:'Récup. totale',combat:'—',type:'—',session:state.session,cbt:state.combat,rnd:state.round,pv:c.pvActuel,ts:Date.now()});
  save(); window.render();
  window.toast(`${c.name} — PM max (${c.pmMax}/${c.pmMax})`,'t-pm');
}
export function adjPC(id,d){
  const c=state.chars.find(x=>x.id===id);if(!c)return;
  const avant=c.pcActuel;
  c.pcActuel=Math.max(0,Math.min(c.pcMax,c.pcActuel+d));
  if(c.pcActuel===avant)return;
  state.log.push({logId:Date.now()+Math.random(),charId:id,charName:c.name,ev:d<0?'PC dépensé':'PC récupéré',val:Math.abs(d),source:'—',combat:'—',type:'—',session:state.session,cbt:state.combat,rnd:state.round,pv:c.pvActuel,ts:Date.now()});
  save(); window.render();
  window.toast(`${c.name} — PC ${d<0?'-':'+'}${Math.abs(d)} (${c.pcActuel}/${c.pcMax})`,'t-pc');
}
export function adjRound(d){state.round=Math.max(1,state.round+d);save();window.render();}

// ── POINT DE RÉCUPÉRATION ──
export function pointRecup(){
  state.chars.filter(c=>c.present&&c.pvActuel>0&&c.pvActuel<c.pvMax).forEach(c=>{
    const conMod=parseMod(c.attrs?.CON||0);
    const dv=dvMax(c.dv||'D6');
    // COF rule: DV (lancé) + mod CON + niveau
    const roll=Math.floor(Math.random()*dv)+1;
    const gain=Math.max(1,roll+conMod+c.niveau);
    const avant=c.pvActuel;
    c.pvActuel=Math.min(c.pvMax,c.pvActuel+gain);
    const actual=c.pvActuel-avant;
    if(actual>0){
      const entry={logId:Date.now()+Math.random()+c.id,charId:c.id,charName:c.name,ev:'Soin',val:actual,source:`Point de récupération (${c.dv}:${roll}+CON${conMod>=0?'+':''}${conMod}+Niv${c.niveau}=${gain})`,combat:document.getElementById('g-cname')?.value||'—',type:'—',session:state.session,cbt:state.combat,rnd:state.round,pv:c.pvActuel,ts:Date.now()};
      state.log.push(entry);pushHistory(c.id,c.pvActuel,c.etat,entry);
    }
  });
  save();window.render();
  state.chars.filter(c=>c.present).forEach(c=>{const el=document.getElementById('card-'+c.id);if(el){el.classList.add('healing');setTimeout(()=>el.classList.remove('healing'),900);}});
  window.toast('✦ Point de Récupération appliqué — voir le journal','t-h');
}

// ── FIN DE ROUND / COMBAT / SESSION / REPOS / RESET ──
export function endRound(){
  window.showActionConfirm('↷','Fin de Round',`Passer au Round ${state.round+1} ?`,()=>{
    window.saveSnapshot();
    state.round++;
    state.chars.forEach(c=>{if(c.etat==='Surpris')c.etat='Normal';});
    save();window.render();window.showUndoBar(`Round ${state.round} — action annulable`);
  });
}
export function endCombat(){
  window.showActionConfirm('⚔','Fin de Combat',`Terminer le combat et passer au Combat ${state.combat+1} ?`,()=>{
    window.saveSnapshot();
    state.combat++;state.round=1;state.activeTurn=null;
    state.chars.forEach(c=>{if(['Étourdi','Surpris'].includes(c.etat))c.etat='Normal';});
    save();window.render();window.showUndoBar(`Combat ${state.combat} prêt — action annulable`);
  });
}
export function endSession(){
  window.showActionConfirm('📜','Fin de Session',`Terminer la Session ${state.session} et passer à la suivante ?`,()=>{
    window.saveSnapshot();
    state.session++;state.combat=1;state.round=1;state.activeTurn=null;
    save();window.render();window.showUndoBar(`Session ${state.session} — action annulable`);
  });
}
export function resetAll(){
  window.showActionConfirm('✕','Réinitialiser TOUT','Cette action est irréversible. Toutes les données seront perdues.',()=>{
    setState({chars:JSON.parse(JSON.stringify(DEFAULT_CHARS)),log:[],session:1,combat:1,round:1,activeTurn:null,etats:JSON.parse(JSON.stringify(ETATS_DEFAULT)),lvlUpHistory:{}});
    setCharHistory({});save();window.render();window.toast('Tout réinitialisé','t-i');
  });
}
export function reposComplet(){
  window.showActionConfirm('☽','Repos Complet','Tous les PV, PM et PC seront restaurés au maximum.',()=>{
    window.saveSnapshot();
    confirmReposComplet();
    window.showUndoBar('Repos complet — action annulable');
  });
}
export function confirmReposComplet(){
  state.chars.forEach(c=>{c.pvActuel=c.pvMax;c.pmActuel=c.pmMax;c.pcActuel=c.pcMax;c.etat='Normal';});
  setCharHistory({});
  save();window.render();
  state.chars.filter(c=>c.present).forEach(c=>{const el=document.getElementById('card-'+c.id);if(el){el.classList.add('healing');setTimeout(()=>el.classList.remove('healing'),900);}});
  window.toast('☽ Repos complet — PV, PM et PC restaurés','t-h');
}

// ── ACTIVE TURN ──
export function setActiveTurn(id){
  state.activeTurn=state.activeTurn===id?null:id;
  save();window.render();
  if(state.activeTurn){const c=state.chars.find(x=>x.id===id);if(c)window.toast(`Tour de ${c.name}`,'t-i');}
}
