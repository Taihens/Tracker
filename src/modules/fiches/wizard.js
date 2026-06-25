// ── CHAR WIZARD ──
import { COF_CLASSES, COF_RACE_DATA, COF_RACES, cofMod, getClasseVoies, getClasseEquip, modStr } from '../cof-classes.js';
import { state, appMode, selectedPlayerChar } from '../state.js';
import { save } from '../firebase.js';
import { pendingChars, fbSavePendingChars } from '../roster.js';

export let charWizard={step:0,charId:null,data:{}};

export function openCharWizard(){
  charWizard={step:1,charId:null,data:{name:'',classe:'',race:'',niveau:1,attrs:{FOR:10,DEX:10,CON:10,INT:10,SAG:10,CHA:10}}};
  showCharWizardStep(1);
  document.getElementById('char-wizard-overlay').style.display='flex';
}
export function closeCharWizard(){
  document.getElementById('char-wizard-overlay').style.display='none';
  charWizard={step:0,charId:null,data:{}};
}

export function showCharWizardStep(step){
  charWizard.step=step;
  const body=document.getElementById('char-wizard-body');
  const title=document.getElementById('char-wizard-title');
  const prev=document.getElementById('char-wizard-prev');
  const next=document.getElementById('char-wizard-next');
  prev.style.display=step>1?'':'none';
  next.textContent=step<4?'Suivant →':'✓ Créer';

  if(step===1){
    title.textContent='Étape 1/4 — Classe';
    body.innerHTML=`
      <p style="font-size:11px;color:var(--txt2);margin-bottom:12px">Choisissez la classe. Elle détermine le DV, les PV, les PM et les voies disponibles.</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        ${Object.entries(COF_CLASSES).map(([name,cl])=>`
          <button onclick="selectWizardClass('${name.replace(/'/g,"\\'")}') " style="background:${charWizard.data.classe===name?'rgba(74,154,64,.2)':'var(--bg3)'};border:1px solid ${charWizard.data.classe===name?'var(--grn2)':'var(--bdr)'};color:var(--wht);border-radius:3px;padding:8px;text-align:left;cursor:pointer">
            <div style="font-family:Cinzel,serif;font-size:10px;color:${charWizard.data.classe===name?'var(--grn3)':'var(--gold2)'}">${name}</div>
            <div style="font-size:9px;color:var(--txt2);margin-top:2px">DV ${cl.dv}${cl.pm?' · PM: '+cl.pmFormule:' · Pas de PM'}</div>
          </button>`).join('')}
      </div>`;
  }
  else if(step===2){
    const cl=COF_CLASSES[charWizard.data.classe]||{};
    const rd=COF_RACE_DATA[charWizard.data.race]||{};
    title.textContent='Étape 2/4 — Race & Caractéristiques';
    const attrs=['FOR','DEX','CON','INT','SAG','CHA'];
    body.innerHTML=`
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
        <div style="flex:1;min-width:140px">
          <label style="font-family:Cinzel,serif;font-size:8px;color:var(--txt2);letter-spacing:.08em">NOM</label>
          <input value="${charWizard.data.name||''}" oninput="charWizard.data.name=this.value" style="width:100%;background:var(--bg3);border:1px solid var(--bdr);color:var(--wht);font-family:'Crimson Text',serif;font-size:14px;padding:6px 8px;border-radius:2px;box-sizing:border-box">
        </div>
        <div style="flex:1;min-width:140px">
          <label style="font-family:Cinzel,serif;font-size:8px;color:var(--txt2);letter-spacing:.08em">RACE</label>
          <select onchange="charWizard.data.race=this.value;showCharWizardStep(2)" style="width:100%;background:var(--bg3);border:1px solid var(--bdr);color:var(--wht);font-family:'Crimson Text',serif;font-size:14px;padding:6px 8px;border-radius:2px;box-sizing:border-box">
            <option value="">— Choisir —</option>
            ${COF_RACES.map(r=>`<option value="${r}"${charWizard.data.race===r?' selected':''}>${r}</option>`).join('')}
          </select>
        </div>
      </div>
      ${rd.capacite?`<div style="background:rgba(200,147,64,.08);border:1px solid var(--gold);border-radius:3px;padding:10px;margin-bottom:12px">
        <div style="font-family:Cinzel,serif;font-size:9px;color:var(--gold2);margin-bottom:3px">CAPACITÉ RACIALE : ${rd.capacite}</div>
        <div style="font-size:11px;color:var(--txt)">${rd.descCap||''}</div>
        ${rd.mods&&Object.keys(rd.mods).length>0?`<div style="font-size:10px;color:var(--grn3);margin-top:4px">${Object.entries(rd.mods).map(([a,v])=>`${a} ${v>0?'+':''}${v}`).join(' · ')}</div>`:''}
        ${rd.choix?`<div style="font-size:10px;color:var(--gold);margin-top:4px">+${rd.choix} dans la caractéristique de ton choix</div>`:''}
      </div>`:''}
      <div style="font-family:Cinzel,serif;font-size:8px;color:var(--txt2);letter-spacing:.08em;margin-bottom:8px">CARACTÉRISTIQUES (score de base, le bonus racial sera ajouté)</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px">
        ${attrs.map(attr=>{
          const raceMod=(rd.mods&&rd.mods[attr])||0;
          const base=parseInt(charWizard.data.attrs?.[attr])||0;
          const total=base+raceMod;
          const mod=cofMod(total);
          return`<div>
            <label style="font-family:Cinzel,serif;font-size:8px;color:var(--txt2)">${attr}${raceMod?` <span style="color:${raceMod>0?'var(--grn3)':'var(--red3)'}">${raceMod>0?'+':''}${raceMod}</span>`:''}</label>
            <input id="wizard-attr-${attr}" type="number" min="3" max="18" value="${base||''}" placeholder="3-18"
              oninput="this.value=this.value.replace(/^0+(?=\\d)/,'');charWizard.data.attrs['${attr}']=parseInt(this.value)||0;updateWizardPVPM()"
              style="width:100%;background:var(--bg3);border:1px solid var(--bdr);color:var(--wht);font-size:14px;padding:6px 8px;border-radius:2px;box-sizing:border-box">
            <div id="wizard-total-${attr}" style="font-size:9px;color:var(--txt3);margin-top:2px"></div>
          </div>`;
        }).join('')}
      </div>
      ${rd.choix?`<div style="background:var(--bg3);border:1px solid var(--bdr);border-radius:3px;padding:8px;margin-bottom:12px">
        <div style="font-family:Cinzel,serif;font-size:8px;color:var(--txt2);margin-bottom:6px">BONUS HUMAIN +${rd.choix} — Choisir la caractéristique :</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${attrs.map(a=>`<button onclick="charWizard.data.bonusAttr='${a}';document.querySelectorAll('.bonus-btn').forEach(b=>b.style.background='var(--bg3)');this.style.background='rgba(200,147,64,.3)';this.style.color='var(--wht)'" class="bonus-btn btn" style="font-size:9px;padding:4px 8px;background:${charWizard.data.bonusAttr===a?'rgba(200,147,64,.3)':'var(--bg3)'};color:var(--wht)">${a}</button>`).join('')}
        </div>
      </div>`:''}
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:8px">
        <div>
          <label style="font-family:Cinzel,serif;font-size:8px;color:var(--txt2)">NIVEAU</label>
          <input type="number" min="1" max="20" value="${charWizard.data.niveau||1}" oninput="charWizard.data.niveau=parseInt(this.value)||1;updateWizardPVPM()" style="width:100%;background:var(--bg3);border:1px solid var(--bdr);color:var(--wht);font-size:14px;padding:6px 8px;border-radius:2px;box-sizing:border-box">
        </div>
        <div>
          <label style="font-family:Cinzel,serif;font-size:8px;color:var(--txt2)">DV</label>
          <div style="background:var(--bg3);border:1px solid var(--bdr);padding:6px 8px;border-radius:2px;font-size:14px;color:var(--gold)">${cl.dv||'D6'}</div>
        </div>
        <div>
          <label style="font-family:Cinzel,serif;font-size:8px;color:var(--txt2)">PV MAX (estimé)</label>
          <div id="wizard-pv" style="background:var(--bg3);border:1px solid var(--bdr);padding:6px 8px;border-radius:2px;font-size:14px;color:var(--grn3)">—</div>
        </div>
        ${cl.pm?`<div>
          <label style="font-family:Cinzel,serif;font-size:8px;color:var(--txt2)">PM MAX (estimé)</label>
          <div id="wizard-pm" style="background:var(--bg3);border:1px solid var(--bdr);padding:6px 8px;border-radius:2px;font-size:14px;color:var(--blu3)">—</div>
        </div>`:''}
      </div>`;
    setTimeout(updateWizardPVPM,50);
  }
  else if(step===3){
    const niveau=parseInt(charWizard.data.niveau)||1;
    const totalPts=niveau*2;
    const spentPts=calcWizardPoints();
    const remaining=totalPts-spentPts;
    title.textContent='Étape 3/4 — Voies & Capacités';
    const voies=getClasseVoies(charWizard.data.classe);
    body.innerHTML=`
      <div style="background:var(--bg3);border:1px solid var(--bdr);border-radius:3px;padding:8px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center">
        <span style="font-family:Cinzel,serif;font-size:10px;color:var(--txt2)">Points disponibles :</span>
        <span id="wizard-pts" style="font-family:Cinzel,serif;font-size:14px;color:${remaining>=0?'var(--grn3)':'var(--red3)'}">${remaining}/${totalPts}</span>
      </div>
      <p style="font-size:10px;color:var(--txt3);margin-bottom:10px">R1-R2 = 1 point · R3-R4-R5 = 2 points · Les rangs précédents sont requis</p>
      ${voies.map((v,vi)=>{
        const vNom=v.nom||('Voie '+(vi+1));
        const caps=v.caps||[];
        return`<div style="background:var(--bg3);border:1px solid var(--bdr);border-radius:3px;padding:10px;margin-bottom:8px">
          <div style="font-family:Cinzel,serif;font-size:10px;color:var(--gold2);margin-bottom:8px">${vNom}</div>
          ${caps.map((cap,ri)=>{
            const rang=ri+1;
            const key='v'+vi+'_r'+rang;
            const checked=!!(charWizard.data.voieCaps&&charWizard.data.voieCaps[key]);
            const prevOk=rang===1||(charWizard.data.voieCaps&&charWizard.data.voieCaps['v'+vi+'_r'+(rang-1)]);
            const levelOk=rang<=niveau;
            const canSelect=prevOk&&levelOk;
            const cost=rang<=2?1:2;
            const capNom=cap.nom||('R'+rang);
            const capDesc=cap.desc||'';
            return'<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:6px;padding:6px;background:'+(checked?'rgba(74,154,64,.1)':'rgba(0,0,0,.2)')+';border-radius:2px;border:1px solid '+(checked?'var(--grn2)':'var(--bdr)')+'">'+
              '<button onclick="toggleWizardCap(\''+key+'\','+vi+','+rang+')" style="flex-shrink:0;width:28px;height:28px;background:'+(checked?'var(--grn2)':'var(--bg4)')+';border:1px solid '+(checked?'var(--grn3)':'var(--bdr)')+';border-radius:2px;cursor:'+(canSelect?'pointer':'not-allowed')+';color:'+(checked?'#fff':'var(--txt3)')+';font-size:11px;opacity:'+(canSelect?'1':'0.4')+'">'+(checked?'✓':'○')+'</button>'+
              '<div style="flex:1;min-width:0">'+
                '<div style="font-family:Cinzel,serif;font-size:9px;color:'+(canSelect?'var(--wht)':'var(--txt3)')+'">'+capNom+' <span style="color:var(--gold3)">[R'+rang+' · '+cost+'pt'+(cost>1?'s':'')+']</span>'+((!levelOk)?' <span style="color:var(--red3);font-size:8px">(niv.'+rang+' requis)</span>':'')+'</div>'+
                (capDesc?'<div style="font-size:10px;color:var(--txt2);margin-top:2px;line-height:1.3">'+capDesc+'</div>':'')+
              '</div>'+
            '</div>';
          }).join('')}
        </div>`;
      }).join('')}
      ${appMode==='mj'?`<div style="margin-top:12px">
        <div style="font-family:Cinzel,serif;font-size:9px;color:var(--txt2);margin-bottom:6px">VOIE BONUS MJ (voie de prestige ou personnalisée — max 6 voies)</div>
        ${charWizard.data.extraVoie!==undefined?`
          <input value="${charWizard.data.extraVoie||''}" placeholder="Nom de la voie de prestige..." oninput="charWizard.data.extraVoie=this.value" style="width:100%;background:var(--bg3);border:1px solid var(--gold);color:var(--wht);font-size:12px;padding:6px 8px;border-radius:2px;box-sizing:border-box">
          <button onclick="delete charWizard.data.extraVoie;showCharWizardStep(3)" class="btn btn-r" style="font-size:9px;margin-top:4px">Retirer</button>
        `:`<button onclick="charWizard.data.extraVoie='';showCharWizardStep(3)" class="btn" style="font-size:9px;background:rgba(200,147,64,.1);border-color:var(--gold);color:var(--gold)">+ Ajouter une voie bonus</button>`}
      </div>`:''}`;
  }
  else if(step===4){
    const defaultEquip=getClasseEquip(charWizard.data.classe);
    if(!charWizard.data.armes&&defaultEquip.length>0){
      // Pre-fill with default equipment
      charWizard.data.armes=defaultEquip.map(e=>{
        const dm=e.match(/\(([^,)]+)/)?.[1]||'1d6';
        return{nom:e.split('(')[0].trim(),dm,bonus:'+0',type:e.includes('distance')?'distance':'contact'};
      });
    }
    if(!charWizard.data.armes) charWizard.data.armes=[];
    title.textContent='Étape 4/4 — Équipement';
    body.innerHTML=`
      <p style="font-size:11px;color:var(--txt2);margin-bottom:8px">Équipement de départ proposé pour ${charWizard.data.classe||'ce profil'} :</p>
      <div id="wizard-armes-list">
        ${charWizard.data.armes.map((a,i)=>`
          <div style="display:flex;gap:6px;margin-bottom:6px;align-items:center">
            <input placeholder="Nom" value="${a.nom||''}" oninput="charWizard.data.armes[${i}].nom=this.value" style="flex:2;background:var(--bg3);border:1px solid var(--bdr);color:var(--wht);font-size:12px;padding:5px 7px;border-radius:2px">
            <input placeholder="DM" value="${a.dm||''}" oninput="charWizard.data.armes[${i}].dm=this.value" style="flex:1;background:var(--bg3);border:1px solid var(--bdr);color:var(--wht);font-size:12px;padding:5px 7px;border-radius:2px">
            <button class="btn btn-r" style="font-size:9px;padding:4px 6px" onclick="charWizard.data.armes.splice(${i},1);showCharWizardStep(4)">✕</button>
          </div>`).join('')}
      </div>
      <button class="btn btn-g" style="font-size:10px;margin-top:4px" onclick="charWizard.data.armes.push({nom:'',dm:'1d6',bonus:'+0',type:'contact'});showCharWizardStep(4)">+ Ajouter</button>
      <div style="margin-top:14px">
        <div style="font-family:Cinzel,serif;font-size:8px;color:var(--txt2);letter-spacing:.08em;margin-bottom:8px">STATS DE COMBAT</div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">
          ${[['DEF','def','10'],['Initiative','init','+0'],['Attaque contact','att','+0'],['Attaque distance','attDistance','+0'],['Attaque magique','attMagique','+0'],['Dégâts','degats','1d6'],['Vitesse','vitesse','9m']].map(([label,key,def])=>`
            <div>
              <label style="font-family:Cinzel,serif;font-size:8px;color:var(--txt2)">${label}</label>
              <input value="${charWizard.data[key]||def}" oninput="charWizard.data['${key}']=this.value" style="width:100%;background:var(--bg3);border:1px solid var(--bdr);color:var(--wht);font-size:12px;padding:5px 7px;border-radius:2px;box-sizing:border-box">
            </div>`).join('')}
        </div>
      </div>`;
  }
}

