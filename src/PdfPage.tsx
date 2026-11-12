import { ShoppingCart } from 'lucide-react';
import type { Product } from './lib/supabase';
import ShareButton from './ShareButton';
import { useT } from './i18n';
const pct = (p: Product) => (p.original_price > 0 ? Math.round(100 * (1 - p.selling_price / p.original_price)) : 0);
// Public page of one PDF (opened from a shared link). Shows only title, cover, price and description.
export default function PdfPage({ p, category, owned, brand, onBuy, onAdd, onDownload, onPreview }: { p?: Product; category?: string; owned: boolean; brand: string; onBuy: () => void; onAdd: () => void; onDownload: () => void; onPreview: () => void }) {
  const t = useT();
  const back = <a href="./#" onClick={(e) => { e.preventDefault(); history.replaceState(null, '', location.pathname + location.search); location.reload(); }} className="mb-4 inline-block text-sm text-gold hover:underline">{t('pdf.back')}</a>;
  if (!p) return <section className="mx-auto max-w-[1000px] px-4 py-10">{back}<p className="rounded-xl border border-white/10 bg-white/[.03] p-8 text-center text-white/70">{t('pdf.notfound')}</p></section>;
  const hue = [218, 258, 188, 28, 342, 46, 202, 278][Math.abs((p.title || 'PDF').split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % 8];
  return <section className="mx-auto max-w-[1000px] px-4 py-8">{back}
    <div className="grid gap-6 md:grid-cols-[300px_1fr]">
      <div className="exam-cover relative aspect-[3/4] overflow-hidden rounded-xl shadow-2xl" style={{ background: `linear-gradient(155deg,hsl(${hue} 70% 42%),hsl(${hue} 65% 15%))` }}>
        {p.cover_url && <img src={p.cover_url} alt={p.title} className="absolute inset-0 h-full w-full object-cover" />}
        <span className="absolute right-2 top-2 z-[2] rounded-md bg-gold px-2 py-0.5 text-[10px] font-black text-navy">{t('card.pdf')}</span>
        {!p.cover_url && <div className="absolute inset-0 flex flex-col justify-end p-4 text-left"><span className="mb-1 text-[11px] font-bold uppercase tracking-wider text-white/80">{category || t('card.cat')}</span><b className="text-lg font-black leading-tight text-white">{p.title}</b><span className="mt-2 w-fit rounded-full border border-gold/80 px-2 py-0.5 text-[10px] font-bold tracking-wider text-gold">{t('card.ready')}</span></div>}
      </div>
      <div>
        {category && <div className="text-xs font-semibold uppercase tracking-wider text-gold">{category}</div>}
        <h1 className="mt-1 text-2xl font-black leading-tight md:text-3xl">{p.title}<ShareButton p={p} brand={brand} /></h1>
        <div className="mt-3 flex flex-wrap items-center gap-2"><b className="text-3xl font-black text-gold">₹{p.selling_price}</b>{pct(p) > 0 && <><s className="text-sm text-white/50">₹{p.original_price}</s><span className="rounded bg-gold px-2 py-0.5 text-xs font-extrabold text-navy">{t('card.off', { n: pct(p) })}</span></>}</div>
        {pct(p) > 0 && <div className="mt-1 text-xs font-medium text-[#8be0a4]">{t('card.save', { n: p.original_price - p.selling_price })}</div>}
        <div className="mt-5 grid max-w-md grid-cols-2 gap-3"><button onClick={owned ? onDownload : onBuy} className="btn-gold">{owned ? t('prev.download') : t('prev.buy')}</button><button onClick={onAdd} className="btn-blue"><ShoppingCart className="mr-1 inline h-4 w-4" />{t('prev.add')}</button></div>
        <button onClick={onPreview} className="mt-3 text-sm text-gold underline">{t('trust.1').replace(/^\S+\s/, '')}</button>
        <h2 className="mt-6 text-sm font-bold uppercase tracking-wider text-white/60">{t('pdf.desc')}</h2>
        <p className="mt-2 whitespace-pre-line text-[15px] leading-7 text-white/80">{p.description?.trim() || t('pdf.nodesc')}</p>
        <p className="mt-4 text-[11px] text-white/45">{t('prev.lock')}</p>
      </div>
    </div></section>;
}
