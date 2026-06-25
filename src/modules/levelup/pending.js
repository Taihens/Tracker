// ═══════════════════════════════════════════════════════════════
//  LVLUP PENDING (player → MJ approval) + Firebase sync
// ═══════════════════════════════════════════════════════════════
import { parseMod, dvMax, parseAtt, fmtAtt } from '../cof-classes.js';
import { state, appMode } from '../state.js';
import { firebaseDB, _fbConnected, save, ref, set, onValue } from '../firebase.js';
import { DEFAULT_CHARS } from '../constants.js';

export let pendingLvlUps={};
export function setPendingLvlUps(v){ pendingLvlUps=v; }

// ── SPAM FIX: remove polling, keep only Firebase listener ──
export async function fbSavePendingLvlUp(){
  localStorage.setItem('anathazer_pending_lvlup',JSON.stringify(pendingLvlUps));
  if(!firebaseDB||!_fbConnected)return;
  try{
    await set(ref(firebaseDB,'pendingLvlUp'),pendingLvlUps);
  }catch(e){console.warn('FB lvlup sync:',e.message);}
}
export async function fbListenPendingLvlUp(){
  if(!firebaseDB||!_fbConnected)return;
  try{
    onValue(ref(firebaseDB,'pendingLvlUp'),(snap)=>{
      const data=snap.exists()?snap.val():{};
      const prev=JSON.stringify(pendingLvlUps);
      pendingLvlUps=data;
      localStorage.setItem('anathazer_pending_lvlup',JSON.stringify(pendingLvlUps));
      if(JSON.stringify(data)!==prev) checkPendingLvlUps();
    });
  }catch(e){console.warn('FB lvlup listen:',e.message);}
}

