import { useState } from 'react';
import { Phone, X } from 'lucide-react';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { useT } from './i18n';
// Small "Call us / Request a callback" button. It sits bottom-left and lifts itself above the cart bar, so it never overlaps it.
export default function CallWidget({ phone, lift }: { phone?: string; lift: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false), [f, setF] = useState({ name: '', phone: '', note: '' }), [busy, setBusy] = useState(false), [done, setDone] = useState(false), [err, setErr] = useState('');
  const tel = (phone || '').replace(/[^\d+]/g, '');
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setBusy(true);
    const { error } = isSupabaseConfigured ? await supabase.rpc('request_callback', { p_name: f.name, p_phone: f.phone, p_note: f.note || null }) : { error: { message: 'x' } as any };
    setBusy(false);
    if (error) { const m = error.message || ''; setErr(/invalid phone/.test(m) ? t('cb.badphone') : /rate_limited/.test(m) ? t('cb.limited') : t('cb.error')); return; }
    setDone(true); setF({ name: '', phone: '', note: '' });
  }
  const close = () => { setOpen(false); setDone(false); setErr(''); };
  return <div className={`fixed left-3 z-40 ${lift ? 'bottom-24' : 'bottom-4'}`}>
    {open && <div className="card mb-2 w-[min(20rem,calc(100vw-1.5rem))] bg-navy p-4 shadow-2xl">
      <div className="mb-2 flex items-center justify-between"><h3 className="font-bold text-gold">{t('cb.title')}</h3><button aria-label={t('common.close')} onClick={close}><X size={18} /></button></div>
      {tel && <a href={`tel:${tel}`} className="btn-blue mb-3 flex w-full items-center justify-center gap-2"><Phone size={16} />{t('cb.call')} {phone}</a>}
      {done ? <p className="py-3 text-center text-sm text-white/80">{t('cb.done')}</p> : <form onSubmit={submit}>
        <p className="mb-2 text-xs text-white/60">{t('cb.intro')}</p>
        <input required maxLength={80} placeholder={t('cb.name')} aria-label={t('cb.name')} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} className="input mb-2" />
        <input required type="tel" inputMode="tel" maxLength={20} placeholder={t('cb.phone')} aria-label={t('cb.phone')} value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} className="input mb-2" />
        <input maxLength={300} placeholder={t('cb.note')} aria-label={t('cb.note')} value={f.note} onChange={e => setF({ ...f, note: e.target.value })} className="input" />
        {err && <p className="mt-2 text-sm text-gold">{err}</p>}
        <button disabled={busy} className="btn-gold mt-3 w-full">{busy ? t('auth.wait') : t('cb.send')}</button></form>}
    </div>}
    <button aria-label={t('cb.title')} onClick={() => (open ? close() : setOpen(true))} className="flex h-12 w-12 items-center justify-center rounded-full border border-gold/40 bg-navy/90 text-gold shadow-xl backdrop-blur"><Phone size={20} /></button>
  </div>;
}
