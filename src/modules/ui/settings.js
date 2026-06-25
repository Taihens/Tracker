import { settings } from '../storage.js';
import { THEMES, ETATS_DEFAULT } from '../constants.js';
import { state, appMode, selectedPlayerChar, charHistory, setState, setCharHistory } from '../state.js';
import { save } from '../firebase.js';

export function renderSettings(){
  renderThemeGrid();
  renderLayoutGrid();
  const isMJ=appMode==='mj';
  // MJ-only sections
  ['settings-affichage','settings-donnees','settings-email','settings-pin','settings-firebase','settings-cof-rules'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.style.display=isMJ?'':'none';
  });
  // Player pwd section: only for players with a selected char
  const pwdSec=document.getElementById('settings-player-pwd');
  if(pwdSec) pwdSec.style.display=(!isMJ&&selectedPlayerChar)?'':'none';
  if(isMJ){
    document.getElementById('tog-pm').checked=settings.showPM;
    document.getElementById('tog-pc').checked=settings.showPC;
    document.getElementById('pin-status').textContent=localStorage.getItem('anathazer_pin')?'PIN actif ✓':'Aucun PIN défini';
    window.renderGeminiKeyStatus();
    window.loadCOFRulesStatus();
  }
  if(!isMJ&&selectedPlayerChar) window.renderPlayerPwdSection();
}
export function renderThemeGrid(){
  document.getElementById('theme-grid').innerHTML=THEMES.map(t=>`
    <button class="theme-btn${settings.theme===t.id?' active':''}" onclick="applyTheme('${t.id}')">
      <div class="theme-swatch" style="background:${t.bg};border-color:${t.acc}40;box-shadow:inset 0 0 0 2px ${t.acc}30"></div>
      <span class="theme-name">${t.name}</span>
    </button>`).join('');
}
export function exportData(){
  const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download=`anathazerín-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();
  window.toast('Sauvegarde exportée','t-i');
}
export function importData(input){
  const f=input.files[0];if(!f)return;
  const r=new FileReader();
  r.onload=e=>{
    try{
      const s=JSON.parse(e.target.result);
      if(!s.chars)throw new Error('Format invalide');
      if(!confirm('Importer cette sauvegarde ? Remplace les données actuelles.'))return;
      setState(s);if(!state.etats)state.etats=JSON.parse(JSON.stringify(ETATS_DEFAULT));
      setCharHistory({});save();window.render();window.toast('Sauvegarde importée','t-i');
    }catch(err){window.toast('Fichier invalide','t-w');}
  };
  r.readAsText(f);input.value='';
}
export function resetStats(){
  if(!confirm('Remettre tous les PV, PM et PC à leur maximum ? Le journal est conservé.'))return;
  state.chars.forEach(c=>{c.pvActuel=c.pvMax;c.pmActuel=c.pmMax;c.pcActuel=c.pcMax;c.etat='Normal';});
  setCharHistory({});save();window.render();window.toast('PV / PM / PC remis à jour','t-i');
}
export function exportEmail(scope){
  const addr=document.getElementById('email-addr').value;
  if(!addr){window.toast('Entrez une adresse email','t-w');return;}
  const isAll=scope==='all';
  const logs=isAll?state.log:state.log.filter(l=>l.session===state.session);
  let body=`ANATHAZERÏN — ${isAll?'Toutes les Sessions':'Session '+state.session}\n\n`;
  body+=`=== FICHES PERSONNAGES ===\n\n`;
  state.chars.forEach(c=>{
    body+=`${c.name} (${c.classe} ${c.race} Niv.${c.niveau})\n`;
    body+=`  PV: ${c.pvActuel}/${c.pvMax} | DEF: ${c.def} | Init: ${c.init} | Att: ${c.att} | Dég: ${c.degats}\n`;
    if(c.pmMax>0)body+=`  PM: ${c.pmActuel}/${c.pmMax}`;if(c.pcMax>0)body+=` | PC: ${c.pcActuel}/${c.pcMax}`;
    if(c.pmMax>0||c.pcMax>0)body+='\n';
    const attrs=c.attrs||{};body+=`  FOR:${attrs.FOR} DEX:${attrs.DEX} CON:${attrs.CON} INT:${attrs.INT} SAG:${attrs.SAG} CHA:${attrs.CHA}\n\n`;
  });
  body+=`=== RÉCAPITULATIF ===\n\n`;
  state.chars.forEach(c=>{
    const dmgs=logs.filter(l=>l.charId===c.id&&l.ev==='Dégâts');
    const soins=logs.filter(l=>l.charId===c.id&&l.ev==='Soin');
    body+=`${c.name}: ${dmgs.reduce((s,l)=>s+l.val,0)} dégâts reçus (${dmgs.length} coups), ${soins.length} soins\n`;
  });
  body+=`\n=== JOURNAL (${logs.length} entrées) ===\n\n`;
  logs.forEach(l=>{body+=`[S${l.session} C${l.cbt} R${l.rnd}] ${l.charName} — ${l.ev} ${l.val} (${l.source}) PV:${l.pv}\n`;});
  const subject=encodeURIComponent(`Anathazerïn — ${isAll?'Export complet':'Session '+state.session}`);
  const bodyEnc=encodeURIComponent(body);
  window.open(`mailto:${addr}?subject=${subject}&body=${bodyEnc}`);
}

const LAYOUTS=[{id:'normal',name:'Standard',desc:'Grille auto'},{id:'compact',name:'Compact',desc:'Cartes réduites'},{id:'large',name:'Étendu',desc:'Une carte/ligne'}];
export function applyLayout(id){
  settings.layout=id;document.documentElement.setAttribute('data-layout',id);
  localStorage.setItem('anathazer_settings',JSON.stringify(settings));renderLayoutGrid();
}
export function renderLayoutGrid(){
  const el=document.getElementById('layout-grid');if(!el)return;
  el.innerHTML=LAYOUTS.map(l=>`<button class="theme-btn${settings.layout===l.id?' active':''}" onclick="applyLayout('${l.id}')" style="flex:1;min-width:120px"><div class="theme-swatch" style="background:var(--bg3);display:flex;align-items:center;justify-content:center;font-family:'Cinzel',serif;font-size:12px;color:var(--gold2)">${l.id==='compact'?'▪▪▪':l.id==='large'?'▬':'▪▪'}</div><span class="theme-name">${l.name}</span><span style="font-family:'Crimson Text',serif;font-size:10px;color:var(--txt3);font-style:italic">${l.desc}</span></button>`).join('');
}
