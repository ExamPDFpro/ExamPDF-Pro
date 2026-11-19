// Counts the pages of a PDF in the browser (admin only). pdf.js is loaded on demand, so visitors never download it.
// Throws when the file cannot be read (corrupted, password-protected, not a PDF, or taking too long).
export async function countPdfPages(file: File): Promise<number> {
  const head = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
  if (!new TextDecoder('latin1').decode(head).includes('%PDF-')) throw new Error('not a pdf');
  const [pdfjs, worker] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false });
  const timer = setTimeout(() => task.destroy(), 20000);
  try { const doc = await task.promise; const n = doc.numPages; await doc.destroy(); return n; }
  finally { clearTimeout(timer); }
}
