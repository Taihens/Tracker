// ═══════════════════════════════════════════════════════════════
//  FIREBASE — init, synchro temps réel, persistance (save)
//  (Lot 02c : imports STATIQUES via package npm — plus de CDN dynamique)
// ═══════════════════════════════════════════════════════════════
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, get, remove, push, update } from 'firebase/database';
import { state, setState } from './state.js';
import { pendingLvlUps, fbSavePendingLvlUp } from './levelup.js';

// Ré-exports : les autres modules importent ces helpers depuis firebase.js
// (évite tout import direct du SDK ailleurs → une seule instance Firebase).
export { ref, set, get, remove, onValue, push, update };

const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
export let firebaseDB=null,firebaseApp=null;
export let _fbConnected=false;
let _fbSyncTimer=null,_fbIgnoreNext=false;

// Les helpers fb* co-localisés dans les modules métier ne peuvent pas réassigner
// le binding importé _fbIgnoreNext → passer par ce setter avant un write Firebase.
export function fbIgnoreNextSync(){ _fbIgnoreNext=true; }

export async function initFirebase(){
  // Garde : sans config (ex. dev local sans .env.local), getDatabase() lèverait
  // une erreur FATALE du SDK. On bascule proprement en hors ligne (R3).
  if(!FIREBASE_CONFIG.databaseURL||!FIREBASE_CONFIG.apiKey){
    console.warn('Firebase: configuration absente (VITE_FIREBASE_* non définies) → mode hors ligne (localStorage)');
    const el=document.getElementById('firebase-status');
    if(el)el.textContent='Hors ligne (localStorage)';
    return;
  }
  try{
    firebaseApp=initializeApp(FIREBASE_CONFIG);
    firebaseDB=getDatabase(firebaseApp);
    onValue(ref(firebaseDB,'state'),(snap)=>{
      if(_fbIgnoreNext){_fbIgnoreNext=false;return;}
      if(!snap.exists())return;
      const remote=snap.val();
      if(!remote||!remote._ts)return;
      const localTs=state._ts||0;
      if(remote._ts>localTs+2000){
        setState(snap.val());
        localStorage.setItem('anathazer_v4',JSON.stringify(state));
        window.render();window.renderEtats();
      }
    });
    _fbConnected=true;
    const el=document.getElementById('firebase-status');
    if(el)el.textContent='🔥 Firebase connecté ✓';
    // Clean orphan pending lvlup
    setTimeout(()=>{
      Object.keys(pendingLvlUps).forEach(charId=>{
        if(!state.chars.find(c=>c.id===parseInt(charId))){
          delete pendingLvlUps[charId];fbSavePendingLvlUp();
        }
      });
    },2000);
  }catch(e){
    console.warn('Firebase:',e.message);
    const el=document.getElementById('firebase-status');
    if(el)el.textContent='Hors ligne (localStorage)';
  }
}
export async function syncToFirebase(){
  if(!firebaseDB||!_fbConnected)return;
  clearTimeout(_fbSyncTimer);
  _fbSyncTimer=setTimeout(async()=>{
    try{
      state._ts=Date.now();
      localStorage.setItem('anathazer_v4',JSON.stringify(state)); // Synchro localStorage avec le _ts Firebase
      _fbIgnoreNext=true;
      await set(ref(firebaseDB,'state'),JSON.parse(JSON.stringify(state)));
    }catch(e){console.warn('Firebase sync:',e.message);}
  },800);
}
export function save(){
  state._ts=Date.now();
  localStorage.setItem('anathazer_v4',JSON.stringify(state));
  syncToFirebase();
}
