// ═══════════════════════════════════════════════════════════════
//  MESSAGES PRIVÉS + JOURNAL (logs de combat)
//  Helpers fb* messagerie co-localisés ici (lecture firebaseDB/_fbConnected)
// ═══════════════════════════════════════════════════════════════
import { state, appMode, selectedPlayerChar, activeLogChar, setActiveLogChar } from './state.js';
import { firebaseDB, _fbConnected, save, ref, push, update, onValue, get, set, remove } from './firebase.js';
import { hpColor } from './combat.js';

export function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

let msgUnread=0;

export function getMsgKey(charId){
  // Conversation key between MJ and a player char
  return `msg_${charId}`;
}

export async function fbSaveMessage(charId, msgObj){
  if(!firebaseDB||!_fbConnected)return;
  try{
    await push(ref(firebaseDB,`messages/${charId}`),msgObj);
  }catch(e){console.warn('FB msg save:',e.message);}
}

export async function fbMarkRead(charId, msgKey){
  if(!firebaseDB||!_fbConnected)return;
  try{
    await update(ref(firebaseDB,`messages/${charId}/${msgKey}`),{readAt:Date.now()});
  }catch(e){console.warn('FB mark read:',e.message);}
}

let _msgListeners={};
// Réassignation cross-module impossible sur un import → setter pour setMode (ui/mode.js)
export function resetMsgListeners(){ _msgListeners={}; }
export async function fbListenMessages(){
  if(!firebaseDB||!_fbConnected)return;
  // Determine which conversations to listen to
  const charIds=appMode==='mj'
    ?state.chars.map(c=>c.id)
    :[selectedPlayerChar].filter(Boolean);
  try{
    charIds.forEach(charId=>{
      if(_msgListeners[charId])return; // already listening
      _msgListeners[charId]=onValue(ref(firebaseDB,`messages/${charId}`),(snap)=>{
        if(!snap.exists())return;
        const msgs=snap.val();
        // Count unread messages sent TO current user
        let newUnread=0;
        Object.values(msgs).forEach(m=>{
          const isForMe = appMode==='mj' ? m.from!=='mj' : m.from==='mj';
          if(isForMe&&!m.readAt) newUnread++;
        });
        if(newUnread>msgUnread){
          window.toast(`✉ Nouveau message de ${appMode==='mj'?state.chars.find(c=>c.id===charId)?.name||'?':'MJ'}`,'t-i');
        }
        msgUnread=newUnread;
        updateMsgBadge();
        // Refresh if messages tab is open
        if(document.getElementById('tab-messages')?.classList.contains('active'))
          renderMessages();
      });
    });
  }catch(e){console.warn('FB msg listen:',e.message);}
}

export function updateMsgBadge(){
  const badge=document.getElementById('msg-badge');
  if(!badge)return;
  badge.style.display=msgUnread>0?'block':'none';
  badge.textContent=msgUnread>9?'9+':msgUnread||'!';
}

export async function renderMessages(){
  const destRow=document.getElementById('msg-dest-row');
  const destSel=document.getElementById('msg-dest');
  if(appMode==='mj'){
    destRow.style.display='flex';
    const opts=state.chars.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
    if(destSel.innerHTML!==opts){
      destSel.innerHTML=opts;
      destSel.onchange=()=>renderMessages();
    }
  } else {
    destRow.style.display='none';
  }
  const rawId=appMode==='mj'?(destSel?.value||state.chars[0]?.id):selectedPlayerChar;
  const charId=parseInt(rawId);
  if(!charId||isNaN(charId)){
    document.getElementById('msg-list').innerHTML='<div style="color:var(--txt3);font-style:italic;font-size:12px;text-align:center;padding:20px">Sélectionne un personnage</div>';
    return;
  }
  const c=state.chars.find(x=>x.id===charId);
  document.getElementById('msg-conv-title').textContent=
    appMode==='mj'?`Conversation avec ${c?.name||'?'}`:`Conversation avec le MJ`;
  if(!firebaseDB||!_fbConnected){
    document.getElementById('msg-list').innerHTML='<div style="color:var(--txt3);font-style:italic;font-size:12px;text-align:center;padding:20px">Firebase non connecté</div>';
    return;
  }
  try{
    const snap=await get(ref(firebaseDB,`messages/${charId}`));
    const list=document.getElementById('msg-list');
    if(!snap.exists()){
      list.innerHTML='<div style="color:var(--txt3);font-style:italic;font-size:12px;text-align:center;padding:20px">Aucun message</div>';
      return;
    }
    const msgs=Object.entries(snap.val()).sort((a,b)=>a[1].ts-b[1].ts);
    list.innerHTML=msgs.map(([key,m])=>{
      const isMine=appMode==='mj'?m.from==='mj':m.from!=='mj';
      const senderName=m.from==='mj'?'MJ':(c?.name||'?');
      const time=new Date(m.ts).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
      const date=new Date(m.ts).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'});
      const readStatus=(isMine&&m.readAt)?`<span style="font-size:9px;color:var(--grn3)"> ✓✓ Lu</span>`:'';
      return`<div style="display:flex;flex-direction:column;align-items:${isMine?'flex-end':'flex-start'}">
        <div style="background:${isMine?'rgba(200,147,64,.15)':'var(--bg3)'};border:1px solid ${isMine?'var(--gold)':'var(--bdr)'};border-radius:${isMine?'8px 8px 0 8px':'8px 8px 8px 0'};padding:8px 12px;max-width:85%">
          <div style="font-size:12px;color:var(--txt);line-height:1.5">${esc(m.text).replace(/\n/g,'<br>')}</div>
        </div>
        <div style="font-size:9px;color:var(--txt3);margin-top:2px">${senderName} · ${date} ${time}${readStatus}</div>
      </div>`;
    }).join('');
    list.scrollTop=list.scrollHeight;
    // Mark unread messages as read — one by one to avoid path issues
    const now=Date.now();
    for(const [key,m] of msgs){
      const isForMe=appMode==='mj'?m.from!=='mj':m.from==='mj';
      if(isForMe&&!m.readAt){
        try{
          await set(ref(firebaseDB,`messages/${charId}/${key}/readAt`),now);
        }catch(e2){console.warn('mark read:',e2.message);}
      }
    }
    msgUnread=0;updateMsgBadge();
  }catch(e){
    document.getElementById('msg-list').innerHTML=`<div style="color:var(--red3);font-size:11px;padding:10px">Erreur: ${e.message}</div>`;
  }
}

