import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { useT, type Key } from './i18n';
import { siteBase } from './lib/share';
const input = 'w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm';
const label = 'mb-1 block text-xs text-white/60';
const PLATFORMS = ['YouTube', 'Facebook', 'Instagram', 'Telegram', 'WhatsApp', 'X', 'Other'];
const STATUSES = ['applied', 'active', 'disabled', 'rejected'] as const;
export default function AdminAffiliates({ say }: { say: (s: string) => void }) {
  const t = useT();
  const [affs, setAffs] = useState<any[]>([]), [stats, setStats] = useState<Record<string, any>>({}), [links, setLinks] = useState<any[]>([]), [pays, setPays] = useState<any[]>([]), [prods, setProds] = useState<any[]>([]), [pdfClicks, setPdfClicks] = useState<any[]>([]), [uid, setUid] = useState('');
  const [nf, setNf] = useState({ name: '', email: '', phone: '', platform: 'YouTube', channel_url: '', commission_pct: '10', status: 'active' });
  const [lf, setLf] = useState<Record<string, { slug: string; product: string }>>({}), [pf, setPf] = useState<Record<string, { amount: string; method: string; reference: string; note: string }>>({});
  const load = async () => {
    const [a, s, l, p, pr, pc, u] = await Promise.all([supabase.from('affiliates').select('*').order('created_at', { ascending: false }), supabase.rpc('affiliate_stats'), supabase.from('affiliate_links').select('*').order('created_at', { ascending: false }), supabase.from('affiliate_payouts').select('*').order('paid_at', { ascending: false }), supabase.from('pdf_products').select('id,title,slug').eq('is_published', true), supabase.rpc('affiliate_pdf_clicks'), supabase.auth.getUser()]);
    if (a.error) { say(a.error.message); return; }
    setAffs(a.data || []); setStats(Object.fromEntries((s.data || []).map((x: any) => [x.affiliate_id, x]))); setLinks(l.data || []); setPays(p.data || []); setProds(pr.data || []); setPdfClicks(pc.data || []); setUid(u.data?.user?.id || '');
  };
  useEffect(() => { load(); }, []);
  const pctOk = (v: any) => { const n = Number(v); return v !== '' && n >= 0 && n <= 100; };
  const add = async (e: React.FormEvent) => {
    e.preventDefault(); if (!pctOk(nf.commission_pct)) { say(t('ad.aff.badpct')); return; }
    const { error } = await supabase.from('affiliates').insert({ name: nf.name.trim(), email: nf.email.trim(), phone: nf.phone || null, platform: nf.platform, channel_url: nf.channel_url || null, commission_pct: Number(nf.commission_pct), status: nf.status });
    if (error) say(error.message); else { say(t('ad.saved')); setNf({ ...nf, name: '', email: '', phone: '', channel_url: '' }); load(); }
  };
  const upd = async (id: string, patch: any) => { if ('commission_pct' in patch && !pctOk(patch.commission_pct)) { say(t('ad.aff.badpct')); return; } const { error } = await supabase.from('affiliates').update(patch).eq('id', id); if (error) say(error.message); else { say(t('ad.saved')); load(); } };
  const edit = (id: string, patch: any) => setAffs(a => a.map(x => x.id === id ? { ...x, ...patch } : x));
  const mkLink = async (aff: any) => {
    const f = lf[aff.id] || { slug: '', product: '' }; const slug = f.slug.trim().toLowerCase();
    if (!/^[a-z0-9_-]{3,40}$/.test(slug)) { say(t('ad.aff.badslug')); return; }
    const { error } = await supabase.from('affiliate_links').insert({ affiliate_id: aff.id, slug, product_id: f.product || null });
    if (error) say(/duplicate|unique/i.test(error.message) ? t('ad.aff.badslug') : error.message); else { say(t('ad.saved')); setLf({ ...lf, [aff.id]: { slug: '', product: '' } }); load(); }
  };
  const linkUrl = (l: any) => { const pd = l.product_id ? prods.find(p => p.id === l.product_id) : null; return pd?.slug ? `${siteBase()}#/pdf/${pd.slug}?ref=${l.slug}` : `${siteBase()}?ref=${l.slug}`; };
  const copy = async (u: string) => { try { await navigator.clipboard.writeText(u); } catch { /* ignore */ } say(t('ad.copied')); };
  const pay = async (aff: any) => {
    const f = pf[aff.id] || { amount: '', method: '', reference: '', note: '' }; const amount = Number(f.amount); if (!(amount > 0)) return;
    const { error } = await supabase.from('affiliate_payouts').insert({ affiliate_id: aff.id, amount, method: f.method || null, reference: f.reference || null, note: f.note || null, created_by: uid || null });
    if (error) say(error.message); else { say(t('ad.saved')); setPf({ ...pf, [aff.id]: { amount: '', method: '', reference: '', note: '' } }); load(); }
  };
  const Stat = ({ k, v }: { k: string; v: any }) => <div className="rounded-lg bg-white/5 p-2"><p className="text-[10px] text-white/50">{k}</p><p className="text-sm font-bold">{v}</p></div>;
  return <>
    <h2 className="mb-2 text-2xl font-black">{t('ad.aff.title')}</h2>
    <p className="mb-4 rounded-xl border border-gold/25 bg-gold/5 p-3 text-xs leading-5 text-white/70">{t('ad.aff.note')}</p>
    <form onSubmit={add} className="admin-panel mb-4 grid gap-3 p-4 sm:grid-cols-3"><h3 className="font-bold text-gold sm:col-span-3">{t('ad.aff.add')}</h3>
      <label><span className={label}>{t('ad.aff.name')}</span><input required maxLength={80} className={input} value={nf.name} onChange={e => setNf({ ...nf, name: e.target.value })} /></label>
      <label><span className={label}>{t('ad.aff.email')}</span><input required type="email" maxLength={120} className={input} value={nf.email} onChange={e => setNf({ ...nf, email: e.target.value })} /></label>
      <label><span className={label}>{t('ad.aff.phone')}</span><input maxLength={30} className={input} value={nf.phone} onChange={e => setNf({ ...nf, phone: e.target.value })} /></label>
      <label><span className={label}>{t('ad.aff.platform')}</span><select className={input} value={nf.platform} onChange={e => setNf({ ...nf, platform: e.target.value })}>{PLATFORMS.map(p => <option key={p}>{p}</option>)}</select></label>
      <label><span className={label}>{t('ad.aff.channel')}</span><input maxLength={300} className={input} placeholder="https://" value={nf.channel_url} onChange={e => setNf({ ...nf, channel_url: e.target.value })} /></label>
      <label><span className={label}>{t('ad.aff.pct')}</span><input type="number" min={0} max={100} step="0.01" className={input} value={nf.commission_pct} onChange={e => setNf({ ...nf, commission_pct: e.target.value })} /></label>
      <button className="btn-gold sm:col-span-3 sm:w-fit">{t('ad.aff.add')}</button></form>
    <div className="admin-panel mb-4 p-4"><h3 className="mb-3 font-bold text-gold">{t('ad.aff.list')}</h3>
      {affs.length === 0 && <p className="py-4 text-center text-sm text-white/50">{t('ad.aff.none')}</p>}
      {affs.map(a => { const s = stats[a.id] || {}; const my = links.filter(l => l.affiliate_id === a.id); const myPays = pays.filter(p => p.affiliate_id === a.id); const f = lf[a.id] || { slug: '', product: '' }; const p = pf[a.id] || { amount: '', method: '', reference: '', note: '' };
        return <div key={a.id} className="mb-4 rounded-xl border border-white/10 p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-bold">{a.name} <span className="text-xs font-normal text-white/50">{a.email}{a.phone ? ' · ' + a.phone : ''}</span></p><p className="text-xs text-white/50">{a.platform}{a.channel_url ? ' · ' : ''}{a.channel_url && <a className="underline" href={a.channel_url} target="_blank" rel="noopener noreferrer">{a.channel_url}</a>}</p></div>
            <div className="flex flex-wrap items-center gap-2"><select className={input + ' !w-auto'} value={a.status} onChange={e => edit(a.id, { status: e.target.value })}>{STATUSES.map(x => <option key={x} value={x}>{t(('ad.aff.st.' + x) as Key)}</option>)}</select>
              <label className="flex items-center gap-1 text-xs">{t('ad.aff.pct')}<input type="number" min={0} max={100} step="0.01" className={input + ' !w-20'} value={a.commission_pct} onChange={e => edit(a.id, { commission_pct: e.target.value })} /></label>
              {a.status === 'applied' && <button className="btn-gold !py-1" onClick={() => upd(a.id, { status: 'active', commission_pct: Number(a.commission_pct) })}>{t('ad.aff.approve')}</button>}
              <button className="btn-blue !py-1" onClick={() => upd(a.id, { status: a.status, commission_pct: Number(a.commission_pct) })}>{t('common.save')}</button></div></div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7"><Stat k={t('ad.aff.clicks')} v={s.clicks ?? 0} /><Stat k={t('ad.aff.sales')} v={s.sales ?? 0} /><Stat k={t('ad.aff.amount')} v={'₹' + (s.sales_amount ?? 0)} /><Stat k={t('ad.aff.earned')} v={'₹' + (s.commission_earned ?? 0)} /><Stat k={t('ad.aff.cancelled')} v={'₹' + (s.commission_cancelled ?? 0)} /><Stat k={t('ad.aff.paid')} v={'₹' + (s.commission_paid ?? 0)} /><Stat k={t('ad.aff.pending')} v={'₹' + (s.commission_pending ?? 0)} /></div>
          <p className="mb-1 mt-4 text-xs font-bold text-white/60">{t('ad.aff.links')}</p>
          {my.map(l => { const u = linkUrl(l); return <div key={l.id} className="mb-1 flex flex-wrap items-center gap-2 rounded-lg bg-white/5 px-2 py-1.5 text-xs"><code className="min-w-0 flex-1 break-all text-white/80">{u}</code><button className="btn-blue !py-0.5" onClick={() => copy(u)}>{t('ad.aff.copy')}</button><label className="flex items-center gap-1"><input type="checkbox" checked={l.is_active} onChange={async e => { const { error } = await supabase.from('affiliate_links').update({ is_active: e.target.checked }).eq('id', l.id); if (error) say(error.message); else load(); }} />{t('ad.aff.active')}</label><button className="rounded border border-red-400/40 px-2 py-0.5 text-red-300" onClick={async () => { if (!confirm(t('ad.confirm'))) return; const { error } = await supabase.from('affiliate_links').delete().eq('id', l.id); if (error) say(error.message); else load(); }}>{t('common.delete')}</button></div>; })}
          <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><label><span className={label}>{t('ad.aff.slug')}</span><input className={input} value={f.slug} onChange={e => setLf({ ...lf, [a.id]: { ...f, slug: e.target.value } })} /></label><label><span className={label}>{t('ad.aff.scope')}</span><select className={input} value={f.product} onChange={e => setLf({ ...lf, [a.id]: { ...f, product: e.target.value } })}><option value="">{t('ad.aff.site')}</option>{prods.map(x => <option key={x.id} value={x.id}>{x.title}</option>)}</select></label><button className="btn-gold self-end" onClick={() => mkLink(a)}>{t('ad.aff.mklink')}</button></div>
          <p className="mb-1 mt-4 text-xs font-bold text-white/60">{t('ad.aff.payout')}</p>
          <div className="grid gap-2 sm:grid-cols-5"><input type="number" min={0} step="0.01" className={input} placeholder={t('ad.aff.amt')} value={p.amount} onChange={e => setPf({ ...pf, [a.id]: { ...p, amount: e.target.value } })} /><input className={input} placeholder={t('ad.aff.method')} value={p.method} onChange={e => setPf({ ...pf, [a.id]: { ...p, method: e.target.value } })} /><input className={input} placeholder={t('ad.aff.ref')} value={p.reference} onChange={e => setPf({ ...pf, [a.id]: { ...p, reference: e.target.value } })} /><input className={input} placeholder={t('ad.aff.pnote')} value={p.note} onChange={e => setPf({ ...pf, [a.id]: { ...p, note: e.target.value } })} /><button className="btn-gold" onClick={() => pay(a)}>{t('ad.aff.payout')}</button></div>
          {myPays.length > 0 && <div className="mt-2 text-xs text-white/60"><p className="font-bold">{t('ad.aff.payouts')}</p>{myPays.map(x => <p key={x.id}>{new Date(x.paid_at).toLocaleDateString()} · ₹{x.amount}{x.method ? ' · ' + x.method : ''}{x.reference ? ' · ' + x.reference : ''}{x.note ? ' · ' + x.note : ''}</p>)}</div>}
        </div>; })}
    </div>
    <div className="admin-panel p-4"><h3 className="mb-3 font-bold text-gold">{t('ad.aff.pdfclicks')}</h3>{pdfClicks.length === 0 ? <p className="py-3 text-center text-sm text-white/50">{t('ad.none')}</p> : pdfClicks.map((x: any) => <p key={x.product_id} className="flex justify-between border-t border-white/10 py-1.5 text-sm"><span>{x.title}</span><b>{x.clicks}</b></p>)}</div>
  </>;
}