export function closeLvlUpPending(){document.getElementById('lvlup-pending-overlay').style.display='none';}
export function checkPendingLvlUps(){
  // Read from Firebase listener (already in pendingLvlUps) + localStorage fallback
  try{const p=JSON.parse(localStorage.getItem('anathazer_pending_lvlup'));if(p&&Object.keys(pendingLvlUps).length===0)pendingLvlUps={...p};}catch(e){ /* SILENT-OK: cache local corrompu → garde l'état Firebase */ }
  const nb=Object.keys(pendingLvlUps).length;
  // Badge visible seulement côté MJ
  const notif=document.getElementById('lvlup-notif');
  if(notif) notif.style.display=(nb>0&&appMode==='mj')?'inline-flex':'none';
  // Fermer le popup si plus rien en attente
  if(nb===0){
    const overlay=document.getElementById('lvlup-pending-overlay');
    if(overlay&&overlay.style.display==='flex') closeLvlUpPending();
  }
  // NE PAS ouvrir le popup automatiquement — seulement via clic sur le badge
}
export function renderPendingLvlUps(){
  const pending=Object.values(pendingLvlUps);
  const el=document.getElementById('lvlup-pending-body');
  const foot=document.getElementById('lvlup-pending-footer');
  if(!el)return;
  if(!pending.length){el.innerHTML='<p style="color:var(--txt2);font-style:italic;text-align:center">Aucune demande en attente.</p>';foot.innerHTML='<button class="btn-lg btn-r" onclick="closeLvlUpPending()">Fermer</button>';return;}
  const items=pending.map(p=>{
    const c=state.chars.find(x=>x.id===p.charId);if(!c)return'';
    const caps=p.selected.map(sel=>{
      const v=c.voies.find(v=>v.nom===sel.voieNom);
      const cap=v?.caps.find(cap=>cap.r===sel.rang);
      return cap?.nom||sel.rang;
    }).join(', ')||'Aucune capacité';
    const date=p.timestamp?new Date(p.timestamp).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'';
    return`<div style="background:var(--bg3);border:1px solid var(--bdr);border-radius:3px;padding:10px 13px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
      <div>
        <div style="font-family:'Cinzel',serif;font-size:12px;color:var(--gold2)">${c.name} — Niv.${c.niveau} → ${c.niveau+1}</div>
        <div style="font-size:10px;color:var(--txt3);margin-top:2px">${caps}${date?` · ${date}`:''}</div>
      </div>
      <button class="btn btn-h" style="white-space:nowrap" onclick="inspectLvlUp(${c.id})">🔍 Inspecter</button>
    </div>`;
  }).join('');
  el.innerHTML=`<p style="font-family:'Cinzel',serif;font-size:8.5px;letter-spacing:.1em;color:var(--gold);text-transform:uppercase;margin-bottom:10px">Demandes de Level Up en attente</p>${items}`;
  foot.innerHTML='<button class="btn-lg btn-r" onclick="closeLvlUpPending()">Fermer</button>';
  document.getElementById('lvlup-pending-overlay').style.display='flex';
}
export function inspectLvlUp(charId){
  const p=pendingLvlUps[charId];if(!p)return;
  const c=state.chars.find(x=>x.id===charId);if(!c)return;
  const el=document.getElementById('lvlup-pending-body');
  const foot=document.getElementById('lvlup-pending-footer');
  const conMod=parseMod(c.attrs?.CON||0);const pvGain=dvMax(c.dv)+conMod;
  const pmGain=p.pmGain||0;
  const atCur=parseAtt(c.attContact||c.att||'0');
  const capsDetail=p.selected.map(sel=>{
    const v=c.voies.find(v=>v.nom===sel.voieNom);
    const cap=v?.caps.find(cap=>cap.r===sel.rang);
    return`<div style="padding:6px 0;border-bottom:1px solid rgba(58,46,28,.2)">
      <div><span style="font-family:Cinzel,serif;font-size:9px;color:var(--gold2);margin-right:6px">${sel.rang}</span><span style="font-size:13px;color:var(--wht);font-weight:600">${cap?.nom||'?'}</span></div>
      ${cap?.desc?`<div style="font-size:11px;color:var(--txt2);margin-top:3px">${cap.desc}</div>`:''}
      ${cap?.descFull?`<div style="font-size:10px;color:var(--txt3);margin-top:3px;font-style:italic">${cap.descFull}</div>`:''}
    </div>`;
  }).join('')||'<div style="color:var(--txt3);font-style:italic;font-size:12px">Aucune capacité choisie</div>';
  el.innerHTML=`
    <button onclick="renderPendingLvlUps()" style="background:none;border:none;color:var(--txt2);cursor:pointer;font-size:12px;padding:0;margin-bottom:12px">← Retour à la liste</button>
    <div style="font-family:'Cinzel',serif;font-size:13px;color:var(--gold2);margin-bottom:12px">${c.name} — Niv.${c.niveau} → ${c.niveau+1}</div>
    <div style="font-family:Cinzel,serif;font-size:8.5px;letter-spacing:.1em;color:var(--gold);text-transform:uppercase;margin-bottom:6px">Gains automatiques</div>
    <div style="background:var(--bg3);border:1px solid var(--bdr);border-radius:3px;padding:10px 13px;margin-bottom:12px;font-size:12px;color:var(--txt2);line-height:1.8">
      +${pvGain} PV max &amp; actuels<br>
      ${pmGain>0?`+${pmGain} PM max &amp; actuels<br>`:''}
      Attaques : ${fmtAtt(atCur)} → <strong style="color:var(--grn3)">${fmtAtt(atCur+1)}</strong> (contact, distance, magique)
    </div>
    <div style="font-family:Cinzel,serif;font-size:8.5px;letter-spacing:.1em;color:var(--gold);text-transform:uppercase;margin-bottom:6px">Capacités choisies</div>
    <div style="background:var(--bg3);border:1px solid var(--bdr);border-radius:3px;padding:10px 13px;margin-bottom:14px">${capsDetail}</div>`;
  foot.innerHTML=`
    <button class="btn-lg btn-r" onclick="renderPendingLvlUps()">← Retour</button>
    <button class="btn-lg btn-h" onclick="mjApproveLvlUp(${charId})">✓ Approuver</button>
    <button class="btn-lg btn-r" onclick="mjRejectLvlUp(${charId})">✕ Refuser</button>`;
}

