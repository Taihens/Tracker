import { state, charHistory, initHistory, appMode, selectedPlayerChar, cardTypes } from '../state.js';
import { settings } from '../storage.js';
import { hpClass, hpColor } from '../combat.js';
import { pendingLvlUps } from '../levelup.js';

export function render(){
  initHistory();
  const present=state.chars.filter(c=>c.present&&!c.pending);
  document.getElementById('char-grid').innerHTML=present.length===0
    ?`<div style="grid-column:1/-1;padding:44px;text-align:center;color:var(--txt2);font-style:italic;font-family:'Cinzel',serif;font-size:10px;letter-spacing:.15em">Aucun personnage présent — gérez les présences dans l'onglet Roster.</div>`
    :present.map(c=>{try{return cardHTML(c);}catch(e){console.warn('cardHTML error',c?.name,e);return'';}}).join('');
  document.getElementById('h-ses').textContent=state.session;
  document.getElementById('h-cbt').textContent=state.combat;
  document.getElementById('h-rnd').textContent=state.round;
  document.getElementById('rnd-disp').textContent=state.round;
}

export function cardHTML(c){
  if(!c||!c.id) return '';
  const pct=c.pvMax>0?Math.max(0,c.pvActuel/c.pvMax):0;
  const isBad=c.etat!=='Normal';
  const etOpts=(state.etats||[]).map(e=>`<option${e.name===c.etat?' selected':''}>${e.name}</option>`).join('');
  const h=charHistory[c.id]||{pos:0,snapshots:[{pvActuel:c.pvActuel,etat:c.etat}]};
  const canUndo=h.pos>0, canRedo=h.pos<h.snapshots.length-1;

  let pmHTML='', pcHTML='';
  if(settings.showPM&&c.pmMax>0){
    const pp=c.pmMax>0?Math.max(0,c.pmActuel/c.pmMax):0;
    pmHTML=`<div class="pm-row"><span class="pm-label">PM</span><div class="pm-bar-bg"><div class="pm-bar-fill" style="width:${(pp*100).toFixed(1)}%"></div></div><span class="pm-val">${c.pmActuel}/${c.pmMax}</span><button class="btn-xs btn-xs-bl" onclick="adjPM(${c.id},-1)">−</button><button class="btn-xs btn-xs-bl" onclick="adjPM(${c.id},1)">+</button><button class="btn-xs btn-xs-g" onclick="recupPM(${c.id})">↻</button></div>`;
  }
  if(settings.showPC&&c.pcMax>0){
    const dots=Array.from({length:c.pcMax},(_,i)=>`<div class="pc-dot${i>=c.pcActuel?' empty':''}"></div>`).join('');
    pcHTML=`<div class="pm-row"><span class="pm-label">PC</span><div class="pc-dots">${dots}</div><span class="pc-val">${c.pcActuel}/${c.pcMax}</span><button class="btn-xs btn-xs-pu" onclick="adjPC(${c.id},-1)">−</button><button class="btn-xs btn-xs-pu" onclick="adjPC(${c.id},1)">+</button></div>`;
  }

  return`<div class="card${c.pvActuel<=0?' ko':''}${c.etat==='Mort'?' dead-card':''}${state.activeTurn===c.id?' active-turn':''}" id="card-${c.id}">
  <div class="c-header">
    <div><div class="c-name">${c.name}</div><div class="c-sub">${c.classe} ${c.race}${appMode==='joueur'&&c.id===selectedPlayerChar&&pendingLvlUps[c.id]?' <span style="font-family:Cinzel,serif;font-size:7px;color:var(--gold);border:1px solid var(--gold);padding:1px 5px;border-radius:2px">⏳ Lvl Up en attente</span>':''}</div></div>
    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
      <div class="c-badge">Niv. ${c.niveau}</div>
      <button class="btn-turn${state.activeTurn===c.id?' on':''}" onclick="setActiveTurn(${c.id})">${state.activeTurn===c.id?'▶ Tour':'◦ Tour'}</button>
    </div>
  </div>
  <div class="hp-z">
    <div class="hp-row"><div class="hp-cur ${hpClass(c)}">${c.pvActuel}</div><div class="hp-sl">/</div><div class="hp-mx">${c.pvMax}</div></div>
    <div class="bar-bg"><div class="bar-fill" style="width:${(pct*100).toFixed(1)}%;background:${hpColor(c)}"></div></div>
  </div>
  ${(pmHTML||pcHTML)?`<div class="pm-z">${pmHTML}${pcHTML}</div>`:''}
  <div class="stat-row">
    <div class="sc"><span class="sl">DEF</span><span class="sv">${c.def}</span></div>
    <div class="sc"><span class="sl">Init</span><span class="sv">${c.init}</span></div>
    <div class="sc"><span class="sl">Att.</span><span class="sv">${c.att}</span></div>
    <div class="sc"><span class="sl">Dégâts</span><span class="sv" style="font-size:10px">${c.degats}</span></div>
  </div>
  <div class="st-z">
    <label>État</label>
    <select class="stsel${isBad?' bad':''}" onchange="setEtat(${c.id},this.value)">${etOpts}</select>
  </div>
  <div class="cbt-z">
    <div class="cbt-r">
      <input class="ci" id="dmg-${c.id}" type="number" min="0" placeholder="DM" onkeydown="if(event.key==='Enter')applyDmg(${c.id})">
      <input class="ti" id="src-${c.id}" placeholder="Source / note">
      <button class="btn-type${(cardTypes[c.id]||'Physique')==='Physique'?' t-phys':''}" id="tp-${c.id}" onclick="setDmgType(${c.id},'Physique')">Phys.</button>
      <button class="btn-type${(cardTypes[c.id]||'Physique')==='Magique'?' t-mag':''}" id="tm-${c.id}" onclick="setDmgType(${c.id},'Magique')">Mag.</button>
      <button class="btn btn-d" onclick="applyDmg(${c.id})">⚔ Blesser</button>
    </div>
    <div class="cbt-r">
      <input class="ci hi" id="heal-${c.id}" type="number" min="0" placeholder="Soin" onkeydown="if(event.key==='Enter')applyHeal(${c.id})">
      <input class="ti" id="hsrc-${c.id}" placeholder="Source du soin">
      <button class="btn btn-h" onclick="applyHeal(${c.id})">✚ Soigner</button>
    </div>
  </div>
  <div class="undo-row">
    <button class="btn-undo" onclick="undoChar(${c.id})"${canUndo?'':' disabled'}>↩</button>
    <span class="undo-pos">${h.pos}/${h.snapshots.length-1}</span>
    <button class="btn-redo" onclick="redoChar(${c.id})"${canRedo?'':' disabled'}>↪</button>
  </div>
</div>`;
}
