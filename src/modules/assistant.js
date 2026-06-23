// ═══════════════════════════════════════════════════════════════
//  ASSISTANT (barrel) — import règles COF + assistant Gemini
// ═══════════════════════════════════════════════════════════════
export {
  _cofImportStopped,
  stopCOFImport,
  importCOFRules,
  retryCOFPages,
  clearCOFRules,
  loadCOFRulesStatus,
  getCOFRulesText,
} from './assistant/cof-import.js';

export {
  GEMINI_URL,
  getGeminiKey,
  setGeminiKey,
  aiConversations,
  aiActiveChar,
  aiCtx,
  COF_RULES,
  buildAiContext,
  generateFicheResume,
  useFicheResume,
  initAssistantTab,
  getAiMessages,
  setAiMessages,
  renderAIChat,
  toggleAiCtx,
  sendAI,
  clearAIChat,
  saveGeminiKey,
  clearGeminiKey,
  renderGeminiKeyStatus,
} from './assistant/gemini.js';
