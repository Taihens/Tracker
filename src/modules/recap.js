import { state } from './state.js';
import { esc } from './messages.js';

// ═══════════════════════════════════════════════════════════════
//  RÉCAP
// ═══════════════════════════════════════════════════════════════
export function renderRecap(){
  const presentChars=state.chars.filter(c=>c.present);
  document.getElementById('rec-grid').innerHTML=presentChars.map(c=>{
    const logs=state.log.filter(l=>l.charId===c.id&&l.ev==='Dégâts');
    const soins=state.log.filter(l=>l.charId===c.id&&l.ev==='Soin');
    const totalD=logs.reduce((s,l)=>s+l.val,0);
    const maxD=logs.length?Math.max(...logs.map(l=>l.val)):0;
    const moyD=logs.length?(totalD/logs.length).toFixed(1):0;
    const nbInco=state.log.filter(l=>l.charId===c.id&&l.pv===0).length;
    const p=c.pvMax>0?Math.max(0,c.pvActuel/c.pvMax):0;
    return`<div class="recc">
      <div class="rcn">${c.name}</div>
      <div class="bar-bg" style="margin-bottom:7px"><div class="bar-fill" style="width:${(p*100).toFixed(1)}%;background:${window.hpColor(c)}"></div></div>
      <div class="rcs">PV actuels<span style="color:${window.hpColor(c)}">${c.pvActuel}/${c.pvMax}</span></div>
      <div class="rcs">Total dégâts reçus<span>${totalD}</span></div>
      <div class="rcs">Nombre de coups<span>${logs.length}</span></div>
      <div class="rcs">Plus gros coup<span class="big">${maxD}</span></div>
      <div class="rcs">Moy. par coup<span>${moyD}</span></div>
      <div class="rcs">Nombre de soins<span style="color:var(--grn3)">${soins.length}</span></div>
      <div class="rcs">Fois inconscient<span style="color:var(--red3)">${nbInco}</span></div>
      <div class="rcs">État actuel<span style="color:${c.etat==='Normal'?'var(--txt2)':'var(--red3)'}">${c.etat}</span></div>
    </div>`;
  }).join('');
  // PDF export button
  const st=document.querySelector('#tab-recap .section-title');
  if(st&&!document.getElementById('pdf-export-btn')){
    const btn=document.createElement('button');
    btn.id='pdf-export-btn';btn.className='btn btn-g';btn.style.cssText='font-size:9px;margin-left:12px';
    btn.textContent='📄 Export PDF';btn.onclick=exportPDF;
    st.appendChild(btn);
  }
  renderRecapTable();
}

