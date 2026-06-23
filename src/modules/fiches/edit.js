// ── EDIT MODAL ──
import { state, editCharId, editData, setEditCharId, setEditData } from '../state.js';
import { save } from '../firebase.js';
import { renderFiche } from './render.js';

export function openEdit(id){
  const c=state.chars.find(x=>x.id===id);if(!c){window.toast('Introuvable','t-w');return;}
  setEditCharId(id);setEditData(JSON.parse(JSON.stringify(c)));
  editData.armes=editData.armes||[];editData.voies=editData.voies||[];
  editData.resume=editData.resume||[];editData.raciales=editData.raciales||[];
  editData.attrs=editData.attrs||{FOR:'—',DEX:'—',CON:'—',INT:'—',SAG:'—',CHA:'—'};
  document.getElementById('m-title').textContent=`Éditer — ${c.name}`;
  buildStatTab();buildArmesTab();buildVoiesTab();buildNotesTab();
  showMTab('stats',document.querySelector('.mt'));
  document.getElementById('modal-overlay').style.display='block';
  document.body.style.overflow='hidden';
}
export function closeModal(){document.getElementById('modal-overlay').style.display='none';document.body.style.overflow='';setEditCharId(null);setEditData(null);}
export function showMTab(id,btn){
  document.querySelectorAll('.m-tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.mt').forEach(b=>b.classList.remove('active'));
  document.getElementById('m-tab-'+id).classList.add('active');
  if(btn)btn.classList.add('active');
}
export function fi(label,key,val,type='text',full=false){
  return`<div class="ef"${full?' style="grid-column:1/-1"':''}><label>${label}</label><input type="${type}" value="${String(val).replace(/"/g,'&quot;')}" data-key="${key}" onchange="if(editData)editData['${key}']=this.type==='number'?parseFloat(this.value)||0:this.value"></div>`;
}
export function buildStatTab(){
  const c=editData,a=c.attrs||{};
  document.getElementById('m-tab-stats').innerHTML=`<div class="ed-grid">
    ${fi('Nom','name',c.name,'text',true)}${fi('Classe','classe',c.classe||'')}${fi('Race','race',c.race||'')}
    ${fi('Niveau','niveau',c.niveau,'number')}${fi('DV','dv',c.dv||'D6')}
    <div class="ed-sep">Points de Vie</div>
    ${fi('PV Max','pvMax',c.pvMax,'number')}${fi('PV Actuels','pvActuel',c.pvActuel,'number')}
    <div class="ed-sep">PM & PC</div>
    ${fi('PM Max','pmMax',c.pmMax,'number')}${fi('PM Actuels','pmActuel',c.pmActuel,'number')}
    ${fi('PC Max','pcMax',c.pcMax,'number')}${fi('PC Actuels','pcActuel',c.pcActuel,'number')}
    <div class="ed-sep">Combat</div>
    ${fi('DEF','def',c.def,'number')}${fi('Initiative','init',c.init)}
    ${fi('Attaque','att',c.att)}${fi('Dégâts','degats',c.degats)}${fi('Vitesse','vitesse',c.vitesse)}
    <div class="ed-sep">Attributs</div>
    ${['FOR','DEX','CON','INT','SAG','CHA'].map(k=>`<div class="ef"><label>${k}</label><input type="text" value="${a[k]||'—'}" onchange="if(editData){editData.attrs=editData.attrs||{};editData.attrs['${k}']=this.value}"></div>`).join('')}
  </div>`;
}
export function buildArmesTab(){
  const r=()=>{
    if(!editData)return;
    document.getElementById('m-tab-armes').innerHTML=`<div>${(editData.armes||[]).map((a,i)=>`
      <div class="arme-ed-row">
        <div class="ef" style="flex:2;margin:0"><label>Nom</label><input value="${a.nom}" onchange="if(editData)editData.armes[${i}].nom=this.value"></div>
        <div class="ef" style="flex:1;margin:0"><label>Att.</label><input value="${a.att}" onchange="if(editData)editData.armes[${i}].att=this.value"></div>
        <div class="ef" style="flex:1;margin:0"><label>Dég.</label><input value="${a.dmg}" onchange="if(editData)editData.armes[${i}].dmg=this.value"></div>
        <div class="ef" style="flex:1;margin:0"><label>Spécial</label><input value="${a.spec}" onchange="if(editData)editData.armes[${i}].spec=this.value"></div>
        <button class="btn-del" style="margin-top:18px" onclick="rmArme(${i})">✕</button>
      </div>`).join('')}</div>
    <button class="add-btn" onclick="addArme()">+ Ajouter une arme</button>`;
  };
  window.addArme=()=>{if(editData){editData.armes.push({nom:'Nouvelle arme',att:'1d20+0',dmg:'1d6',spec:'—'});r();}};
  window.rmArme=(i)=>{if(editData){editData.armes.splice(i,1);r();}};
  r();
}
export function buildVoiesTab(){
  const r=()=>{
    if(!editData)return;
    document.getElementById('m-tab-voies').innerHTML=`<div>${(editData.voies||[]).map((v,vi)=>`
      <div class="voie-ed" style="${vi===5?'border:1px solid var(--gold);background:rgba(200,147,64,.05)':''}">
        ${vi===5?`<div style="font-family:Cinzel,serif;font-size:8px;color:var(--gold);margin-bottom:4px">⭐ VOIE DE PRESTIGE (6ème voie)</div>`:''}
        <div class="voie-ed-header"><input value="${v.nom}" placeholder="Nom" onchange="if(editData)editData.voies[${vi}].nom=this.value"><button class="btn-del" onclick="rmVoie(${vi})">✕</button></div>
        ${v.caps.map((cap,ci)=>`<div class="rank-row">
          <button class="rank-toggle${cap.ok?' on':''}" onclick="toggleRank(${vi},${ci})">${cap.ok?'✓':'○'}</button>
          <span class="rank-label">${cap.r}</span>
          <div class="rank-fields">
            <input value="${cap.nom}" placeholder="Capacité" onchange="if(editData)editData.voies[${vi}].caps[${ci}].nom=this.value">
            <textarea placeholder="Description" onchange="if(editData)editData.voies[${vi}].caps[${ci}].desc=this.value">${cap.desc}</textarea>
          </div></div>`).join('')}
      </div>`).join('')}</div>
    ${(editData.voies||[]).length<6
      ?`<button class="add-btn" onclick="addVoie()">${(editData.voies||[]).length===5?'⭐ Ajouter voie de prestige (6ème)':'+ Ajouter une voie'}</button>`
      :`<p style="font-size:10px;color:var(--txt3);text-align:center;margin:8px 0">Maximum de 6 voies atteint (voie de prestige incluse)</p>`
    }`;
  };
  window.toggleRank=(vi,ci)=>{
    if(!editData)return;
    editData.voies[vi].caps[ci].ok=!editData.voies[vi].caps[ci].ok;
    let idx=0;
    const btns=document.querySelectorAll('.rank-toggle');
    (editData.voies||[]).forEach((v,vj)=>v.caps.forEach((_,cj)=>{
      if(vj===vi&&cj===ci){const b=btns[idx];if(b){b.classList.toggle('on',editData.voies[vi].caps[ci].ok);b.textContent=editData.voies[vi].caps[ci].ok?'✓':'○';}}idx++;
    }));
  };
  window.addVoie=()=>{if(editData){editData.voies.push({nom:'Nouvelle voie',caps:['R1','R2','R3','R4','R5'].map(r=>({r,ok:false,nom:'',desc:''}))});r();}};
  window.rmVoie=(vi)=>{if(editData&&confirm('Supprimer cette voie ?')){editData.voies.splice(vi,1);r();}};
  r();
}
export function buildNotesTab(){
  const r=()=>{
    if(!editData)return;
    document.getElementById('m-tab-notes').innerHTML=`
    <div style="font-family:'Cinzel',serif;font-size:8px;letter-spacing:.12em;color:var(--gold);text-transform:uppercase;margin-bottom:7px">Résumé MJ</div>
    <div>${(editData.resume||[]).map((n,i)=>`<div class="note-row"><textarea onchange="if(editData)editData.resume[${i}]=this.value">${n}</textarea><button class="btn-del" style="margin-top:2px" onclick="rmNote(${i})">✕</button></div>`).join('')}</div>
    <button class="add-btn" onclick="addNote()">+ Ajouter une note</button>
    <div style="border-top:1px solid var(--bdr);margin:10px 0"></div>
    <div style="font-family:'Cinzel',serif;font-size:8px;letter-spacing:.12em;color:var(--gold);text-transform:uppercase;margin-bottom:7px">Capacités Raciales</div>
    <div>${(editData.raciales||[]).map((rc,i)=>`<div class="rac-row"><input value="${rc}" onchange="if(editData)editData.raciales[${i}]=this.value"><button class="btn-del" onclick="rmRac(${i})">✕</button></div>`).join('')}</div>
    <button class="add-btn" onclick="addRac()">+ Ajouter une capacité raciale</button>`;
  };
  window.addNote=()=>{if(editData){editData.resume.push('');r();}};
  window.rmNote=(i)=>{if(editData){editData.resume.splice(i,1);r();}};
  window.addRac=()=>{if(editData){editData.raciales.push('');r();}};
  window.rmRac=(i)=>{if(editData){editData.raciales.splice(i,1);r();}};
  r();
}
export function saveEdit(){
  if(!editCharId||!editData)return;
  const idx=state.chars.findIndex(x=>x.id===editCharId);if(idx===-1)return;
  editData.pvActuel=Math.min(editData.pvActuel,editData.pvMax);
  editData.pmActuel=Math.min(editData.pmActuel,editData.pmMax);
  editData.pcActuel=Math.min(editData.pcActuel,editData.pcMax);
  state.chars[idx]=editData;
  save();window.render();
  if(document.getElementById('tab-fiches').classList.contains('active'))renderFiche();
  if(document.getElementById('tab-roster').classList.contains('active'))window.renderRoster();
  closeModal();
  if(window._postEditCb){window._postEditCb();}
  window.toast(`${editData.name} — sauvegardé`,'t-i');
}