export function calcWizardPoints(){
  if(!charWizard.data.voieCaps) return 0;
  return Object.entries(charWizard.data.voieCaps).filter(([k,v])=>v).reduce((sum,[k])=>{
    const rang=parseInt(k.split('_r')[1])||0;
    return sum+(rang<=2?1:2);
  },0);
}

export function toggleWizardCap(key,vi,rang){
  if(!charWizard.data.voieCaps) charWizard.data.voieCaps={};
  const prevKey=`v${vi}_r${rang-1}`;
  // Check prerequisite
  if(!charWizard.data.voieCaps[key]){
    if(rang>1&&!charWizard.data.voieCaps[prevKey]){window.toast('Rang précédent requis','t-w');return;}
    const cost=rang<=2?1:2;
    const totalPts=(parseInt(charWizard.data.niveau)||1)*2;
    const spent=calcWizardPoints();
    if(spent+cost>totalPts){window.toast(`Plus de points disponibles (${totalPts-spent} restant(s))`, 't-w');return;}
  } else {
    // Check if higher ranks would be broken
    const nextKey=`v${vi}_r${rang+1}`;
    if(charWizard.data.voieCaps[nextKey]){window.toast('Désélectionne d\'abord les rangs supérieurs','t-w');return;}
  }
  charWizard.data.voieCaps[key]=!charWizard.data.voieCaps[key];
  showCharWizardStep(3);
}

