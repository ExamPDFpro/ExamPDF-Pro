import { useState } from 'react';
import { supabase } from './lib/supabase';
import { siteBase } from './lib/share';
import { useT } from './i18n';
// Staff (main admin + sub-admin) tools on each affiliate card:
//  - link the affiliate record to a VERIFIED login account (so the dashboard never depends on the typed email matching)
//  - send a password-reset EMAIL to the affiliate (the admin never sees or sets a password)
const input = 'w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm';
export default function AffiliateAccess({ a, say, onDone }: { a: any; say: (s: string) => void; onDone: () => void }) {
  const t = useT();
  const [em, setEm] = useState(''), [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<{ error: any; data?: any }>, ok: string) => { setBusy(true); const { error } = await fn(); setBusy(false); if (error) { const m = error.message || ''; say(/no_verified_user/.test(m) ? t('ad.aff.acc.nouser') : /already_linked/.test(m) ? t('ad.aff.acc.taken') : m); } else { say(ok); onDone(); } };
  const link = () => run(() => supabase.rpc('admin_link_affiliate', { p_affiliate: a.id, p_login_email: em.trim() }), t('ad.aff.acc.linked'));
  const unlink = () => confirm(t('ad.aff.acc.confirmunlink')) && run(() => supabase.rpc('admin_link_affiliate', { p_affiliate: a.id, p_login_email: '' }), t('ad.aff.acc.unlinked'));
  const reset = () => { const to = (em.trim() || a.email || '').trim(); if (!to) return; run(() => supabase.auth.resetPasswordForEmail(to, { redirectTo: siteBase() }), t('ad.aff.acc.sent').replace('{email}', to)); };
  return <div className="mt-4 rounded-lg border border-white/10 bg-white/[.03] p-3">
    <p className="text-xs font-bold text-white/60">{t('ad.aff.acc.title')}</p>
    <p className={`mb-2 text-[11px] ${a.user_id ? 'text-emerald-300' : 'text-amber-300'}`}>{a.user_id ? '✓ ' + t('ad.aff.acc.islinked') : '⚠ ' + t('ad.aff.acc.notlinked')}</p>
    <div className="flex flex-wrap items-end gap-2"><label className="min-w-[14rem] flex-1"><span className="mb-1 block text-xs text-white/60">{t('ad.aff.acc.email')}</span><input type="email" maxLength={120} className={input} placeholder={a.email} value={em} onChange={e => setEm(e.target.value)} /></label>
      <button className="btn-blue" disabled={busy || !em.trim()} onClick={link}>{t('ad.aff.acc.link')}</button>
      {a.user_id && <button className="rounded-lg border border-white/15 px-3 py-2 text-xs" disabled={busy} onClick={unlink}>{t('ad.aff.acc.unlink')}</button>}
      <button className="rounded-lg border border-gold/40 px-3 py-2 text-xs text-gold" disabled={busy} onClick={reset}>{t('ad.aff.acc.reset')}</button></div>
    <p className="mt-1 text-[11px] text-white/45">{t('ad.aff.acc.note')}</p>
  </div>;
}
