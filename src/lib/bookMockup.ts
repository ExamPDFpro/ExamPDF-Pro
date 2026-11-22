// Template-based 3D book mockup renderer (Canvas 2D, no external service, no AI API).
// Produces a transparent WebP of a physical book: front cover, spine, perspective, lighting, shadow.
// Display-only: the original PDF is never touched.

export type Theme = { a: string; b: string; accent: string; ink: string };

const THEMES: { re: RegExp; t: Theme }[] = [
  { re: /upsc|ias|civil/i, t: { a: "#1e40af", b: "#0b1b4d", accent: "#f5c542", ink: "#ffffff" } },
  { re: /ssc|cgl|chsl/i, t: { a: "#2563eb", b: "#0c2a6b", accent: "#ef4444", ink: "#ffffff" } },
  { re: /rail|rrb|ntpc/i, t: { a: "#dc2626", b: "#7f1313", accent: "#facc15", ink: "#ffffff" } },
  { re: /police|constable|\bsi\b/i, t: { a: "#1e3a8a", b: "#0a1233", accent: "#facc15", ink: "#ffffff" } },
  { re: /wbcs|wbpsc/i, t: { a: "#15803d", b: "#064e2b", accent: "#facc15", ink: "#ffffff" } },
  { re: /neet|bio|medical/i, t: { a: "#16a34a", b: "#064e3b", accent: "#facc15", ink: "#ffffff" } },
  { re: /icds|supervisor|anganwadi/i, t: { a: "#7e22ce", b: "#3b0764", accent: "#facc15", ink: "#ffffff" } },
  { re: /ctet|tet|teach/i, t: { a: "#0e7490", b: "#083344", accent: "#facc15", ink: "#ffffff" } },
  { re: /bank|ibps|sbi|clerk/i, t: { a: "#c2410c", b: "#7c2d12", accent: "#fde047", ink: "#ffffff" } },
];
export function themeFor(text: string): Theme {
  for (const x of THEMES) if (x.re.test(text)) return x.t;
  let h = 0; for (const c of text) h = (h * 31 + c.charCodeAt(0)) % 360;
  return { a: `hsl(${h} 70% 42%)`, b: `hsl(${h} 65% 15%)`, accent: "#f5c542", ink: "#ffffff" };
}

// Canvas size of the final image (3:4 portrait, good for cards and sharing).
const OUT_W = 900, OUT_H = 1200;
// Book proportions (consistent for every product).
const BW = 1, BH = 1.38, BD = 0.17;
// Texture resolution of the front face.
const TW = 720, TH = Math.round(TW * (BH / BW));

export function loadImage(src: string | Blob): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const url = typeof src === "string" ? src : URL.createObjectURL(src);
    const im = new Image();
    if (typeof src === "string") im.crossOrigin = "anonymous";
    im.onload = () => res(im);
    im.onerror = () => rej(new Error("ছবি লোড করা যায়নি"));
    im.src = url;
  });
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(/\s+/).filter(Boolean), lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const t = cur ? cur + " " + w : w;
    if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

