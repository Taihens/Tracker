import { state, appMode, modeExplicitlySet, selectedPlayerChar, setAppMode, setModeExplicitlySet, setSelectedPlayerChar } from '../state.js';
import { resetMsgListeners, fbListenMessages } from '../messages.js';
import { _fbConnected } from '../firebase.js';
import { updateUndoButtonVisibility } from './modals.js';

async function hashPin(pin, saltHex = null) {
  const encoder = new TextEncoder();
  const salt = saltHex
    ? new Uint8Array(saltHex.match(/.{2}/g).map(b => parseInt(b, 16)))
    : crypto.getRandomValues(new Uint8Array(16));
  const baseKey = await crypto.subtle.importKey('raw', encoder.encode(pin), { name: 'PBKDF2' }, false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, baseKey, 256);
  const hashHex = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
  const storedSaltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${storedSaltHex}:${hashHex}`;
}

export function openModeModal(){
  if(appMode==='mj'){
    // MJ clicking badge → directly open char select as player (loses MJ privileges)
    localStorage.removeItem('anathazer_last_mode');
    localStorage.removeItem('anathazer_last_char');
    sessionStorage.removeItem('anathazer_session_mode');
    sessionStorage.removeItem('anathazer_session_pin');
    setAppMode('joueur');
    setModeExplicitlySet(false);
    document.getElementById('mj-act-row').style.display='none';
    const editBtn=document.getElementById('fiche-edit-btn');
    if(editBtn) editBtn.style.display='none';
    const _bm=document.getElementById('btn-import-monster');if(_bm)_bm.style.display='none';
    const _bp=document.getElementById('btn-import-char-pdf');if(_bp)_bp.style.display='none';
    updateUndoButtonVisibility();
    openCharSelect();
  } else {
    document.getElementById('mode-overlay').classList.add('show');
  }
}
export function closeModeModal(){ document.getElementById('mode-overlay').classList.remove('show'); }
export function showPlayerSection(){
  document.getElementById('mode-overlay').classList.remove('show');
  openCharSelect();
}
export function enterMJ(){
  const stored=localStorage.getItem('anathazer_pin');
  if(stored&&sessionStorage.getItem('anathazer_session_pin')==='ok'){setMode('mj');return;}
  if(stored){ document.getElementById('mj-pin-section').classList.add('show'); return; }
  setMode('mj');
}
export async function enterMJwithPin(){
  const stored=localStorage.getItem('anathazer_pin');
  const input=document.getElementById('mj-pin-input').value;
  if(stored){
    let valid=false;
    if(stored.includes(':')){
      // PBKDF2: sel:hash stocké — dériver avec le même sel
      const [saltHex]=stored.split(':');
      const derived=await hashPin(input,saltHex);
      valid=(derived===stored);
    } else {
      // Rétrocompat : ancien PIN en clair
      valid=(input===stored);
    }
    if(!valid){ document.getElementById('pin-error').style.display='block'; return; }
  }
  document.getElementById('pin-error').style.display='none';
  document.getElementById('mj-pin-input').value='';
  document.getElementById('mj-pin-section').classList.remove('show');
  if(stored) sessionStorage.setItem('anathazer_session_pin','ok');
  setMode('mj');
}
export function setMode(mode){
  setAppMode(mode);
  setModeExplicitlySet(true);
  closeModeModal();
  // Reset message listeners so they re-init with correct mode/charId
  resetMsgListeners();
  const badge=document.getElementById('mode-badge');
  if(mode==='mj'){
    badge.textContent='⚔ MJ'; badge.className='mode-badge mj';
    document.getElementById('nav-roster').classList.remove('hidden');
    document.getElementById('nav-settings').classList.remove('hidden');
    document.getElementById('mj-act-row').style.display='';
    document.getElementById('fiche-edit-btn').style.display='';
    const _bm=document.getElementById('btn-import-monster');if(_bm)_bm.style.display='';
    const _bp=document.getElementById('btn-import-char-pdf');if(_bp)_bp.style.display='';
    sessionStorage.setItem('anathazer_session_mode','mj');
    sessionStorage.removeItem('anathazer_session_char');
    localStorage.setItem('anathazer_last_mode','mj');
    localStorage.removeItem('anathazer_last_char');
    window.render();
    window.refreshActiveTab();
    setTimeout(window.checkPendingLvlUps, 300);
    setTimeout(window.checkPendingChars, 300);
    if(_fbConnected) fbListenMessages();
  } else {
    badge.textContent='🧙 Joueur: '+(selectedPlayerChar?state.chars.find(c=>c.id===selectedPlayerChar)?.name||'?':'?');
    badge.className='mode-badge joueur';
    document.getElementById('nav-roster').classList.remove('hidden');
    document.getElementById('nav-settings').classList.remove('hidden');
    document.getElementById('mj-act-row').style.display='none';
    const _bm2=document.getElementById('btn-import-monster');if(_bm2)_bm2.style.display='none';
    const _bp2=document.getElementById('btn-import-char-pdf');if(_bp2)_bp2.style.display='none';
    sessionStorage.setItem('anathazer_session_mode','joueur');
    if(selectedPlayerChar) sessionStorage.setItem('anathazer_session_char',String(selectedPlayerChar));
    localStorage.setItem('anathazer_last_mode','joueur');
    if(selectedPlayerChar) localStorage.setItem('anathazer_last_char',String(selectedPlayerChar));
    window.render();
    if(_fbConnected) fbListenMessages();
  }
  updateUndoButtonVisibility();
}
export function openCharSelect(){
  const list=document.getElementById('cs-list');
  list.innerHTML=state.chars.map(c=>`
    <div class="cs-item${selectedPlayerChar===c.id?' selected':''}" onclick="selectAndConfirmChar(${c.id})">
      <div>${c.name}</div>
      <div class="cs-sub">${c.classe} ${c.race} — Niv. ${c.niveau}</div>
    </div>`).join('');
  document.getElementById('char-select-overlay').classList.add('show');
}
export function selectAndConfirmChar(id){
  window.requireCharPwd(id, ()=>{
    setSelectedPlayerChar(id);
    document.getElementById('char-select-overlay').classList.remove('show');
    setMode('joueur');
    // Full refresh of active tab
    window.refreshActiveTab();
  });
}
export function selectPlayerChar(id,el){ selectAndConfirmChar(id); }
export function confirmCharSelect(){
  if(!selectedPlayerChar){ window.toast('Choisissez un personnage','t-w'); return; }
  document.getElementById('char-select-overlay').classList.remove('show');
  setMode('joueur');
  window.refreshActiveTab();
}
export function createPlayerChar(){
  document.getElementById('char-select-overlay').classList.remove('show');
  window.openCharWizard();
}
export function changePlayerChar(){ openCharSelect(); }
export async function savePin(){
  const v=document.getElementById('pin-input').value;
  if(!v){ clearPin(); return; }
  const hashed=await hashPin(v);
  localStorage.setItem('anathazer_pin',hashed);
  document.getElementById('pin-input').value='';
  document.getElementById('pin-status').textContent='PIN sauvegardé ✓';
  window.toast('PIN MJ sauvegardé','t-i');
}
export function clearPin(){
  localStorage.removeItem('anathazer_pin');
  document.getElementById('pin-input').value='';
  document.getElementById('pin-status').textContent='PIN supprimé — mode MJ accessible sans code';
  window.toast('PIN supprimé','t-i');
}
