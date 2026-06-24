// ═══════════════════════════════════════════════════════════════
//  ANATHAZERÏN TRACKER — point d'entrée
//  Le monolithe (Lot 01) a été découpé en modules ES6 (Lot 02a, iso-fonctionnel).
//  Ce fichier : bindings globaux + fonctions résiduelles (refresh/install/reset)
//  + écouteurs PWA/clavier + séquence d'initialisation.
// ═══════════════════════════════════════════════════════════════
import { bindGlobals } from './modules/bindings.js';

import {
  state, setState, setCharHistory, initHistory,
  appMode, setAppMode, setModeExplicitlySet, setSelectedPlayerChar,
} from './modules/state.js';
import { loadState, loadSettings, settings } from './modules/storage.js';
import { initFirebase, firebaseDB, _fbConnected, save, ref, get } from './modules/firebase.js';
import { DEFAULT_CHARS } from './modules/constants.js';
import { render } from './modules/ui/render.js';
import { renderEtats } from './modules/ui/etats.js';
import { toast } from './modules/ui/toast.js';
import { renderRoster, checkPendingChars, fbListenPendingChars } from './modules/roster.js';
import {
  setPendingLvlUps, checkPendingLvlUps, fbListenPendingLvlUp,
} from './modules/levelup.js';
import { fbListenPhotos } from './modules/fiches/render.js';
import { fbListenMessages } from './modules/messages.js';

// ── Expose toutes les fonctions appelées par les handlers inline ──
bindGlobals();

// ═══════════════════════════════════════════════════════════════
//  FONCTIONS RÉSIDUELLES (référencées par index.html, hors domaine d'un module)
// ═══════════════════════════════════════════════════════════════

// ── REFRESH FIREBASE MANUEL ──
async function forceRefresh(){
  const btn=document.getElementById('refresh-btn');
  if(btn){btn.textContent='⏳';btn.disabled=true;}
  const timeout=setTimeout(()=>{
    if(btn){btn.textContent='↺';btn.disabled=false;}
    toast('Timeout — Firebase lent','t-w');
  },8000);
  try{
    if(!firebaseDB||!_fbConnected) throw new Error('Firebase non connecté');
    const [snapState,snapLvl]=await Promise.all([
      get(ref(firebaseDB,'state')),
      get(ref(firebaseDB,'pendingLvlUp'))
    ]);
    if(snapState.exists()){
      setState(snapState.val());
      localStorage.setItem('anathazer_v4',JSON.stringify(state));
      render();renderEtats();
    }
    setPendingLvlUps(snapLvl.exists()?{...snapLvl.val()}:{});
    checkPendingLvlUps();
    toast('↺ Synchronisé ✓','t-i');
  }catch(e){
    toast('Erreur: '+e.message,'t-w');
  }finally{
    clearTimeout(timeout);
    if(btn){btn.textContent='↺';btn.disabled=false;}
  }
}
window.forceRefresh=forceRefresh;

// ── RESET TO LEVEL 8 ──
function resetToLevel8(){
  if(!confirm('Remettre les 4 personnages au niveau 8 (stats de base) ? Le journal et les PV actuels sont conservés.'))return;
  DEFAULT_CHARS.forEach(def=>{
    const c=state.chars.find(x=>x.id===def.id);
    if(!c)return;
    // Reset only level-dependent stats, keep voies ok state, photo, log
    c.niveau=def.niveau;
    c.pvMax=def.pvMax;
    c.pvActuel=Math.min(c.pvActuel,def.pvMax);
    c.pmMax=def.pmMax;c.pmActuel=Math.min(c.pmActuel,def.pmMax);
    c.pcMax=def.pcMax;c.pcActuel=Math.min(c.pcActuel,def.pcMax);
    c.def=def.def;c.init=def.init;c.att=def.att;
    c.attContact=def.attContact||def.att;
    c.attDistance=def.attDistance||def.att;
    c.attMagique=def.attMagique||def.att;
    c.degats=def.degats;c.dv=def.dv;c.vitesse=def.vitesse;
    c.attrs=JSON.parse(JSON.stringify(def.attrs));
    c.armes=JSON.parse(JSON.stringify(def.armes));
    c.raciales=JSON.parse(JSON.stringify(def.raciales));
    // Reset voies caps to default ok state
    c.voies=JSON.parse(JSON.stringify(def.voies));
  });
  if(!state.lvlUpHistory)state.lvlUpHistory={};
  state.chars.forEach(c=>{state.lvlUpHistory[c.id]=[];});
  setCharHistory({});
  save();render();renderRoster();
  toast('Personnages remis au niveau 8 ✓','t-i');
}
window.resetToLevel8=resetToLevel8;

