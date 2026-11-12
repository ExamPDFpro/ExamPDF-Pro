import { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from './lib/supabase';
import { useT, type Key } from './i18n';
const PLATFORMS = ['YouTube', 'Facebook', 'Instagram', 'Telegram', 'WhatsApp', 'X'];
export default function AffiliateApply({ onClose, say }: { onClose: () => void; say: (s: string) => void }) {
  const t = useT();
  const [f, setF] = useState({ name: '', email: '', phone: '', platform: 'YouTube', url: '' }), [busy, setBusy] = useState(false), [done, setDone] = useState(false), [err, setErr] = useState('');
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setBusy(true);
    const { error } = await supabase.rpc('apply_affiliate', { p_name: f.name, p_email: f.email, p_phone: f.phone || null, p_platform: f.platform, p_channel_url: f.url || null });
    setBusy(false);
    if (error) { const m = error.message || ''; const k = /already_applied/.test(m) ? 'err.already_applied' : /rate_limited/.test(m) ? 'err.rate_limited' : /invalid email/.test(m) ? 'err.invalid_email' : /invalid name/.test(m) ? 'err.invalid_name' : /http/.test(m) ? 'err.bad_link' : 'err.generic'; setErr(t(k as Key)); return; }
    setDone(true); say(t('aff.done'));
  }
  return <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-black/80 p-3"><form onSubmit={submit} className="card w-full max-w-md bg-navy p-5">
    <div className="mb-3 flex items-center justify-between"><div><span className="text-xs uppercase tracking-widest text-gold">{t('aff.eyebrow')}</span><h2 className="text-xl font-bold">{t('aff.title')}</h2></div><button type="button" onClick={onClose} aria-label={t('common.close')}><X /></button></div>
    {done ? <p className="py-6 text-center text-sm text-white/80">{t('aff.done')}</p> : <>
      <p className="mb-3 text-sm text-white/65">{t('aff.intro')}</p>
      <label className="mb-3 block text-sm">{t('aff.name')}<input required maxLength={80} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="input mt-1" /></label>
      <label className="mb-3 block text-sm">{t('aff.email')}<input required type="email" maxLength={120} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className="input mt-1" /></label>
      <label className="mb-3 block text-sm">{t('aff.phone')}<input maxLength={30} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} className="input mt-1" /></label>
      <label className="mb-3 block text-sm">{t('aff.platform')}<select value={f.platform} onChange={(e) => setF({ ...f, platform: e.target.value })} className="input mt-1">{PLATFORMS.map((p) => <option key={p}>{p}</option>)}<option value="Other">{t('aff.other')}</option></select></label>
      <label className="block text-sm">{t('aff.url')}<input type="url" maxLength={300} placeholder="https://" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} className="input mt-1" /></label>
      {err && <p className="mt-3 text-sm text-gold">{err}</p>}
      <button disabled={busy} className="btn-gold mt-4 w-full">{busy ? t('auth.wait') : t('aff.submit')}</button></>}
  </form></div>;
}
