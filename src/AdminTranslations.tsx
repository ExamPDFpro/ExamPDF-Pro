import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { useT, en } from './i18n';
import { DEFAULT_PAGES, DEFAULT_TEXTS } from './lib/defaults';
const input = 'w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm';
type Row = { key: string; value: string; tkey?: string; long?: boolean };
export default function AdminTranslations({ say }: { say: (s: string) => void }) {
  const t = useT(); const E: any = en;
  const [rows, setRows] = useState<Row[]>([]), [ov, setOv] = useState<any>({ bn: {}, hi: {} }), [busy, setBusy] = useState(false);
  useEffect(() => { (async () => {
    const [w, c] = await Promise.all([supabase.from('website_settings').select('key,value'), supabase.from('exam_categories').select('id,name')]);
    const s: any = Object.fromEntries((w.data || []).map((r: any) => [r.key, r.value]));
    const T: any = { ...DEFAULT_TEXTS, ...(s.texts || {}) }, F = s.footer || {}, H = s.hero || {}, cfg = s.sections || {};
    const out: Row[] = []; const add = (key: string, value: any, tkey?: string, long = false) => { if (typeof value === 'string' && value.trim()) out.push({ key, value, tkey, long }); };
    add('brand.tagline', s.brand?.tagline || E['brand.tagline'], 'brand.tagline'); add('hdr.search', T.search_placeholder, 'hdr.search');
    add('hero.title', H.title || E['hero.title'], 'hero.title'); add('hero.highlight', H.highlight || E['hero.highlight'], 'hero.highlight'); add('hero.text', H.text || E['hero.text'], 'hero.text', true); add('hero.button', H.button_text, 'hero.button');
    (s.trust?.items || []).forEach((x: string, i: number) => add('trust.' + i, x, 'trust.' + (i + 1)));
    add('sec.popular', T.popular_title, 'sec.popular');
    ['best', 'featured', 'latest', 'offers'].forEach(id => { add('sec.' + id, cfg.titles?.[id] || E['sec.' + id], 'sec.' + id); add('secdesc.' + id, cfg.descs?.[id], undefined, true); });
    (c.data || []).forEach((x: any) => add('cat.' + x.id, x.name));
    add('rev.title', T.reviews_title, 'rev.title'); add('rev.sub', T.reviews_sub, 'rev.sub'); add('rev.button', T.reviews_button, 'rev.button'); add('rev.empty', T.reviews_empty, 'rev.empty');
    add('foot.about', F.support || E['foot.about'], 'foot.about', true); add('foot.quick', F.quick_title || E['foot.quick'], 'foot.quick'); add('foot.cats', F.cats_title || E['foot.cats'], 'foot.cats');
    add('foot.support', F.support_title || E['foot.support'], 'foot.support'); add('foot.legal', F.legal_title || E['foot.legal'], 'foot.legal');
    add('foot.copyright.custom', F.copyright); add('foot.secure', F.secure_text ?? E['foot.secure'], 'foot.secure');
    (s.pages?.items || DEFAULT_PAGES).forEach((p: any) => { add(`page.${p.id}.label`, p.label, E[`page.${p.id}`] !== undefined ? `page.${p.id}` : undefined); add(`page.${p.id}.content`, p.content, undefined, true); });
    setRows(out); setOv({ bn: s.i18n?.bn || {}, hi: s.i18n?.hi || {} });
  })(); }, []);
  const set = (l: 'bn' | 'hi', k: string, v: string) => setOv((o: any) => ({ ...o, [l]: { ...o[l], [k]: v } }));
  const isMissing = (l: 'bn' | 'hi', r: Row) => !(ov[l]?.[r.key] || '').trim() && !(r.tkey && r.value === E[r.tkey]);
  const missing = rows.reduce((n, r) => n + (isMissing('bn', r) ? 1 : 0) + (isMissing('hi', r) ? 1 : 0), 0);
  const save = async () => {
    setBusy(true); const clean: any = { bn: {}, hi: {} };
    (['bn', 'hi'] as const).forEach(l => Object.entries(ov[l] || {}).forEach(([k, v]) => { if (String(v).trim()) clean[l][k] = String(v); }));
    const { error } = await supabase.from('website_settings').upsert({ key: 'i18n', value: clean }, { onConflict: 'key' }); setBusy(false);
    if (error) say(error.message); else say(t('ad.saved'));
  };
  return <>
    <h2 className="mb-1 text-2xl font-black">{t('ad.tr.title')}</h2><p className="mb-4 text-xs text-white/55">{t('ad.tr.help')}</p>
    <div className="admin-panel p-4">
      {missing > 0 && <p className="mb-3 rounded-lg border border-gold/40 bg-gold/10 p-2 text-xs text-gold">{t('ad.tr.missing')}: {missing}</p>}
      {rows.length === 0 && <p className="py-6 text-center text-sm text-white/50">{t('ad.tr.empty')}</p>}
      {rows.map(r => <div key={r.key} className="mb-3 rounded-xl border border-white/10 p-3 text-sm"><p className="mb-1 text-[11px] text-white/40">{r.key}</p><p className="mb-2 text-xs text-white/70"><b className="text-white/50">{t('ad.tr.text')}: </b>{r.value.length > 160 ? r.value.slice(0, 160) + '…' : r.value}</p>
        <div className="grid gap-2 sm:grid-cols-2">{(['bn', 'hi'] as const).map(l => <label key={l}><span className="mb-1 block text-xs text-white/60">{t(l === 'bn' ? 'ad.tr.bn' : 'ad.tr.hi')}{isMissing(l, r) && <span className="ml-2 text-gold">•</span>}</span>
          {r.long ? <textarea rows={3} className={input} value={ov[l]?.[r.key] || ''} onChange={e => set(l, r.key, e.target.value)} /> : <input className={input} value={ov[l]?.[r.key] || ''} onChange={e => set(l, r.key, e.target.value)} />}</label>)}</div></div>)}
      <button className="btn-gold mt-2" disabled={busy} onClick={save}>{t('ad.tr.save')}</button></div></>;
}