// ── PWA INSTALL PROMPT ──
let _installPrompt=null;
window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault();
  _installPrompt=e;
  const row=document.getElementById('install-auto-row');
  const manual=document.getElementById('install-manual');
  if(row) row.style.display='';
  if(manual) manual.style.display='none';
});
window.addEventListener('appinstalled',()=>{
  _installPrompt=null;
  const row=document.getElementById('install-auto-row');
  const manual=document.getElementById('install-manual');
  const st=document.getElementById('install-status');
  if(row) row.style.display='none';
  if(manual) manual.innerHTML='<strong style="color:var(--grn3)">✓ Application installée sur cet appareil.</strong>';
  if(st) st.textContent='';
});
function triggerInstall(){
  if(!_installPrompt){
    document.getElementById('install-status').textContent='Installation non disponible sur ce navigateur (utilisez Chrome, Edge ou Opera).';
    return;
  }
  _installPrompt.prompt();
  _installPrompt.userChoice.then(r=>{
    if(r.outcome==='accepted'){
      document.getElementById('install-status').textContent='✓ Installation lancée !';
      document.getElementById('install-btn').style.display='none';
    }
    _installPrompt=null;
  });
}
window.triggerInstall=triggerInstall;

// ═══════════════════════════════════════════════════════════════
//  RACCOURCIS CLAVIER (Escape ferme les modales ; Enter→jet de dés géré par dice.js)
// ═══════════════════════════════════════════════════════════════
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    ['modal-overlay','etat-modal','capfull-overlay','lvlup-pending-overlay','repos-overlay','pending-chars-overlay'].forEach(id=>{const el=document.getElementById(id);if(el&&(el.style.display==='block'||el.style.display==='flex')){el.style.display='none';document.body.style.overflow='';}});
    // lvlup-overlay s'ouvre via classList('show') (et non style.display) → groupe classList
    ['mode-overlay','char-select-overlay','death-overlay','lvlup-overlay'].forEach(id=>{const el=document.getElementById(id);if(el){el.classList.remove('show');}});
  }
});

// ═══════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════
setState(loadState());
loadSettings();
if(!state.activeTurn) state.activeTurn=null;
if(!state.lvlUpHistory) state.lvlUpHistory={};
document.documentElement.setAttribute('data-theme',settings.theme||'parchment');
document.documentElement.setAttribute('data-layout',settings.layout||'normal');
initHistory();

// ── RESTAURER SESSION (éviter re-login au refresh) ──
(function restoreSession(){
  try{
    const savedMode=localStorage.getItem('anathazer_last_mode');
    const savedChar=localStorage.getItem('anathazer_last_char');
    const savedPin=sessionStorage.getItem('anathazer_session_pin');
    if(savedPin) window._sessionPin=savedPin;
    if(savedMode==='mj'){
      setAppMode('mj');
      setModeExplicitlySet(true);
      document.getElementById('mode-badge').textContent='⚔ MJ';
      document.getElementById('mode-badge').className='mode-badge mj';
      document.getElementById('mj-act-row').style.display='';
      document.getElementById('nav-settings').classList.remove('hidden');
      document.getElementById('mode-overlay').classList.remove('show'); // fermer le popup
    } else if(savedMode==='joueur'&&savedChar){
      const charId=parseInt(savedChar);
      if(state.chars.find(x=>x.id===charId)){
        setAppMode('joueur');
        setModeExplicitlySet(true);
        setSelectedPlayerChar(charId);
        const c=state.chars.find(x=>x.id===charId);
        document.getElementById('mode-badge').textContent='🧙 Joueur: '+(c?.name||'?');
        document.getElementById('mode-badge').className='mode-badge joueur';
        document.getElementById('mj-act-row').style.display='none';
        document.getElementById('mode-overlay').classList.remove('show'); // fermer le popup
        const editBtn=document.getElementById('fiche-edit-btn');
        if(editBtn)editBtn.style.display='none';
      }
    }
  }catch(e){ /* SILENT-OK: init UI mode best-effort, render() suit */ }
})();

render();
renderEtats();
initFirebase().then(()=>{
  if(_fbConnected){
    fbListenMessages();
    fbListenPendingLvlUp();
    fbListenPhotos();
    fbListenPendingChars();
  }
});
checkPendingLvlUps();
checkPendingChars();
if(window.matchMedia('(display-mode: standalone)').matches){
  const manual=document.getElementById('install-manual');
  if(manual) manual.innerHTML='<strong style="color:var(--grn3)">✓ Application déjà installée sur cet appareil.</strong>';
}

// ── NETTOYAGE SW + AUTO-UPDATE ──
if('serviceWorker' in navigator){
  navigator.serviceWorker.getRegistrations().then(regs=>{
    regs.forEach(r=>r.unregister());
  });
}
// Auto-update désactivé — le build est géré manuellement via data-build
// Pour forcer un refresh: vider le cache navigateur (Ctrl+Shift+R)
