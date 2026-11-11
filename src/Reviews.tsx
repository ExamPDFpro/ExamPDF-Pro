import { useState } from 'react';
import { Star, X } from 'lucide-react';
import { supabase, type Product } from './lib/supabase';
export const Stars = ({ n, size = 16 }: { n: number; size?: number }) => <span className="inline-flex gap-0.5" aria-label={`${n} star`}>{[1, 2, 3, 4, 5].map(i => <Star key={i} size={size} className={i <= n ? 'fill-gold text-gold' : 'text-white/25'} />)}</span>;
export function ReviewsSection({ T, reviews, products, onWrite }: { T: any; reviews: any[]; products: Product[]; onWrite: () => void }) {
  return <section id="reviews" className="mx-auto max-w-[1100px] px-4 py-8">
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h2 className="exam-section-title text-xl font-black">{T.reviews_title}</h2>{T.reviews_sub && <p className="mt-1 text-sm text-white/60">{T.reviews_sub}</p>}</div><button className="btn-gold" onClick={onWrite}>{T.reviews_button}</button></div>
    {reviews.length === 0 ? <p className="rounded-xl border border-white/10 bg-white/[.03] p-6 text-center text-sm text-white/60">{T.reviews_empty}</p> :
      <div className="grid gap-4 md:grid-cols-3">{reviews.map(r => { const pd = products.find(p => p.id === r.product_id); return <div key={r.id} className="card bg-white/[.04] p-4">
        <Stars n={r.rating} /><p className="mt-2 text-sm leading-6 text-white/85">“{r.comment}”</p>
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/10 pt-2 text-xs"><b className="text-gold">{r.author_name}</b>{pd && <span className="truncate text-white/50">{pd.title}</span>}</div></div>; })}</div>}
  </section>;
}
export function ReviewModal({ user, products, say, onClose }: { user: any; products: Product[]; say: (s: string) => void; onClose: () => void }) {
  const [name, setName] = useState((user?.email || '').split('@')[0]), [rating, setRating] = useState(5), [text, setText] = useState(''), [pid, setPid] = useState(''), [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (text.trim().length < 3) { say('Review একটু বিস্তারিত লিখুন।'); return; } setBusy(true);
    const { error } = await supabase.from('reviews').insert({ user_id: user.id, author_name: name.trim().slice(0, 60) || 'Student', rating, comment: text.trim(), product_id: pid || null });
    setBusy(false);
    if (error) { say(/row-level security|policy/i.test(error.message) ? 'আজকের জন্য review-এর সীমা শেষ। পরে চেষ্টা করুন।' : error.message); return; }
    say('ধন্যবাদ! Admin অনুমোদন করলে আপনার review সাইটে দেখা যাবে।'); onClose();
  }
  return <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-black/80 p-3"><form onSubmit={submit} className="card w-full max-w-md bg-navy p-5">
    <div className="mb-4 flex items-center justify-between"><div><span className="text-xs uppercase tracking-widest text-gold">Your Feedback</span><h2 className="text-xl font-bold">Write a Review</h2></div><button type="button" onClick={onClose}><X /></button></div>
    <label className="mb-3 block text-sm">Your name<input required maxLength={60} value={name} onChange={e => setName(e.target.value)} className="input mt-1" /></label>
    <div className="mb-3 text-sm">Rating<div className="mt-1 flex gap-1">{[1, 2, 3, 4, 5].map(i => <button type="button" key={i} onClick={() => setRating(i)} aria-label={`${i} star`}><Star size={28} className={i <= rating ? 'fill-gold text-gold' : 'text-white/25'} /></button>)}</div></div>
    <label className="mb-3 block text-sm">PDF (ঐচ্ছিক)<select value={pid} onChange={e => setPid(e.target.value)} className="input mt-1"><option value="">— নির্দিষ্ট PDF নয় —</option>{products.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
    <label className="block text-sm">Review<textarea required minLength={3} maxLength={1000} rows={4} value={text} onChange={e => setText(e.target.value)} className="input mt-1" placeholder="আপনার অভিজ্ঞতা লিখুন…" /></label>
    <button disabled={busy} className="btn-gold mt-4 w-full">{busy ? 'Submitting…' : 'Submit Review'}</button>
    <p className="mt-2 text-center text-[11px] text-white/45">Admin অনুমোদনের পরই সাইটে দেখা যাবে।</p></form></div>;
}
