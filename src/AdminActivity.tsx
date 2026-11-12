import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { useT } from './i18n';
export default function AdminActivity({ say }: { say: (s: string) => void }) {
  const t = useT(); const [rows, setRows] = useState<any[]>([]);
  const load = async () => { const { data, error } = await supabase.from('activity_log').select('id,actor_email,action,entity,entity_id,created_at').order('created_at', { ascending: false }).limit(200); if (error) say(error.message); else setRows(data || []); };
  useEffect(() => { load(); }, []);
  return <>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="text-2xl font-black">{t('ad.act.title')}</h2><button className="btn-blue" onClick={load}>{t('ad.act.refresh')}</button></div>
    <div className="admin-panel overflow-x-auto p-4"><p className="mb-3 text-xs text-white/55">{t('ad.act.help')}</p>
      {rows.length === 0 ? <p className="py-6 text-center text-sm text-white/50">{t('ad.act.none')}</p> :
        <table className="w-full min-w-[560px] text-left text-sm"><thead className="text-xs text-white/55"><tr><th className="py-2">{t('ad.act.when')}</th><th>{t('ad.act.who')}</th><th>{t('ad.act.action')}</th><th>{t('ad.act.what')}</th></tr></thead>
          <tbody>{rows.map(r => <tr key={r.id} className="border-t border-white/10"><td className="py-2 pr-3 text-xs text-white/60">{new Date(r.created_at).toLocaleString()}</td><td className="pr-3">{r.actor_email}</td><td className="pr-3 font-semibold text-gold">{r.action}</td><td className="text-xs text-white/70">{r.entity}{r.entity_id ? ` · ${String(r.entity_id).slice(0, 8)}` : ''}</td></tr>)}</tbody></table>}</div></>;
}
