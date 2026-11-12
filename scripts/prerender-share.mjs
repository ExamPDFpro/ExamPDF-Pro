// Builds a tiny static page per published PDF at dist/pdf/<slug>/index.html so WhatsApp / Facebook / Google can read
// the title, description and cover (Open Graph). Visitors are sent straight on to the live app. The page never contains
// the PDF file, a download link or a signed URL. Runs after `vite build`; failures never break the deploy.
import { mkdirSync, writeFileSync } from 'node:fs';
const URL_ = process.env.VITE_SUPABASE_URL, KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SITE = (process.env.SITE_URL || 'https://exampdfpro.github.io/ExamPDF-Pro/').replace(/\/?$/, '/');
if (!URL_ || !KEY) { console.log('prerender: Supabase env missing - skipped'); process.exit(0); }
const H = { apikey: KEY, authorization: `Bearer ${KEY}` };
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
try {
  const r = await fetch(`${URL_}/rest/v1/pdf_products?select=title,description,slug,cover_url,selling_price,original_price&is_published=eq.true&is_active=eq.true&deleted_at=is.null&slug=not.is.null`, { headers: H });
  if (!r.ok) { console.log('prerender: fetch failed', r.status); process.exit(0); }
  const items = await r.json();
  let site = 'ExamPDF Pro';
  try { const b = await (await fetch(`${URL_}/rest/v1/website_settings?select=value&key=eq.brand`, { headers: H })).json(); site = b?.[0]?.value?.title || site; } catch { /* keep default */ }
  let n = 0;
  for (const p of items) {
    if (!/^[a-z0-9-]+$/i.test(p.slug || '')) continue;
    const title = `${p.title} | ${site}`;
    const desc = (p.description || `${p.title} - exam preparation PDF. Preview before you buy.`).replace(/\s+/g, ' ').slice(0, 200);
    const url = `${SITE}pdf/${p.slug}/`;
    const img = /^https:\/\//i.test(p.cover_url || '') ? p.cover_url : '';
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="${esc(site)}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${esc(url)}">
${img ? `<meta property="og:image" content="${esc(img)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${esc(img)}">` : '<meta name="twitter:card" content="summary">'}
<meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(desc)}">
<meta http-equiv="refresh" content="0;url=../../#/pdf/${esc(p.slug)}"><script>location.replace('../../#/pdf/${esc(p.slug)}')</script></head>
<body style="background:#0a1633;color:#fff;font-family:sans-serif;text-align:center;padding:40px"><h1>${esc(p.title)}</h1><p>${esc(desc)}</p><p><a style="color:#f5c04a" href="../../#/pdf/${esc(p.slug)}">Open</a></p></body></html>`;
    mkdirSync(`dist/pdf/${p.slug}`, { recursive: true }); writeFileSync(`dist/pdf/${p.slug}/index.html`, html); n++;
  }
  console.log(`prerender: wrote ${n} share page(s)`);
} catch (e) { console.log('prerender: skipped -', e.message); }
