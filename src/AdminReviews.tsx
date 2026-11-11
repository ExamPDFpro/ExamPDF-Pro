import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { Stars } from './Reviews';
const input = 'w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm';
export default function AdminReviews({ say }: { say: (s: string) => void }) {
  const [rows, setRows] = useState<any[]>([]), [titles, setTitles] = useState<Record<string, string>>({}), [filter, setFilter] = useState('pending');
  const load = async () => {
    const [r, p] = await Promise.all([supabase.from('reviews').select('id,author_name,rating,comment,product_id,status,created_at').order('created_at', { ascending: false }), supabase.from('pdf_products').select('id,title')]);
    if (r.error) { say(r.error.message); return; } setRows(r.data || []); setTitles(Object.fromEntries((p.data || []).map((x: any) => [x.id, x.title])));
  };
  useEffect(() => { load(); }, []);
  const edit = (id: string, patch: any) => setRows(rs => rs.map(r => r.id === id ? { ...r, ...patch } : r));
  const save = async (r: any, status?: string) => {
    const { error } = await supabase.from('reviews').update({ author_name: r.author_name, rating: r.rating, comment: r.comment, ...(status ? { status } : {}) }).eq('id', r.id);
    if (error) say(error.message); else { say(status === 'published' ? 'Published ✓' : status === 'pending' ? 'Unpublished' : 'Saved ✓'); load(); }
  };
  const del = async (id: string) => { if (!confirm('এই review মুছে ফেলবেন?')) return; const { error } = await supabase.from('reviews').delete().eq('id', id); if (error) say(error.message); else { say('Deleted'); load(); } };
  const shown = rows.filter(r => filter === 'all' || r.status === filter);
  return <>
    <h2 className="mb-4 text-2xl font-black">Customer Reviews</h2>
    <div className="admin-panel p-4"><div className="mb-3 flex flex-wrap items-center gap-2"><p className="mr-auto text-xs text-white/55">নতুন review প্রথমে pending থাকে। Edit করে Publish করলে সাইটে দেখা যাবে।</p>{[['pending', 'Pending'], ['published', 'Published'], ['all', 'All']].map(([f, t]) => <button key={f} onClick={() => setFilter(f)} className={`rounded-full border px-3 py-1 text-xs ${filter === f ? 'border-gold bg-gold text-navy' : 'border-white/15 text-white/70'}`}>{t} ({f === 'all' ? rows.length : rows.filter(r => r.status === f).length})</button>)}</div>
      {shown.length === 0 && <p className="py-6 text-center text-sm text-white/50">কোনো review নেই।</p>}
      {shown.map(r => <div key={r.id} className="mb-3 rounded-xl border border-white/10 p-3 text-sm">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><span className="text-xs text-white/50">{new Date(r.created_at).toLocaleString()}{r.product_id && titles[r.product_id] ? ` · ${titles[r.product_id]}` : ''}</span><span className={`rounded-full border px-2 py-0.5 text-xs ${r.status === 'published' ? 'border-green-400/50 text-green-300' : 'border-gold/50 text-gold'}`}>{r.status}</span></div>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]"><input className={input} maxLength={60} value={r.author_name} onChange={e => edit(r.id, { author_name: e.target.value })} /><div className="flex items-center gap-2"><Stars n={r.rating} /><select className={input + ' !w-20'} value={r.rating} onChange={e => edit(r.id, { rating: Number(e.target.value) })}>{[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} ★</option>)}</select></div></div>
        <textarea className={input + ' mt-2'} rows={3} maxLength={1000} value={r.comment} onChange={e => edit(r.id, { comment: e.target.value })} />
        <div className="mt-2 flex flex-wrap gap-2"><button className="btn-blue !py-1" onClick={() => save(r)}>Save edits</button>{r.status !== 'published' ? <button className="btn-gold !py-1" onClick={() => save(r, 'published')}>Publish</button> : <button className="btn-blue !py-1" onClick={() => save(r, 'pending')}>Unpublish</button>}<button className="rounded-lg border border-red-400/50 px-3 py-1 text-xs text-red-300" onClick={() => del(r.id)}>Delete</button></div></div>)}
    </div></>;
}
