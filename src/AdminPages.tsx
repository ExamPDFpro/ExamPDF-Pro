import { Plus, Save, Trash2 } from 'lucide-react';
import { DEFAULT_PAGES, type PageItem } from './lib/defaults';
const input = 'w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm';
const label = 'mb-1 block text-xs text-white/60';
export default function AdminPages({ settings, setSettings, saveSettings, saving }: any) {
  const items: PageItem[] = settings.pages?.items ?? DEFAULT_PAGES;
  const setItems = (fn: (a: PageItem[]) => PageItem[]) => setSettings((s: any) => ({ ...s, pages: { items: fn(s.pages?.items ?? DEFAULT_PAGES) } }));
  const upd = (id: string, patch: Partial<PageItem>) => setItems(a => a.map(x => x.id === id ? { ...x, ...patch } : x));
  const setF = (k: string, v: any) => setSettings((s: any) => ({ ...s, footer: { ...(s.footer || {}), [k]: v } }));
  const F = settings.footer || {};
  const groups: [string, string][] = [['quick', 'Quick Links'], ['support', 'Customer Support'], ['legal', 'Legal']];
  return <>
    <h2 className="mb-4 text-2xl font-black">Footer & Pages</h2>
    <div className="admin-panel mb-4 p-4"><h3 className="mb-3 font-bold text-gold">Footer লেখা</h3>
      <div className="grid gap-3 sm:grid-cols-2">{[['quick_title', 'Quick Links', 'কলামের নাম ১'], ['cats_title', 'Categories', 'কলামের নাম ২'], ['support_title', 'Customer Support', 'কলামের নাম ৩'], ['legal_title', 'Legal', 'কলামের নাম ৪'], ['secure_text', 'Secure learning. Smarter preparation.', 'নিচের ডানদিকের লেখা']].map(([k, d, t]) => <label key={k}><span className={label}>{t}</span><input className={input} placeholder={d} value={F[k] ?? ''} onChange={e => setF(k, e.target.value)} /></label>)}
        <label className="flex items-center gap-2 pt-5 text-sm"><input type="checkbox" checked={F.show_language !== false} onChange={e => setF('show_language', e.target.checked)} /> Language বক্স দেখান</label></div>
      <p className="mt-2 text-xs text-white/45">লোগো, ট্যাগলাইন লেখা, কপিরাইট ও সোশ্যাল লিংক “Settings” ট্যাবে আছে।</p>
      <button className="btn-gold mt-3" disabled={saving} onClick={() => saveSettings(['footer'])}><Save size={15} className="mr-1 inline" /> Save Footer</button></div>
    <div className="admin-panel p-4"><h3 className="mb-1 font-bold text-gold">Footer Pages</h3><p className="mb-3 text-xs text-white/50">এখানকার প্রতিটি পেজ ফুটারে লিংক হিসেবে দেখাবে। ক্লিক করলে লেখাটা পপআপে খুলবে। বাইরের লিংক দিলে সেটাই খুলবে।</p>
      {groups.map(([g, gt]) => <div key={g} className="mb-4"><p className="mb-2 text-sm font-bold text-white/70">{gt}</p>
        {items.filter(x => x.group === g).map(x => <div key={x.id} className="mb-2 rounded-xl border border-white/10 p-3">
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><label><span className={label}>নাম</span><input className={input} value={x.label} onChange={e => upd(x.id, { label: e.target.value })} /></label><label><span className={label}>বাইরের লিংক (ঐচ্ছিক)</span><input className={input} placeholder="https://…" value={x.url} onChange={e => upd(x.id, { url: e.target.value })} /></label><label className="flex items-center gap-2 pt-5 text-xs"><input type="checkbox" checked={x.show} onChange={e => upd(x.id, { show: e.target.checked })} /> দেখান</label></div>
          <label className="mt-2 block"><span className={label}>পেজের লেখা</span><textarea rows={4} className={input} value={x.content} onChange={e => upd(x.id, { content: e.target.value })} /></label>
          <div className="mt-2 flex flex-wrap items-center gap-2"><select className={input + ' !w-auto'} value={x.group} onChange={e => upd(x.id, { group: e.target.value as any })}>{groups.map(([v, t]) => <option key={v} value={v}>{t} কলামে</option>)}</select><button className="ml-auto rounded-lg border border-red-400/50 px-3 py-1 text-xs text-red-300" onClick={() => { if (confirm('এই পেজ মুছবেন?')) setItems(a => a.filter(y => y.id !== x.id)); }}><Trash2 size={13} className="mr-1 inline" />Delete</button></div></div>)}</div>)}
      <div className="flex flex-wrap gap-2"><button className="btn-blue" onClick={() => setItems(a => [...a, { id: 'p' + Date.now(), label: 'New Page', group: 'quick', content: '', url: '', show: true }])}><Plus size={15} className="mr-1 inline" /> নতুন পেজ</button><button className="btn-gold" disabled={saving} onClick={() => saveSettings(['pages'])}><Save size={15} className="mr-1 inline" /> Save Pages</button></div></div></>;
}
