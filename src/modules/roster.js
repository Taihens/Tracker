// ═══════════════════════════════════════════════════════════════
//  ROSTER — liste des persos, présence, suppression,
//  validation des persos en attente (pending), mots de passe perso.
//  Appels de rendu/UI via window.* (pas d'import de ui.js — R architecte)
// ═══════════════════════════════════════════════════════════════
import { state, appMode, selectedPlayerChar, cardTypes, charHistory, getChar, rebuildCharsMap } from './state.js';
import { save, firebaseDB, _fbConnected, ref, set, onValue } from './firebase.js';
import { getCharPwds, setCharPwds } from './storage.js';
import { DEFAULT_CHARS } from './constants.js';
import { pendingLvlUps, fbSavePendingLvlUp } from './levelup.js';
import { groupChars, applyGroupFilter, renderGroupHeader, renderGroupFilterBar, GROUPE_ORDER, GROUPE_LABELS } from './ui/groupes.js';

// ── PENDING CHARS ──
export let pendingChars={};
try{const p=JSON.parse(localStorage.getItem('anathazer_pending_chars'));if(p)pendingChars=p;}catch(e){ /* SILENT-OK: cache local corrompu → pendingChars vide, resync Firebase */ }

export async function fbSavePendingChars(){
  localStorage.setItem('anathazer_pending_chars',JSON.stringify(pendingChars));
  if(!firebaseDB||!_fbConnected)return;
  try{await set(ref(firebaseDB,'pendingChars'),pendingChars);}catch(e){ console.warn('Firebase set pendingChars:',e.message); }
}
export async function fbListenPendingChars(){
  if(!firebaseDB||!_fbConnected)return;
  try{
    onValue(ref(firebaseDB,'pendingChars'),(snap)=>{
      pendingChars=snap.exists()?snap.val():{};
      localStorage.setItem('anathazer_pending_chars',JSON.stringify(pendingChars));
      checkPendingChars();
    });
  }catch(e){ console.warn('Firebase listen pendingChars:',e.message); }
}
export function checkPendingChars(){
  const nb=Object.keys(pendingChars).length;
  const show=nb>0&&appMode==='mj';
  const notif=document.getElementById('newchar-notif');
  if(notif) notif.style.display=show?'inline-flex':'none';
  const badge=document.getElementById('newchar-badge');
  if(badge){badge.style.display=show?'block':'none';badge.textContent=nb>9?'9+':String(nb);}
}
export function renderPendingChars(){
  const overlay=document.getElementById('pending-chars-overlay');
  const body=document.getElementById('pending-chars-body');
  const pending=Object.values(pendingChars);
  if(!pending.length){body.innerHTML='<p style="color:var(--txt3);text-align:center;padding:20px">Aucun personnage en attente.</p>';overlay.style.display='flex';return;}
  body.innerHTML=pending.map(c=>`
    <div style="background:var(--bg3);border:1px solid var(--bdr);border-radius:3px;padding:12px;margin-bottom:10px">
      <div style="font-family:Cinzel,serif;font-size:12px;color:var(--wht);margin-bottom:3px">${c.name} <span style="font-size:9px;color:var(--txt2)">${c.classe} ${c.race} — Niv.${c.niveau}</span></div>
      <div style="font-size:10px;color:var(--txt3);margin-bottom:8px">Soumis le ${new Date(c.submittedAt||Date.now()).toLocaleDateString('fr-FR')}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn btn-g" style="font-size:9px" onclick="mjValidateChar(${c.id})">✓ Valider</button>
        <button class="btn" style="font-size:9px;background:rgba(26,45,74,.3);border-color:var(--blu2);color:var(--blu3)" onclick="openEdit(${c.id})">✏ Voir</button>
        <button class="btn btn-r" style="font-size:9px" onclick="mjRefuseChar(${c.id})">✕ Refuser</button>
      </div>
    </div>`).join('');
  overlay.style.display='flex';
}
export function closePendingChars(){document.getElementById('pending-chars-overlay').style.display='none';}
export function mjValidateChar(charId){
  const numId=parseInt(charId);
  const c=state.chars.find(x=>x.id===numId);if(!c)return;
  c.pending=false;c.hidden=false;
  // Only delete THIS specific char's pending entry
  if(pendingChars[numId]) delete pendingChars[numId];
  if(pendingChars[charId]) delete pendingChars[charId];
  fbSavePendingChars();
  save();window.render();renderRoster();checkPendingChars();
  const remaining=Object.values(pendingChars);
  if(remaining.length>0) renderPendingChars(); else closePendingChars();
  window.toast(`${c.name} validé ✓`,'t-i');
}
export async function mjRefuseChar(charId){
  const c=getChar(charId);if(!c)return;
  if(await window.showActionConfirm('✕','Refuser '+c.name,'Le personnage sera supprimé définitivement.')){
    delete pendingChars[charId];
    fbSavePendingChars();
    state.chars=state.chars.filter(x=>x.id!==charId);
    rebuildCharsMap();
    save();window.render();renderRoster();checkPendingChars();
    const pending=Object.values(pendingChars);
    if(pending.length>0) renderPendingChars(); else closePendingChars();
    window.toast(`${c.name} refusé`,'t-w');
  }
}
export function submitCharForValidation(charId){
  const c=state.chars.find(x=>x.id===charId);if(!c)return;
  c.pending=true;
  pendingChars[charId]={...JSON.parse(JSON.stringify(c)),submittedAt:Date.now()};
  fbSavePendingChars();save();renderRoster();
  window.toast(`${c.name} — demande envoyée au MJ`,'t-i');
}
export async function cancelCharSubmission(charId){
  const c=getChar(charId);if(!c)return;
  if(await window.showActionConfirm('✕','Annuler la demande','Votre personnage restera non validé.')){
    c.pending=false;
    delete pendingChars[charId];
    fbSavePendingChars();save();renderRoster();
    window.toast('Demande annulée','t-i');
  }
}

