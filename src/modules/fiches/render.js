// ── FICHES : render + monnaie/photo/cap helpers + firebase photo sync ──
import { firebaseDB, firebaseApp, _fbConnected, save } from '../firebase.js';
import { state, appMode, selectedPlayerChar } from '../state.js';
import { openEdit } from './edit.js';

// ── FIREBASE PHOTO SYNC ──
export async function fbSavePhoto(charId, photoData){
  if(!firebaseDB||!_fbConnected)return;
  try{
    const {getDatabase,ref,set}=await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js');
    await set(ref(getDatabase(firebaseApp),`photos/${charId}`),photoData||null);
  }catch(e){console.warn('FB photo sync:',e.message);}
}
export async function fbListenPhotos(){
  if(!firebaseDB||!_fbConnected)return;
  try{
    const {getDatabase,ref,onValue}=await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js');
    onValue(ref(getDatabase(firebaseApp),'photos'),(snap)=>{
      if(!snap.exists())return;
      const photos=snap.val();
      let changed=false;
      Object.entries(photos).forEach(([id,photo])=>{
        const c=state.chars.find(x=>x.id===parseInt(id));
        if(c&&c.photo!==photo){c.photo=photo;changed=true;}
      });
      if(changed){localStorage.setItem('anathazer_v4',JSON.stringify(state));if(document.getElementById('tab-fiches')?.classList.contains('active'))renderFiche();}
    });
  }catch(e){console.warn('FB photos listen:',e.message);}
}

