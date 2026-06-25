// ═══════════════════════════════════════════════════════════════
//  DICE — rendu SVG des dés, sélection, jet, statistiques, historique
// ═══════════════════════════════════════════════════════════════
import { DICE_TYPES } from './constants.js';

export let activeDie = 20, diceHistory = [];

export function dieSVG(sides){
  const s='var(--gold)',s2='var(--gold2)',bg='var(--bg3)',bdr='var(--bdr2)';
  const W=54,H=54;
  let shape='';
  if(sides===4) shape=`<polygon points="27,4 50,50 4,50" fill="${bg}" stroke="${bdr}" stroke-width="2"/><text x="27" y="40" font-family="Cinzel,serif" font-size="12" fill="${s2}" text-anchor="middle">d4</text>`;
  else if(sides===6) shape=`<rect x="5" y="5" width="44" height="44" rx="5" fill="${bg}" stroke="${bdr}" stroke-width="2"/><text x="27" y="33" font-family="Cinzel,serif" font-size="13" fill="${s2}" text-anchor="middle">d6</text>`;
  else if(sides===8) shape=`<polygon points="27,3 51,27 27,51 3,27" fill="${bg}" stroke="${bdr}" stroke-width="2"/><text x="27" y="32" font-family="Cinzel,serif" font-size="12" fill="${s2}" text-anchor="middle">d8</text>`;
  else if(sides===10) shape=`<polygon points="27,3 49,16 49,38 27,51 5,38 5,16" fill="${bg}" stroke="${bdr}" stroke-width="2"/><text x="27" y="32" font-family="Cinzel,serif" font-size="11" fill="${s2}" text-anchor="middle">d10</text>`;
  else if(sides===12) shape=`<polygon points="27,2 45,9 52,28 42,46 12,46 2,28 9,9" fill="${bg}" stroke="${bdr}" stroke-width="2"/><text x="27" y="32" font-family="Cinzel,serif" font-size="11" fill="${s2}" text-anchor="middle">d12</text>`;
  else if(sides===20) shape=`<polygon points="27,2 52,18 52,38 27,52 2,38 2,18" fill="${bg}" stroke="${bdr}" stroke-width="2"/><line x1="2" y1="18" x2="27" y2="28" stroke="${bdr}" stroke-width="1" opacity=".5"/><line x1="52" y1="18" x2="27" y2="28" stroke="${bdr}" stroke-width="1" opacity=".5"/><line x1="2" y1="38" x2="27" y2="28" stroke="${bdr}" stroke-width="1" opacity=".5"/><line x1="52" y1="38" x2="27" y2="28" stroke="${bdr}" stroke-width="1" opacity=".5"/><line x1="27" y1="2" x2="27" y2="28" stroke="${bdr}" stroke-width="1" opacity=".5"/><line x1="27" y1="52" x2="27" y2="28" stroke="${bdr}" stroke-width="1" opacity=".5"/><text x="27" y="33" font-family="Cinzel,serif" font-size="11" fill="${s2}" text-anchor="middle">d20</text>`;
  else shape=`<circle cx="27" cy="27" r="24" fill="${bg}" stroke="${bdr}" stroke-width="2"/><text x="27" y="24" font-family="Cinzel,serif" font-size="9" fill="${s2}" text-anchor="middle">d100</text><text x="27" y="36" font-family="Cinzel,serif" font-size="8" fill="${s2}" text-anchor="middle">%</text>`;
  return`<svg width="${W}" height="${H}" viewBox="0 0 54 54" xmlns="http://www.w3.org/2000/svg">${shape}</svg>`;
}
export function initDiceSVG(){
  if(document.getElementById('dice-svg-row').innerHTML)return;
  document.getElementById('dice-svg-row').innerHTML=DICE_TYPES.map(d=>`
    <div class="die-wrap${d===activeDie?' active-die':''}" id="die-${d}" onclick="selectDie(${d})" title="d${d}">
      ${dieSVG(d)}
      <span class="die-label">d${d}</span>
    </div>`).join('');
}
export function selectDie(d){
  activeDie=d;
  document.querySelectorAll('.die-wrap').forEach(w=>w.classList.remove('active-die'));
  document.getElementById('die-'+d)?.classList.add('active-die');
}
export function rollDice(){
  const n=Math.max(1,Math.min(20,parseInt(document.getElementById('dice-n').value)||1));
  const mod=parseInt(document.getElementById('dice-mod').value)||0;
  const rolls=Array.from({length:n},()=>Math.floor(Math.random()*activeDie)+1);
  const sum=rolls.reduce((s,r)=>s+r,0);
  const total=sum+mod;
  // COF : 1 = échec critique, 20 = réussite critique (d20 uniquement, 1 dé)
  const isCrit=activeDie===20&&n===1&&rolls[0]===20;
  const isFumble=activeDie===20&&n===1&&rolls[0]===1;
  const formula=`${n}d${activeDie}${mod!==0?(mod>0?'+':'')+mod:''}`;
  const diceStr=n>1?`[${rolls.join(', ')}]${mod!==0?` + ${mod} = ${total}`:''}`:mod!==0?`${rolls[0]} ${mod>0?'+':''} ${mod} = ${total}`:'';
  document.getElementById('rr-formula').textContent=formula;
  document.getElementById('rr-dice').textContent=diceStr;
  const el=document.getElementById('rr-total');
  el.textContent=total;
  el.className='rr-total'+(isCrit?' crit':isFumble?' fumble':'');
  // Style the result box
  const resultBox=document.querySelector('.roll-result');
  if(resultBox){
    resultBox.style.borderColor=isCrit?'var(--gold)':isFumble?'var(--red3)':'var(--bdr)';
    resultBox.style.background=isCrit?'rgba(200,147,64,.1)':isFumble?'rgba(220,50,50,.08)':'var(--bg3)';
  }
  document.getElementById('rr-label').textContent=isCrit?'✨ RÉUSSITE CRITIQUE !':(isFumble?'⚡ ÉCHEC CRITIQUE !':n===1&&rolls[0]===activeDie&&activeDie!==20?'Maximum !':'');
  document.getElementById('rr-label').style.color=isCrit?'var(--gold)':isFumble?'var(--red3)':'var(--txt2)';
  diceHistory.unshift({formula,total,rolls,n,mod,isCrit,isFumble,ts:Date.now()});
  if(diceHistory.length>100)diceHistory.pop();
  document.getElementById('dice-history-list').innerHTML=diceHistory.map(h=>`
    <div class="dh-entry" style="flex-direction:column;align-items:flex-start;gap:1px;${h.isCrit?'border-left:2px solid var(--gold)':h.isFumble?'border-left:2px solid var(--red3)':''}">
      <div style="display:flex;justify-content:space-between;width:100%">
        <span class="dh-formula">${h.formula}${h.isCrit?' ✨':h.isFumble?' ⚡':''}</span>
        <span class="dh-total" style="${h.isCrit?'color:var(--gold)':h.isFumble?'color:var(--red3)':''}">${h.total}</span>
      </div>
      ${h.n>1?`<span style="font-size:10px;color:var(--txt3)">[${h.rolls.join(', ')}]${h.mod!==0?' '+(h.mod>0?'+':'')+h.mod:''}</span>`:''}
    </div>`).join('');
  updateDiceStats();
}
export function updateDiceStats(){
  if(diceHistory.length===0){document.getElementById('dice-stats').style.display='none';return;}
  document.getElementById('dice-stats').style.display='block';
  const totals=diceHistory.map(h=>h.total);
  const avg=(totals.reduce((s,v)=>s+v,0)/totals.length).toFixed(1);
  const best=Math.max(...totals), worst=Math.min(...totals);
  const crits=diceHistory.filter(h=>h.n===1&&h.rolls[0]===h.rolls[0]&&h.total===activeDie+(h.mod||0)&&activeDie===20).length;
  document.getElementById('ds-grid').innerHTML=`
    <div class="ds-stat"><span class="ds-label">Moyenne</span><span class="ds-val">${avg}</span></div>
    <div class="ds-stat"><span class="ds-label">Meilleur</span><span class="ds-val" style="color:var(--grn3)">${best}</span></div>
    <div class="ds-stat"><span class="ds-label">Pire</span><span class="ds-val" style="color:var(--red3)">${worst}</span></div>
    <div class="ds-stat"><span class="ds-label">Lancers</span><span class="ds-val">${diceHistory.length}</span></div>`;
  // Distribution for d20 single rolls
  const singles=diceHistory.filter(h=>h.n===1&&activeDie===20);
  if(singles.length>3){
    const buckets={'1-5':0,'6-10':0,'11-15':0,'16-20':0};
    singles.forEach(h=>{const v=h.rolls[0];if(v<=5)buckets['1-5']++;else if(v<=10)buckets['6-10']++;else if(v<=15)buckets['11-15']++;else buckets['16-20']++;});
    const mx=Math.max(...Object.values(buckets))||1;
    document.getElementById('ds-dist').innerHTML=`<div style="margin-top:8px;font-family:'Cinzel',serif;font-size:7.5px;color:var(--txt2);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px">Distribution d20</div>`+
    Object.entries(buckets).map(([k,v])=>`<div class="dist-bar-row"><span class="dist-label">${k}</span><div class="dist-bar-bg"><div class="dist-bar-fill" style="width:${(v/mx*100).toFixed(0)}%"></div></div><span class="dist-count">${v}</span></div>`).join('');
  } else { document.getElementById('ds-dist').innerHTML=''; }
}
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&document.getElementById('tab-dice')?.classList.contains('active')&&document.activeElement?.id!=='ai-input')rollDice();});
