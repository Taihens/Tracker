import { state, appMode, modeExplicitlySet, selectedPlayerChar, setAppMode, setModeExplicitlySet, setSelectedPlayerChar } from '../state.js';
import { resetMsgListeners, fbListenMessages } from '../messages.js';
import { _fbConnected } from '../firebase.js';

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
  const pin=localStorage.getItem('anathazer_pin');
  // Si PIN déjà validé cette session, passer directement
  if(pin&&sessionStorage.getItem('anathazer_session_pin')===pin){setMode('mj');return;}
  if(pin){ document.getElementById('mj-pin-section').classList.add('show'); return; }
  setMode('mj');
}
export function enterMJwithPin(){
  const pin=localStorage.getItem('anathazer_pin');
  const input=document.getElementById('mj-pin-input').value;
  if(pin&&input!==pin){ document.getElementById('pin-error').style.display='block'; return; }
  document.getElementById('pin-error').style.display='none';
  document.getElementById('mj-pin-input').value='';
  document.getElementById('mj-pin-section').classList.remove('show');
  // Sauvegarder le PIN validé en session
  if(pin) sessionStorage.setItem('anathazer_session_pin',pin);
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
    sessionStorage.setItem('anathazer_session_mode','joueur');
    if(selectedPlayerChar) sessionStorage.setItem('anathazer_session_char',String(selectedPlayerChar));
    localStorage.setItem('anathazer_last_mode','joueur');
    if(selectedPlayerChar) localStorage.setItem('anathazer_last_char',String(selectedPlayerChar));
    window.render();
    if(_fbConnected) fbListenMessages();
  }
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
export function savePin(){
  const v=document.getElementById('pin-input').value;
  if(!v){ clearPin(); return; }
  localStorage.setItem('anathazer_pin',v);
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