// ── HIDDEN CHARS ──
export function toggleHiddenChar(charId){
  const c=state.chars.find(x=>x.id===charId);if(!c)return;
  c.hidden=!c.hidden;save();renderRoster();
  window.toast(`${c.name} — ${c.hidden?'masqué aux joueurs':'visible'}`,'t-i');
}

// ═══════════════════════════════════════════════════════════════
//  ROSTER
// ═══════════════════════════════════════════════════════════════
export function renderRoster(){
  const isMJ = appMode === 'mj';
  const visibleChars = isMJ
    ? state.chars
    : state.chars.filter(c => {
        if(!c.hidden && !c.pending) return true;
        if(c.id === selectedPlayerChar) return true;
        if(c.createdBy === selectedPlayerChar) return true;
        return false;
      });

  const mjRow = c => {
    const hasHistory=c.niveau>(DEFAULT_CHARS.find(d=>d.id===c.id)?.niveau||8);
    const hasPwd=!!getCharPwds()[c.id];
    const isPending=!!c.pending;
    return`<div class="roster-item${!c.present?' absent-item':''}${isPending?' pending-item':''}${c.hidden?' hidden-item':''}">
      <div style="flex:1;min-width:0">
        <div class="ri-name" style="display:flex;flex-wrap:wrap;gap:4px;align-items:center">
          ${c.name}${hasPwd?' <span style="font-size:9px;color:var(--gold2)">🔒</span>':''}
          ${isPending?`<span style="font-family:Cinzel,serif;font-size:7px;color:var(--blu3);border:1px solid var(--blu2);padding:1px 5px;border-radius:2px;white-space:nowrap">⏳ En attente</span>`:''}
          ${c.hidden?`<span style="font-family:Cinzel,serif;font-size:7px;color:var(--txt3);border:1px solid var(--bdr);padding:1px 5px;border-radius:2px;white-space:nowrap">👁 Caché</span>`:''}
        </div>
        <div class="ri-sub">${c.classe} ${c.race} — Niv. ${c.niveau} — PV ${c.pvActuel}/${c.pvMax}${c.pmMax>0?` — PM ${c.pmActuel}/${c.pmMax}`:''}${c.pcMax>0?` — PC ${c.pcActuel}/${c.pcMax}`:''}</div>
      </div>
      <button class="btn btn-g" style="font-size:8px" onclick="openLvlUp(${c.id})">↑</button>
      ${hasHistory?`<button class="btn btn-r" style="font-size:8px" onclick="undoLvlUp(${c.id})">↓</button>`:''}
      ${isPending?`<button class="btn btn-g" style="font-size:8px;background:rgba(26,45,74,.3);border-color:var(--blu2);color:var(--blu3)" onclick="mjValidateChar(${c.id})">✓ Valider</button>`:''}
      ${hasPwd?`<button class="btn btn-r" style="font-size:8px" onclick="mjRemoveCharPwd(${c.id})">🔒✕</button>`:''}
      <button class="btn" style="font-size:8px;background:rgba(26,45,74,.3);border-color:var(--blu2);color:var(--blu3)" onclick="openPlayerLog(${c.id})">📜</button>
      <button class="btn" style="font-size:8px;background:${c.hidden?'rgba(60,60,60,.3)':'rgba(26,45,74,.15)'};border-color:var(--bdr);color:var(--txt2)" onclick="toggleHiddenChar(${c.id})">${c.hidden?'👁':'🙈'}</button>
      <button class="toggle-pres ${c.present?'tp-on':'tp-off'}" onclick="togglePresent(${c.id})">${c.present?'✓':'✗'}</button>
      <button class="btn btn-g" style="font-size:8px" onclick="openEdit(${c.id})">✏</button>
      <button class="btn-del" onclick="deleteChar(${c.id})">✕</button>
    </div>`;
  };

  const playerRow = c => {
    const isOwn = c.id === selectedPlayerChar;
    const hasPending=!!pendingLvlUps[c.id];
    const isPending=!!c.pending;
    return`<div class="roster-item${!c.present?' absent-item':''}${isPending?' pending-item':''}" style="${isPending?'opacity:0.5;filter:grayscale(0.5)':''}">
      <div style="flex:1;min-width:0">
        <div class="ri-name" style="display:flex;flex-wrap:wrap;gap:4px;align-items:center">
          <span>${c.name}</span>
          ${isOwn?`<span style="font-family:Cinzel,serif;font-size:7px;color:var(--grn3);border:1px solid var(--grn2);padding:1px 5px;border-radius:2px;white-space:nowrap">MON PERSO</span>`:''}
          ${isPending?`<span style="font-family:Cinzel,serif;font-size:7px;color:var(--txt3);border:1px solid var(--bdr);padding:1px 5px;border-radius:2px;white-space:nowrap">⏳ En attente MJ</span>`:''}
          ${isOwn&&hasPending?`<span style="font-family:Cinzel,serif;font-size:7px;color:var(--gold);border:1px solid var(--gold);padding:1px 5px;border-radius:2px;white-space:nowrap">⏳ Lvl Up</span>`:''}
        </div>
        <div class="ri-sub">${c.classe} ${c.race} — Niv. ${c.niveau} — PV ${c.pvActuel}/${c.pvMax}${c.pmMax>0?` — PM ${c.pmActuel}/${c.pmMax}`:''}${c.pcMax>0?` — PC ${c.pcActuel}/${c.pcMax}`:''} — ${c.etat}</div>
      </div>
      <button class="toggle-pres ${c.present?'tp-on':'tp-off'}" onclick="togglePresent(${c.id})">${c.present?'✓':'✗'}</button>
      ${isOwn&&!isPending&&!hasPending?`<button class="btn btn-g" style="font-size:8px" onclick="openLvlUp(${c.id})">↑</button>`:''}
      ${isOwn&&hasPending?`<button class="btn btn-r" style="font-size:8px" onclick="cancelPlayerLvlUp(${c.id})">✕ LvlUp</button>`:''}
      ${isOwn?`<button class="btn btn-g" style="font-size:8px" onclick="openEdit(${c.id})">✏</button>`:''}
      ${isOwn&&isPending?`<button class="btn btn-r" style="font-size:8px" onclick="cancelCharSubmission(${c.id})">✕ Annuler</button>`:''}
      ${isOwn&&!isPending&&c.createdBy===selectedPlayerChar?`<button class="btn btn-g" style="font-size:8px;background:rgba(26,45,74,.3);border-color:var(--blu2);color:var(--blu3)" onclick="submitCharForValidation(${c.id})">✦ Soumettre</button>`:''}
      ${c.createdBy===selectedPlayerChar&&!isPending?`<button class="btn-del" onclick="deleteChar(${c.id})">✕</button>`:''}
    </div>`;
  };

  let html = '';
  if (isMJ) {
    const filtered = applyGroupFilter(visibleChars);
    const groups = groupChars(filtered);
    const nonEmpty = GROUPE_ORDER.filter(g => groups[g].length);
    html += renderGroupFilterBar();
    for (const g of GROUPE_ORDER) {
      if (!groups[g].length) continue;
      if (nonEmpty.length > 1) html += renderGroupHeader(GROUPE_LABELS[g]);
      html += groups[g].map(mjRow).join('');
    }
  } else {
    html = visibleChars.map(playerRow).join('');
  }

  document.getElementById('roster-list').innerHTML = html;

  // Bouton ajouter perso (joueurs aussi)
  const addBtn=document.querySelector('.add-char-btn');
  if(addBtn) addBtn.style.display='';
}
export function togglePresent(id){
  const c=state.chars.find(x=>x.id===id);if(!c)return;
  c.present=!c.present;save();window.render();renderRoster();
  window.toast(`${c.name} — ${c.present?'Présent':'Absent'}`,'t-i');
  window.refreshActiveTab();
}
export async function deleteChar(id){
  const c=getChar(id);if(!c)return;
  if(appMode==='joueur'){
    if(c.createdBy!==selectedPlayerChar){window.toast('Tu ne peux supprimer que les personnages que tu as créés','t-w');return;}
  }
  if(await window.showActionConfirm('🗑','Supprimer '+c.name,'Cette action est irréversible.')){
    if(pendingLvlUps[id]){delete pendingLvlUps[id];fbSavePendingLvlUp();}
    if(pendingChars[id]){delete pendingChars[id];fbSavePendingChars();}
    state.chars=state.chars.filter(x=>x.id!==id);
    rebuildCharsMap();
    state.log=state.log.filter(l=>l.charId!==id);
    delete cardTypes[id];delete charHistory[id];
    save();window.render();renderRoster();
    window.checkPendingLvlUps();checkPendingChars();
    window.toast(`${c.name} supprimé`,'t-w');
  }
}

