// ── COF RULES IMPORT ──
import { COF_PAGES, COF_RACES_INDEX } from '../constants.js';
import { firebaseDB, _fbConnected, set, get, remove, ref } from '../firebase.js';

export let _cofImportStopped=false;

export function stopCOFImport(){
  _cofImportStopped=true;
  const btn=document.getElementById('cof-stop-btn');
  if(btn) btn.style.display='none';
  const status=document.getElementById('cof-rules-status');
  if(status) status.textContent+=' — ⏹ Arrêté par l\'utilisateur';
}

export async function importCOFRules(){
  const btn=document.getElementById('cof-import-btn');
  const stopBtn=document.getElementById('cof-stop-btn');
  const status=document.getElementById('cof-rules-status');
  _cofImportStopped=false;
  if(btn){btn.disabled=true;btn.textContent='⏳ Import...';}
  if(stopBtn) stopBtn.style.display='';

  const PROXIES=[
    {fn:url=>`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,json:true},
    {fn:url=>`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,json:false},
    {fn:url=>`https://corsproxy.io/?${encodeURIComponent(url)}`,json:false},
    {fn:url=>`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,json:false},
    {fn:url=>`https://proxy.cors.sh/${url}`,json:false},
    {fn:url=>`https://crossorigin.me/?${url}`,json:false},
  ];

  async function fetchPage(url, attempt=0){
    for(const proxy of PROXIES){
      if(_cofImportStopped) return null;
      try{
        const proxyUrl=proxy.fn(url);
        const res=await fetch(proxyUrl);
        if(res.status===429) continue;
        if(!res.ok) continue;
        let html='';
        if(proxy.json){
          const data=await res.json();
          if(data.status&&data.status.http_code===429) continue;
          html=data.contents||'';
        } else {
          html=await res.text();
        }
        if(html.includes('429')||html.includes('Too Many Requests')||html.includes('rate limit')) continue;
        if(html.length<200) continue;
        const parser=new DOMParser();
        const doc=parser.parseFromString(html,'text/html');
        doc.querySelectorAll('nav,header,footer,script,style,.menu,.sidebar,.block-menu,.contextual').forEach(el=>el.remove());
        const main=doc.querySelector('main,.content,article,.node__content,.field--body,.region-content')||doc.body;
        const text=(main?.textContent||'').replace(/\s+/g,' ').trim();
        if(text.length>200) return text;
      }catch(e){continue;}
    }
    // Tous les proxies ont échoué — réessaye jusqu'à 3 fois avec délai croissant
    if(attempt<3&&!_cofImportStopped){
      const wait=[10000,20000,35000][attempt];
      const statusEl=document.getElementById('cof-rules-status');
      if(statusEl){const cur=statusEl.innerHTML;statusEl.innerHTML=cur+`<br>⏳ Échec — attente ${wait/1000}s avant retry ${attempt+1}/3...`;}
      await new Promise(r=>setTimeout(r,wait));
      return fetchPage(url,attempt+1);
    }
    return null;
  }

  // Load already imported text to avoid restarting from scratch
  const existingText=window._cofRulesText||localStorage.getItem('anathazer_cof_rules')||'';
  const alreadyImported=new Set();
  COF_PAGES.forEach(url=>{
    const label=url.split('/').slice(-2).join('/');
    const marker=`=== ${label} ===`;
    const idx=existingText.indexOf(marker);
    if(idx>=0){
      const excerpt=existingText.slice(idx+marker.length,idx+marker.length+800);
      const is429=excerpt.includes('429')||excerpt.includes('Too Many Requests')||excerpt.includes('rate limit');
      if(!is429&&excerpt.trim().length>100) alreadyImported.add(url);
    }
  });

  const results=existingText?[existingText]:[];
  const failed=[];
  const pageStatus=COF_PAGES.map(url=>({
    ok:alreadyImported.has(url),
    label:url.split('/').slice(-2).join('/'),
    url,
    skipped:alreadyImported.has(url)
  }));

  for(let i=0;i<COF_PAGES.length;i++){
    if(_cofImportStopped) break;
    const url=COF_PAGES[i];
    if(alreadyImported.has(url)){
      // Already have this page, skip
      if(status){
        const lines=pageStatus.map(p=>`${p.ok?'✅':p.url===url?'⏳':'⬜'} ${p.label}${p.skipped?' (déjà importé)':''}`).join('<br>');
        status.innerHTML=lines;
      }
      continue;
    }
    // Afficher le suivi page par page
    const label=url.split('/').slice(-2).join('/');
    if(status){
      const lines=pageStatus.map(p=>`${p.ok?'✅':failed.includes(p.url)?'❌':p.url===url?'⏳':'⬜'} ${p.label}${p.skipped?' (déjà importé)':''}`).join('<br>');
      status.innerHTML=lines;
    }
    const text=await fetchPage(url);
    const pi=pageStatus.findIndex(p=>p.url===url);
    if(text){
      results.push(`\n=== ${label} ===\n${text}`);
      if(pi>=0) pageStatus[pi].ok=true;
    } else {
      failed.push(url);
      if(pi>=0) pageStatus[pi].ok=false;
    }
    // Sauvegarde progressive toutes les 3 pages
    if(results.length>0&&(results.length%3===0||i===COF_PAGES.length-1)){
      const partial=results.join('\n');
      window._cofRulesText=partial;
      if(firebaseDB&&_fbConnected){
        try{
          await set(ref(firebaseDB,'cof_rules'),{text:partial,imported:Date.now(),pages:results.length,failed:failed.length});
        }catch(e){ console.warn('Firebase set cof_rules (partiel):',e.message); }
      }
    }
    // Délai entre pages pour éviter le rate limiting (429)
    if(i<COF_PAGES.length-1&&!_cofImportStopped) await new Promise(r=>setTimeout(r,3500));
  }

  // Affichage final — garde le suivi affiché
  const lines=pageStatus.map(p=>`${p.ok?'✅':p.skipped?'✅':failed.includes(p.url)?'❌':'⬜'} ${p.label}${p.skipped?' (déjà importé)':''}`).join('<br>');
  const stopped=_cofImportStopped?' (arrêté)':'';
  if(status){
    status.innerHTML=`${lines}<br><strong style="color:var(--grn3)">${pageStatus.filter(p=>p.ok||p.skipped).length}/${COF_PAGES.length} pages importées — ${Math.round((window._cofRulesText||'').length/1024)}ko${stopped}</strong>`;
    if(failed.length>0){
      window._cofFailedPages=failed;
      status.innerHTML+=`<br><button onclick="retryCOFPages()" style="margin-top:6px;font-family:Cinzel,serif;font-size:9px;background:rgba(200,147,64,.15);border:1px solid var(--gold);color:var(--gold);padding:3px 8px;border-radius:2px;cursor:pointer">↺ Réessayer ${failed.length} page(s) échouée(s)</button>`;
    }
  }

  // Crawler les sous-pages de règles
  if(!_cofImportStopped){
    const reglesIndexLabel='jeu/regles';
    const reglesText=results.join('\n');
    if(reglesText.includes(`=== ${reglesIndexLabel} ===`)){
      const reglesLinks=[...new Set(reglesText.match(/\/fr\/jeu\/regles\/[a-z0-9/-]+/g)||[])];
      const reglesUrls=reglesLinks.map(p=>`https://www.co-drs.org${p}`)
        .filter(u=>!COF_PAGES.includes(u)); // évite les doublons avec pages déjà dans la liste
      for(const rUrl of reglesUrls){
        if(_cofImportStopped) break;
        const rLabel=rUrl.split('/').slice(-2).join('/');
        const marker=`=== ${rLabel} ===`;
        const idx=(window._cofRulesText||'').indexOf(marker);
        if(idx>=0){const ex=(window._cofRulesText||'').slice(idx+marker.length,idx+marker.length+800);if(!ex.includes('429')&&ex.trim().length>100) continue;}
        if(status) status.innerHTML+=`<br>⏳ Règle : ${rLabel}`;
        const rText=await fetchPage(rUrl);
        if(rText){
          results.push(`\n=== ${rLabel} ===\n${rText}`);
          const full=results.join('\n');
          window._cofRulesText=full;
          localStorage.setItem('anathazer_cof_rules',full);
          if(status) status.innerHTML+=` ✅`;
        } else {
          if(status) status.innerHTML+=` ❌`;
        }
        if(!_cofImportStopped) await new Promise(r=>setTimeout(r,3500));
      }
    }
  }

  // Crawler les sous-pages de races si la page index a été importée
  if(!_cofImportStopped){
    const racesIndexLabel=COF_RACES_INDEX.split('/').slice(-2).join('/');
    const racesText=results.find(r=>r.includes(`=== ${racesIndexLabel} ===`))||'';
    if(racesText){
      // Extraire les liens /fr/jeu/races/[slug] de la page index
      const raceLinks=[...new Set(racesText.match(/\/fr\/jeu\/races\/[a-z0-9-]+/g)||[])];
      const raceUrls=raceLinks.map(p=>`https://www.co-drs.org${p}`).filter(u=>u!==COF_RACES_INDEX);
      for(const raceUrl of raceUrls){
        if(_cofImportStopped) break;
        const raceLabel=raceUrl.split('/').slice(-2).join('/');
        if(existingText.includes(`=== ${raceLabel} ===`)) continue;
        if(status) status.innerHTML+= `<br>⏳ Race : ${raceLabel}`;
        const raceText=await fetchPage(raceUrl);
        if(raceText){
          results.push(`\n=== ${raceLabel} ===\n${raceText}`);
          const full=results.join('\n');
          window._cofRulesText=full;
          localStorage.setItem('anathazer_cof_rules',full);
          if(status) status.innerHTML+= ` ✅`;
        } else {
          if(status) status.innerHTML+= ` ❌`;
        }
        if(!_cofImportStopped) await new Promise(r=>setTimeout(r,3500));
      }
    }
  }

  if(btn){btn.disabled=false;btn.textContent='📥 Importer les règles';}
  if(stopBtn) stopBtn.style.display='none';
  if(!_cofImportStopped) window.toast(`COF : ${results.length}/${COF_PAGES.length} pages importées`,'t-i');
}

export async function retryCOFPages(){
  const failed=window._cofFailedPages||[];
  if(!failed.length){window.toast('Aucune page à réessayer','t-i');return;}
  const status=document.getElementById('cof-rules-status');
  if(status) status.textContent=`Réessai de ${failed.length} pages...`;
  // Reload existing rules first
  const existing=window._cofRulesText||'';
  const newResults=[];
  for(const url of failed){
    if(status) status.textContent=`Réessai : ${url.split('/').slice(-2).join('/')}...`;
    try{
      const res=await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
      if(res.ok){
        const html=await res.text();
        const parser=new DOMParser();
        const doc=parser.parseFromString(html,'text/html');
        doc.querySelectorAll('nav,header,footer,script,style,.menu').forEach(el=>el.remove());
        const main=doc.querySelector('main,.content,article')||doc.body;
        const text=(main?.textContent||'').replace(/\s+/g,' ').trim();
        if(text.length>200){newResults.push(`\n=== ${url.split('/').slice(-2).join('/')} ===\n${text}`);continue;}
      }
    }catch(e){ console.warn('Retry fetch page COF échoué:',e.message); }
    // Still failed
  }
  const fullText=existing+newResults.join('\n');
  window._cofRulesText=fullText;
  if(firebaseDB&&_fbConnected){
    try{
      await set(ref(firebaseDB,'cof_rules'),{text:fullText,imported:Date.now(),pages:(existing.match(/===/g)||[]).length/2+newResults.length});
    }catch(e){ console.warn('Firebase set cof_rules:',e.message); }
  }
  if(status) status.textContent=`✅ ${newResults.length} pages récupérées en plus — ${Math.round(fullText.length/1024)}ko total`;
  window._cofFailedPages=[];
}

export async function clearCOFRules(){
  if(!confirm('Effacer les règles COF ?'))return;
  window._cofRulesText=null;
  localStorage.removeItem('anathazer_cof_rules');
  if(firebaseDB&&_fbConnected){
    try{await remove(ref(firebaseDB,'cof_rules'));}catch(e){ console.warn('Firebase remove cof_rules:',e.message); }
  }
  const s=document.getElementById('cof-rules-status');
  if(s) s.textContent='Aucune règle importée.';
  window.toast('Effacé','t-i');
}

export async function loadCOFRulesStatus(){
  const s=document.getElementById('cof-rules-status');if(!s)return;
  if(firebaseDB&&_fbConnected){
    try{
      const snap=await get(ref(firebaseDB,'cof_rules'));
      if(snap.exists()){
        const d=snap.val();
        window._cofRulesText=d.text;
        s.textContent=`✅ Importées le ${new Date(d.imported).toLocaleDateString('fr-FR')} — ${Math.round((d.text||'').length/1024)}ko`;
        return;
      }
    }catch(e){ console.warn('Firebase get cof_rules (statut):',e.message); }
  }
  const local=localStorage.getItem('anathazer_cof_rules');
  if(local){window._cofRulesText=local;s.textContent=`✅ Cache local — ${Math.round(local.length/1024)}ko`;}
  else s.textContent='Aucune règle importée.';
}

export async function getCOFRulesText(){
  if(window._cofRulesText) return window._cofRulesText;
  if(firebaseDB&&_fbConnected){
    try{
      const snap=await get(ref(firebaseDB,'cof_rules'));
      if(snap.exists()){window._cofRulesText=snap.val().text;return window._cofRulesText;}
    }catch(e){ console.warn('Firebase get cof_rules:',e.message); }
  }
  const local=localStorage.getItem('anathazer_cof_rules');
  if(local){window._cofRulesText=local;return local;}
  return null;
}