// ── UNDO LEVEL UP ──
export function undoLvlUp(charId){
  const c=state.chars.find(x=>x.id===charId);if(!c)return;
  const baseNiv=DEFAULT_CHARS.find(d=>d.id===charId)?.niveau||8;
  if(c.niveau<=baseNiv){window.toast('Déjà au niveau de base','t-w');return;}
  if(!confirm(`Annuler le dernier level up de ${c.name} ? (Niv.${c.niveau} → ${c.niveau-1})`))return;
  // Try snapshot first
  const hist=state.lvlUpHistory?.[charId];
  if(hist&&hist.length>0){
    const snap=hist.pop();
    Object.assign(c,snap);
  } else {
    // Reverse manually
    const conMod=parseMod(c.attrs?.CON||0);
    const pvGain=dvMax(c.dv)+conMod;
    c.niveau--;
    c.pvMax=Math.max(1,c.pvMax-pvGain);
    c.pvActuel=Math.min(c.pvActuel,c.pvMax);
    const aC=parseAtt(c.attContact||c.att||'0');
    const aD=parseAtt(c.attDistance||c.att||'0');
    const aM=parseAtt(c.attMagique||c.att||'0');
    c.attContact=fmtAtt(aC-1);c.attDistance=fmtAtt(aD-1);c.attMagique=fmtAtt(aM-1);c.att=c.attContact;
  }
  save();window.render();window.renderRoster();
  if(document.getElementById('tab-fiches')?.classList.contains('active'))window.renderFiche();
  window.toast(`${c.name} — retour au niveau ${c.niveau}`,'t-i');
}
export function mjApproveLvlUp(charId){
  const p=pendingLvlUps[charId];if(!p)return;
  const c=state.chars.find(x=>x.id===charId);if(!c)return;
  // Save snapshot for undo
  if(!state.lvlUpHistory)state.lvlUpHistory={};
  if(!state.lvlUpHistory[charId])state.lvlUpHistory[charId]=[];
  state.lvlUpHistory[charId].push(JSON.parse(JSON.stringify({niveau:c.niveau,pvMax:c.pvMax,pvActuel:c.pvActuel,pmMax:c.pmMax,pmActuel:c.pmActuel,attContact:c.attContact,attDistance:c.attDistance,attMagique:c.attMagique,att:c.att,voies:c.voies})));
  const conMod=parseMod(c.attrs?.CON||0);const pvGain=dvMax(c.dv)+conMod;
  c.niveau++;c.pvMax+=pvGain;c.pvActuel+=pvGain;
  const aC=parseAtt(c.attContact||c.att||'0'),aD=parseAtt(c.attDistance||c.att||'0'),aM=parseAtt(c.attMagique||c.att||'0');
  c.attContact=fmtAtt(aC+1);c.attDistance=fmtAtt(aD+1);c.attMagique=fmtAtt(aM+1);c.att=c.attContact;
  if(p.pmGain>0){c.pmMax+=p.pmGain;c.pmActuel+=p.pmGain;}
  p.selected.forEach(sel=>{const v=c.voies.find(v=>v.nom===sel.voieNom);if(v){const cap=v.caps.find(cap=>cap.r===sel.rang);if(cap)cap.ok=true;}});
  delete pendingLvlUps[charId];fbSavePendingLvlUp();
  save();window.render();if(document.getElementById('tab-roster')?.classList.contains('active'))window.renderRoster();
  checkPendingLvlUps();closeLvlUpPending();window.toast(`${c.name} — Niveau ${c.niveau} approuvé ! 🎉`,'t-i');
}
export function mjRejectLvlUp(charId){
  delete pendingLvlUps[charId];fbSavePendingLvlUp();
  checkPendingLvlUps();window.toast('Demande refusée','t-w');renderPendingLvlUps();
}
export function cancelPlayerLvlUp(charId){
  if(!pendingLvlUps[charId])return;
  if(!confirm('Annuler ta demande de level up ?'))return;
  delete pendingLvlUps[charId];
  fbSavePendingLvlUp();
  checkPendingLvlUps();
  window.renderRoster();
  window.toast('Demande de level up annulée','t-i');
}
