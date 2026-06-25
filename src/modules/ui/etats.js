import { state, appMode } from '../state.js';
import { save } from '../firebase.js';

let editingEtatIdxLocal=null;

export function renderEtats(){
  const etats=state.etats||[];
  const isPlayer=appMode==='joueur';
  const cards=etats.map((e,i)=>{
    if(e.builtin||isPlayer) return`<div class="etc-builtin${e.sev?' sev':''}"><div class="etn">${e.name}</div><div class="ete">${e.effect}</div></div>`;
    return`<div class="etc-custom${e.sev?' sev':''}"><div class="etc-custom-top"><span class="etc-custom-name">${e.name}${e.sev?' <span style="font-size:8.5px;color:var(--red3);font-family:Cinzel,serif">● SÉV.</span>':''}</span><div class="etc-custom-btns"><button class="btn btn-g" style="font-size:7.5px;padding:2px 8px" onclick="openEtatModal(${i})">✏ Éditer</button><button class="btn-del" onclick="deleteEtat(${i})">✕</button></div></div><div class="ete">${e.effect}</div></div>`;
  }).join('');
  document.getElementById('etats-grid').innerHTML=`<div class="etgrid">${cards}</div>${!isPlayer?'<button class="add-etat-btn" onclick="addEtat()">+ Ajouter un état</button>':''}`;
}
export function openEtatModal(i){
  editingEtatIdxLocal=i;
  const e=state.etats[i];if(!e||e.builtin)return;
  document.getElementById('em-name').value=e.name;
  document.getElementById('em-effect').value=e.effect;
  document.getElementById('em-sev').value=String(e.sev);
  document.getElementById('etat-modal').style.display='block';
}
export function closeEtatModal(){document.getElementById('etat-modal').style.display='none';editingEtatIdxLocal=null;}
export function saveEtatModal(){
  if(editingEtatIdxLocal===null)return;
  const e=state.etats[editingEtatIdxLocal];if(!e||e.builtin)return;
  e.name=document.getElementById('em-name').value||e.name;
  e.effect=document.getElementById('em-effect').value;
  e.sev=document.getElementById('em-sev').value==='true';
  save();window.render();renderEtats();closeEtatModal();
  window.toast(`État "${e.name}" mis à jour`,'t-i');
}
export function addEtat(){
  state.etats.push({name:'Nouvel état',effect:'—',sev:false,builtin:false});
  save();renderEtats();openEtatModal(state.etats.length-1);
}
export function deleteEtat(i){
  const e=state.etats[i];if(!e||e.builtin)return;
  const used=state.chars.filter(c=>c.etat===e.name).map(c=>c.name);
  if(used.length>0){if(!confirm(`"${e.name}" utilisé par : ${used.join(', ')}. Supprimer ? Ces personnages passeront à "Normal".`))return;state.chars.forEach(c=>{if(c.etat===e.name)c.etat='Normal';});}
  state.etats.splice(i,1);save();window.render();renderEtats();window.toast('État supprimé','t-w');
}