// ═══════════════════════════════════════════════════════════════
//  FICHES
// ═══════════════════════════════════════════════════════════════
export function renderFiche(){
  const sel=document.getElementById('fiche-sel');
  const prevId=parseInt(sel.value)||null;
  const opts=state.chars.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
  if(sel.innerHTML!==opts) sel.innerHTML=opts;
  // Mode joueur: start on own char only on first load (no prevId), allow switching after
  if(appMode==='joueur'&&selectedPlayerChar&&!prevId){
    sel.value=selectedPlayerChar;
  } else if(prevId&&state.chars.find(x=>x.id===prevId)){
    sel.value=prevId;
  } else if(appMode==='joueur'&&selectedPlayerChar){
    sel.value=selectedPlayerChar; // fallback if selected char was deleted
  }
  const id=parseInt(sel.value);
  const c=state.chars.find(x=>x.id===id);if(!c){document.getElementById('fiche-content').innerHTML='';return;}
  const editBtn=document.getElementById('fiche-edit-btn');
  if(appMode==='joueur') editBtn.style.display=c.id===selectedPlayerChar?'':'none';
  else editBtn.style.display='';
  const canEdit=appMode==='mj'||(appMode==='joueur'&&c.id===selectedPlayerChar);
  const attrs=c.attrs||{};
  const attrList=['FOR','DEX','CON','INT','SAG','CHA'].map(k=>`<div class="fstat"><span class="fsl">${k}</span><span class="fsv">${attrs[k]||'—'}</span></div>`).join('');
  const statBase=[['PV Max',c.pvMax],['DEF',c.def],['Initiative',c.init],['DV',c.dv||'—'],
    ['Att. contact',c.attContact||c.att||'—'],['Att. distance',c.attDistance||c.att||'—'],['Att. magique',c.attMagique||c.att||'—'],
    ['Dégâts',c.degats],['Vitesse',c.vitesse]];
  if(c.pmMax>0)statBase.push(['PM Max',c.pmMax],['PM actuels',c.pmActuel]);
  if(c.pcMax>0)statBase.push(['PC Max',c.pcMax],['PC actuels',c.pcActuel]);
  const statsHTML=statBase.map(([l,v])=>`<div class="fstat"><span class="fsl">${l}</span><span class="fsv">${v}</span></div>`).join('');
  const or=c.or||{pp:0,po:0,pa:0,pc:0};
  const monnaieHTML=`<div style="margin-top:10px"><div class="ftitle">💰 Monnaie</div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">
    ${['PP','PO','PA','PC'].map(m=>`<div class="fstat"><span class="fsl">${m}</span><span class="fsv" style="cursor:${canEdit?'pointer':'default'}" ${canEdit?`onclick="editMonnaie(${c.id},'${m.toLowerCase()}')"`:''} title="${canEdit?'Cliquer pour modifier':''}">${or[m.toLowerCase()]||0}</span></div>`).join('')}
  </div></div>`;
  const armesHTML=(c.armes||[]).map(a=>`<div class="arme-row"><span class="arme-nom">${a.nom}</span><span class="arme-att">${a.att||''}</span><span class="arme-dmg">${a.dm||a.dmg||''}</span><span class="arme-sp">${a.spec||a.type||''}</span></div>`).join('')||'<div class="td-dim" style="font-size:11.5px;font-style:italic">Aucune arme.</div>';
  const racHTML=(c.raciales||[]).map(r=>{
    const nom=typeof r==='string'?r:(r.nom||'');
    const desc=typeof r==='object'?r.desc:'';
    return`<div style="font-size:11.5px;padding:4px 0;border-bottom:1px solid rgba(58,46,28,.18)"><strong>${nom}</strong>${desc?` — ${desc}`:''}</div>`;
  }).join('')||'<div class="td-dim" style="font-size:11.5px;font-style:italic">—</div>';
  const isMJMode=appMode==='mj';
  const voiesHTML=(c.voies||[]).map(v=>`
    <div class="voie-title">${v.nom}</div>
    <div>${v.caps.map(cap=>`
      <div class="cap${cap.ok?' ok':''}${isMJMode?' clickable':''}" ${isMJMode?`onclick="toggleCap(${c.id},'${v.nom.replace(/'/g,"\\'")}','${cap.r}')"`:''}>
        <div class="cap-name">${cap.r} ${cap.ok?'✓':'○'} ${cap.nom}</div>
        <div style="display:flex;gap:8px;align-items:flex-start">
          <div class="cap-desc" style="flex:1">${cap.desc}</div>
          ${cap.descFull?`<button onclick="event.stopPropagation();showCapFull(${c.id},'${v.nom.replace(/'/g,"\\'")}','${cap.r}')" style="font-family:'Cinzel',serif;font-size:7px;padding:2px 6px;border-radius:2px;cursor:pointer;background:rgba(200,147,64,.08);border:1px solid rgba(200,147,64,.2);color:var(--gold);white-space:nowrap;flex-shrink:0">📄 Texte</button>`:''}
        </div>
      </div>`).join('')}
    </div>`).join('')||'<div class="td-dim" style="font-size:11.5px;font-style:italic">Aucune voie.</div>';
  const resumeHTML=(c.resume||[]).map(r=>`<p>• ${r}</p>`).join('')||'<p class="td-dim">—</p>';
  const photoHTML=`<div style="text-align:center;margin-bottom:10px">
    ${c.photo?`<img src="${c.photo}" alt="${c.name}" style="max-width:100%;max-height:400px;border-radius:3px;border:2px solid var(--gold);object-fit:contain;display:block;margin:0 auto;cursor:pointer" onclick="this.style.maxHeight=this.style.maxHeight==='400px'?'none':'400px'">`
    :`<div style="width:100%;height:100px;border:2px dashed var(--bdr2);border-radius:3px;display:flex;align-items:center;justify-content:center;color:var(--txt3);font-style:italic;font-size:12px">Aucune illustration</div>`}
    ${canEdit?`<div style="margin-top:7px;display:flex;gap:7px;justify-content:center;flex-wrap:wrap">
      <button class="btn btn-g" style="font-size:8px" onclick="document.getElementById('photo-upload-${c.id}').click()">📷 ${c.photo?'Changer':'Ajouter'}</button>
      ${c.photo?`<button class="btn btn-r" style="font-size:8px" onclick="removePhoto(${c.id})">✕ Supprimer</button>`:''}
      <input type="file" id="photo-upload-${c.id}" accept="image/*" style="display:none" onchange="uploadPhoto(${c.id},this)">
    </div>`:''}
  </div>`;
  const voieTitleNote=isMJMode?'(cliquer pour toggler ✓/○ — 📄 pour le texte complet)':'(📄 pour voir le texte complet)';
  document.getElementById('fiche-content').innerHTML=`<div class="fiche">
    <div class="fsec">
      <div class="ftitle">🖼 Illustration</div>
      ${photoHTML}
      <div class="ftitle" style="margin-top:10px">⚙ Statistiques</div>${statsHTML}
    </div>
    <div class="fsec"><div class="ftitle">📊 Attributs</div>${attrList}<div class="ftitle" style="margin-top:10px">⚔ Armes</div>${armesHTML}<div class="ftitle" style="margin-top:10px">🔷 Raciales</div>${racHTML}${monnaieHTML}</div>
    <div class="fsec full">
      <div class="ftitle" style="display:flex;justify-content:space-between;align-items:center">
        📋 Résumé MJ
        ${isMJMode?`<button id="resume-ai-btn-${c.id}" class="btn btn-g" style="font-size:8px" onclick="generateFicheResume(${c.id})">✨ Générer résumé IA</button>`:''}
      </div>
      <div class="res-box">${resumeHTML}</div>
      <div id="resume-ai-box-${c.id}"></div>
    </div>
    <div class="fsec full"><div class="ftitle">📖 Voies & Capacités <span style="font-size:9px;color:var(--txt2);font-family:'Crimson Text',serif;font-style:italic">${voieTitleNote}</span></div>${voiesHTML}</div>
  </div>`;
}
export function editMonnaie(charId, type){
  const c=state.chars.find(x=>x.id===charId);if(!c)return;
  if(!c.or) c.or={pp:0,po:0,pa:0,pc:0};
  const label={pp:'Pièces de Platine',po:'Pièces d\'Or',pa:'Pièces d\'Argent',pc:'Pièces de Cuivre'}[type]||type.toUpperCase();
  const val=prompt(`${label} :`,c.or[type]||0);
  if(val===null)return;
  const n=parseInt(val)||0;
  c.or[type]=n;
  save();
  const el=document.getElementById(`fiche-${type}-${charId}`);
  if(el) el.textContent=n;
  window.toast(`${label.split(' ')[1]||type.toUpperCase()} : ${n}`,'t-i');
}
export function editCurrentFiche(){
  const id=parseInt(document.getElementById('fiche-sel').value);
  if(!isNaN(id))openEdit(id);
}
export function toggleCap(charId,voieNom,rang){
  const c=state.chars.find(x=>x.id===charId);if(!c)return;
  const v=c.voies.find(v=>v.nom===voieNom);if(!v)return;
  const cap=v.caps.find(cp=>cp.r===rang);if(!cap)return;
  cap.ok=!cap.ok;save();renderFiche();
  window.toast(`${c.name} — ${cap.nom} ${cap.ok?'débloqué':'verrouillé'}`,'t-i');
}
export function uploadPhoto(charId,input){
  const file=input.files[0];if(!file)return;
  if(file.size>4096*1024){window.toast('Image trop lourde (max 4Mo)','t-w');input.value='';return;}
  const r=new FileReader();
  r.onload=e=>{
    const c=state.chars.find(x=>x.id===parseInt(charId));if(!c)return;
    c.photo=e.target.result;
    fbSavePhoto(charId,e.target.result); // sync to Firebase
    save();renderFiche();window.toast('Photo mise à jour','t-i');
  };
  r.readAsDataURL(file);input.value='';
}

