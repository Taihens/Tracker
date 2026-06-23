// ═══════════════════════════════════════════════════════════════
//  STORAGE — abstraction localStorage (chargement / settings / prefs)
// ═══════════════════════════════════════════════════════════════
import { DEFAULT_CHARS, ETATS_DEFAULT } from './constants.js';

export let settings = { theme:'parchment', showPM:true, showPC:true };

export function loadState(){
  try{
    // Try v4 first, then migrate from v3
    let raw=localStorage.getItem('anathazer_v4');
    if(!raw) raw=localStorage.getItem('anathazer_v3'); // migrate from previous version
    const s=JSON.parse(raw);
    if(s&&s.chars){
      s.chars=s.chars.map(c=>{
        const def=DEFAULT_CHARS.find(d=>d.id===c.id)||{};
        const merged={pmMax:0,pmActuel:0,pcMax:0,pcActuel:0,dv:'D6',raciales:[],voies:[],resume:[],...def,...c,attrs:{FOR:'—',DEX:'—',CON:'—',INT:'—',SAG:'—',CHA:'—',...(def.attrs||{}),...(c.attrs||{})}};
        // If saved char has empty or incomplete voies/armes/raciales/resume, restore from defaults
        if((!c.voies||c.voies.length===0||(def.voies&&c.voies.length<def.voies.length))&&def.voies&&def.voies.length>0) merged.voies=JSON.parse(JSON.stringify(def.voies));
        if((!c.armes||c.armes.length===0)&&def.armes&&def.armes.length>0) merged.armes=JSON.parse(JSON.stringify(def.armes));
        if((!c.raciales||c.raciales.length===0)&&def.raciales&&def.raciales.length>0) merged.raciales=JSON.parse(JSON.stringify(def.raciales));
        if((!c.resume||c.resume.length===0)&&def.resume&&def.resume.length>0) merged.resume=JSON.parse(JSON.stringify(def.resume));
        // migrate single att → three att fields
        if(!merged.attContact) merged.attContact=merged.att||'+0';
        if(!merged.attDistance) merged.attDistance=merged.att||'+0';
        if(!merged.attMagique) merged.attMagique=merged.att||'+0';
        return merged;
      });
      if(!s.etats){s.etats=JSON.parse(JSON.stringify(ETATS_DEFAULT));}
      else{const bn=new Set(ETATS_DEFAULT.map(e=>e.name));s.etats.forEach(e=>{if(bn.has(e.name))e.builtin=true;});}
      if(!s.lvlUpHistory)s.lvlUpHistory={};
      return s;
    }
  }catch(e){ /* SILENT-OK: localStorage corrompu → fallback DEFAULT_CHARS ci-dessous */ }
  return{chars:JSON.parse(JSON.stringify(DEFAULT_CHARS)),log:[],session:1,combat:1,round:1,etats:JSON.parse(JSON.stringify(ETATS_DEFAULT))};
}
export function loadSettings(){
  try{ const s=JSON.parse(localStorage.getItem('anathazer_settings')); if(s) settings={...settings,...s}; }catch(e){ /* SILENT-OK: settings corrompus → garde les defaults en mémoire */ }
}
export function saveSettings(){
  settings.showPM=document.getElementById('tog-pm').checked;
  settings.showPC=document.getElementById('tog-pc').checked;
  localStorage.setItem('anathazer_settings',JSON.stringify(settings));
  window.render();
}
export function applyTheme(id){
  settings.theme=id;
  document.documentElement.setAttribute('data-theme',id);
  localStorage.setItem('anathazer_settings',JSON.stringify(settings));
  window.renderThemeGrid();
}

// ── Mots de passe personnages (localStorage) ──
export function getCharPwds(){ try{return JSON.parse(localStorage.getItem('anathazer_char_pwds')||'{}');}catch(e){return{};} }
export function setCharPwds(p){ localStorage.setItem('anathazer_char_pwds',JSON.stringify(p)); }

// ── Préférence de modificateur PM par personnage (localStorage) ──
export function getPmAttrPref(charId){
  try{const p=JSON.parse(localStorage.getItem('anathazer_pm_pref')||'{}');return p[charId]||null;}catch(e){return null;}
}
export function setPmAttrPref(charId,attr){
  try{const p=JSON.parse(localStorage.getItem('anathazer_pm_pref')||'{}');p[charId]=attr;localStorage.setItem('anathazer_pm_pref',JSON.stringify(p));}catch(e){ /* SILENT-OK: préférence PM non critique */ }
}
