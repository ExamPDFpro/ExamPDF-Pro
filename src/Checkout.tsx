import { useEffect, useRef, useState } from 'react';
import { X, ShieldCheck, Upload, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { isSupabaseConfigured, supabase, fnErr, type Product } from './lib/supabase';
import { isOn, APP_METHODS, appLink } from './lib/payMethods';
import { getRef } from './lib/affiliate';
import { compressProof, MAX_PROOF_BYTES } from './lib/compress';
import { useT, en, type Key } from './i18n';
type Order={id:string;total:number};
type Quote={subtotal:number;discount:number;total:number;coupon_code?:string|null};
const fld='mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-navy';
export default function Checkout({items,existing,user,say,onClose,onDone,onOrders}:{items:Product[];existing?:Order;user:any;say:(s:string)=>void;onClose:()=>void;onDone:()=>void;onOrders?:()=>void}){
 const t=useT();
 const lock=useRef(false),sub=useRef<any>(null),[done,setDone]=useState<{id:string;amount:number}|null>(null),[fail,setFail]=useState(''),failRef=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(fail)failRef.current?.scrollIntoView({behavior:'smooth',block:'center'})},[fail]);
 const [utr,setUtr]=useState(''),[file,setFile]=useState<File|null>(null),[busy,setBusy]=useState(false);
 const [pay,setPay]=useState<any>({}),[code,setCode]=useState(''),[applied,setApplied]=useState(''),[quote,setQuote]=useState<Quote|null>(null),[cpMsg,setCpMsg]=useState(''),[checking,setChecking]=useState(false);
 const ids=items.map(p=>p.id),idsKey=ids.join(',');
 useEffect(()=>{if(!isSupabaseConfigured)return;supabase.from('website_settings').select('value').eq('key','payment').maybeSingle().then(({data}:any)=>setPay(data?.value||{}))},[]);
 const errText=(c:string,min?:any)=>('err.'+c) in en?t(('err.'+c) as Key,{min:min??''}):t('err.generic');
 // The browser only asks the server for a price; the server decides discount, coupon and affiliate rules.
 async function getQuote(cp:string){
  if(!isSupabaseConfigured||existing||!ids.length)return null;
  const {data,error}=await supabase.rpc('quote_order',{p_product_ids:ids,p_coupon:cp||null,p_ref:getRef()});
  if(error)return {err:/rate_limited/.test(error.message)?'rate_limited':'server_error'};
  if(!data?.ok)return {err:data?.error||'server_error',min:data?.min_order};
  return {q:data as Quote};
 }
 useEffect(()=>{let live=true;getQuote(applied).then(r=>{if(!live||!r)return;if(r.q)setQuote(r.q);else if(applied){setApplied('');setCpMsg(errText(r.err!,(r as any).min));}});return()=>{live=false}},[idsKey,applied]);// eslint-disable-line
 async function applyCoupon(){const c=code.trim().toUpperCase();if(!c)return;setChecking(true);setCpMsg('');const r=await getQuote(c);setChecking(false);
  if(r?.q){setApplied(c);setQuote(r.q);setCpMsg(t('cp.applied'));}else setCpMsg(errText(r?.err||'server_error',(r as any)?.min));}
 function removeCoupon(){setApplied('');setCode('');setCpMsg('');}
 const sum=items.reduce((s,p)=>s+Number(p.selling_price),0);
 const total=existing?.total??quote?.total??sum;
 const showQr=isOn(pay,'qr')&&!!pay.qr_url, showBank=isOn(pay,'bank')&&!!pay.account_number;
 const appsOn=APP_METHODS.filter(m=>isOn(pay,m));
 const showUpiId=!!pay.upi_id&&(isOn(pay,'upi')||appsOn.length>0);
 const hasPay=showQr||showBank||showUpiId;
 // Duplicate-click lock + safe retry: once the server has created the order we keep its answer and, on a retry, only the screenshot upload is repeated (no second order).
 async function submit(){if(lock.current)return;if(!isSupabaseConfigured){say(t('co.needsetup'));return;}if(!file||!utr.trim()){say(t('co.need'));return;}if(file.size>MAX_PROOF_BYTES){say(t('co.toolarge'));return;}lock.current=true;setBusy(true);setFail('');try{
  // Payment submissions are processed by a server-side Edge Function: it re-prices the order and records the UTR.
  let data=sub.current;
  if(!data){const r=await supabase.functions.invoke('submit-payment',{body:{order_id:existing?.id,product_ids:ids,payment_reference:utr.trim(),coupon_code:applied||undefined,ref:getRef()||undefined}});
   if(r.error||!r.data?.upload_path)throw new Error((await fnErr(r.error,r.data))||t('co.noendpoint'));
   data=r.data;sub.current=data;}
  const proof=(await compressProof(file)).file;   // images only; PDFs and failures fall back to the original
  const up=await supabase.storage.from('payment-proofs').upload(data.upload_path,proof,{upsert:false,contentType:proof.type||undefined});
  if(up.error&&!/exist|duplicate/i.test(up.error.message||''))throw Object.assign(new Error(t('shop.retry')),{retry:true});
  setDone({id:String(data.order_id||existing?.id||''),amount:total});onDone();
 }catch(e:any){const m=e?.retry?e.message:(e.message||t('co.fail'));setFail(m);say(m);}finally{lock.current=false;setBusy(false)}}
 const card='rounded-xl border border-slate-200 bg-white p-4 shadow-sm',h='mb-3 text-sm font-bold uppercase tracking-wide text-slate-500';
 if(done)return <div className="fixed inset-0 z-[90] overflow-y-auto bg-slate-100 p-3 text-slate-900"><div className="mx-auto mt-10 max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
  <CheckCircle2 className="mx-auto h-14 w-14 text-green-600"/><h2 className="mt-3 text-xl font-black">{t('shop.ok.title')}</h2><p className="mt-2 text-sm text-slate-600">{t('shop.ok.text')}</p>
  <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">{done.id&&<p className="flex justify-between"><span className="text-slate-500">{t('shop.ok.order')}</span><b>#{done.id.slice(0,8)}</b></p>}<p className="mt-1 flex justify-between"><span className="text-slate-500">{t('shop.ok.amount')}</span><b>₹{done.amount}</b></p></div>
  <div className="mt-5 flex flex-col gap-2">{onOrders&&<button className="btn-gold" onClick={onOrders}>{t('shop.ok.orders')}</button>}<button className="btn-blue" onClick={onClose}>{t('shop.ok.close')}</button></div></div></div>;
 const orig=(p:Product)=>Math.max(Number(p.original_price)||0,Number(p.selling_price)||0);
 // Copy buttons + "Pay via UPI App" (UPI intent). The amount comes from the same server-priced total shown on this page; opening a UPI app proves nothing, so the PDF stays locked until Admin approves.
 const copy=async(v:string)=>{try{await navigator.clipboard.writeText(v);say(t('pay.copied'));}catch{say(t('pay.copyfail'));}};
 const upiOk=/^[\w.\-]{2,}@[\w.\-]{2,}$/.test(String(pay.upi_id||''))&&Number.isFinite(Number(total))&&Number(total)>0;
 const upiQuery=upiOk?`pa=${encodeURIComponent(pay.upi_id)}${pay.payee_name?`&pn=${encodeURIComponent(pay.payee_name)}`:''}&am=${Number(total).toFixed(2)}&cu=INR&tn=${encodeURIComponent('ExamPDF Pro order')}`:'';
 const upiLink=upiOk&&isOn(pay,'upi')?`upi://pay?${upiQuery}`:'';
 const appNames:Record<string,string>={phonepe:'PhonePe',paytm:'Paytm',gpay:'Google Pay'};
 const cb='shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-navy active:bg-slate-100';
 const Pay=<div className={card}><h3 className={h}>{t('shop.sec.payment')}</h3>
  <div className="md:hidden">
   <p className="mb-2 flex items-center justify-between rounded-xl bg-navy px-4 py-3 text-white"><span className="text-sm text-white/80">{t('shop.payamt')}</span><b className="text-2xl text-gold">₹{total}</b></p>
   <ol className="mb-3 space-y-1 text-[11px] leading-snug text-slate-600">{(['pay.step1','pay.step2','pay.step3'] as const).map((k,i)=><li key={k} className="flex gap-1.5"><b className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-navy text-[10px] text-gold">{i+1}</b><span>{t(k)}</span></li>)}</ol>
   {hasPay?<div className="text-sm text-slate-700">
    {upiOk&&(!!upiLink||appsOn.length>0)&&<div className="mb-3"><p className="mb-1.5 text-xs font-semibold text-slate-500">{t('pay.appsh')}</p><div className="grid grid-cols-2 gap-2">{[...(upiLink?[['upi',t('pay.upibtn'),upiLink]]:[]),...appsOn.map(m=>[m,appNames[m],appLink(m,upiQuery)])].map(([k,label,href])=><a key={k} href={href} className="flex min-h-[48px] items-center justify-center rounded-xl border-2 border-navy px-2 py-2 text-center text-sm font-bold leading-tight text-navy active:bg-slate-100 [&:last-child:nth-child(odd)]:col-span-2">{label}</a>)}</div><p className="mt-1.5 text-[11px] text-slate-500">{t('pay.upifallback')}</p></div>}
    {showUpiId&&<div className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2"><p className="min-w-0 break-all text-xs">{t('co.upi')}: <b className="select-all text-sm">{pay.upi_id}</b>{pay.payee_name?` (${pay.payee_name})`:''}</p><button type="button" className={cb} onClick={()=>copy(String(pay.upi_id))}>{t('pay.copyupi')}</button></div>}
    {showQr&&<details open={!showUpiId&&!showBank} className="mb-2 rounded-lg border border-slate-200"><summary className="cursor-pointer px-3 py-2.5 text-sm font-semibold text-navy">{t('pay.scanqr')}</summary><img src={pay.qr_url} alt="Payment QR" className="mx-auto mb-3 h-40 w-40 rounded-lg border border-slate-200 bg-white object-contain p-1"/></details>}
    {showBank&&<details open={!showUpiId&&!showQr} className="mb-2 rounded-lg border border-slate-200"><summary className="cursor-pointer px-3 py-2.5 text-sm font-semibold text-navy">{t('pay.bankdet')}</summary><div className="space-y-0.5 px-3 pb-3 text-sm"><p>{t('co.bank')}: {pay.bank_name}</p><p>{t('co.acname')}: {pay.account_name}</p><div className="flex items-center justify-between gap-2"><p className="min-w-0 break-all">{t('co.acno')}: <b className="select-all">{pay.account_number}</b></p><button type="button" className={cb} onClick={()=>copy(String(pay.account_number))}>{t('pay.copyacno')}</button></div><p>{t('co.ifsc')}: <b className="select-all">{pay.ifsc}</b></p></div></details>}
    {pay.note&&<p className="text-xs text-slate-500">{pay.note}</p>}<p className="mt-1 text-xs text-slate-500">{t('co.after')}</p></div>:<p className="text-sm text-slate-500">{t('shop.nopay')}</p>}
  </div>
  <div className="hidden md:block">
  <ol className="mb-3 space-y-1.5 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">{(['pay.step1','pay.step2','pay.step3'] as const).map((k,i)=><li key={k} className="flex gap-2"><b className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-navy text-[11px] text-gold">{i+1}</b><span>{t(k)}</span></li>)}</ol>
  {hasPay?<div className="text-sm text-slate-700"><p className="mb-2 font-semibold text-navy">{t('co.payto')}</p>
   <p className="mb-2 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"><span>{t('shop.payamt')}</span><b className="text-lg text-navy">₹{total}</b></p>
   {upiLink&&<div className="mb-3 md:hidden"><a href={upiLink} className="btn-gold block w-full text-center">{t('pay.upibtn')}</a><p className="mt-1.5 text-[11px] text-slate-500">{t('pay.upifallback')}</p></div>}
   {showQr&&<img src={pay.qr_url} alt="Payment QR" className="mx-auto mb-3 h-44 w-44 rounded-lg border border-slate-200 bg-white object-contain p-1"/>}
   {upiOk&&appsOn.length>0&&<div className="mb-3 md:hidden"><p className="mb-1.5 text-xs text-slate-500">{t('pay.apps')}</p><div className="grid grid-cols-3 gap-2">{appsOn.map(m=><a key={m} href={appLink(m,upiQuery)} className="rounded-lg border border-navy px-2 py-2 text-center text-xs font-bold text-navy active:bg-slate-100">{appNames[m]}</a>)}</div></div>}
   {showUpiId&&<div className="flex items-center justify-between gap-2"><p className="min-w-0 break-all">{t('co.upi')}: <b className="select-all">{pay.upi_id}</b>{pay.payee_name?` (${pay.payee_name})`:''}</p><button type="button" className={cb} onClick={()=>copy(String(pay.upi_id))}>{t('pay.copyupi')}</button></div>}
   {showBank&&<div className="mt-2 rounded-lg bg-slate-50 p-3"><p>{t('co.bank')}: {pay.bank_name}</p><p>{t('co.acname')}: {pay.account_name}</p><div className="flex items-center justify-between gap-2"><p className="min-w-0 break-all">{t('co.acno')}: <b className="select-all">{pay.account_number}</b></p><button type="button" className={cb} onClick={()=>copy(String(pay.account_number))}>{t('pay.copyacno')}</button></div><p>{t('co.ifsc')}: <b className="select-all">{pay.ifsc}</b></p></div>}{pay.note&&<p className="mt-2 text-xs text-slate-500">{pay.note}</p>}<p className="mt-2 text-xs text-slate-500">{t('co.after')}</p></div>:<p className="text-sm text-slate-500">{t('shop.nopay')}</p>}
  </div>
  <label className="mt-4 block text-sm font-medium">{t('co.utr')}<input value={utr} onChange={e=>setUtr(e.target.value)} className={fld} placeholder={t('co.utrph')}/></label>
  <label className="mt-4 block text-sm font-medium">{t('co.shot')}<input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={e=>{const f=e.target.files?.[0]||null;if(f&&f.size>MAX_PROOF_BYTES){say(t('co.toolarge'));e.target.value='';setFile(null);return;}setFile(f);}} className="mt-2 block w-full text-sm text-slate-600"/><span className="mt-1 block text-xs text-slate-400">{t('co.shotnote')}</span></label></div>;
 const Fail=fail?<div ref={failRef} role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"><b className="block">{t('pay.failtitle')}</b>{fail}<span className="mt-1 block text-xs">{t('pay.failhint')}</span></div>:null;
 const mkBtn=(bar:boolean)=><button disabled={busy} onClick={submit} className={bar?"btn-gold w-full whitespace-nowrap !px-3 !py-2.5 text-sm disabled:opacity-50":"btn-gold w-full disabled:opacity-50"}>{busy?t('co.submitting'):fail?t('pay.retry'):bar?t('co.submitshort'):<><Upload className="mr-2 inline h-4 w-4"/> {t('co.submit')}</>}</button>;
 const Btn=mkBtn(false);
 return <div className="fixed inset-0 z-[90] overflow-y-auto bg-slate-100 text-slate-900">
  <div className="sticky top-0 z-10 border-b border-gold/30 bg-navy text-white shadow"><div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-3 py-3"><button className="flex items-center gap-2 text-sm font-semibold" onClick={onClose}><ArrowLeft className="h-5 w-5"/>{t('shop.back')}</button><div className="text-center"><span className="block text-[10px] uppercase tracking-widest text-gold">{t('co.secure')}</span><h2 className="text-base font-bold">{t('co.title')}</h2></div><button onClick={onClose} aria-label={t('common.close')}><X/></button></div></div>
  <div className="mx-auto max-w-5xl px-3 pb-24 pt-4 lg:grid lg:grid-cols-[1fr_340px] lg:items-start lg:gap-5 lg:pb-10">
   <div className="space-y-3">
    {Fail}
    <div className={card}><h3 className={h}>{t('shop.sec.review')}</h3>
     {existing?<p className="text-sm text-slate-700">{t('shop.existing')} · #{String(existing.id).slice(0,8)}</p>:items.map(p=><div key={p.id} className="flex items-center gap-3 border-b border-slate-100 py-2 last:border-0">
      <div className="h-14 w-10 shrink-0 overflow-hidden rounded bg-navy">{p.cover_url&&<img src={p.cover_url} alt="" className="h-full w-full object-cover"/>}</div>
      <p className="min-w-0 flex-1 text-sm font-semibold leading-snug">{p.title}</p><p className="text-sm font-black">₹{p.selling_price}{orig(p)>Number(p.selling_price)&&<s className="ml-1 text-xs font-normal text-slate-400">₹{orig(p)}</s>}</p></div>)}
     <p className="mt-2 flex justify-between text-sm text-slate-500"><span>{t('shop.items',{n:existing?1:items.length})}</span><span className="font-bold text-slate-900">₹{total}</span></p></div>
    <div className={card}><h3 className={h}>{t('shop.sec.customer')}</h3><p className="text-sm text-slate-500">{t('co.account')}</p><p className="font-semibold">{user.email}</p></div>
    {!existing&&isSupabaseConfigured&&<div className={card}><label className="block text-sm font-medium">{t('cp.label')}</label>
     {applied?<div className="mt-1 flex items-center justify-between rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-sm"><b className="text-green-800">{applied}</b><button type="button" className="text-xs text-slate-600 underline" onClick={removeCoupon}>{t('cp.remove')}</button></div>
     :<div className="mt-1 flex gap-2"><input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} className={fld+' !mt-0 flex-1'} placeholder={t('cp.ph')} maxLength={30}/><button type="button" disabled={checking||!code.trim()} onClick={applyCoupon} className="btn-blue disabled:opacity-50">{checking?t('cp.checking'):t('cp.apply')}</button></div>}
     {cpMsg&&<p className={`mt-1 text-xs ${applied?'text-green-700':'text-amber-700'}`}>{cpMsg}</p>}</div>}
    {!isSupabaseConfigured&&<p className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"><AlertCircle className="h-5 w-5 shrink-0"/>{t('co.preview')}</p>}
    {Pay}
   </div>
   <div className="mt-3 lg:sticky lg:top-20 lg:mt-0"><div className={card}><h3 className={h}>{t('shop.sec.confirm')}</h3>
    {!existing&&quote&&quote.discount>0&&<div className="mb-2 space-y-1 text-sm text-slate-700"><p className="flex justify-between"><span>{t('cp.sub')}</span><span>₹{quote.subtotal}</span></p><p className="flex justify-between text-green-700"><span>{t('cp.disc')}{quote.coupon_code?` (${quote.coupon_code})`:''}</span><span>− ₹{quote.discount}</span></p></div>}
    <p className="text-sm text-slate-500">{t('co.payable')}</p><p className="text-3xl font-black text-navy">₹{total}</p>
    <div className="mt-4 hidden lg:block">{Btn}</div><p className="mt-3 text-center text-xs text-slate-500"><ShieldCheck className="mr-1 inline h-4 w-4"/> {t('co.trust')}</p></div></div>
  </div>
  <div className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white px-3 py-2 shadow-[0_-6px_16px_rgba(0,0,0,.08)] lg:hidden"><div className="mx-auto flex max-w-5xl items-center gap-3"><div><p className="text-[11px] text-slate-500">{t('co.payable')}</p><p className="text-lg font-black leading-none">₹{total}</p></div><div className="flex-1">{mkBtn(true)}</div></div></div>
 </div>
}
