import { ArrowLeft, Bookmark, ShoppingCart, Trash2, X, ShieldCheck, Tag } from 'lucide-react';
import type { Product } from './lib/supabase';
import { useT } from './i18n';
// Full-screen cart (page-like, still a modal: no routing). Content area is white / light grey; header keeps the navy + gold brand.
const orig = (p: Product) => Math.max(Number(p.original_price) || 0, Number(p.selling_price) || 0);
const pct = (p: Product) => { const o = orig(p); return o > 0 ? Math.round(100 * (1 - Number(p.selling_price) / o)) : 0; };
function Thumb({ p, cat }: { p: Product; cat: string }) {
  const hue = [218, 258, 188, 28, 342, 46, 202, 278][Math.abs((p.title || 'PDF').split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % 8];
  return <div className="relative aspect-[3/4] w-[72px] shrink-0 overflow-hidden rounded-lg border border-slate-200 sm:w-24" style={{ background: `linear-gradient(155deg,hsl(${hue} 70% 42%),hsl(${hue} 65% 15%))` }}>
    {p.cover_url ? <img src={p.cover_url} alt={p.title} className="absolute inset-0 h-full w-full object-cover" /> : <span className="absolute inset-0 flex items-end p-1.5 text-[9px] font-bold leading-tight text-white">{cat}</span>}
  </div>;
}
export default function CartPage({ items, saved, catName, onRemove, onSave, onRestore, onRemoveSaved, onCheckout, onClose }: {
  items: Product[]; saved: Product[]; catName: (p: Product) => string; onRemove: (id: string) => void; onSave: (id: string) => void;
  onRestore: (id: string) => void; onRemoveSaved: (id: string) => void; onCheckout: () => void; onClose: () => void;
}) {
  const t = useT();
  const total = items.reduce((s, p) => s + Number(p.selling_price), 0);
  const origTotal = items.reduce((s, p) => s + orig(p), 0);
  const discount = Math.max(0, origTotal - total);
  const Summary = <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">{t('shop.price')}</h3>
    <div className="space-y-2 text-sm text-slate-700">
      <p className="flex justify-between"><span>{t('shop.pricen', { n: items.length })}</span><span>₹{origTotal}</span></p>
      <p className="flex justify-between"><span>{t('shop.disc')}</span><span className="font-semibold text-green-700">− ₹{discount}</span></p>
    </div>
    <p className="mt-3 flex items-center justify-between border-t border-dashed border-slate-300 pt-3 text-base font-black text-slate-900"><span>{t('shop.total')}</span><span>₹{total}</span></p>
    {discount > 0 && <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-800">{t('shop.savings', { n: discount })}</p>}
    <p className="mt-3 flex items-start gap-1.5 text-[11px] text-slate-500"><Tag className="mt-0.5 h-3.5 w-3.5 shrink-0" />{t('shop.couponnote')}</p>
    <button className="btn-gold mt-4 hidden w-full lg:block" onClick={onCheckout}>{t('shop.proceed')}</button>
    <p className="mt-3 flex items-start gap-1.5 text-[11px] text-slate-500"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />{t('shop.trust')}</p>
  </div>;
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-100 text-slate-900">
    <div className="sticky top-0 z-10 border-b border-gold/30 bg-navy text-white shadow">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-3">
        <button className="flex items-center gap-2 text-sm font-semibold" onClick={onClose}><ArrowLeft className="h-5 w-5" />{t('shop.back')}</button>
        <h2 className="flex items-center gap-2 text-base font-bold text-gold sm:text-lg"><ShoppingCart className="h-5 w-5" />{t('shop.cart')}{items.length > 0 && <span className="rounded-full bg-gold px-2 py-0.5 text-xs font-black text-navy">{items.length}</span>}</h2>
        <button aria-label={t('common.close')} onClick={onClose}><X /></button>
      </div>
    </div>
    <div className="mx-auto max-w-6xl px-3 pb-28 pt-4 lg:pb-10">
      {items.length === 0 ? <div className="mx-auto mt-6 max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100"><ShoppingCart className="h-9 w-9 text-slate-400" /></div>
        <h3 className="text-lg font-black">{t('shop.emptytitle')}</h3><p className="mt-1 text-sm text-slate-500">{t('shop.emptytext')}</p>
        <button className="btn-gold mt-5" onClick={onClose}>{t('shop.continue')}</button>
      </div> : <div className="lg:grid lg:grid-cols-[1fr_340px] lg:items-start lg:gap-5">
        <div className="space-y-3">
          {items.map(p => <div key={p.id} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <Thumb p={p} cat={catName(p)} />
            <div className="min-w-0 flex-1">
              <h3 className="line-clamp-2 text-sm font-bold leading-snug sm:text-base">{p.title}</h3>
              <p className="mt-0.5 text-xs text-slate-500">{catName(p)}</p>
              <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1"><span className="text-lg font-black">₹{p.selling_price}</span>
                {pct(p) > 0 && <><s className="text-xs text-slate-400">₹{orig(p)}</s><span className="rounded bg-green-100 px-1.5 py-0.5 text-[11px] font-bold text-green-800">{t('shop.off', { n: pct(p) })}</span></>}</div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
                <button className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50" onClick={() => onSave(p.id)}><Bookmark className="h-3.5 w-3.5" />{t('shop.save')}</button>
                <button aria-label={t('shop.remove')} className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-red-600 hover:bg-red-50" onClick={() => onRemove(p.id)}><Trash2 className="h-3.5 w-3.5" />{t('shop.remove')}</button>
              </div>
            </div>
          </div>)}
          <div className="lg:hidden">{Summary}</div>
        </div>
        <div className="hidden lg:sticky lg:top-20 lg:block">{Summary}</div>
      </div>}
      {saved.length > 0 && <div className="mt-6"><h3 className="mb-2 text-sm font-bold text-slate-700">{t('shop.saved', { n: saved.length })}</h3>
        <div className="grid gap-3 sm:grid-cols-2">{saved.map(p => <div key={p.id} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <Thumb p={p} cat={catName(p)} />
          <div className="min-w-0 flex-1"><h4 className="line-clamp-2 text-sm font-bold">{p.title}</h4><p className="text-xs text-slate-500">{catName(p)}</p>
            <p className="mt-1 font-black">₹{p.selling_price}{pct(p) > 0 && <s className="ml-2 text-xs font-normal text-slate-400">₹{orig(p)}</s>}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold"><button className="rounded-lg bg-navy px-3 py-1.5 text-gold" onClick={() => onRestore(p.id)}>{t('shop.restore')}</button>
              <button className="rounded-lg border border-red-200 px-3 py-1.5 text-red-600" onClick={() => onRemoveSaved(p.id)}>{t('shop.remove')}</button></div></div>
        </div>)}</div></div>}
    </div>
    {items.length > 0 && <div className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white p-3 shadow-[0_-6px_16px_rgba(0,0,0,.08)] lg:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3"><div><p className="text-[11px] text-slate-500">{t('shop.items', { n: items.length })}</p><p className="text-xl font-black leading-none">₹{total}</p></div>
        <button className="btn-gold flex-1 !py-3" onClick={onCheckout}>{t('shop.proceed')}</button></div></div>}
  </div>;
}
