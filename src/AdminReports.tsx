import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { useT } from './i18n';
const Card = ({ title, children }: { title: string; children: any }) => <div className="admin-panel mb-4 p-4"><h3 className="mb-3 font-bold text-gold">{title}</h3>{children}</div>;
const Empty = ({ t }: { t: any }) => <p className="py-3 text-center text-sm text-white/50">{t('ad.none')}</p>;
export default function AdminReports() {
  const t = useT();
  const [r, setR] = useState<any>(null), [recent, setRecent] = useState<any[]>([]), [err, setErr] = useState('');
  useEffect(() => { (async () => {
    const { data, error } = await supabase.rpc('admin_reports'); if (error) { setErr(error.message); return; } setR(data);
    const { data: dl } = await supabase.from('download_logs').select('user_id,product_id,created_at').order('created_at', { ascending: false }).limit(15);
    const list = dl || []; const uids = [...new Set(list.map((x: any) => x.user_id))], pids = [...new Set(list.map((x: any) => x.product_id))];
    const [pr, pd] = await Promise.all([uids.length ? supabase.from('profiles').select('id,email').in('id', uids) : { data: [] }, pids.length ? supabase.from('pdf_products').select('id,title').in('id', pids) : { data: [] }]);
    const em: any = Object.fromEntries((pr.data || []).map((x: any) => [x.id, x.email])), ti: any = Object.fromEntries((pd.data || []).map((x: any) => [x.id, x.title]));
    setRecent(list.map((x: any) => ({ ...x, email: em[x.user_id] || '', title: ti[x.product_id] || '' })));
  })(); }, []);
  if (err) return <p className="text-sm text-gold">{err}</p>;
  if (!r) return <p className="text-sm text-white/60">{t('common.loading')}</p>;
  const th = 'px-2 py-1 text-left text-xs text-white/50', td = 'px-2 py-1.5 text-sm';
  const Tbl = ({ head, rows }: { head: string[]; rows: any[][] }) => rows.length ? <div className="overflow-x-auto"><table className="w-full"><thead><tr>{head.map(h => <th key={h} className={th}>{h}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i} className="border-t border-white/10">{row.map((c, j) => <td key={j} className={td}>{c}</td>)}</tr>)}</tbody></table></div> : <Empty t={t} />;
  return <>
    <h2 className="mb-4 text-2xl font-black">{t('ad.rep.title')}</h2>
    <div className="mb-4 grid gap-3 sm:grid-cols-2">
      <div className="admin-panel p-4"><p className="text-xs text-white/55">{t('ad.rep.direct')}</p><p className="mt-1 text-2xl font-black">₹{r.direct?.amount ?? 0}</p><p className="text-xs text-white/50">{t('ad.rep.orders')}: {r.direct?.orders ?? 0}</p></div>
      <div className="admin-panel p-4"><p className="text-xs text-white/55">{t('ad.rep.aff')}</p><p className="mt-1 text-2xl font-black">₹{r.affiliate?.amount ?? 0}</p><p className="text-xs text-white/50">{t('ad.rep.orders')}: {r.affiliate?.orders ?? 0} · {t('ad.rep.comm')}: ₹{r.affiliate?.commission ?? 0}</p></div>
    </div>
    <Card title={t('ad.rep.best')}><Tbl head={[t('ad.rep.pdf'), t('ad.rep.units'), t('ad.rep.revenue')]} rows={(r.best_sellers || []).map((x: any) => [x.title, x.units, '₹' + x.revenue])} /></Card>
    <Card title={t('ad.rep.coupons')}><Tbl head={['Code', t('ad.rep.uses'), t('ad.rep.disc')]} rows={(r.coupons || []).map((x: any) => [x.code, x.uses, '₹' + x.total_discount])} /></Card>
    <Card title={t('ad.rep.social')}><Tbl head={[t('ad.rep.platform'), t('ad.rep.clicks')]} rows={(r.social || []).map((x: any) => [x.platform, x.clicks])} /></Card>
    <Card title={t('ad.rep.shares')}><Tbl head={[t('ad.rep.pdf'), t('ad.rep.shared')]} rows={(r.shares || []).map((x: any) => [x.title, x.shares])} /></Card>
    <Card title={t('ad.rep.downloads')}><Tbl head={[t('ad.rep.pdf'), t('ad.rep.dl')]} rows={(r.downloads || []).map((x: any) => [x.title, x.downloads])} /></Card>
    <Card title={t('ad.rep.recent')}><Tbl head={[t('ad.rep.user'), t('ad.rep.pdf'), t('ad.rep.when')]} rows={recent.map(x => [x.email, x.title, new Date(x.created_at).toLocaleString()])} /></Card>
  </>;
}
