// Payment-screenshot compression (runs in the customer's browser, before the upload).
// - Only JPG / PNG / WebP images are touched. PDFs and anything else are returned unchanged.
// - Already-small images (<= TARGET) are left exactly as they are: no quality is thrown away for nothing.
// - The best quality that fits TARGET (200 KB) wins; if the text would suffer, up to HARD (300 KB) is accepted.
// - Never throws: on any failure (old browser, decode error, bigger result) the ORIGINAL file is returned.
export const MAX_PROOF_BYTES = 5 * 1024 * 1024;   // customers may pick a file up to 5 MB
export const TARGET_BYTES = 200 * 1024;
export const HARD_BYTES = 300 * 1024;
const COMPRESSIBLE = ['image/jpeg', 'image/png', 'image/webp'];
// [longest side in px, JPEG quality] - ordered from best quality to smallest. Text (UTR, amount) stays readable down to the last step.
const LADDER: [number, number][] = [[1600, 0.82], [1600, 0.74], [1400, 0.74], [1400, 0.66], [1280, 0.66], [1200, 0.6], [1080, 0.6], [1000, 0.55], [900, 0.55]];

export type CompressResult = { file: File; before: number; after: number; compressed: boolean };

async function decode(file: File): Promise<{ src: CanvasImageSource; w: number; h: number; done: () => void }> {
  if (typeof createImageBitmap === 'function') {
    try { const b = await createImageBitmap(file); return { src: b, w: b.width, h: b.height, done: () => b.close() }; } catch { /* fall through to <img> */ }
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  await new Promise<void>((ok, bad) => { img.onload = () => ok(); img.onerror = () => bad(new Error('decode')); img.src = url; });
  return { src: img, w: img.naturalWidth, h: img.naturalHeight, done: () => URL.revokeObjectURL(url) };
}
const toBlob = (c: HTMLCanvasElement, q: number) => new Promise<Blob | null>((ok) => c.toBlob(ok, 'image/jpeg', q));

export async function compressProof(file: File): Promise<CompressResult> {
  const same: CompressResult = { file, before: file.size, after: file.size, compressed: false };
  try {
    if (!COMPRESSIBLE.includes(file.type) || file.size <= TARGET_BYTES) return same;
    const img = await decode(file);
    try {
      if (!img.w || !img.h) return same;
      let best: Blob | null = null, ok300: Blob | null = null;
      for (const [side, q] of LADDER) {
        const scale = Math.min(1, side / Math.max(img.w, img.h));
        const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(img.w * scale)); c.height = Math.max(1, Math.round(img.h * scale));
        const ctx = c.getContext('2d'); if (!ctx) return same;
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);   // PNG transparency -> white, so text never turns black
        ctx.imageSmoothingQuality = 'high'; ctx.drawImage(img.src, 0, 0, c.width, c.height);
        const b = await toBlob(c, q); if (!b) return same;
        if (!best || b.size < best.size) best = b;
        if (b.size <= TARGET_BYTES) { best = b; ok300 = null; return finish(file, b); }
        if (b.size <= HARD_BYTES && !ok300) ok300 = b;
      }
      const pick = ok300 || best;
      return pick ? finish(file, pick) : same;
    } finally { img.done(); }
  } catch { return same; }
}

function finish(orig: File, b: Blob): CompressResult {
  if (b.size >= orig.size) return { file: orig, before: orig.size, after: orig.size, compressed: false };   // never make it worse
  const name = (orig.name.replace(/\.[^.]+$/, '') || 'payment-proof') + '.jpg';
  const f = new File([b], name, { type: 'image/jpeg', lastModified: Date.now() });
  return { file: f, before: orig.size, after: f.size, compressed: true };
}
