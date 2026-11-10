import { useState } from 'react';
import { X, LockKeyhole, ShoppingCart, ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Product } from './lib/supabase';

const lines = [92, 78, 100, 68, 88, 96, 72, 84, 60, 94, 76, 90, 82, 96];
function SamplePage({ page }: { page: number }) {
  return <div className="preview-paper h-full w-full overflow-hidden bg-[#f8f6ef] p-3 text-[#26334a] sm:p-4">
    <div className="mb-3 flex items-center justify-between border-b border-slate-300 pb-2"><b className="text-[9px] tracking-wider text-[#0a1633] sm:text-[11px]">EXAMPDF PRO • SAMPLE</b><span className="text-[9px] text-slate-500">{page}</span></div>
    <h4 className="mb-2 text-[10px] font-extrabold text-[#0a1633] sm:text-xs">{page === 1 ? 'CONTENTS & STUDY NOTES' : 'IMPORTANT QUESTIONS'}</h4>
    {lines.map((w, i) => <div key={i} className="my-[5px] h-[4px] rounded-full bg-slate-300 sm:my-[6px] sm:h-[5px]" style={{ width: `${w}%` }} />)}
    {page === 1 && <div className="mt-2 grid h-10 grid-cols-6 items-end gap-1 border-b border-slate-300 pb-1 sm:h-12">{[35, 60, 48, 82, 66, 94].map((h, i) => <i key={i} className="rounded-t bg-gradient-to-b from-blue-500 to-blue-800" style={{ height: `${h}%` }} />)}</div>}
    <div className="mt-2 border-t border-slate-200 pt-2 text-center text-[7px] text-slate-400">Preview copy • Protected PDF</div>
  </div>;
}
export default function Preview({p,cat,url,owned,onClose,onBuy,onAdd,onDownload}:{p:Product;cat?:string;url:string;owned:boolean;onClose:()=>void;onBuy:()=>void;onAdd:()=>void;onDownload?:()=>void}) {
  const [flipped,setFlipped]=useState(false);
  return <div className="preview-overlay fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-[#030816]/85 p-2 backdrop-blur-md sm:p-4" onClick={onClose}>
    <div className="preview-modal card mx-auto my-auto w-full max-w-[560px] overflow-hidden bg-navy p-4 shadow-2xl sm:p-[18px]" onClick={e=>e.stopPropagation()}>
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="text-base font-black leading-tight sm:text-[19px]">{p.title}</h2><div className="mt-1 text-xs font-semibold text-gold">{cat||'Exam Preparation'}</div></div><button onClick={onClose} className="-mt-1 rounded-lg px-2 py-1 text-xl" aria-label="Close">✕</button></div>
      <div className="preview-spread relative my-4 grid aspect-[3/2] grid-cols-2 overflow-hidden rounded-lg bg-[#e9e5d8] shadow-[0_22px_24px_rgba(0,0,0,.5)]">
        <div className="relative min-w-0 overflow-hidden rounded-l-md border-r border-slate-300 bg-[#f8f6ef]">{url?<iframe title="PDF preview page one" src={`${url}#page=1&toolbar=0&navpanes=0&scrollbar=0&view=FitH`} className="h-full w-full border-0"/>:<SamplePage page={1}/>}</div>
        <div className={`preview-leaf relative min-w-0 overflow-hidden rounded-r-md bg-[#f8f6ef] ${flipped?'is-flipped':''}`}>
          <div className="preview-leaf-front absolute inset-0 overflow-hidden">{url?<iframe title="PDF preview page two" src={`${url}#page=2&toolbar=0&navpanes=0&scrollbar=0&view=FitH`} className="h-full w-full border-0"/>:<SamplePage page={2}/>}</div>
          <div className="preview-leaf-back absolute inset-0 overflow-hidden"><SamplePage page={1}/></div>
        </div>
        <div className="pointer-events-none absolute bottom-0 left-1/2 top-0 z-10 w-1 -translate-x-1/2 bg-gradient-to-r from-transparent via-black/25 to-transparent"/>
      </div>
      <div className="flex items-center justify-center gap-4"><button className="btn-blue !px-3 !py-2 text-xs" onClick={()=>setFlipped(false)} disabled={!flipped}>‹ Prev</button><span className="text-xs font-semibold text-white/75">Page {flipped?'2':'1'} / 2</span><button className="btn-blue !px-3 !py-2 text-xs" onClick={()=>setFlipped(true)} disabled={flipped}>Next ›</button></div>
      {!url&&<p className="mt-2 text-center text-[10px] text-white/45">এটি নমুনা Preview। আসল PDF-এর প্রথম দুই পৃষ্ঠা দেখাতে Admin Panel থেকে ২-পৃষ্ঠার Preview PDF আপলোড করুন।</p>}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3"><b className="text-2xl font-black text-gold">₹{p.selling_price}</b>{p.original_price>p.selling_price&&<s className="text-sm text-white/45">₹{p.original_price}</s>}{p.original_price>p.selling_price&&<span className="rounded-md bg-gold px-2 py-0.5 text-[10px] font-extrabold text-navy">{Math.round((1-p.selling_price/p.original_price)*100)}% OFF</span>}<span className="ml-auto text-[11px] text-[#8be0a4]">Save ₹{Math.max(0,p.original_price-p.selling_price)}</span></div>
      <div className="mt-3 grid grid-cols-2 gap-3"><button onClick={owned?onDownload:onBuy} className="btn-gold">{owned?'DOWNLOAD PDF':'BUY NOW'}</button><button onClick={onAdd} className="btn-blue"><ShoppingCart className="mr-1 inline h-4 w-4"/> ADD TO CART</button></div>
      <p className="mt-3 text-[11px] leading-5 text-white/50"><ShieldCheck className="mr-1 inline h-4 w-4 text-gold"/><LockKeyhole className="mr-1 inline h-4 w-4 text-gold"/> Admin payment approval-এর পরই সম্পূর্ণ PDF Download করা যাবে।</p>
    </div>
  </div>;
}
