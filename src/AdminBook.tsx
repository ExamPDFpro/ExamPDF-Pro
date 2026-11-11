import { Save } from 'lucide-react';
import { DEFAULT_BOOK, DEFAULT_TEXTS } from './lib/defaults';
const input = 'w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm';
const label = 'mb-1 block text-xs text-white/60';
export default function AdminBook({ settings, setSettings, saveSettings, saving }: any) {
  const B = { ...DEFAULT_BOOK, ...(settings.book || {}) }, T = { ...DEFAULT_TEXTS, ...(settings.texts || {}) };
  const setB = (k: string, v: any) => setSettings((s: any) => ({ ...s, book: { ...DEFAULT_BOOK, ...(s.book || {}), [k]: v } }));
  const setT = (k: string, v: any) => setSettings((s: any) => ({ ...s, texts: { ...DEFAULT_TEXTS, ...(s.texts || {}), [k]: v } }));
  const txt = (o: any, set: any, k: string, t: string, ph = '') => <label key={k}><span className={label}>{t}</span><input className={input} placeholder={ph} value={o[k] ?? ''} onChange={e => set(k, e.target.value)} /></label>;
  const col = (k: string, t: string) => <label key={k}><span className={label}>{t}</span><div className="flex gap-2"><input type="color" className="h-10 w-12 rounded bg-transparent" value={/^#[0-9a-f]{6}$/i.test(B[k]) ? B[k] : '#1e4fd8'} onChange={e => setB(k, e.target.value)} /><input className={input} placeholder="ফাঁকা = ডিফল্ট" value={B[k] ?? ''} onChange={e => setB(k, e.target.value)} /></div></label>;
  return <>
    <div className="admin-panel mb-4 p-4"><h3 className="mb-1 font-bold text-gold">3D Book Designer (Hero-র ঘূর্ণায়মান PDF)</h3><p className="mb-3 text-xs text-white/50">বইয়ের প্রচ্ছদ, রঙ, ছবি, লেখা আর ভাসমান লেবেল এখান থেকে বদলান। ফাঁকা রাখলে ডিফল্ট ডিজাইন থাকবে।</p>
      <div className="grid gap-3 sm:grid-cols-2">{txt(B, setB, 'cover_badge', 'Cover ব্যাজ', 'PDF')}{txt(B, setB, 'cover_title', 'Cover শিরোনাম', 'ফাঁকা = Website Name')}
        <label className="sm:col-span-2"><span className={label}>Cover নিচের লেখা (নতুন লাইনে Enter)</span><textarea rows={2} className={input} value={B.cover_sub} onChange={e => setB('cover_sub', e.target.value)} /></label>
        {col('cover_from', 'Cover রঙ ১')}{col('cover_to', 'Cover রঙ ২')}{col('cover_border', 'Cover বর্ডার রঙ')}{col('cover_title_color', 'শিরোনামের রঙ')}
        <label className="sm:col-span-2"><span className={label}>Cover ছবির URL (দিলে রঙের বদলে ছবি দেখাবে)</span><input className={input} value={B.cover_image} onChange={e => setB('cover_image', e.target.value)} /></label>
        {txt(B, setB, 'inside_label', 'Cover-এর ভেতরের ছোট লেখা')}{txt(B, setB, 'inside_title', 'Cover-এর ভেতরের বড় লেখা')}
        {txt(B, setB, 'base_icon', 'শেষ পাতার আইকন')}{txt(B, setB, 'base_title', 'শেষ পাতার শিরোনাম')}
        <label className="sm:col-span-2"><span className={label}>শেষ পাতার লেখা</span><input className={input} value={B.base_text} onChange={e => setB('base_text', e.target.value)} /></label>
        {[0, 1, 2].map(i => <label key={i}><span className={label}>ভাসমান লেবেল {i + 1}</span><input className={input} value={B.labels?.[i] ?? ''} onChange={e => setB('labels', [0, 1, 2].map(j => j === i ? e.target.value : (B.labels?.[j] ?? '')))} /></label>)}
        <label><span className={label}>পাতা উল্টানোর গতি (ms, কম = দ্রুত)</span><input type="number" min={900} max={6000} step={100} className={input} value={B.speed} onChange={e => setB('speed', Number(e.target.value))} /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={B.show_labels !== false} onChange={e => setB('show_labels', e.target.checked)} /> ভাসমান লেবেল দেখান</label></div>
      <p className="mt-2 text-xs text-white/45">বইটা পুরো লুকাতে বা Hero-র লেখা/বাটন বদলাতে ওপরের “Hero Banner” অংশ ব্যবহার করুন।</p>
      <button className="btn-gold mt-3" disabled={saving} onClick={() => saveSettings(['book'])}><Save size={15} className="mr-1 inline" /> Save Book Design</button></div>
    <div className="admin-panel mb-4 p-4"><h3 className="mb-3 font-bold text-gold">Website-এর লেখা ও Reviews / Likes</h3>
      <div className="grid gap-3 sm:grid-cols-2">{txt(T, setT, 'search_placeholder', 'Search বক্সের লেখা')}{txt(T, setT, 'popular_title', 'Popular Exams-এর শিরোনাম')}
        {txt(T, setT, 'reviews_title', 'Reviews সেকশনের শিরোনাম')}{txt(T, setT, 'reviews_sub', 'Reviews সেকশনের উপশিরোনাম')}{txt(T, setT, 'reviews_button', 'Review বাটনের লেখা')}{txt(T, setT, 'reviews_empty', 'Review না থাকলে যে লেখা দেখাবে')}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!T.reviews_hidden} onChange={e => setT('reviews_hidden', !e.target.checked)} /> Reviews সেকশন দেখান</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={T.likes_enabled !== false} onChange={e => setT('likes_enabled', e.target.checked)} /> PDF-এ ❤ Love বাটন দেখান</label></div>
      <button className="btn-gold mt-3" disabled={saving} onClick={() => saveSettings(['texts'])}><Save size={15} className="mr-1 inline" /> Save Texts</button></div></>;
}