// Front face texture: the uploaded cover (cover-fit) or a designed cover built from the product's real title/category.
function frontTexture(img: HTMLImageElement | null, title: string, category: string, th: Theme): HTMLCanvasElement {
  const c = document.createElement("canvas"); c.width = TW; c.height = TH;
  const x = c.getContext("2d")!;
  if (img) {
    const s = Math.max(TW / img.width, TH / img.height), w = img.width * s, h = img.height * s;
    x.drawImage(img, (TW - w) / 2, (TH - h) / 2, w, h);
    return c;
  }
  const g = x.createLinearGradient(0, 0, TW, TH); g.addColorStop(0, th.a); g.addColorStop(1, th.b);
  x.fillStyle = g; x.fillRect(0, 0, TW, TH);
  // soft decorative shapes
  x.globalAlpha = 0.12; x.fillStyle = "#fff";
  x.beginPath(); x.arc(TW * 0.95, TH * 0.28, TW * 0.5, 0, 7); x.fill();
  x.globalAlpha = 0.08; x.beginPath(); x.arc(TW * 0.1, TH * 0.95, TW * 0.55, 0, 7); x.fill();
  x.globalAlpha = 1;
  // brand
  x.fillStyle = th.ink; x.font = "800 34px Arial, sans-serif"; x.textBaseline = "top";
  x.fillText("ExamPDFPro", 56, 52);
  x.globalAlpha = 0.75; x.font = "600 20px Arial, sans-serif"; x.fillText("Prepare Smart... Crack Big...", 56, 94); x.globalAlpha = 1;
  // EXAM READY badge
  x.save(); x.translate(TW - 150, 118); x.rotate(0.12);
  x.fillStyle = th.accent; x.beginPath(); (x as any).roundRect(-92, -60, 184, 120, 24); x.fill();
  x.fillStyle = "#111827"; x.textAlign = "center"; x.font = "900 38px Arial, sans-serif"; x.fillText("EXAM", 0, -44); x.fillText("READY", 0, -4);
  x.strokeStyle = "#dc2626"; x.lineWidth = 7; x.lineCap = "round"; x.beginPath(); x.moveTo(30, 36); x.lineTo(46, 50); x.lineTo(74, 20); x.stroke();
  x.restore();
  // category + title
  x.textAlign = "left"; x.fillStyle = th.accent; x.font = "900 30px Arial, sans-serif";
  const cat = (category || "EXAM PREP").toUpperCase(); x.fillText(cat.slice(0, 22), 56, TH * 0.4);
  x.fillStyle = th.ink; let fs = 96;
  const t = (title || "ExamPDF").trim();
  let lines: string[] = [];
  for (; fs >= 40; fs -= 6) { x.font = `900 ${fs}px Arial, sans-serif`; lines = wrap(x, t, TW - 112); if (lines.length <= 4 && lines.every((l) => x.measureText(l).width <= TW - 112)) break; }
  let y = TH * 0.4 + 52;
  for (const l of lines.slice(0, 5)) { x.shadowColor = "rgba(0,0,0,.35)"; x.shadowBlur = 8; x.fillText(l, 56, y); y += fs * 1.05; }
  x.shadowBlur = 0;
  x.fillStyle = th.accent; x.fillRect(56, y + 14, 150, 8);
  // bottom ribbon
  x.fillStyle = th.accent; x.beginPath(); x.moveTo(0, TH - 120); x.quadraticCurveTo(TW * 0.55, TH - 150, TW, TH - 70); x.lineTo(TW, TH); x.lineTo(0, TH); x.fill();
  x.fillStyle = "#111827"; x.font = "800 30px Arial, sans-serif"; x.textAlign = "left"; x.fillText("EXAM READY PDF", 56, TH - 62);
  return c;
}

function spineTexture(title: string, th: Theme): HTMLCanvasElement {
  const w = 120, h = TH, c = document.createElement("canvas"); c.width = w; c.height = h;
  const x = c.getContext("2d")!;
  const g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, th.b); g.addColorStop(0.6, th.a); g.addColorStop(1, th.b);
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  x.fillStyle = th.accent; x.fillRect(0, 0, w, 10); x.fillRect(0, h - 10, w, 10);
  x.save(); x.translate(w / 2, h / 2); x.rotate(Math.PI / 2); x.textAlign = "center"; x.textBaseline = "middle";
  let fs = 54; x.font = `900 ${fs}px Arial, sans-serif`;
  const t = (title || "ExamPDF").trim();
  while (x.measureText(t).width > h - 230 && fs > 22) { fs -= 2; x.font = `900 ${fs}px Arial, sans-serif`; }
  x.fillStyle = th.accent; x.fillText(t, -20, 0);
  x.fillStyle = "#fff"; x.globalAlpha = 0.85; x.font = "800 26px Arial, sans-serif"; x.fillText("ExamPDFPro", h / 2 - 90, 0);
  x.restore();
  return c;
}

