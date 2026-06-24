// ═══════════════════════════════════════════════════════════════
//  GEMINI ASSISTANT
// ═══════════════════════════════════════════════════════════════
import { state, appMode, selectedPlayerChar } from '../state.js';
import { parseMod } from '../cof-classes.js';
import { save } from '../firebase.js';
import { getCOFRulesText } from './cof-import.js';
import { loadRAGIndexes, queryRAG } from './rag.js';

export const GEMINI_URL='https://taihen.keifer-gianfr.workers.dev';
let _sendAiAbortCtrl = null;
export function getGeminiKey(){ return sessionStorage.getItem('anathazer_gemini_key')||''; }
export function setGeminiKey(k){ sessionStorage.setItem('anathazer_gemini_key',k.trim()); }
export let aiConversations={}, aiActiveChar=null, aiCtx={fiches:true,combat:true,etats:false};
export const COF_RULES=`Tu es un assistant expert en Chroniques Oubliées Fantasy (COF). Tu aides les joueurs et le MJ pendant leurs sessions de jeu. Réponds toujours en français, de manière concise et précise.

=== RÈGLES OFFICIELLES COF (NE PAS INVENTER, NE PAS MÉLANGER AVEC D&D/PATHFINDER) ===

TESTS : 1d20 + modificateur ≥ Difficulté. Critique : 20 naturel (DM×2). Fumble : 1 naturel (échec automatique). Pas de "saving throw" séparé — tout est un test normal.

COMBAT :
- Initiative : DEX + bonus, fixe pour tout le combat, ordre décroissant.
- Actions par tour : 1 action limitée (L) OU 1 attaque + 1 déplacement.
- Attaque : 1d20 + Att (contact/distance/magique) vs DEF de la cible.
- DEF = 10 + armure + bouclier + mod DEX + divers.
- Armures lourdes : imposent des malus à la DEX et aux tests physiques selon le type.

PV ET MORT :
- 0 PV → Inconscient. Mort si aucun soin dans [1 + mod CON] tours.
- Mort définitive si PV atteignent valeur négative = score CON.

RÉCUPÉRATION :
- Point de récupération : lancer le DV + mod CON + niveau du personnage. (Ex : Amidamaru Niv.8, D8, CON+3 → 1d8+3+8)
- Repos complet (8h) : tous PV, PM et PC restaurés au maximum.

LEVEL UP — CE QUI AUGMENTE :
- +PV : DV MAXIMUM (pas lancé) + mod CON. (Ex : D8 → +8+CON)
- +1 en Attaque contact, Distance ET Magique (séparément).
- +PM : selon la classe (voir ci-dessous).
- +2 points de rang à distribuer dans les voies.
- Initiative : N'AUGMENTE PAS automatiquement.
- Attributs (FOR/DEX/CON/INT/SAG/CHA) : N'AUGMENTENT JAMAIS automatiquement au level up. Uniquement via des capacités spécifiques débloquées dans les voies (ex: Force héroïque, Dextérité héroïque).

PC = POINTS DE CHANCE :
- PC est une ressource limitée pour des effets spéciaux (relancer des dés, éviter un coup fatal, etc.).
- PC ≠ Points de Caractéristique. Il N'EXISTE PAS de "gain de points de caractéristique" au level up dans COF.
- Les personnages ne gagnent JAMAIS de PC supplémentaires au level up automatiquement.

POINTS DE MAGIE (PM) PAR NIVEAU :
- Magicien, Ensorceleur, Nécromancien : PM = 2 × niveau + mod INT.
- Barde, Forgesort : PM = niveau + mod CHA.
- Druide, Prêtre, Animiste : PM = niveau + mod SAG.
- Gain par niveau : +2+mod INT (Magicien/Ensorc/Nécro) ou +1+mod SAG/CHA (autres).
- Coût des sorts : rang 3 = 1 PM, rang 4 = 2 PM, rang 5 = 3 PM.
- Récupération PM : repos complet 8h (sauf capacités spéciales).

VOIES ET POINTS DE RANG :
- 2 points de rang gagnés par niveau.
- R1-R2 = 1 point chacun. R3-R4-R5 = 2 points chacun.
- Voies de prestige : TOUS les rangs coûtent 2 points (R1 à R5 compris).
- Ordre obligatoire : impossible de prendre R3 sans avoir R1 et R2.
- Niveau requis : le rang R doit correspondre à un niveau suffisant.

ÉTATS PRINCIPAUX :
- Affaibli : utilise d12 au lieu du d20 pour tous les tests.
- Étourdi : aucune action ce tour, DEF −5.
- Aveugle : Init −5, Att contact −5, DEF −5, Att distance −10.
- Immobilisé : d12 à tous les tests, aucun déplacement.
- Paralysé : toutes les attaques contre lui touchent automatiquement et sont des critiques.
- Surpris : ne peut pas agir au premier round, DEF −5.

CE QUE COF N'A PAS (NE JAMAIS INVENTER) :
- Pas de gain automatique d'attributs au level up.
- Pas de multiclasse au sens D&D.
- Pas de points d'expérience — la progression est décidée par le MJ session par session.
- Pas de "classe d'armure" dynamique comme D&D — la DEF est fixe avec modificateurs.
- Pas de slots de sorts — les PM sont la seule ressource magique.
- Pas de "Points de Caractéristique" gagnés au level up.`;
export function buildAiContext(){
  let ctx='';
  if(aiCtx.fiches){
    ctx+='\n--- PERSONNAGES (valeurs calculées) ---\n';
    const chars=appMode==='joueur'&&selectedPlayerChar
      ? state.chars.filter(c=>c.id===selectedPlayerChar)
      : state.chars;
    if(appMode==='joueur'&&selectedPlayerChar){
      const me=state.chars.find(c=>c.id===selectedPlayerChar);
      if(me) ctx+=`[Le joueur qui te parle joue ${me.name}]\n`;
    }
    chars.forEach(c=>{
      const attrs=c.attrs||{};
      const intMod=parseMod(attrs.INT||0),sagMod=parseMod(attrs.SAG||0),chaMod=parseMod(attrs.CHA||0),forMod=parseMod(attrs.FOR||0),dexMod=parseMod(attrs.DEX||0),conMod=parseMod(attrs.CON||0);
      ctx+=`\n${c.name} (${c.classe} ${c.race} Niv.${c.niveau}):\n`;
      ctx+=`  PV ${c.pvActuel}/${c.pvMax} | DEF ${c.def} | Init ${c.init} | État ${c.etat}\n`;
      ctx+=`  Att.Contact ${c.attContact||c.att} | Att.Distance ${c.attDistance||c.att} | Att.Magique ${c.attMagique||c.att}\n`;
      if(c.pmMax>0) ctx+=`  PM ${c.pmActuel}/${c.pmMax}\n`;
      if(c.pcMax>0) ctx+=`  PC ${c.pcActuel}/${c.pcMax}\n`;
      ctx+=`  FOR ${attrs.FOR}(${forMod>=0?'+':''}${forMod}) DEX ${attrs.DEX}(${dexMod>=0?'+':''}${dexMod}) CON ${attrs.CON}(${conMod>=0?'+':''}${conMod}) INT ${attrs.INT}(${intMod>=0?'+':''}${intMod}) SAG ${attrs.SAG}(${sagMod>=0?'+':''}${sagMod}) CHA ${attrs.CHA}(${chaMod>=0?'+':''}${chaMod})\n`;
      ctx+=`  Armes: ${(c.armes||[]).map(a=>`${a.nom}(${a.att}, ${a.dmg})`).join(', ')||'—'}\n`;
      if(c.voies?.length){
        ctx+=`  Voies et capacités (✓=acquis, ○=disponible) :\n`;
        c.voies.forEach(v=>{
          ctx+=`    ${v.nom}:\n`;
          v.caps.forEach(cap=>{
            const status=cap.ok?'✓':'○';
            let desc=cap.desc
              .replace(/Mod[. ]+d?'?INT/gi,`${intMod>=0?'+':''}${intMod}`)
              .replace(/Mod[. ]+d?'?SAG/gi,`${sagMod>=0?'+':''}${sagMod}`)
              .replace(/Mod[. ]+d?'?CHA/gi,`${chaMod>=0?'+':''}${chaMod}`)
              .replace(/Mod[. ]+d?'?FOR/gi,`${forMod>=0?'+':''}${forMod}`)
              .replace(/Mod[. ]+d?'?DEX/gi,`${dexMod>=0?'+':''}${dexMod}`)
              .replace(/Mod[. ]+d?'?CON/gi,`${conMod>=0?'+':''}${conMod}`);
            ctx+=`      ${cap.r} [${status}] ${cap.nom}: ${desc}\n`;
          });
        });
      }
    });
  }
  if(aiCtx.combat){
    ctx+=`\n--- COMBAT ---\n${document.getElementById('g-cname')?.value||'Combat en cours'} | S${state.session} C${state.combat} R${state.round}\n`;
    const combatLogs=state.log.filter(l=>l.session===state.session&&l.cbt===state.combat).slice(-10);
    if(combatLogs.length){
      ctx+='\n--- 10 DERNIERS ÉVÉNEMENTS DE COMBAT ---\n';
      combatLogs.forEach(l=>{
        const sign=l.ev==='Dégâts'?'-':'+';
        const src=l.source?` (${l.source})`:'';
        ctx+=`Round ${l.rnd}: ${l.charName} — ${l.ev} ${sign}${l.val}${src} | PV: ${l.pv}\n`;
      });
    }
  }
  if(aiCtx.etats){const actifs=state.chars.filter(c=>c.etat!=='Normal');if(actifs.length){ctx+='\n--- ÉTATS ACTIFS ---\n';actifs.forEach(c=>ctx+=`${c.name}: ${c.etat}\n`);}}
  return ctx;
}

// ── RÉSUMÉ MJ IA ──
export async function generateFicheResume(charId){
  const c=state.chars.find(x=>x.id===charId);if(!c)return;
  const btn=document.getElementById(`resume-ai-btn-${charId}`);
  if(btn){btn.disabled=true;btn.textContent='⏳ Génération...';}
  const attrs=c.attrs||{};
  const intMod=parseMod(attrs.INT||0),sagMod=parseMod(attrs.SAG||0),chaMod=parseMod(attrs.CHA||0),forMod=parseMod(attrs.FOR||0),dexMod=parseMod(attrs.DEX||0),conMod=parseMod(attrs.CON||0);
  const capsText=c.voies?.flatMap(v=>v.caps.filter(cap=>cap.ok).map(cap=>{
    // Replace placeholders with real values in full description
    let desc=(cap.descFull||cap.desc)
      .replace(/\[?(?:\d+\+\s*)?[Mm]od\.?\s*d['']?INT\]?/g,`[X+${intMod>=0?'+':''}${intMod}(INT)]`)
      .replace(/\[?(?:\d+\+\s*)?[Mm]od\.?\s*d['']?SAG\]?/g,`[X+${sagMod>=0?'+':''}${sagMod}(SAG)]`)
      .replace(/\[?(?:\d+\+\s*)?[Mm]od\.?\s*d['']?CHA\]?/g,`[X+${chaMod>=0?'+':''}${chaMod}(CHA)]`)
      .replace(/\[?(?:\d+\+\s*)?[Mm]od\.?\s*d['']?FOR\]?/g,`[X+${forMod>=0?'+':''}${forMod}(FOR)]`)
      .replace(/\[?(?:\d+\+\s*)?[Mm]od\.?\s*d['']?DEX\]?/g,`[X+${dexMod>=0?'+':''}${dexMod}(DEX)]`)
      .replace(/\[?(?:\d+\+\s*)?[Mm]od\.?\s*d['']?CON\]?/g,`[X+${conMod>=0?'+':''}${conMod}(CON)]`);
    return`${v.nom} ${cap.r} — ${cap.nom}: ${desc}`;
  })).join('\n')||'Aucune capacité débloquée';

  const sysPrompt=`Tu es un assistant MJ expert en Chroniques Oubliées Fantasy.
FORMAT STRICT : UNIQUEMENT des bullet points, un par ligne, commençant par "- ". Zéro introduction, zéro conclusion, zéro titre. Chaque bullet = 1 fait court et percutant avec les valeurs numériques réelles entre parenthèses. Style : factuel, dense, utile. Exemple de bon bullet : "- Initiative +22 — agit presque toujours en premier." Exemple de bon bullet avec capacité : "- Boule de feu (L) : [4d6+5] DM, rayon 6m, touche les alliés — coupler avec Sort sélectif (1 PM)."`;

  const prompt=`Résumé MJ pour ${c.name} (${c.classe} ${c.race} Niv.${c.niveau}). Génère 7 à 9 bullet points couvrant : stats clés remarquables, capacités importantes avec valeurs réelles, points forts, points faibles, ressources à gérer.

STATS :
PV ${c.pvMax} | DEF ${c.def} | Init ${c.init} | DV ${c.dv}${c.pmMax>0?` | PM ${c.pmMax}`:''}${c.pcMax>0?` | PC ${c.pcMax}`:''}
Att.C ${c.attContact||c.att} | Att.D ${c.attDistance||c.att} | Att.M ${c.attMagique||c.att}
FOR(${forMod>=0?'+':''}${forMod}) DEX(${dexMod>=0?'+':''}${dexMod}) CON(${conMod>=0?'+':''}${conMod}) INT(${intMod>=0?'+':''}${intMod}) SAG(${sagMod>=0?'+':''}${sagMod}) CHA(${chaMod>=0?'+':''}${chaMod})
Armes : ${(c.armes||[]).map(a=>`${a.nom} ${a.att} ${a.dmg}${a.spec&&a.spec!=='—'?' '+a.spec:''}`).join(' | ')||'—'}

CAPACITÉS DÉBLOQUÉES :
${capsText}

Règle de ton : concis comme une note de combat, pas comme un tutoriel. Donne les faits utiles, pas des instructions d'utilisation. Valeurs numériques CALCULÉES obligatoires (pas "[Mod INT]", mais "+5").`;

  try{
    const res=await fetch(GEMINI_URL,{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        model:'gemini-2.5-flash',
        system_instruction:{parts:[{text:sysPrompt}]},
        contents:[{role:'user',parts:[{text:prompt}]}],
        generationConfig:{maxOutputTokens:2048,temperature:0.5,thinkingConfig:{thinkingBudget:0}}
      })
    });
    const data=await res.json();
    if(data.error)throw new Error(data.error.message);
    const raw=data?.candidates?.[0]?.content?.parts?.[0]?.text||'';
    // Parse into clean bullet point array
    const lines=raw.split('\n')
      .map(l=>l.trim())
      .filter(l=>l.startsWith('-')||l.startsWith('*')||l.startsWith('•'))
      .map(l=>l.replace(/^[-*•]\s*/,'').replace(/\*\*(.*?)\*\*/g,'$1').replace(/\*(.*?)\*/g,'$1').trim())
      .filter(l=>l.length>10) // skip very short/empty lines
      .filter(l=>!l.endsWith(':')) // skip lines ending with colon (headers)
      .map(l=>{
        // Fix unclosed parentheses: count ( and ) - if unbalanced, close or remove trailing (
        const opens=(l.match(/\(/g)||[]).length;
        const closes=(l.match(/\)/g)||[]).length;
        if(opens>closes){
          // Remove the trailing orphan ( and anything after it if it's the last char or near end
          l=l.replace(/\s*\([^)]*$/, '').trim();
          // If still unclosed, add closing paren
          const o2=(l.match(/\(/g)||[]).length;
          const c2=(l.match(/\)/g)||[]).length;
          if(o2>c2) l+=')';
        }
        return l;
      })
      .filter(l=>l.length>5); // filter again after cleanup
    // Store for use
    window._resumeAiLines={[charId]:lines};
    const preview=lines.map(l=>`<div style="padding:3px 0;border-bottom:1px solid rgba(58,46,28,.15);font-size:12px;color:var(--txt);line-height:1.6">• ${l.replace(/</g,'&lt;')}</div>`).join('');
    const box=document.getElementById(`resume-ai-box-${charId}`);
    if(box){
      box.innerHTML=`<div style="background:rgba(200,147,64,.07);border:1px solid rgba(200,147,64,.25);border-radius:3px;padding:12px;margin-top:10px">
        <div style="font-family:'Cinzel',serif;font-size:8.5px;color:var(--gold);text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px">✨ Résumé généré par IA (${lines.length} points)</div>
        ${preview||'<div style="color:var(--txt2);font-style:italic;font-size:11px">Aucun bullet point trouvé — réessaie.</div>'}
        <div style="margin-top:10px;display:flex;gap:8px">
          <button class="btn btn-g" style="font-size:8px" onclick="useFicheResume(${charId})">✓ Utiliser ce résumé</button>
          <button class="btn btn-g" style="font-size:8px;background:rgba(26,45,74,.3);border-color:var(--blu)" onclick="generateFicheResume(${charId})">↺ Regénérer</button>
          <button class="btn btn-r" style="font-size:8px" onclick="document.getElementById('resume-ai-box-${charId}').innerHTML=''">✕ Ignorer</button>
        </div>
      </div>`;
    }
  }catch(err){
    const box=document.getElementById(`resume-ai-box-${charId}`);
    if(box) box.innerHTML=`<div style="color:var(--red3);font-size:11px;margin-top:6px">Erreur Gemini: ${err.message}</div>`;
  }
  if(btn){btn.disabled=false;btn.textContent='✨ Générer résumé IA';}
}
export function useFicheResume(charId){
  const c=state.chars.find(x=>x.id===charId);if(!c)return;
  const lines=window._resumeAiLines?.[charId];
  if(!lines||lines.length===0){window.toast('Aucun résumé à utiliser','t-w');return;}
  c.resume=lines; // array of strings, same format as manual résumés
  delete window._resumeAiLines[charId];
  save();window.renderFiche();window.toast('Résumé MJ mis à jour ✓','t-i');
}
export function initAssistantTab(){
  const el=document.getElementById('ai-ctx-btns');if(!el)return;
  loadRAGIndexes();
  el.innerHTML=[{k:'fiches',l:'Fiches PJs'},{k:'combat',l:'Combat actuel'},{k:'etats',l:'États'}].map(b=>`<button class="ai-ctx-btn${aiCtx[b.k]?' on':''}" onclick="toggleAiCtx('${b.k}',this)">${b.l}</button>`).join('');
  const charSel=document.getElementById('ai-char-sel');
  if(charSel){
    if(appMode==='mj'){
      charSel.innerHTML=`<option value="mj_private">🔒 MJ (privé)</option>${state.chars.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}`;
    } else {
      const chars=state.chars.filter(c=>c.id===selectedPlayerChar);
      charSel.innerHTML=chars.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
    }
    charSel.onchange=()=>{
      const val=charSel.value;
      aiActiveChar=val==='global'?null:val==='mj_private'?'mj_private':parseInt(val);
      renderAIChat();
    };
  }
  renderAIChat();
}
export function getAiMessages(){return aiConversations[aiActiveChar||'global']||[];}
export function setAiMessages(msgs){aiConversations[aiActiveChar||'global']=msgs;}
export function renderAIChat(){
  const chat=document.getElementById('ai-chat');if(!chat)return;
  const msgs=getAiMessages();
  if(msgs.length===0){chat.innerHTML='<div class="ai-empty">Pose une question sur les règles COF, les capacités de tes personnages, ou la situation de combat en cours.</div>';return;}
  chat.innerHTML=msgs.map(m=>`<div class="ai-msg ${m.role==='user'?'user':'assistant'}">${m.text.replace(/</g,'&lt;').replace(/\n/g,'<br>').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\*(.*?)\*/g,'<em>$1</em>')}</div>`).join('');
  chat.scrollTop=chat.scrollHeight;
}
export function toggleAiCtx(k,btn){aiCtx[k]=!aiCtx[k];btn.classList.toggle('on',aiCtx[k]);}
export async function sendAI(){
  const input=document.getElementById('ai-input');const msg=input.value.trim();if(!msg)return;
  input.value='';
  const msgs=getAiMessages();
  msgs.push({role:'user',text:msg});
  setAiMessages(msgs);
  const chat=document.getElementById('ai-chat');
  const empty=chat.querySelector('.ai-empty');if(empty)empty.remove();
  chat.innerHTML+=`<div class="ai-msg user">${msg.replace(/</g,'&lt;').replace(/\n/g,'<br>')}</div>`;
  chat.innerHTML+=`<div class="ai-msg thinking" id="ai-thinking">✦ Consultation des règles...</div>`;
  chat.scrollTop=chat.scrollHeight;
  document.getElementById('ai-send-btn').disabled=true;
  if (_sendAiAbortCtrl) _sendAiAbortCtrl.abort();
  _sendAiAbortCtrl = new AbortController();
  const ctx=buildAiContext();
  // Load COF rules — Firebase first, fallback to hardcoded
  const cofRules=await getCOFRulesText();
  const rulesSection=cofRules
    ?`=== RÈGLES OFFICIELLES COF — SOURCE: co-drs.org (PRIORITÉ ABSOLUE) ===\n${cofRules.slice(0,20000)}\n=== FIN RÈGLES ===\n\n`
    :COF_RULES+'\n\n';
  // Include player's own sheet if in joueur mode
  let playerSheet='';
  if(appMode==='joueur'&&selectedPlayerChar){
    const pc=state.chars.find(c=>c.id===selectedPlayerChar);
    if(pc) playerSheet=`\n=== FICHE DU JOUEUR (contexte prioritaire pour ses questions) ===\n${JSON.stringify(pc,null,1)}\n`;
  }
  let systemText=rulesSection+playerSheet+(ctx?'\n'+ctx:'');
  const ragCtx=await queryRAG(msg);if(ragCtx)systemText=ragCtx+systemText;
  const visibleMsgs=msgs.filter(m=>m.role==='user'||m.role==='model').slice(-20);
  const contents=[
    ...visibleMsgs.slice(0,-1).map(m=>({role:m.role,parts:[{text:m.text}]})),
    {role:'user',parts:[{text:msg}]},
  ];
  try{
    const res=await fetch(GEMINI_URL,{
      method:'POST',headers:{'Content-Type':'application/json'},
      signal:_sendAiAbortCtrl?.signal,
      body:JSON.stringify({
        model:'gemini-2.5-flash',
        system_instruction:{parts:[{text:systemText}]},
        contents,
        generationConfig:{maxOutputTokens:8192,temperature:0.7,thinkingConfig:{thinkingBudget:0}}
      })
    });
    const data=await res.json();
    if(data.error)throw new Error(data.error.message);
    const reply=data?.candidates?.[0]?.content?.parts?.[0]?.text||'Aucune réponse reçue.';
    msgs.push({role:'model',text:reply});
    setAiMessages(msgs);
    document.getElementById('ai-thinking')?.remove();
    chat.innerHTML+=`<div class="ai-msg assistant">${reply.replace(/</g,'&lt;').replace(/\n/g,'<br>').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\*(.*?)\*/g,'<em>$1</em>')}</div>`;
  }catch(err){
    if(err.name==='AbortError'){document.getElementById('ai-thinking')?.remove();document.getElementById('ai-send-btn').disabled=false;return;} // requête annulée, pas d'erreur UI
    document.getElementById('ai-thinking')?.remove();
    chat.innerHTML+=`<div class="ai-msg assistant" style="color:var(--red3)">Erreur Gemini : ${err.message}<br><button onclick="sendAI()" class="btn btn-g" style="font-size:9px;margin-top:6px">↺ Réessayer</button></div>`;
  }
  document.getElementById('ai-send-btn').disabled=false;chat.scrollTop=chat.scrollHeight;
}
export async function generateNarrativeSummary(){
  const combatLogs=state.log.filter(l=>l.session===state.session&&l.cbt===state.combat);
  if(!combatLogs.length){window.toast('Aucun log de combat pour ce combat','t-w');return;}
  const overlay=document.createElement('div');
  overlay.id='narrative-overlay';
  overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
  overlay.innerHTML=`<div style="background:var(--bg2);border:1px solid var(--gold3);border-radius:6px;padding:24px;max-width:600px;width:100%;max-height:80vh;overflow-y:auto"><div style="font-family:'Cinzel',serif;color:var(--gold);font-size:13px;margin-bottom:16px">✨ Récit de combat IA</div><div id="narrative-content" style="color:var(--txt);font-size:12px;line-height:1.8">⏳ Génération en cours...</div><div style="margin-top:16px;display:flex;gap:8px"><button class="btn btn-g" style="font-size:9px" id="narrative-copy-btn">📋 Copier</button><button class="btn btn-r" style="font-size:9px" onclick="document.getElementById('narrative-overlay').remove()">✕ Fermer</button></div></div>`;
  document.body.appendChild(overlay);
  const chronicle=combatLogs.map(l=>{
    const sign=l.ev==='Dégâts'?'-':'+';
    const src=l.source?` (${l.source})`:'';
    const typ=l.type?` [${l.type}]`:'';
    return `Round ${l.rnd}: ${l.charName} — ${l.ev} ${sign}${l.val}${src}${typ} | PV: ${l.pv}`;
  }).join('\n');
  const prompt=`Voici la chronologie d'un combat (Chroniques Oubliées Fantasy) :\n\n${chronicle}\n\nRédige un récit épique, immersif et romancé de ce combat en français (2-3 paragraphes), mettant en valeur les actions clés. Style JDR héroïque-fantastique.`;
  try{
    const res=await fetch(GEMINI_URL,{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        model:'gemini-2.5-flash',
        system_instruction:{parts:[{text:'Tu es un conteur épique expert en récits de JDR heroic fantasy. Réponds uniquement en français.'}]},
        contents:[{role:'user',parts:[{text:prompt}]}],
        generationConfig:{maxOutputTokens:2048,temperature:0.8,thinkingConfig:{thinkingBudget:0}},
      })
    });
    const data=await res.json();
    if(data.error)throw new Error(data.error.message);
    const narrative=data?.candidates?.[0]?.content?.parts?.[0]?.text||'Aucun récit généré.';
    const el=document.getElementById('narrative-content');
    if(el)el.innerHTML=narrative.replace(/</g,'&lt;').replace(/\n/g,'<br>').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\*(.*?)\*/g,'<em>$1</em>');
    const copyBtn=document.getElementById('narrative-copy-btn');
    if(copyBtn)copyBtn.onclick=()=>{navigator.clipboard.writeText(narrative);window.toast('Récit copié ✓','t-i');};
  }catch(err){
    const el=document.getElementById('narrative-content');
    if(el)el.innerHTML=`<span style="color:var(--red3)">Erreur Gemini : ${err.message}</span>`;
  }
}
export function clearAIChat(){
  setAiMessages([]);
  document.getElementById('ai-chat').innerHTML='<div class="ai-empty">Conversation effacée.</div>';
}

export function saveGeminiKey(){
  const val=document.getElementById('gemini-key-input')?.value?.trim();
  if(!val){window.toast('Entrez une clé API','t-w');return;}
  setGeminiKey(val);
  document.getElementById('gemini-key-input').value='';
  renderGeminiKeyStatus();
  window.toast('Clé Gemini sauvegardée ✓','t-i');
}
export function clearGeminiKey(){
  if(!confirm('Effacer la clé Gemini ?'))return;
  sessionStorage.removeItem('anathazer_gemini_key');
  renderGeminiKeyStatus();
  window.toast('Clé Gemini effacée','t-i');
}
export function renderGeminiKeyStatus(){
  const el=document.getElementById('gemini-key-status');if(!el)return;
  const key=getGeminiKey();
  el.textContent=key?`Clé configurée : ${key.slice(0,8)}${'•'.repeat(12)} ✓`:'Aucune clé configurée — l\'assistant IA ne fonctionnera pas.';
  el.style.color=key?'var(--grn3)':'var(--red3)';
}
