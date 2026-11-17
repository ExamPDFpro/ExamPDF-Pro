import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { useT } from './i18n';
// Main admin: (1) website notice / announcement bar, (2) send a free push notification to everyone who turned notifications on.
const input = 'w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm';
const label = 'mb-1 block text-xs text-white/60';
export default function AdminNotify({ say }: { say: (s: string) => void }) {
  const t = useT();
  const [n, setN] = useState<any>({ enabled: false, text: { en: '', bn: '', hi: '' }, url: '' }), [subs, setSubs] = useState<number | null>(null), [busy, setBusy] = useState(false);
  const [m, setM] = useState({ title: '', body: '', url: '' }), [res, setRes] = useState('');
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('website_settings').select('value').eq('key', 'notice').maybeSingle();
      if (data?.value) setN({ enabled: false, url: '', ...data.value, text: { en: '', bn: '', hi: '', ...(data.value.text || {}) } });
      const { count } = await supabase.from('push_subscriptions').select('id', { count: 'exact', head: true }); setSubs(count ?? 0);
    })();
  }, []);
  const saveNotice = async () => {
    setBusy(true);
    const value = { ...n, url: (n.url || '').trim(), id: String(Date.now()) };   // new id = visitors who closed the old notice see the new one
    const { error } = await supabase.from('website_settings').upsert({ key: 'notice', value }, { onConflict: 'key' });
    setBusy(false); if (error) say(error.message); else { setN(value); say(t('ad.saved')); }
  };
  const send = async () => {
    if (!m.title.trim() || !m.body.trim()) return;
    if (!confirm(t('ad.nt.confirm').replace('{n}', String(subs ?? 0)))) return;
    setBusy(true); setRes('');
    const { data, error } = await supabase.functions.invoke('send-push', { body: { title: m.title.trim(), body: m.body.trim(), url: m.url.trim() } });
    setBusy(false);
    if (error || data?.error) { setRes(t('ad.nt.fail')); return; }
    setRes(t('ad.nt.result').replace('{sent}', String(data.sent)).replace('{failed}', String(data.failed)));
    setSubs(data.total - (data.removed || 0)); setM({ title: '', body: '', url: '' });
  };
  return <>
    <h2 className="mb-4 text-2xl font-black">{t('ad.nt.title')}</h2>
    <div className="admin-panel mb-4 grid gap-3 p-4"><h3 className="font-bold text-gold">{t('ad.nt.notice')}</h3><p className="text-xs text-white/55">{t('ad.nt.noticenote')}</p>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!n.enabled} onChange={e => setN({ ...n, enabled: e.target.checked })} />{t('ad.nt.show')}</label>
      {(['en', 'bn', 'hi'] as const).map(l => <label key={l}><span className={label}>{t('ad.nt.text')} ({l === 'en' ? 'English' : l === 'bn' ? 'বাংলা' : 'हिन्दी'})</span><textarea rows={2} maxLength={300} className={input} value={n.text?.[l] || ''} onChange={e => setN({ ...n, text: { ...n.text, [l]: e.target.value } })} /></label>)}
      <label><span className={label}>{t('ad.nt.link')}</span><input maxLength={300} className={input} placeholder="https://" value={n.url || ''} onChange={e => setN({ ...n, url: e.target.value })} /></label>
      <button className="btn-gold w-fit" disabled={busy} onClick={saveNotice}>{t('ad.nt.savenotice')}</button></div>
    <div className="admin-panel grid gap-3 p-4"><h3 className="font-bold text-gold">{t('ad.nt.push')}</h3><p className="text-xs text-white/55">{t('ad.nt.pushnote')} <b>{t('ad.nt.subs')}: {subs ?? '…'}</b></p>
      <label><span className={label}>{t('ad.nt.mtitle')}</span><input maxLength={80} className={input} value={m.title} onChange={e => setM({ ...m, title: e.target.value })} /></label>
      <label><span className={label}>{t('ad.nt.mbody')}</span><textarea rows={3} maxLength={200} className={input} value={m.body} onChange={e => setM({ ...m, body: e.target.value })} /></label>
      <label><span className={label}>{t('ad.nt.link')}</span><input maxLength={300} className={input} placeholder="https://" value={m.url} onChange={e => setM({ ...m, url: e.target.value })} /></label>
      <button className="btn-blue w-fit" disabled={busy || !m.title.trim() || !m.body.trim() || !subs} onClick={send}>{t('ad.nt.send')}</button>
      {res && <p className="text-sm text-gold">{res}</p>}</div>
  </>;
}
