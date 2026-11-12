import { supabase, isSupabaseConfigured } from './supabase';
// Affiliate attribution: a visitor arriving through ?ref=<slug> is remembered for 30 days (last link wins).
// The browser only passes the slug; the server decides whether it is valid and what commission applies.
const KEY = 'exampdf_ref', SES = 'exampdf_sid', TTL = 30 * 24 * 3600e3;
const sid = () => { try { let s = sessionStorage.getItem(SES); if (!s) { s = (crypto as any)?.randomUUID?.() || String(Math.random()).slice(2); sessionStorage.setItem(SES, s!); } return s!; } catch { return ''; } };
export function refFromUrl(): string | null {
  let r = new URLSearchParams(location.search).get('ref');
  if (!r) { const i = location.hash.indexOf('?'); if (i >= 0) r = new URLSearchParams(location.hash.slice(i + 1)).get('ref'); }
  r = (r || '').toLowerCase().trim();
  return /^[a-z0-9_-]{3,40}$/.test(r) ? r : null;
}
export function getRef(): string | null {
  try { const o = JSON.parse(localStorage.getItem(KEY) || 'null'); if (o?.slug && Date.now() - o.ts < TTL) return o.slug; } catch { /* ignore */ }
  return null;
}
/** Call once per page load (and again when the product is known). Counts one click per link per 30 minutes (server-side). */
export function captureRef(productId?: string) {
  const r = refFromUrl(); if (!r) return;
  try { localStorage.setItem(KEY, JSON.stringify({ slug: r, ts: Date.now() })); } catch { /* ignore */ }
  if (!isSupabaseConfigured) return;
  const tk = `exampdf_clk_${r}_${productId || ''}`;
  try { if (sessionStorage.getItem(tk)) return; sessionStorage.setItem(tk, '1'); } catch { /* ignore */ }
  supabase.rpc('track_affiliate_click', { p_slug: r, p_session: sid(), p_product: productId || null });
}