// ═══════════════════════════════════════════════════════════════
//  CHAR PASSWORD SYSTEM
//  (getCharPwds/setCharPwds importés depuis storage.js)
// ═══════════════════════════════════════════════════════════════
let _pwdPendingCharId=null, _pwdCallback=null;

export function requireCharPwd(charId, cb){
  const pwds=getCharPwds();
  if(!pwds[charId]){ cb(); return; }
  // Si mdp déjà validé cette session
  if(sessionStorage.getItem('anathazer_char_pwd_'+charId)===pwds[charId]){ cb(); return; }
  _pwdPendingCharId=charId;
  _pwdCallback=cb;
  const c=state.chars.find(x=>x.id===charId);
  document.getElementById('char-pwd-name').textContent=`Personnage : ${c?.name||'?'}`;
  document.getElementById('char-pwd-input').value='';
  document.getElementById('char-pwd-error').textContent='';
  document.getElementById('char-pwd-overlay').style.display='flex';
  setTimeout(()=>document.getElementById('char-pwd-input').focus(),100);
}
export function submitCharPwd(){
  const pwds=getCharPwds();
  const entered=document.getElementById('char-pwd-input').value;
  if(pwds[_pwdPendingCharId]===entered){
    // Sauvegarder en session
    sessionStorage.setItem('anathazer_char_pwd_'+_pwdPendingCharId,entered);
    document.getElementById('char-pwd-overlay').style.display='none';
    const cb=_pwdCallback; _pwdCallback=null; _pwdPendingCharId=null;
    cb();
  } else {
    document.getElementById('char-pwd-error').textContent='Mot de passe incorrect.';
    document.getElementById('char-pwd-input').value='';
    document.getElementById('char-pwd-input').focus();
  }
}
export function cancelCharPwd(){
  document.getElementById('char-pwd-overlay').style.display='none';
  _pwdCallback=null; _pwdPendingCharId=null;
}
export function renderPlayerPwdSection(){
  const el=document.getElementById('player-pwd-content');if(!el)return;
  const pwds=getCharPwds();
  const hasPwd=!!pwds[selectedPlayerChar];
  el.innerHTML=`
    <div class="set-row">
      <div><div class="set-label">${hasPwd?'Changer le mot de passe':'Définir un mot de passe'}</div><div class="set-desc">${hasPwd?'Ton personnage est protégé ✓':'Aucun mot de passe défini'}</div></div>
    </div>
    <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
      <input type="password" id="new-char-pwd" placeholder="Nouveau mot de passe..." style="background:var(--bg3);border:1px solid var(--bdr);color:var(--wht);font-family:'Crimson Text',serif;font-size:13px;padding:6px 10px;border-radius:2px;flex:1;min-width:150px">
      <button class="btn btn-g" onclick="saveCharPwd()">✓ Sauvegarder</button>
      ${hasPwd?`<button class="btn btn-r" onclick="removeCharPwd()">✕ Supprimer</button>`:''}
    </div>`;
}
export function saveCharPwd(){
  const val=document.getElementById('new-char-pwd')?.value?.trim();
  if(!val){window.toast('Entrez un mot de passe','t-w');return;}
  const pwds=getCharPwds();
  pwds[selectedPlayerChar]=val;
  setCharPwds(pwds);
  document.getElementById('new-char-pwd').value='';
  window.toast('Mot de passe sauvegardé','t-i');
  renderPlayerPwdSection();
}
export function removeCharPwd(){
  if(!confirm('Supprimer le mot de passe de ce personnage ?'))return;
  const pwds=getCharPwds();
  delete pwds[selectedPlayerChar];
  setCharPwds(pwds);
  window.toast('Mot de passe supprimé','t-i');
  renderPlayerPwdSection();
}
// MJ can remove any char's password from roster
export function mjRemoveCharPwd(charId){
  const c=state.chars.find(x=>x.id===charId);if(!c)return;
  if(!confirm(`Supprimer le mot de passe de ${c.name} ?`))return;
  const pwds=getCharPwds();
  delete pwds[charId];
  setCharPwds(pwds);
  window.toast(`Mot de passe de ${c.name} supprimé`,'t-i');
  renderRoster();
}
