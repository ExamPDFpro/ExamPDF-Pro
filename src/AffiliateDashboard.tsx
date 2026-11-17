import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { siteBase } from './lib/share';
import { useT } from './i18n';
import { Auth } from './Account';
// The affiliate's own page (#affiliate). Everything comes from one server function keyed on the logged-in user,
// so an affiliate can only ever see their own numbers. No customer name, email or UTR is ever returned.
const input = 'input mt-1';
const FIELDS: [string, string][] = [['upi_id', 'ad.pd.upi'], ['bank_name', 'ad.pd.bank'], ['account_name', 'ad.pd.acname'], ['account_number', 'ad.pd.acno'], ['ifsc', 'ad.pd.ifsc']];
export default function AffiliateDashboard() {
  const t = useT();
  const [user, setUser] = useState<any>(undefined), [d, setD] = useState<any>(null), [busy, setBusy] = useState(false), [msg, setMsg] = useState('');
  const [f, setF] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: s } = supabase.auth.onAuthStateChange((_, ses) => setUser(ses?.user ?? null));
    return () => s.subscription.unsubscribe();
  }, []);
  const load = async () => {
    const { data, error } = await supabase.rpc('my_affiliate');
    if (error) { setD({ linked: false }); return; }
    setD(data); setF(Object.fromEntries(FIELDS.map(([k]) => [k, (data?.payout?.[k] as string) || ''])));
  };
  useEffect(() => { if (user) load(); else setD(null); }, [user?.id]);
  const save = async () => {
    setBusy(true); setMsg('');
    const { error } = await supabase.rpc('my_affiliate_set_payout', { p_upi: f.upi_id || '', p_bank: f.bank_name || '', p_acname: f.account_name || '', p_acno: f.account_number || '', p_ifsc: f.ifsc || '' });
    setBusy(false); setMsg(error ? t('ad.pd.invalid') : t('ad.pd.saved'));
  };
  const url = (l: any) => l.product ? `${siteBase()}#/pdf/${l.product}?ref=${l.slug}` : `${siteBase()}?ref=${l.slug}`;
  const copy = async (u: string) => { try { await navigator.clipboard.writeText(u); setMsg(t('ad.pd.copied')); } catch { /* ignore */ } };
  const Stat = ({ k, v }: { k: string; v: any }) => <div className="rounded-xl bg-white/5 p-3"><p className="text-[11px] text-white/55">{k}</p><p className="text-lg font-bold">{v}</p></div>;
  const home = <a href="./" className="btn-blue !px-3 !py-2 text-xs">{t('ad.pd.back')}</a>;
  let body;
  if (!isSupabaseConfigured || user === undefined) body = null;
  else if (!user) body = <Auth onClose={() => { location.hash = ''; location.reload(); }} onDone={() => undefined} />;
  else if (!d) body = <p className="text-sm text-white/60">…</p>;
  else if (!d.linked) body = <p className="rounded-xl border border-gold/25 bg-gold/5 p-4 text-sm text-white/80">{t('ad.pd.nolink')}</p>;
  else body = <>
    <h2 className="mb-1 text-2xl font-black">{d.name}</h2>
    <p className="mb-4 text-xs text-white/55">{t('ad.pd.rate')}: {d.pct}%{d.status !== 'active' ? ' · ' + t('ad.pd.inactive') : ''}</p>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><Stat k={t('ad.pd.clicks')} v={d.clicks} /><Stat k={t('ad.pd.sales')} v={d.sales} /><Stat k={t('ad.pd.amount')} v={'₹' + d.sales_amount} /><Stat k={t('ad.pd.earned')} v={'₹' + d.earned} /><Stat k={t('ad.pd.paid')} v={'₹' + d.paid} /><Stat k={t('ad.pd.pending')} v={'₹' + d.pending} /><Stat k={t('ad.pd.cancelled')} v={'₹' + d.cancelled} /></div>
    <h3 className="mb-2 mt-6 font-bold text-gold">{t('ad.pd.links')}</h3>
    {d.links.length === 0 && <p className="text-sm text-white/50">{t('ad.pd.none')}</p>}
    {d.links.map((l: any) => <div key={l.slug} className="mb-2 flex flex-wrap items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs"><code className="min-w-0 flex-1 break-all text-white/80">{url(l)}</code><span className="text-white/50">{t('ad.pd.clicks')}: {l.clicks}</span><button className="text-gold underline" onClick={() => copy(url(l))}>{t('ad.pd.copy')}</button></div>)}
    <h3 className="mb-2 mt-6 font-bold text-gold">{t('ad.pd.recent')}</h3>
    {d.recent.length === 0 && <p className="text-sm text-white/50">{t('ad.pd.none')}</p>}
    {d.recent.map((r: any, i: number) => <p key={i} className="border-b border-white/10 py-1.5 text-sm">{new Date(r.date).toLocaleDateString()} · ₹{r.amount} · <b>₹{r.commission}</b> <span className="text-xs text-white/50">({r.state})</span></p>)}
    <h3 className="mb-2 mt-6 font-bold text-gold">{t('ad.pd.payouts')}</h3>
    {d.payouts.length === 0 && <p className="text-sm text-white/50">{t('ad.pd.none')}</p>}
    {d.payouts.map((p: any, i: number) => <p key={i} className="border-b border-white/10 py-1.5 text-sm">{new Date(p.date).toLocaleDateString()} · ₹{p.amount}{p.method ? ' · ' + p.method : ''}</p>)}
    {d.status === 'active' && <div className="mt-6 rounded-xl border border-gold/25 p-4"><h3 className="font-bold text-gold">{t('ad.pd.payout')}</h3><p className="mb-3 text-xs text-white/55">{t('ad.pd.note')}</p>
      <div className="grid gap-3 sm:grid-cols-2">{FIELDS.map(([k, tk]) => <label key={k} className="text-sm">{t(tk as any)}<input className={input} maxLength={80} autoComplete="off" value={f[k] || ''} onChange={e => setF({ ...f, [k]: e.target.value })} /></label>)}</div>
      <button disabled={busy} onClick={save} className="btn-gold mt-3">{t('ad.pd.save')}</button></div>}
    {msg && <p className="mt-3 text-sm text-gold">{msg}</p>}
  </>;
  return <main className="min-h-screen bg-navy p-4 text-white"><div className="mx-auto max-w-3xl">
    <div className="mb-5 flex items-center justify-between"><h1 className="text-xl font-black text-gold">{t('ad.pd.title')}</h1><div className="flex gap-2">{home}{user && <button className="rounded-lg border border-white/15 px-3 py-2 text-xs" onClick={async () => { await supabase.auth.signOut(); }}>{t('ad.pd.logout')}</button>}</div></div>
    {body}</div></main>;
}
