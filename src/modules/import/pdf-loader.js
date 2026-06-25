// ═══════════════════════════════════════════════════════════════
//  PDF-LOADER — chargement dynamique de PDF.js (CDN) à la demande
//  Partagé entre monster.js et character-pdf.js.
// ═══════════════════════════════════════════════════════════════
const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let _lib = null;
let _loading = null;

export async function getPdfjsLib() {
  if (_lib) return _lib;
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
    _lib = window.pdfjsLib;
    return _lib;
  }
  if (!_loading) {
    _loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = PDFJS_CDN;
      s.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
        _lib = window.pdfjsLib;
        resolve(_lib);
      };
      s.onerror = () => reject(new Error('Impossible de charger PDF.js'));
      document.head.appendChild(s);
    });
  }
  return _loading;
}

export async function extractTextFromPdf(file, maxPages = 20) {
  const lib = await getPdfjsLib();
  const buf = await file.arrayBuffer();
  const pdf = await lib.getDocument({ data: buf }).promise;
  const pages = [];
  const limit = Math.min(pdf.numPages, maxPages);
  for (let i = 1; i <= limit; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    pages.push(tc.items.map(it => it.str).join(' '));
  }
  return pages.join('\n');
}
