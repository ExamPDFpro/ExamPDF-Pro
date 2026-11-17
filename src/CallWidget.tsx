import { useEffect, useRef, useState } from 'react';
import { Phone, X } from 'lucide-react';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { useT } from './i18n';
// "Call us / Request a callback" popup. It is NOT always on screen: it slides up from the bottom only when the visitor
// has scrolled down near the footer, can be closed, and once closed it stays away for the rest of that visit (browser session).
// It sits above the cart bar (never over it) and an in-page spacer keeps the footer text from being covered.
const KEY = 'cb_popup_closed';
const closedBefore = () => { try { return sessionStorage.getItem(KEY) === '1'; } catch { return false; } };
export default function CallWidget({ phone, lift }: { phone?: string; lift: boolean }) {
  const t = useT();
  const [closed, setClosed] = useState(closedBefore), [near, setNear] = useState(false), [form, setForm] = useState(false);
  const [f, setF] = useState({ name: '', phone: '', note: '' }), [busy, setBusy] = useState(false), [done, setDone] = useState(false), [err, setErr] = useState('');
  const box = useRef<HTMLDivElement>(null), [h, setH] = useState(0);
  const tel = (phone || '').replace(/[^\d+]/g, '');
  useEffect(() => {
    if (closed) return;
    const el = document.querySelector('footer.site-footer'); if (!el || !('IntersectionObserver' in window)) return;
    let scrolled = window.scrollY > 0, inView = false;
    const apply = () => setNear(scrolled && inView);
    const io = new IntersectionObserver(([e]) => { inView = e.isIntersecting; apply(); }, { threshold: 0, rootMargin: '0px 0px 0px 0px' });
    const onScroll = () => { if (!scrolled && window.scrollY > 0) { scrolled = true; apply(); } };   // never pop up before the visitor has scrolled
    io.observe(el); window.addEventListener('scroll', onScroll, { passive: true });
    return () => { io.disconnect(); window.removeEventListener('scroll', onScroll); };
  }, [closed]);
  const show = near || form || done;
  useEffect(() => { if (box.current) setH(box.current.offsetHeight); }, [show, form, done, err, closed]);
  if (closed) return null;
  const close = () => { try { sessionStorage.setItem(KEY, '1'); } catch { /* ignore */ } setClosed(true); };
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setBusy(true);
    const { error } = isSupabaseConfigured ? await supabase.rpc('request_callback', { p_name: f.name, p_phone: f.phone, p_note: f.note || null }) : { error: { message: 'x' } as any };
    setBusy(false);
    if (error) { const m = error.message || ''; setErr(/invalid phone/.test(m) ? t('cb.badphone') : /rate_limited/.test(m) ? t('cb.limited') : t('cb.error')); return; }
    setDone(true); setForm(false); setF({ name: '', phone: '', note: '' });
  }
  return <>
    {show && <div aria-hidden="true" style={{ height: Math.max(0, h + (lift ? 96 - 80 : 12)) }} />}
    <div ref={box} role="dialog" aria-label={t('cb.title')} aria-hidden={!show}
      className={`fixed inset-x-3 z-40 sm:inset-x-auto sm:left-4 sm:w-80 ${lift ? 'bottom-24' : 'bottom-3'} transition-all duration-500 ease-out ${show ? 'translate-y-0 opacity-100' : 'invisible pointer-events-none translate-y-8 opacity-0'}`}>
      <div className="card bg-navy/95 p-3 shadow-2xl backdrop-blur">
        <div className="flex items-start justify-between gap-2"><div><h3 className="text-sm font-bold text-gold">{t('cb.title')}</h3>{!form && !done && <p className="mt-0.5 text-xs text-white/60">{t('cb.intro')}</p>}</div>
          <button aria-label={t('common.close')} onClick={close} className="shrink-0 p-1"><X size={16} /></button></div>
        {done ? <p className="py-3 text-center text-sm text-white/80">{t('cb.done')}</p> : form ? <form onSubmit={submit} className="mt-2">
          <input required maxLength={80} placeholder={t('cb.name')} aria-label={t('cb.name')} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} className="input mb-2" />
          <input required type="tel" inputMode="tel" maxLength={20} placeholder={t('cb.phone')} aria-label={t('cb.phone')} value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} className="input mb-2" />
          <input maxLength={300} placeholder={t('cb.note')} aria-label={t('cb.note')} value={f.note} onChange={e => setF({ ...f, note: e.target.value })} className="input" />
          {err && <p className="mt-2 text-sm text-gold">{err}</p>}
          <button disabled={busy} className="btn-gold mt-3 w-full">{busy ? t('auth.wait') : t('cb.send')}</button></form>
        : <div className="mt-2 flex gap-2">
          {tel && <a href={`tel:${tel}`} className="btn-blue flex flex-1 items-center justify-center gap-1.5 !px-2 !py-2 text-xs"><Phone size={14} />{t('cb.call')}</a>}
          <button onClick={() => setForm(true)} className="btn-gold flex-1 !px-2 !py-2 text-xs">{t('cb.send')}</button></div>}
      </div>
    </div>
  </>;
}