export async function renderMockup(o: { cover?: HTMLImageElement | null; title: string; category: string }): Promise<Blob> {
  o = { ...o, title: (o.title || "").replace(/[_]+/g, " ").trim() };
  const th = themeFor(`${o.category} ${o.title}`);
  const front = frontTexture(o.cover || null, o.title, o.category, th);
  const spine = spineTexture(o.title, th);
  const th0 = 0.42; // rotation (rad): left edge nearer, spine visible
  const cs = Math.cos(th0), sn = Math.sin(th0), F = 3.2; // camera distance
  const P = (x: number, y: number, z: number) => {
    const xr = x * cs + z * sn, zr = -x * sn + z * cs, k = F / (F - zr);
    return { x: xr * k, y: y * k, k };
  };
  const hw = BW / 2, hh = BH / 2, hd = BD / 2;
  const corners = [P(-hw, -hh, hd), P(hw, -hh, hd), P(hw, hh, hd), P(-hw, hh, hd), P(-hw, -hh, -hd), P(-hw, hh, -hd)];
  const minX = Math.min(...corners.map((c) => c.x)), maxX = Math.max(...corners.map((c) => c.x));
  const minY = Math.min(...corners.map((c) => c.y)), maxY = Math.max(...corners.map((c) => c.y));
  const sc = Math.min((OUT_W * 0.88) / (maxX - minX), (OUT_H * 0.86) / (maxY - minY));
  const ox = OUT_W / 2 - ((minX + maxX) / 2) * sc, oy = OUT_H * 0.47 - ((minY + maxY) / 2) * sc;
  const S = (x: number, y: number, z: number) => { const p = P(x, y, z); return { x: p.x * sc + ox, y: p.y * sc + oy }; };

  const cv = document.createElement("canvas"); cv.width = OUT_W; cv.height = OUT_H;
  const ctx = cv.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";

  // floor shadow
  const bl = S(-hw, hh, hd), br = S(hw, hh, hd), bb = S(-hw, hh, -hd);
  ctx.save();
  const cx = (bl.x + br.x) / 2 + 26, cy = Math.max(bl.y, br.y) + 16, rx = (br.x - bb.x) / 2 + 60;
  ctx.translate(cx, cy); ctx.scale(1, 0.1);
  const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, rx); sg.addColorStop(0, "rgba(0,0,0,.55)"); sg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(0, 0, rx, 0, 7); ctx.fill(); ctx.restore();

  // strip renderer: textures on a vertical-edged quad are exact under Y-rotation + perspective
  const strips = (tex: HTMLCanvasElement, N: number, at: (u: number) => [{ x: number; y: number }, { x: number; y: number }]) => {
    for (let i = 0; i < N; i++) {
      const u0 = i / N, u1 = (i + 1) / N, [t0, b0] = at(u0), [t1] = at(u1);
      const sx = u0 * tex.width, sw = Math.max(1, tex.width / N);
      const hTop = t0.y, hBot = b0.y, x0 = t0.x, w = Math.max(1, t1.x - t0.x + 0.8);
      ctx.drawImage(tex, sx, 0, sw, tex.height, x0, hTop, w, hBot - hTop);
    }
  };
  // spine (z from back to front along u)
  strips(spine, 120, (u) => { const z = -hd + u * BD; return [S(-hw, -hh, z), S(-hw, hh, z)]; });
  // front
  strips(front, 360, (u) => { const x = -hw + u * BW; return [S(x, -hh, hd), S(x, hh, hd)]; });

  // lighting overlays (clipped to faces)
  const fq = [S(-hw, -hh, hd), S(hw, -hh, hd), S(hw, hh, hd), S(-hw, hh, hd)];
  ctx.save(); ctx.beginPath(); fq.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); ctx.clip();
  const lg = ctx.createLinearGradient(fq[0].x, fq[0].y, fq[2].x, fq[2].y);
  lg.addColorStop(0, "rgba(255,255,255,.26)"); lg.addColorStop(0.4, "rgba(255,255,255,0)"); lg.addColorStop(1, "rgba(0,0,0,.28)");
  ctx.fillStyle = lg; ctx.fillRect(0, 0, OUT_W, OUT_H);
  // hinge groove near the spine
  const gx = S(-hw + 0.055, 0, hd).x; ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.fillRect(gx - 2, 0, 4, OUT_H);
  ctx.fillStyle = "rgba(255,255,255,.16)"; ctx.fillRect(gx + 2, 0, 2, OUT_H);
  ctx.restore();
  const sq = [S(-hw, -hh, -hd), S(-hw, -hh, hd), S(-hw, hh, hd), S(-hw, hh, -hd)];
  ctx.save(); ctx.beginPath(); sq.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); ctx.clip();
  const sg2 = ctx.createLinearGradient(sq[0].x, 0, sq[1].x, 0); sg2.addColorStop(0, "rgba(0,0,0,.45)"); sg2.addColorStop(1, "rgba(0,0,0,.05)");
  ctx.fillStyle = sg2; ctx.fillRect(0, 0, OUT_W, OUT_H); ctx.restore();
  // crisp outline
  ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.lineWidth = 1.5;
  for (const q of [fq, sq]) { ctx.beginPath(); q.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); ctx.stroke(); }

  return new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error("ছবি তৈরি হয়নি"))), "image/webp", 0.9));
}

// Convert any image blob to an optimized WebP (keeps alpha). Used for the stored original and custom 3D uploads.
export async function toWebp(src: Blob, maxSide = 1400, q = 0.9): Promise<Blob> {
  const im = await loadImage(src);
  const s = Math.min(1, maxSide / Math.max(im.width, im.height));
  const c = document.createElement("canvas"); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s);
  c.getContext("2d")!.drawImage(im, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("convert failed"))), "image/webp", q));
}

// Naming convention (no DB column needed): <base>-3d.webp is the mockup, <base>-orig.webp is the original cover.
export const is3d = (u?: string | null) => !!u && /-3d\.webp(\?|$)/.test(u);
// Regenerated mockups keep the same base name plus "-v<time>" so the original (<base>-orig.webp) stays reachable.
export const origOf = (u: string) => u.replace(/(-v\d+)?-3d\.webp(\?|$)/, "-orig.webp$2");
export const stemOf = (u: string) => decodeURIComponent((u.split("/covers/")[1] || "").split("?")[0]).replace(/(-v\d+)?-3d\.webp$/, "");