export function selectWizardClass(name){
  charWizard.data.classe=name;
  charWizard.data.voieCaps={};
  showCharWizardStep(1);
}

export function updateWizardPVPM(){
  const cl=COF_CLASSES[charWizard.data.classe]||{};
  const niveau=parseInt(charWizard.data.niveau)||1;
  const attrs=charWizard.data.attrs||{};
  const rd=COF_RACE_DATA[charWizard.data.race]||{};
  ['FOR','DEX','CON','INT','SAG','CHA'].forEach(a=>{
    const el=document.getElementById('wizard-total-'+a);
    if(!el)return;
    const raceMod=(rd.mods&&rd.mods[a])||0;
    const base=parseInt(attrs[a])||0;
    const total=base+raceMod;
    if(total){
      const mod=cofMod(total);
      el.innerHTML=`Total: ${total} → mod. <span style="color:${mod>=0?'var(--grn3)':'var(--red3)'}">${mod>=0?'+':''}${mod}</span>`;
    } else {
      el.innerHTML='';
    }
  });
  const modCon=cofMod(parseInt(attrs.CON)||0);
  const dvMax={'D4':4,'D6':6,'D8':8,'D10':10,'D12':12}[cl.dv]||6;
  const pvEst=Math.max(1, dvMax*niveau + modCon*niveau);
  const pvEl=document.getElementById('wizard-pv');
  if(pvEl) pvEl.textContent=pvEst;
  charWizard.data._pvEst=pvEst;
  const pmEl=document.getElementById('wizard-pm');
  if(pmEl&&cl.pm){
    const f=cl.pmFormule||'';
    let attrMod=0;
    if(f.includes('INT')) attrMod=cofMod(parseInt(attrs.INT)||0);
    else if(f.includes('SAG')) attrMod=cofMod(parseInt(attrs.SAG)||0);
    else if(f.includes('CHA')) attrMod=cofMod(parseInt(attrs.CHA)||0);
    let pm=f.includes('×2')?niveau*2+attrMod:niveau+attrMod;
    pm=Math.max(0,pm);
    pmEl.textContent=pm;
    charWizard.data._pmEst=pm;
  }
}

