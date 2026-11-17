import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { useT } from './i18n';
// Opens only when someone arrives from a "reset password" email link: lets them choose a NEW password themselves.
export default function PasswordRecovery() {
  const t = useT();
  const [open, setOpen] = useState(false), [pw, setPw] = useState(''), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const { data } = supabase.auth.onAuthStateChange((ev: string) => { if (ev === 'PASSWORD_RECOVERY') setOpen(true); });
    return () => data.subscription.unsubscribe();
  }, []);
  if (!open) return null;
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); if (pw.length < 8) { setMsg(t('pw.short')); return; }
    setBusy(true); const { error } = await supabase.auth.updateUser({ password: pw }); setBusy(false);
    if (error) { setMsg(t('pw.error')); return; }
    setMsg(t('pw.done')); setPw(''); try { history.replaceState(null, '', location.pathname + location.search); } catch { /* ignore */ } setTimeout(() => setOpen(false), 1800);
  };
  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4"><form onSubmit={save} className="card w-full max-w-sm bg-navy p-5">
    <h3 className="mb-1 text-lg font-bold text-gold">{t('pw.title')}</h3><p className="mb-3 text-xs text-white/60">{t('pw.note')}</p>
    <input type="password" required minLength={8} autoComplete="new-password" placeholder={t('pw.new')} aria-label={t('pw.new')} value={pw} onChange={e => setPw(e.target.value)} className="input" />
    {msg && <p className="mt-2 text-sm text-gold">{msg}</p>}
    <div className="mt-3 flex gap-2"><button disabled={busy} className="btn-gold flex-1">{t('pw.save')}</button><button type="button" className="rounded-lg border border-white/15 px-3 text-sm" onClick={() => setOpen(false)}>{t('common.close')}</button></div></form></div>;
}
