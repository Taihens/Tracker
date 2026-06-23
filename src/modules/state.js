// ═══════════════════════════════════════════════════════════════
//  STATE — globals d'application + historique undo/redo par perso
//  (Lot 02a : déplacement pur, AUCUNE indexation O(1) — réservé 02b)
// ═══════════════════════════════════════════════════════════════
import { save } from './firebase.js';

// ── Globals mutables (live bindings ; réassignés via setters cross-module) ──
export let state;
export let editCharId = null, editData = null;
export let activeLogChar = 0, editingEtatIdx = null, selectedPlayerChar = null;
export let cardTypes = {}, charHistory = {};
export let appMode = 'mj'; // 'mj' | 'joueur'
export let modeExplicitlySet = false;

// ── Setters (réassignation hors module impossible sur un import → passer par ici) ──
export function setState(v){ state = v; }
export function setEditCharId(v){ editCharId = v; }
export function setEditData(v){ editData = v; }
export function setActiveLogChar(v){ activeLogChar = v; }
export function setEditingEtatIdx(v){ editingEtatIdx = v; }
export function setSelectedPlayerChar(v){ selectedPlayerChar = v; }
export function setCardTypes(v){ cardTypes = v; }
export function setCharHistory(v){ charHistory = v; }
export function setAppMode(v){ appMode = v; }
export function setModeExplicitlySet(v){ modeExplicitlySet = v; }

// ═══════════════════════════════════════════════════════════════
//  HISTORY
// ═══════════════════════════════════════════════════════════════
export function initHistory(){
  state.chars.forEach(c=>{
    if(!charHistory[c.id]) charHistory[c.id]={pos:0,snapshots:[{pvActuel:c.pvActuel,etat:c.etat,logId:null,logEntry:null}]};
  });
}
export function pushHistory(charId,pvActuel,etat,logEntry){
  if(!charHistory[charId]) charHistory[charId]={pos:0,snapshots:[{pvActuel,etat,logId:null,logEntry:null}]};
  const h=charHistory[charId];
  h.snapshots.splice(h.pos+1);
  h.snapshots.push({pvActuel,etat,logId:logEntry.logId,logEntry});
  h.pos=h.snapshots.length-1;
}
export function undoChar(id){
  const h=charHistory[id]; if(!h||h.pos<=0)return;
  const c=state.chars.find(x=>x.id===id); if(!c)return;
  const cur=h.snapshots[h.pos];
  if(cur.logId) state.log=state.log.filter(l=>l.logId!==cur.logId);
  h.pos--;
  const prev=h.snapshots[h.pos];
  c.pvActuel=prev.pvActuel; c.etat=prev.etat;
  save(); window.render();
  if(document.getElementById('tab-log').classList.contains('active'))window.renderLog();
  if(document.getElementById('tab-recap').classList.contains('active'))window.renderRecap();
  window.toast(`${c.name} — Undo (${h.pos}/${h.snapshots.length-1})`,'t-i');
}
export function redoChar(id){
  const h=charHistory[id]; if(!h||h.pos>=h.snapshots.length-1)return;
  const c=state.chars.find(x=>x.id===id); if(!c)return;
  h.pos++;
  const next=h.snapshots[h.pos];
  c.pvActuel=next.pvActuel; c.etat=next.etat;
  if(next.logEntry) state.log.push({...next.logEntry});
  save(); window.render();
  if(document.getElementById('tab-log').classList.contains('active'))window.renderLog();
  if(document.getElementById('tab-recap').classList.contains('active'))window.renderRecap();
  window.toast(`${c.name} — Redo (${h.pos}/${h.snapshots.length-1})`,'t-i');
}