export function wizardNext(){
  const step=charWizard.step;
  if(step===1){
    if(!charWizard.data.classe){window.toast('Choisissez une classe','t-w');return;}
    showCharWizardStep(2);
  } else if(step===2){
    if(!charWizard.data.name?.trim()){window.toast('Entrez un nom','t-w');return;}
    if(!charWizard.data.race){window.toast('Choisissez une race','t-w');return;}
    showCharWizardStep(3);
  } else if(step===3){
    const niveau=parseInt(charWizard.data.niveau)||1;
    const totalPts=niveau*2;
    const spent=calcWizardPoints();
    const remaining=totalPts-spent;
    if(remaining>0){
      // Avertissement mais on laisse passer
      if(!confirm(`Il te reste ${remaining} point(s) de capacité non distribué(s). Continuer quand même ?`)) return;
    }
    showCharWizardStep(4);
  } else if(step===4){
    finalizeCharCreation();
  }
}
export function wizardPrev(){
  if(charWizard.step>1) showCharWizardStep(charWizard.step-1);
}

export function finalizeCharCreation(){
  const d=charWizard.data;
  const cl=COF_CLASSES[d.classe]||{};
  const rd=COF_RACE_DATA[d.race]||{};
  const isMJ=appMode==='mj';
  const ids=state.chars.map(c=>c.id).filter(Number.isFinite);
  const newId=ids.length>0?Math.max(...ids)+1:1;

  // Apply racial modifiers to attrs
  const attrs={FOR:0,DEX:0,CON:0,INT:0,SAG:0,CHA:0,...d.attrs};
  Object.entries(rd.mods||{}).forEach(([a,v])=>{attrs[a]=(parseInt(attrs[a])||0)+v;});
  if(rd.choix&&d.bonusAttr&&attrs[d.bonusAttr]!==undefined) attrs[d.bonusAttr]=(parseInt(attrs[d.bonusAttr])||0)+rd.choix;

  // Build voies from wizard selections
  const voiesTemplate=getClasseVoies(d.classe);
  const voies=voiesTemplate.map((v,vi)=>{
    const caps=v.caps.map((cap,ri)=>{
      const rang=ri+1;
      const key='v'+vi+'_r'+rang;
      return {...cap, ok:!!(d.voieCaps&&d.voieCaps[key])};
    });
    return{nom:v.nom,caps};
  });
  // Extra voie MJ
  if(d.extraVoie&&voies.length<6){
    voies.push({nom:d.extraVoie,caps:[1,2,3,4,5].map(r=>({r:`R${r}`,nom:`${d.extraVoie} R${r}`,desc:'',ok:false}))});
  }
  // Racial capacity
  const raciales=rd.capacite?[{nom:rd.capacite,desc:rd.descCap||''}]:[];

  // Compute modifiers from final attribute scores
  const modFor=cofMod(attrs.FOR);
  const modDex=cofMod(attrs.DEX);
  const modCon=cofMod(attrs.CON);
  const modInt=cofMod(attrs.INT);
  const modSag=cofMod(attrs.SAG);
  const modCha=cofMod(attrs.CHA);
  const niveau=parseInt(d.niveau)||1;
  const dvMax={'D4':4,'D6':6,'D8':8,'D10':10,'D12':12}[cl.dv]||6;

  // PV = DV max × niveau + mod CON × niveau
  const pvMax=Math.max(1, dvMax*niveau + modCon*niveau);

  // PM selon formule classe
  let pmMax=0;
  if(cl.pm){
    const f=cl.pmFormule||'';
    if(f.includes('×2')&&f.includes('INT')) pmMax=niveau*2+modInt;
    else if(f.includes('×2')&&f.includes('CHA')) pmMax=niveau*2+modCha;
    else if(f.includes('×2')) pmMax=niveau*2;
    else if(f.includes('INT')) pmMax=niveau+modInt;
    else if(f.includes('SAG')) pmMax=niveau+modSag;
    else if(f.includes('CHA')) pmMax=niveau+modCha;
    pmMax=Math.max(0,pmMax);
  }

  // Stats de combat calculées si pas overridées manuellement
  const initVal=d.init&&d.init!=='+0'?d.init:modStr(modDex);
  const attVal=d.att&&d.att!=='+0'?d.att:modStr(modFor);
  const attDistVal=d.attDistance&&d.attDistance!=='+0'?d.attDistance:modStr(modDex);
  const attMagVal=d.attMagique&&d.attMagique!=='+0'?d.attMagique:modStr(Math.max(modInt,modSag,modCha));
  const defVal=parseInt(d.def)||10;

  const nc={
    id:newId,
    name:d.name?.trim()||'Nouveau PJ',
    classe:d.classe,race:d.race,niveau,
    dv:cl.dv||'D6',
    pvMax,pvActuel:pvMax,
    pmMax,pmActuel:pmMax,
    pcMax:0,pcActuel:0,
    def:defVal,
    init:initVal,
    att:attVal,
    attDistance:attDistVal,
    attMagique:attMagVal,
    degats:d.degats||'1d6',
    vitesse:d.vitesse||'9m',
    attrs,etat:'Normal',present:true,
    armes:d.armes||[],raciales,voies,resume:[],
    createdBy:isMJ?'mj':selectedPlayerChar,
    pending:!isMJ,
    hidden:!isMJ,
  };

  state.chars.push(nc);
  if(!isMJ){
    pendingChars[newId]={...JSON.parse(JSON.stringify(nc)),submittedAt:Date.now()};
    fbSavePendingChars();
  }
  save();window.render();window.renderRoster();
  window.checkPendingLvlUps();window.checkPendingChars();
  closeCharWizard();
  window.toast(`${nc.name} créé ✓`+(isMJ?'':' — en attente de validation MJ'),'t-i');
}
