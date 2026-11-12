import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { useT } from './i18n';
import { PLATFORMS, isHttp, socialItems, type SocialItem } from './SocialIcons';
const input = 'w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm';
const label = 'mb-1 block text-xs text-white/60';
export default function AdminSocial({ say }: { say: (s: string) => void }) {
  const t = useT();
  const [items, setItems] = useState<SocialItem[]>([]), [clicks, setClicks] = useState<Record<string, number>>({});
  useEffect(() => { (async () => {
    const [w, c] = await Promise.all([supabase.from('website_settings').select('key,value').in('key', ['social_links', 'social']), supabase.from('social_clicks').select('platform')]);
    const m: any = Object.fromEntries((w.data || []).map((r: any) => [r.key, r.value]));
    setItems(Array.isArray(m.social_links?.items) ? m.social_links.items : socialItems({ social: m.social }));
    const cc: Record<string, number> = {}; (c.data || []).forEach((r: any) => { cc[r.platform] = (cc[r.platform] || 0) + 1; }); setClicks(cc);
  })(); }, []);
  const upd = (id: string, patch: Partial<SocialItem>) => setItems(a => a.map(x => x.id === id ? { ...x, ...patch } : x));
  const move = (i: number, d: number) => setItems(a => { const b = [...a]; const j = i + d; if (j < 0 || j >= b.length) return a; [b[i], b[j]] = [b[j], b[i]]; return b; });
  const save = async () => {
    if (items.some(x => x.url.trim() && !isHttp(x.url))) { say(t('ad.soc.bad')); return; }
    const { error } = await supabase.from('website_settings').upsert({ key: 'social_links', value: { items: items.map(x => ({ ...x, url: x.url.trim() })) } }, { onConflict: 'key' });
    if (error) say(error.message); else say(t('ad.saved'));
  };
  return <>
    <h2 className="mb-4 text-2xl font-black">{t('ad.soc.title')}</h2>
    <div className="admin-panel p-4"><p className="mb-3 text-xs text-white/55">{t('ad.soc.help')}</p>
      {items.map((x, i) => <div key={x.id} className="mb-2 grid gap-2 rounded-xl border border-white/10 p-3 sm:grid-cols-[150px_1fr_auto]">
        <label><span className={label}>{t('ad.soc.platform')}</span><select className={input} value={x.platform} onChange={e => upd(x.id, { platform: e.target.value })}>{PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label><span className={label}>{t('ad.soc.url')}</span><input className={input} placeholder="https://" value={x.url} onChange={e => upd(x.id, { url: e.target.value })} /></label>
        <div className="flex flex-wrap items-end gap-2 text-xs"><label className="flex items-center gap-1 pb-2"><input type="checkbox" checked={x.show !== false} onChange={e => upd(x.id, { show: e.target.checked })} />{t('ad.soc.show')}</label>
          <button className="rounded border border-white/15 px-2 py-2" disabled={i === 0} onClick={() => move(i, -1)} aria-label={t('ad.soc.up')}>↑</button><button className="rounded border border-white/15 px-2 py-2" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label={t('ad.soc.down')}>↓</button>
          <button className="rounded border border-red-400/50 px-2 py-2 text-red-300" onClick={() => { if (window.confirm(t('ad.confirm'))) setItems(a => a.filter(y => y.id !== x.id)); }}>{t('ad.delete')}</button></div>
        <p className="text-[11px] text-white/45 sm:col-span-3">{t('ad.soc.clicks')}: {clicks[x.platform] || 0}</p></div>)}
      <div className="mt-3 flex flex-wrap gap-2"><button className="btn-blue" onClick={() => setItems(a => [...a, { id: 's' + Date.now(), platform: 'facebook', url: '', show: true }])}>{t('ad.soc.add')}</button><button className="btn-gold" onClick={save}>{t('ad.save')}</button></div></div></>;
}
