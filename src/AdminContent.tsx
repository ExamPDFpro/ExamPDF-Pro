import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
const input='w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm';
const label='mb-1 block text-xs text-white/60';
export const PAGE_DEFS:[string,string][]=[['about','About Us'],['help','Help Center'],['faq','FAQ'],['terms','Terms & Conditions'],['privacy','Privacy Policy'],['refund','Refund Policy'],['disclaimer','Disclaimer']];
export default function AdminContent({say}:{say:(s:string)=>void}){
 const [pages,setPages]=useState<any>({}),[extra,setExtra]=useState<any>({}),[busy,setBusy]=useState(false);
 useEffect(()=>{supabase.from('website_settings').select('key,value').in('key',['pages','extra']).then(({data}:any)=>{(data||[]).forEach((r:any)=>{if(r.key==='pages')setPages(r.value||{});if(r.key==='extra')setExtra(r.value||{});});})},[]);
 const setP=(k:string,f:string,v:string)=>setPages((p:any)=>({...p,[k]:{...p[k],[f]:v}}));
 const save=async()=>{setBusy(true);const {error}=await supabase.from('website_settings').upsert([{key:'pages',value:pages},{key:'extra',value:extra}],{onConflict:'key'});setBusy(false);if(error)say('সেভ হয়নি: '+error.message);else say('সংরক্ষণ হয়েছে ✓');};
 return <>
  <h2 className="mb-4 text-2xl font-black">Pages & Footer Content</h2>
  <div className="admin-panel mb-4 p-4"><h3 className="mb-3 font-bold text-gold">অন্যান্য লেখা</h3><div className="grid gap-3 sm:grid-cols-2">
   <label><span className={label}>"Popular Exams" সেকশনের নাম</span><input className={input} placeholder="Popular Exams" value={extra.popular_title||''} onChange={e=>setExtra({...extra,popular_title:e.target.value})}/></label>
   <label><span className={label}>Footer-এর ডানদিকের লেখা</span><input className={input} placeholder="Secure learning. Smarter preparation." value={extra.footer_right||''} onChange={e=>setExtra({...extra,footer_right:e.target.value})}/></label></div></div>
  <div className="admin-panel p-4"><h3 className="mb-1 font-bold text-gold">Footer Pages</h3><p className="mb-3 text-xs text-white/50">লেখা বসালে Footer-এর ওই লিংকে ক্লিক করলে পেজটি খুলবে। ফাঁকা রাখলে লিংকটি নিষ্ক্রিয় থাকবে।</p>
   {PAGE_DEFS.map(([k,t])=><div key={k} className="mb-4 rounded-xl border border-white/10 p-3"><p className="mb-2 text-sm font-bold">{t}</p><label><span className={label}>Page Title (ফাঁকা রাখলে "{t}")</span><input className={input} value={pages[k]?.title||''} onChange={e=>setP(k,'title',e.target.value)}/></label><label className="mt-2 block"><span className={label}>Content</span><textarea rows={5} className={input} value={pages[k]?.body||''} onChange={e=>setP(k,'body',e.target.value)}/></label></div>)}
   <button className="btn-gold" disabled={busy} onClick={save}>{busy?'Saving…':'Save All'}</button></div></>;
}