// ── PM auto calc by class ──
export function calcPmGainAtLvlUp(c){
  const classe=(c.classe||'').toLowerCase();
  if(/magicien|ensorceleur|nécromancien|necromancien/i.test(classe)) return 2;
  if(/barde|forgesort|druide|prêtre|pretre|animiste|chaman/i.test(classe)) return 1;
  if(c.pmMax>0) return 1;
  return 0;
}
export function removePhoto(charId){
  const c=state.chars.find(x=>x.id===parseInt(charId));if(!c)return;
  if(!confirm('Supprimer la photo ?'))return;
  delete c.photo;save();renderFiche();window.toast('Photo supprimée','t-i');
}
export function showCapFull(charId,voieNom,rang){
  const c=state.chars.find(x=>x.id===parseInt(charId));if(!c)return;
  const v=c.voies.find(v=>v.nom===voieNom);if(!v)return;
  const cap=v.caps.find(cp=>cp.r===rang);if(!cap)return;
  document.getElementById('capfull-title').textContent=`${cap.r} — ${cap.nom}`;
  document.getElementById('capfull-body').textContent=cap.descFull||cap.desc;
  document.getElementById('capfull-overlay').style.display='flex';
}
export function closeCapFull(){document.getElementById('capfull-overlay').style.display='none';}