// ═══════════════════════════════════════════════════════════════
//  CHARTS & LOG FILTER
// ═══════════════════════════════════════════════════════════════
export let activeChart='bars', recFilter='all';
export function setChart(type,btn){
  activeChart=type;
  document.querySelectorAll('.chart-btn').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
  renderChart();
}
export function setRecFilter(f,btn){
  recFilter=f;
  document.querySelectorAll('#rec-filters .lf-btn').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
  renderRecapTable();
}
export function renderChart(){
  const el=document.getElementById('chart-container');if(!el)return;
  if(activeChart==='none'){el.style.display='none';return;}
  el.style.display='block';
  if(activeChart==='bars'){
    const data=state.chars.map(c=>({name:c.name,val:state.log.filter(l=>l.charId===c.id&&l.ev==='Dégâts').reduce((s,l)=>s+l.val,0),color:window.hpColor(c)}));
    const max=Math.max(...data.map(d=>d.val),1);
    el.innerHTML=`<div class="chart-title">Dégâts totaux reçus</div><div class="bar-chart">${data.map(d=>`<div class="bar-row"><span class="bar-name">${d.name}</span><div class="bar-wrap"><div class="bar-inner" style="width:${(d.val/max*100).toFixed(1)}%;background:${d.color}"><span class="bar-val">${d.val}</span></div></div></div>`).join('')}</div>`;
  } else if(activeChart==='pv'){
    const colors=['#e04444','#60a8f0','#4a9a40','#b090e0'];
    const pvLines=state.chars.map((c,ci)=>{const entries=state.log.filter(l=>l.charId===c.id&&['Dégâts','Soin'].includes(l.ev));return{name:c.name,color:colors[ci%4],pts:[c.pvMax,...entries.map(l=>l.pv)]};});
    const allPts=pvLines.flatMap(l=>l.pts);const maxPV=Math.max(...allPts,1);const maxPts=Math.max(...pvLines.map(l=>l.pts.length),2);
    const W=500,H=100;
    const toX=i=>(i/(maxPts-1))*W,toY=v=>H-(v/maxPV)*H;
    const svgLines=pvLines.map(l=>{if(l.pts.length<2)return'';const d=l.pts.map((v,i)=>`${i===0?'M':'L'}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');return`<path d="${d}" fill="none" stroke="${l.color}" stroke-width="2" opacity=".85"/>`;}).join('');
    const legend=pvLines.map(l=>`<div class="pie-item"><div class="pie-dot" style="background:${l.color}"></div>${l.name}</div>`).join('');
    el.innerHTML=`<div class="chart-title">Évolution des PV</div><div class="pie-wrap"><svg viewBox="0 0 ${W} ${H}" style="flex:1;min-width:200px;height:100px"><rect width="${W}" height="${H}" fill="rgba(255,255,255,.03)" rx="2"/>${svgLines}</svg><div class="pie-legend">${legend}</div></div>`;
  } else if(activeChart==='pie'){
    const phys=state.log.filter(l=>l.ev==='Dégâts'&&l.type==='Physique').reduce((s,l)=>s+l.val,0);
    const mag=state.log.filter(l=>l.ev==='Dégâts'&&l.type==='Magique').reduce((s,l)=>s+l.val,0);
    const total=phys+mag||1;
    el.innerHTML=`<div class="chart-title">Répartition Physique / Magique</div><div class="pie-wrap" style="gap:30px"><div style="display:flex;flex-direction:column;gap:10px"><div class="ds-stat"><span class="ds-label" style="color:var(--red3)">Physique</span><span class="ds-val" style="color:var(--red3)">${phys} (${((phys/total)*100).toFixed(1)}%)</span></div><div class="ds-stat"><span class="ds-label" style="color:var(--blu3)">Magique</span><span class="ds-val" style="color:var(--blu3)">${mag} (${((mag/total)*100).toFixed(1)}%)</span></div><div class="ds-stat"><span class="ds-label">Total</span><span class="ds-val">${phys+mag}</span></div></div></div>`;
  }
}
export function renderRecapTable(){
  const evClass=ev=>ev==='Dégâts'?'td-d':ev==='Soin'?'td-h':ev.includes('PM')?'td-pm':'td-pc';
  let filtered=state.log;
  if(recFilter==='Dégâts')filtered=state.log.filter(l=>l.ev==='Dégâts');
  else if(recFilter==='Soin')filtered=state.log.filter(l=>l.ev==='Soin');
  else if(recFilter==='PM')filtered=state.log.filter(l=>l.ev.includes('PM'));
  else if(recFilter==='PC')filtered=state.log.filter(l=>l.ev.includes('PC'));
  document.getElementById('rec-body').innerHTML=filtered.length?[...filtered].reverse().map(l=>`<tr><td>${esc(l.charName)}</td><td class="${evClass(l.ev)}">${l.ev}</td><td class="${evClass(l.ev)}">${l.val}</td><td class="td-dim">${esc(l.source)}</td><td class="td-dim">${esc(l.type)}</td><td class="td-dim">Session ${l.session}</td><td class="td-dim">Combat ${l.cbt}</td><td class="td-dim">Round ${l.rnd}</td><td class="td-pv">${l.pv}</td></tr>`).join(''):'<tr><td colspan="9" class="empty-log">Aucune entrée.</td></tr>';
}

// ═══════════════════════════════════════════════════════════════
//  PDF EXPORT
// ═══════════════════════════════════════════════════════════════
export function exportPDF(){
  const w=window.open('','_blank');
  const css=`body{font-family:Georgia,serif;padding:20px;color:#222;max-width:900px;margin:0 auto}h1{font-size:18px;border-bottom:2px solid #333;padding-bottom:8px;margin-bottom:16px}h2{font-size:14px;color:#555;border-bottom:1px solid #ccc;padding-bottom:4px;margin:12px 0 8px}table{width:100%;border-collapse:collapse;font-size:12px}th{background:#333;color:#fff;padding:5px 8px;text-align:left}td{padding:4px 8px;border-bottom:1px solid #eee}.char-section{background:#f9f9f9;border:1px solid #ddd;border-radius:4px;padding:12px;margin-bottom:12px}.bar{height:8px;background:#ddd;border-radius:4px;margin:4px 0}.bar-fill{height:100%;border-radius:4px}.stat{display:inline-block;margin-right:16px;font-size:12px}`;
  let html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Anathazerïn — Récap</title><style>${css}</style></head><body><h1>⚔ Anathazerïn — Session ${state.session}</h1><h2>Personnages</h2>`;
  state.chars.forEach(c=>{
    const pct=c.pvMax>0?(c.pvActuel/c.pvMax*100).toFixed(0):0;
    const logs=state.log.filter(l=>l.charId===c.id&&l.ev==='Dégâts');
    const totalD=logs.reduce((s,l)=>s+l.val,0);
    html+=`<div class="char-section"><strong>${c.name}</strong> — ${c.classe} ${c.race} Niv.${c.niveau}<div class="bar"><div class="bar-fill" style="width:${pct}%;background:${Number(pct)>50?'#4a9a40':Number(pct)>25?'#ff9800':'#e04444'}"></div></div><span class="stat">PV: <strong>${c.pvActuel}/${c.pvMax}</strong></span><span class="stat">DEF: <strong>${c.def}</strong></span><span class="stat">Init: <strong>${c.init}</strong></span><span class="stat">État: <strong>${c.etat}</strong></span><span class="stat">Dégâts reçus: <strong>${totalD}</strong></span></div>`;
  });
  html+=`<h2>Journal (${state.log.length} entrées)</h2><table><tr><th>PJ</th><th>Événement</th><th>Val.</th><th>Source</th><th>Type</th><th>Session</th><th>Combat</th><th>Round</th><th>PV rest.</th></tr>`;
  [...state.log].reverse().forEach(l=>{html+=`<tr><td>${l.charName}</td><td>${l.ev}</td><td>${l.val}</td><td>${l.source}</td><td>${l.type}</td><td>${l.session}</td><td>${l.cbt}</td><td>${l.rnd}</td><td>${l.pv}</td></tr>`;});
  html+=`</table></body></html>`;
  w.document.write(html);w.document.close();setTimeout(()=>w.print(),500);
}
