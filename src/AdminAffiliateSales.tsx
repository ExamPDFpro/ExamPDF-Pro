import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { useT } from './i18n';
// Main-admin-only add-ons for the Affiliates tab (the server enforces this too: RLS + a role check inside the function).
const input = 'w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm';
const label = 'mb-1 block text-xs text-white/60';
const blank = { upi_id: '', bank_name: '', account_name: '', account_number: '', ifsc: '' };
const nz = (s: string) => { const v = (s || '').trim(); return v ? v : null; };

/** The affiliate's own UPI / bank details (where their commission is paid). */
export function PayoutDetailsForm({ affiliateId, say }: { affiliateId: string; say: (s: string) => void }) {
  const t = useT();
  const [f, setF] = useState<Record<string, string>>(blank), [ok, setOk] = useState(true), [has, setHas] = useState(false), [busy, setBusy] = useState(false);
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('affiliate_payout_details').select('upi_id,bank_name,account_name,account_number,ifsc').eq('affiliate_id', affiliateId).maybeSingle();
      if (error) { setOk(false); return; }   // table not available yet: hide the form, the rest of the page keeps working
      if (data) { setHas(true); setF({ ...blank, ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, (v as string) || ''])) }); }
    })();
  }, [affiliateId]);
  if (!ok) return null;
  const save = async () => {
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const row = { affiliate_id: affiliateId, upi_id: nz(f.upi_id), bank_name: nz(f.bank_name), account_name: nz(f.account_name), account_number: nz(f.account_number), ifsc: nz((f.ifsc || '').toUpperCase()), updated_at: new Date().toISOString(), updated_by: u?.user?.id || null };
    const { error } = await supabase.from('affiliate_payout_details').upsert(row, { onConflict: 'affiliate_id' });
    setBusy(false);
    if (error) say(/check|violat/i.test(error.message) ? t('ad.aff.pd.invalid') : error.message); else { setHas(true); say(t('ad.saved')); }
  };
  const fields: [string, string][] = [['upi_id', 'ad.aff.pd.upi'], ['bank_name', 'ad.aff.pd.bank'], ['account_name', 'ad.aff.pd.acname'], ['account_number', 'ad.aff.pd.acno'], ['ifsc', 'ad.aff.pd.ifsc']];
  return <div className="mt-4 rounded-lg border border-gold/20 bg-white/[.03] p-3">
    <p className="text-xs font-bold text-white/60">{t('ad.aff.pd.title')}</p>
    <p className="mb-2 text-[11px] text-white/45">{t('ad.aff.pd.note')}</p>
    <div className="grid gap-2 sm:grid-cols-3">{fields.map(([k, tk]) => <label key={k}><span className={label}>{t(tk as any)}</span><input className={input} maxLength={80} autoComplete="off" value={f[k] || ''} onChange={e => setF({ ...f, [k]: e.target.value })} /></label>)}
      <button className="btn-blue self-end" disabled={busy} onClick={save}>{t('ad.aff.pd.save')}</button></div>
    {!has && <p className="mt-1 text-[11px] text-white/40">{t('ad.aff.pd.none')}</p>}
  </div>;
}

/** Every affiliate-attributed sale: customer UTR + the affiliate's payout details, side by side. */
export function AffiliateSales({ say }: { say: (s: string) => void }) {
  const t = useT();
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc('admin_affiliate_sales');
      if (error) { setRows(null); return; }   // function not available yet (or not main admin): show nothing
      setRows(data || []);
    })();
  }, []);
  if (rows === null) return null;
  const bank = (r: any) => [r.pay_bank, r.pay_acname, r.pay_acno && ('A/C ' + r.pay_acno), r.pay_ifsc].filter(Boolean).join(' · ');
  const copy = async (s: string) => { try { await navigator.clipboard.writeText(s); say(t('ad.copied')); } catch { /* ignore */ } };
  return <div className="admin-panel mb-4 p-4"><h3 className="mb-1 font-bold text-gold">{t('ad.aff.sales.title')}</h3><p className="mb-3 text-xs text-white/50">{t('ad.aff.sales.note')}</p>
    {rows.length === 0 && <p className="py-3 text-center text-sm text-white/50">{t('ad.aff.sales.none')}</p>}
    {rows.map(r => <div key={r.o_id} className="mb-2 rounded-xl border border-white/10 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">{r.aff_name} <span className="text-xs font-normal text-white/50">{new Date(r.o_created).toLocaleString()}</span></p>
        <span className="rounded-full border border-white/15 px-2 py-0.5 text-xs">{r.order_state} · {r.commission_state}</span></div>
      <p className="mt-1 text-xs text-white/60">{r.pdfs}{r.coupon ? ` · ${t('ad.aff.sales.coupon')}: ${r.coupon}` : ''}</p>
      <div className="mt-2 grid gap-2 text-xs sm:grid-cols-4"><p><span className="text-white/50">{t('ad.aff.sales.paid')}</span><br /><b>₹{r.total}</b></p><p><span className="text-white/50">{t('ad.aff.sales.commission')}</span><br /><b>₹{r.commission} ({r.pct}%)</b></p>
        <p className="sm:col-span-2"><span className="text-white/50">{t('ad.aff.sales.utr')}</span><br /><b className="select-all break-all">{r.utr || '—'}</b>{r.utr && <button className="ml-2 text-gold underline" onClick={() => copy(r.utr)}>{t('ad.aff.sales.copy')}</button>}</p></div>
      <p className="mt-2 text-xs"><span className="text-white/50">{t('ad.aff.sales.payto')}: </span>{r.pay_upi || bank(r) ? <>{r.pay_upi && <b className="select-all">{r.pay_upi}</b>}{r.pay_upi && bank(r) ? ' · ' : ''}{bank(r) && <span className="select-all">{bank(r)}</span>}</> : <span className="text-white/40">{t('ad.aff.pd.none')}</span>}</p>
    </div>)}
  </div>;
}
