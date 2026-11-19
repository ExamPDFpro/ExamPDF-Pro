import { useEffect, useRef, useState } from 'react';
import { Phone, X, Headphones } from 'lucide-react';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { useT } from './i18n';
// Small "Need Help?" trigger (bottom-right). It shows when EITHER
//  (a) the visitor is at the real bottom of the page (hides again the moment they scroll up out of that zone), OR
//  (b) they have actively browsed ~270 s (once qualified it stays for the rest of the visit).
// The popup opens ONLY on click, is a small card (<= 320 px), closes on x / outside click, and never re-opens by itself.
// Engagement = seconds in which the tab is visible AND the visitor did something in the last 30 s. The counter lives in sessionStorage, so internal navigation / reloads do not reset it.
const SECS = 270, IDLE_MS = 30000, BOTTOM_PX = 80, K_S = 'cb_engaged_s', K_Q = 'cb_engaged_q';
const rd = (k: string) => { try { return sessionStorage.getItem(k); } catch { return null; } };
const wr = (k: string, v: string) => { try { sessionStorage.setItem(k, v); } catch { /* ignore */ } };
export default function CallWidget({ phone, hide }: { phone?: string; hide: boolean }) {
  const t = useT();
  const [qualified, setQualified] = useState(() => rd(K_Q) === '1'), [bottom, setBottom] = useState(false), [open, setOpen] = useState(false), [form, setForm] = useState(false);
  const [f, setF] = useState({ name: '', phone: '' }), [busy, setBusy] = useState(false), [done, setDone] = useState(false), [err, setErr] = useState('');
  const box = useRef<HTMLDivElement>(null);
  const tel = (phone || '').replace(/[^\d+]/g, '');
  // (a) bottom zone: only when the page really scrolls, and we are within BOTTOM_PX of the very end.
  useEffect(() => {
    let raf = 0;
    const check = () => {
      raf = 0; const d = document.documentElement, scrollable = d.scrollHeight > window.innerHeight + 200;
      setBottom(scrollable && window.scrollY > 0 && window.innerHeight + window.scrollY >= d.scrollHeight - BOTTOM_PX);
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(check); };
    window.addEventListener('scroll', on, { passive: true }); window.addEventListener('resize', on); on();
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); if (raf) cancelAnimationFrame(raf); };
  }, []);
  // (b) active engagement.
  useEffect(() => {
    if (qualified) return;
    let last = Date.now(), secs = Number(rd(K_S)) || 0, since = 0;
    const act = () => { last = Date.now(); };
    const ev = ['scroll', 'click', 'touchstart', 'keydown', 'pointerdown', 'hashchange'] as const;
    ev.forEach(e => window.addEventListener(e, act, { passive: true }));
    const iv = setInterval(() => {
      if (document.visibilityState !== 'visible' || Date.now() - last > IDLE_MS) return;
      secs += 1; since += 1; if (since >= 5) { wr(K_S, String(secs)); since = 0; }
      if (secs >= SECS) { wr(K_S, String(secs)); wr(K_Q, '1'); setQualified(true); }
    }, 1000);
    return () => { clearInterval(iv); ev.forEach(e => window.removeEventListener(e, act)); wr(K_S, String(secs)); };
  }, [qualified]);
  const visible = !hide && (qualified || bottom);
  // bottom-only trigger lost (or a critical screen opened): close the popup right away.
  useEffect(() => { if (!visible) { setOpen(false); setForm(false); } }, [visible]);
  useEffect(() => {
    if (!open) return;
    const out = (e: PointerEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', out); return () => document.removeEventListener('pointerdown', out);
  }, [open]);
  if (!visible) return null;
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr('');
    const name = f.name.trim(), ph = f.phone.trim();
    if (name.length < 2) { setErr(t('cb.badname')); return; }
    if (!/^\+?[\d\s-]{10,15}$/.test(ph)) { setErr(t('cb.badphone')); return; }
    setBusy(true);
    const { error } = isSupabaseConfigured ? await supabase.rpc('request_callback', { p_name: name, p_phone: ph, p_note: null }) : { error: { message: 'x' } as any };
    setBusy(false);
    if (error) { const m = error.message || ''; setErr(/invalid phone/.test(m) ? t('cb.badphone') : /rate_limited/.test(m) ? t('cb.limited') : t('cb.error')); return; }
    setDone(true); setForm(false); setF({ name: '', phone: '' });
  }
  const close = () => { setOpen(false); setForm(false); setDone(false); };
  return <div ref={box} className="pointer-events-none fixed right-3 z-40 flex flex-col items-end gap-2" style={{ bottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
    {open && <div role="dialog" aria-label={t('cb.ptitle')} className="card pointer-events-auto w-[min(20rem,calc(100vw-1.5rem))] bg-navy/95 p-3 shadow-2xl backdrop-blur">
      <div className="flex items-start justify-between gap-2"><h3 className="text-sm font-bold text-gold">{t('cb.ptitle')}</h3><button aria-label={t('common.close')} onClick={close} className="-m-1 shrink-0 p-2"><X size={16} /></button></div>
      {done ? <p className="py-3 text-center text-sm text-white/80">{t('cb.done')}</p> : form ? <form onSubmit={submit} className="mt-2" noValidate>
        <input required maxLength={80} placeholder={t('cb.name')} aria-label={t('cb.name')} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} className="input mb-2" autoComplete="name" />
        <input required type="tel" inputMode="tel" maxLength={20} placeholder={t('cb.phone')} aria-label={t('cb.phone')} value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} className="input" autoComplete="tel" />
        {err && <p className="mt-2 text-sm text-gold" role="alert">{err}</p>}
        <button disabled={busy} className="btn-gold mt-3 w-full">{busy ? t('auth.wait') : t('cb.request')}</button></form>
      : <><p className="mt-1 text-xs leading-5 text-white/70">{t('cb.pmsg')}</p>
        <div className="mt-3 flex gap-2">{tel && <a href={`tel:${tel}`} className="btn-blue flex flex-1 items-center justify-center gap-1.5 !px-2 !py-2.5 text-xs"><Phone size={14} />{t('cb.callnow')}</a>}
          <button onClick={() => setForm(true)} className="btn-gold flex-1 !px-2 !py-2.5 text-xs">{t('cb.request')}</button></div></>}
    </div>}
    {!open && <button onClick={() => { setOpen(true); setDone(false); }} className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-gold/60 bg-navy px-3.5 py-2.5 text-xs font-bold text-gold shadow-xl"><Headphones size={15} />{t('cb.trigger')}</button>}
  </div>;
}