export async function sendMessage(){
  const input=document.getElementById('msg-input');
  const text=input.value.trim();if(!text)return;
  const destSel=document.getElementById('msg-dest');
  const charId=appMode==='mj'
    ?parseInt(destSel?.value||state.chars[0]?.id)
    :selectedPlayerChar;
  if(!charId){window.toast('Aucun personnage sélectionné','t-w');return;}
  const msg={text,from:appMode==='mj'?'mj':`char_${charId}`,ts:Date.now(),readAt:null};
  input.value='';
  // Afficher optimistement avant la confirmation Firebase
  const list=document.getElementById('msg-list');
  const time=new Date(msg.ts).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
  const tmpDiv=document.createElement('div');
  tmpDiv.style.cssText='display:flex;flex-direction:column;align-items:flex-end';
  tmpDiv.innerHTML=`<div style="background:rgba(200,147,64,.15);border:1px solid var(--gold);border-radius:8px 8px 0 8px;padding:8px 12px;max-width:85%"><div style="font-size:12px;color:var(--txt);line-height:1.5">${esc(msg.text).replace(/\n/g,'<br>')}</div></div><div style="font-size:9px;color:var(--txt3);margin-top:2px">${appMode==='mj'?'MJ':state.chars.find(c=>c.id===charId)?.name||'?'} · ${time}</div>`;
  list.appendChild(tmpDiv);
  list.scrollTop=list.scrollHeight;
  await fbSaveMessage(charId,msg);
  // Refresh complet pour avoir les vrais keys Firebase (pour le marquage lu)
  setTimeout(()=>renderMessages(),500);
}

export async function deleteConversation(){
  if(appMode!=='mj')return;
  const destSel=document.getElementById('msg-dest');
  const charId=parseInt(destSel?.value||state.chars[0]?.id);
  if(!charId)return;
  const charName=state.chars.find(c=>c.id===charId)?.name||'?';
  if(!confirm(`Supprimer toute la conversation avec ${charName} ? Cette action est irréversible.`))return;
  try{
    await remove(ref(firebaseDB,`messages/${charId}`));
    msgUnread=0;updateMsgBadge();
    await renderMessages();
    window.toast(`Conversation avec ${charName} supprimée`,'t-i');
  }catch(e){window.toast('Erreur suppression: '+e.message,'t-e');}
}

// ── JOURNAL MJ : voir journal d'un joueur ──
let viewingPlayerLog=null;
export function openPlayerLog(charId){
  viewingPlayerLog=charId;
  const c=state.chars.find(x=>x.id===charId);
  // Show overlay with player's log entries
  const entries=state.log.filter(l=>l.charId===charId).slice(-50).reverse();
  const html=entries.map(l=>`<tr><td>${l.charName}</td><td>${l.ev}</td><td>${l.val>0?'+':''}<strong>${l.val}</strong></td><td style="font-size:10px;color:var(--txt2)">${l.source||'—'}</td><td>S${l.session}C${l.cbt||l.combat}R${l.rnd||l.round}</td></tr>`).join('');
  const overlay=document.createElement('div');
  overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.9);z-index:950;overflow:auto;padding:20px';
  overlay.innerHTML=`<div style="max-width:700px;margin:auto;background:var(--bg2);border:1px solid var(--gold);border-radius:4px;padding:16px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div style="font-family:'Cinzel',serif;font-size:13px;color:var(--gold)">Journal de ${c?.name||'?'}</div>
      <button class="btn btn-r" style="font-size:9px" onclick="this.closest('[style*=fixed]').remove()">✕ Fermer</button>
    </div>
    <table style="width:100%;font-size:11px;border-collapse:collapse">
      <tr style="color:var(--txt2);font-family:'Cinzel',serif;font-size:8px"><th>Perso</th><th>Évt</th><th>Val</th><th>Source</th><th>Loc.</th></tr>
      ${html||'<tr><td colspan="5" style="text-align:center;color:var(--txt3);padding:20px">Aucune entrée</td></tr>'}
    </table>
  </div>`;
  document.body.appendChild(overlay);
}

