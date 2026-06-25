// ═══ CONSTANTES GLOBALES ═══
export const THEMES = [
  {id:'parchment', name:'Parchemin', bg:'#0b0905', acc:'#c89340'},
  {id:'abyssal',   name:'Abyssal',   bg:'#070510', acc:'#9070d0'},
  {id:'sangsfer',  name:'Sang & Fer',bg:'#0a0504', acc:'#c04020'},
  {id:'foret',     name:'Forêt',     bg:'#040a06', acc:'#60a050'},
  {id:'codex',     name:'Codex',     bg:'#f5f0e8', acc:'#6a4e20'},
];

export const ETATS_DEFAULT = [
  {name:'Normal',effect:'—',sev:false,builtin:true},
  {name:'Affaibli',effect:'d12 à tous les tests au lieu du d20',sev:false,builtin:true},
  {name:'Aveugle',effect:'Init −5 | Att. contact −5 | DEF −5 | Att. dist. −10',sev:true,builtin:true},
  {name:'Étourdi',effect:'Aucune action | DEF −5',sev:true,builtin:true},
  {name:'Immobilisé',effect:'d12 à tous les tests | Pas de déplacement',sev:true,builtin:true},
  {name:'Paralysé',effect:'Aucune action | Touché auto + Coup critique',sev:true,builtin:true},
  {name:'Ralenti',effect:'1 seule action/tour (attaque OU déplacement)',sev:false,builtin:true},
  {name:'Renversé',effect:'Att. −5 | DEF −5 | Action mvt pour se relever',sev:false,builtin:true},
  {name:'Surpris',effect:'Pas d\'action | DEF −5 (1er tour seulement)',sev:false,builtin:true},
  {name:'Empoisonné',effect:'Varie selon le poison',sev:true,builtin:true},
  {name:'Enragé',effect:'Varie selon la capacité',sev:false,builtin:true},
  {name:'À terre',effect:'Att. −5 | DEF −5 | Action mvt pour se relever',sev:false,builtin:true},
  {name:'Charmé',effect:'Sous le contrôle du lanceur',sev:true,builtin:true},
  {name:'Effrayé',effect:'Fuite ou Étourdi (SAG diff. 12)',sev:true,builtin:true},
  {name:'Saignement',effect:'DM par tour (varie)',sev:true,builtin:true},
  {name:'Brûlé',effect:'DM par tour (varie)',sev:true,builtin:true},
  {name:'Gelé',effect:'Varie selon l\'effet',sev:true,builtin:true},
  {name:'Invisible',effect:'Att. dist. impossible contre lui | Att. contact −5',sev:false,builtin:true},
  {name:'Inconscient',effect:'PV = 0 | Aucune action',sev:true,builtin:true},
  {name:'Mort',effect:'Mort au combat',sev:true,builtin:true},
];

export const DICE_TYPES = [4,6,8,10,12,20,100];

export const COF_PAGES=[
  'https://www.co-drs.org/fr/jeu/regles',
  'https://www.co-drs.org/fr/jeu/regles/voies-de-prestige',
  'https://www.co-drs.org/fr/jeu/profils',
  'https://www.co-drs.org/fr/jeu/capacites',
  'https://www.co-drs.org/fr/jeu/voies',
  'https://www.co-drs.org/fr/jeu/etats-prejudiciables',
  'https://www.co-drs.org/fr/jeu/regles/creer-un-personnage',
  'https://www.co-drs.org/fr/jeu/regles/creer-un-personnage/voies-et-capacites',
  'https://www.co-drs.org/fr/jeu/races',
];
export const COF_RACES_INDEX='https://www.co-drs.org/fr/jeu/races';

export { DEFAULT_CHARS } from './constants/default-chars.js';
