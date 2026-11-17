import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { useT } from './i18n';
const STATES = ['new', 'called', 'closed'] as const;
export default function AdminCallbacks({ say }: { say: (s: string) => void }) {
  const t = useT();
  const [rows, setRows] = useState<any[]>([]), [show, setShow] = useState<string>('new');
  const load = async () => { const { data, error } = await supabase.from('callback_requests').select('*').order('created_at', { ascending: false }).limit(300); if (error) say(error.message); else setRows(data || []); };
  useEffect(() => { load(); }, []);
  const set = async (id: string, status: string) => { const { error } = await supabase.from('callback_requests').update({ status }).eq('id', id); if (error) say(error.message); else { say(t('ad.saved')); load(); } };
  const del = async (id: string) => { if (!confirm(t('ad.cb.confirmdel'))) return; const { error } = await supabase.from('callback_requests').delete().eq('id', id); if (error) say(error.message); else load(); };
  const list = rows.filter(r => show === 'all' || r.status === show);
  return <>
    <h2 className="mb-2 text-2xl font-black">{t('ad.cb.title')}</h2>
    <p className="mb-4 text-xs text-white/60">{t('ad.cb.note')}</p>
    <div className="mb-3 flex flex-wrap gap-2">{['new', 'called', 'closed', 'all'].map(s => <button key={s} onClick={() => setShow(s)} className={`rounded-full border px-3 py-1 text-xs ${show === s ? 'border-gold bg-gold/15 text-gold' : 'border-white/15'}`}>{t(('ad.cb.st.' + s) as any)} ({s === 'all' ? rows.length : rows.filter(r => r.status === s).length})</button>)}</div>
    <div className="admin-panel p-4">
      {list.length === 0 && <p className="py-4 text-center text-sm text-white/50">{t('ad.cb.none')}</p>}
      {list.map(r => <div key={r.id} className="mb-2 rounded-xl border border-white/10 p-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-bold">{r.name} <span className="text-xs font-normal text-white/50">{new Date(r.created_at).toLocaleString()}</span></p>
          <a className="text-gold underline" href={`tel:${String(r.phone).replace(/[^\d+]/g, '')}`}>{r.phone}</a></div>
        {r.note && <p className="mt-1 text-xs text-white/70">{r.note}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-2">{STATES.map(s => <button key={s} disabled={r.status === s} onClick={() => set(r.id, s)} className={`rounded-lg border px-2 py-1 text-xs ${r.status === s ? 'border-gold text-gold' : 'border-white/15'}`}>{t(('ad.cb.st.' + s) as any)}</button>)}
          <button className="ml-auto text-xs text-red-300 underline" onClick={() => del(r.id)}>{t('ad.cb.del')}</button></div>
      </div>)}
    </div>
  </>;
}