// ═══════════════════════════════════════════════════════════════
//  LOG
// ═══════════════════════════════════════════════════════════════
export function renderLog(){
  const all=[{id:0,name:'Tous'},...state.chars];
  document.getElementById('log-tabs').innerHTML=all.map(c=>`<button class="lt${c.id===activeLogChar?' active':''}" onclick="switchLog(${c.id})">${c.name}</button>`).join('');
  const f=activeLogChar===0?state.log:state.log.filter(l=>l.charId===activeLogChar);
  const dmg=f.filter(l=>l.ev==='Dégâts');
  const totalD=dmg.reduce((s,l)=>s+l.val,0),maxD=dmg.length?Math.max(...dmg.map(l=>l.val)):0;
  const c=state.chars.find(x=>x.id===activeLogChar);
  document.getElementById('log-sum').innerHTML=`<div class="log-sum">
    <div class="lsc"><span class="lsl">Total dégâts</span><span class="lsv">${totalD}</span></div>
    <div class="lsc"><span class="lsl">Nb. coups</span><span class="lsv">${dmg.length}</span></div>
    <div class="lsc"><span class="lsl">Max 1 coup</span><span class="lsv">${maxD}</span></div>
    ${c?`<div class="lsc"><span class="lsl">PV actuels</span><span class="lsv" style="color:${hpColor(c)}">${c.pvActuel}/${c.pvMax}</span></div>`:''}
  </div>`;
  const who=activeLogChar===0?'tout le journal':state.chars.find(x=>x.id===activeLogChar)?.name||'';
  if(!f.length){document.getElementById('log-tbl').innerHTML='<div class="empty-log">Aucune entrée.</div>';return;}
  const evClass=ev=>ev==='Dégâts'?'td-d':ev==='Soin'?'td-h':ev.includes('PM')?'td-pm':'td-pc';
  const evSign=ev=>ev==='Dégâts'?'-':ev==='Soin'?'+':ev.includes('dépensé')?'-':'+';
  const rows=[...f].reverse().map(l=>`<tr><td class="td-dim">${esc(l.charName)}</td><td class="${evClass(l.ev)}">${l.ev}</td><td class="${evClass(l.ev)}">${evSign(l.ev)}${l.val}</td><td class="td-dim">${esc(l.source||'—')}</td><td class="td-dim">${esc(l.type||'—')}</td><td class="td-dim">Session ${l.session}</td><td class="td-dim">Combat ${l.cbt}</td><td class="td-dim">Round ${l.rnd}</td><td class="td-pv">${l.pv}</td><td><button class="btn-del-row" onclick="deleteLogEntry(${l.logId||l.ts})">✕</button></td></tr>`).join('');
  const narrativeBtn=appMode==='mj'?`<button class="btn btn-g" style="font-size:9px;margin-left:8px" onclick="generateNarrativeSummary()">✨ Récit de combat IA</button>`:'';
  document.getElementById('log-tbl').innerHTML=`<div style="margin-bottom:9px"><button class="btn-clear-log" onclick="clearLog()">✕ Vider${activeLogChar===0?'':" le journal de "+who}</button>${narrativeBtn}</div><table><thead><tr><th>PJ</th><th>Événement</th><th>Valeur</th><th>Source</th><th>Type</th><th>Session</th><th>Combat</th><th>Round</th><th>PV rest.</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
}
export function switchLog(id){setActiveLogChar(id);renderLog();}
export function clearLog(){
  const who=activeLogChar===0?'tout le journal':`le journal de ${state.chars.find(x=>x.id===activeLogChar)?.name||'ce personnage'}`;
  if(!confirm(`Vider ${who} ?`))return;
  if(activeLogChar===0)state.log=[];
  else state.log=state.log.filter(l=>l.charId!==activeLogChar);
  save();renderLog();
  if(document.getElementById('tab-recap')?.classList.contains('active'))window.renderRecap();
  window.toast('Journal vidé','t-i');
}
export function deleteLogEntry(logId){
  state.log=state.log.filter(l=>(l.logId||l.ts)!==logId);
  save();renderLog();
  if(document.getElementById('tab-recap').classList.contains('active'))window.renderRecap();
}
