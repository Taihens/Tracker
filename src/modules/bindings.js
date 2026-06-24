// ═══════════════════════════════════════════════════════════════
//  BINDINGS — expose les fonctions sur window pour les handlers inline
//  Les handlers onclick/onchange (index.html + template strings) résolvent
//  les noms en portée GLOBALE, pas module → chaque fonction référencée doit
//  être bindée sur window, sinon le bouton est mort silencieusement.
//  Stratégie : binder toute fonction exportée (les data-globals sont ignorées).
//  Data-globals réassignées au runtime (appMode, charWizard, editData) →
//  live getters : un binding statique deviendrait obsolète après réassignation.
// ═══════════════════════════════════════════════════════════════
import * as stateNs from './state.js';
import * as storageNs from './storage.js';
import * as firebaseNs from './firebase.js';
import * as diceNs from './dice.js';
import * as combatNs from './combat.js';
import * as messagesNs from './messages.js';
import * as recapNs from './recap.js';
import * as rosterNs from './roster.js';
import * as cofNs from './cof-classes.js';
import * as fichesRenderNs from './fiches/render.js';
import * as fichesWizardNs from './fiches/wizard.js';
import * as fichesEditNs from './fiches/edit.js';
import * as levelupWizardNs from './levelup/wizard.js';
import * as levelupPendingNs from './levelup/pending.js';
import * as geminiNs from './assistant/gemini.js';
import * as cofImportNs from './assistant/cof-import.js';
import * as uiRenderNs from './ui/render.js';
import * as toastNs from './ui/toast.js';
import * as tabsNs from './ui/tabs.js';
import * as modalsNs from './ui/modals.js';
import * as etatsNs from './ui/etats.js';
import * as settingsNs from './ui/settings.js';
import * as modeNs from './ui/mode.js';
import * as groupesNs from './ui/groupes.js';
import * as jsonIoNs from './import/json-io.js';
import * as monsterNs from './import/monster.js';
import * as charPdfNs from './import/character-pdf.js';

const NAMESPACES = [
  stateNs, storageNs, firebaseNs, diceNs, combatNs, messagesNs, recapNs,
  rosterNs, cofNs, fichesRenderNs, fichesWizardNs, fichesEditNs,
  levelupWizardNs, levelupPendingNs, geminiNs, cofImportNs,
  uiRenderNs, toastNs, tabsNs, modalsNs, etatsNs, settingsNs, modeNs,
  groupesNs, jsonIoNs, monsterNs, charPdfNs,
];

export function bindGlobals(){
  for(const ns of NAMESPACES){
    for(const [name, val] of Object.entries(ns)){
      if(typeof val === 'function') window[name] = val;
    }
  }
  // Data-globals réassignées au runtime → getters live (binding statique = obsolète)
  Object.defineProperty(window, 'appMode',    { get: () => stateNs.appMode,            configurable: true });
  Object.defineProperty(window, 'editData',   { get: () => stateNs.editData,           configurable: true });
  Object.defineProperty(window, 'charWizard', { get: () => fichesWizardNs.charWizard,  configurable: true });
}
