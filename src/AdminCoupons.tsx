import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { useT } from './i18n';
const input = 'w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm';
const label = 'mb-1 block text-xs text-white/60';
const blank = { id: '', code: '', kind: 'percent', value: '', expires: '', max_uses: '', per_user: '', min_order: '', product_ids: [] as string[], affiliate_id: '', is_active: true };
export default function AdminCoupons({ say }: { say: (s: string) => void }) {
  const t = useT();
  const [rows, setRows] = useState<any[]>([]), [stats, setStats] = useState<Record<string, any>>({}), [prods, setProds] = useState<any[]>([]), [affs, setAffs] = useState<any[]>([]), [f, setF] = useState<any>(blank);
  const load = async () => {
    const [c, r, p, a] = await Promise.all([supabase.from('coupons').select('*').order('created_at', { ascending: false }), supabase.rpc('admin_reports'), supabase.from('pdf_products').select('id,title').eq('is_published', true), supabase.from('affiliates').select('id,name').eq('status', 'active')]);
    if (c.error) { say(c.error.message); return; } setRows(c.data || []); setProds(p.data || []); setAffs(a.data || []);
    setStats(Object.fromEntries((r.data?.coupons || []).map((x: any) => [x.code, x])));
  };
  useEffect(() => { load(); }, []);
  const num = (v: string) => (v === '' ? null : Number(v));
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); const code = f.code.trim().toUpperCase(), value = Number(f.value);
    if (!/^[A-Z0-9_-]{3,30}$/.test(code)) { say(t('ad.cp.badcode')); return; }
    if (!(value > 0) || (f.kind === 'percent' && value > 100)) { say(t('ad.cp.badval')); return; }
    const row = { code, kind: f.kind, value, expires_at: f.expires ? new Date(f.expires + 'T23:59:59').toISOString() : null, max_uses: num(f.max_uses), max_uses_per_user: num(f.per_user), min_order: num(f.min_order), product_ids: f.product_ids.length ? f.product_ids : null, affiliate_id: f.affiliate_id || null, is_active: f.is_active };
    const { error } = f.id ? await supabase.from('coupons').update(row).eq('id', f.id) : await supabase.from('coupons').insert(row);
    if (error) say(/duplicate|unique/i.test(error.message) ? t('ad.cp.exists') : error.message); else { say(t('ad.saved')); setF(blank); load(); }
  };
  const editRow = (c: any) => setF({ id: c.id, code: c.code, kind: c.kind, value: String(c.value), expires: c.expires_at ? c.expires_at.slice(0, 10) : '', max_uses: c.max_uses ?? '', per_user: c.max_uses_per_user ?? '', min_order: c.min_order ?? '', product_ids: c.product_ids || [], affiliate_id: c.affiliate_id || '', is_active: c.is_active });
  return <>
    <h2 className="mb-4 text-2xl font-black">{t('ad.cp.title')}</h2>
    <form onSubmit={save} className="admin-panel mb-4 grid gap-3 p-4 sm:grid-cols-3">
      <label><span className={label}>{t('ad.cp.code')}</span><input required className={input} value={f.code} onChange={e => setF({ ...f, code: e.target.value.toUpperCase() })} maxLength={30} /></label>
      <label><span className={label}>{t('ad.cp.kind')}</span><select className={input} value={f.kind} onChange={e => setF({ ...f, kind: e.target.value })}><option value="percent">{t('ad.cp.percent')}</option><option value="flat">{t('ad.cp.flat')}</option></select></label>
      <label><span className={label}>{t('ad.cp.value')}</span><input required type="number" min="0" step="0.01" className={input} value={f.value} onChange={e => setF({ ...f, value: e.target.value })} /></label>
      <label><span className={label}>{t('ad.cp.expires')}</span><input type="date" className={input} value={f.expires} onChange={e => setF({ ...f, expires: e.target.value })} /></label>
      <label><span className={label}>{t('ad.cp.maxuses')}</span><input type="number" min="1" className={input} value={f.max_uses} onChange={e => setF({ ...f, max_uses: e.target.value })} /></label>
      <label><span className={label}>{t('ad.cp.peruser')}</span><input type="number" min="1" className={input} value={f.per_user} onChange={e => setF({ ...f, per_user: e.target.value })} /></label>
      <label><span className={label}>{t('ad.cp.minorder')}</span><input type="number" min="0" className={input} value={f.min_order} onChange={e => setF({ ...f, min_order: e.target.value })} /></label>
      <label className="sm:col-span-2"><span className={label}>{t('ad.cp.aff')}</span><select className={input} value={f.affiliate_id} onChange={e => setF({ ...f, affiliate_id: e.target.value })}><option value="">{t('ad.cp.noaff')}</option>{affs.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
      <div className="sm:col-span-3"><span className={label}>{t('ad.cp.pdfs')}</span><div className="grid max-h-40 gap-1 overflow-y-auto rounded-lg border border-white/10 p-2 sm:grid-cols-2">{prods.map(p => <label key={p.id} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={f.product_ids.includes(p.id)} onChange={e => setF({ ...f, product_ids: e.target.checked ? [...f.product_ids, p.id] : f.product_ids.filter((x: string) => x !== p.id) })} />{p.title}</label>)}</div></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.is_active} onChange={e => setF({ ...f, is_active: e.target.checked })} />{t('ad.cp.active')}</label>
      <div className="flex gap-2 sm:col-span-2"><button className="btn-gold">{f.id ? t('ad.cp.update') : t('ad.cp.create')}</button>{f.id && <button type="button" className="btn-blue" onClick={() => setF(blank)}>{t('common.cancel')}</button>}</div>
    </form>
    <div className="admin-panel p-4">{rows.length === 0 && <p className="py-4 text-center text-sm text-white/50">{t('ad.cp.none')}</p>}
      {rows.map(c => { const s = stats[c.code] || {}; return <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 py-2 text-sm first:border-0"><div><p className="font-bold">{c.code} <span className="text-xs font-normal text-white/55">{c.kind === 'percent' ? c.value + '%' : '₹' + c.value}{c.min_order ? ' · min ₹' + c.min_order : ''}{c.expires_at ? ' · ' + new Date(c.expires_at).toLocaleDateString() : ''}</span></p><p className="text-xs text-white/50">{t('ad.cp.used')}: {s.uses ?? 0}/{c.max_uses ?? t('ad.cp.unlimited')} · {t('ad.cp.given')}: ₹{s.total_discount ?? 0} · {c.product_ids?.length ? t('ad.cp.pdfsel', { n: c.product_ids.length }) : t('ad.cp.allpdfs')}{c.is_active ? '' : ' · ' + t('ad.cp.off')}</p></div>
        <div className="flex gap-2"><button className="btn-blue !py-1" onClick={() => editRow(c)}>{t('ad.edit')}</button><button className="rounded-lg border border-red-400/40 px-3 py-1 text-xs text-red-300" onClick={async () => { if (!confirm(t('ad.confirm'))) return; const { error } = await supabase.from('coupons').delete().eq('id', c.id); if (error) say(error.message); else load(); }}>{t('common.delete')}</button></div></div>; })}
    </div>
  </>;
}
