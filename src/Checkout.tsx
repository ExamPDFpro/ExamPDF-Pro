import { useEffect, useRef, useState } from 'react';
import { X, ShieldCheck, Upload, AlertCircle, CheckCircle2, ArrowLeft, Copy, QrCode, Landmark, Tag, ImageUp } from 'lucide-react';
import { isSupabaseConfigured, supabase, fnErr, type Product } from './lib/supabase';
import { isOn, APP_METHODS, appLink } from './lib/payMethods';
import { PAY_ICONS } from './lib/payIcons';
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
 const tint:Record<string,string>={phonepe:'border-[#5F259F] bg-[#5F259F]/[0.07] text-[#5F259F]',paytm:'border-[#00BAF2] bg-[#00BAF2]/10 text-[#002E6E]',gpay:'border-slate-300 bg-white text-slate-700'};
 const cb='inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-navy shadow-sm active:bg-slate-100';
 // Brand logo: PhonePe is a round icon + name; Paytm and Google Pay are wordmarks, so the logo itself carries the name.
 const Logo=({m}:{m:string})=>{const i=PAY_ICONS[m];if(!i)return <span>{appNames[m]}</span>;
  if(m==='phonepe')return <><svg viewBox={i.vb} width="26" height="26" role="img" aria-hidden="true" className="shrink-0">{i.paths.map((p,k)=><path key={k} fill={p.fill} d={p.d}/>)}</svg><span className="whitespace-nowrap">{appNames[m]}</span></>;
  const hgt=m==='paytm'?17:20;return <svg viewBox={i.vb} height={hgt} width={Math.round(hgt*i.w/i.h)} role="img" aria-label={appNames[m]} className="shrink-0">{i.paths.map((p,k)=><path key={k} fill={p.fill} d={p.d}/>)}</svg>;};
 const tile='flex min-h-[52px] items-center justify-center gap-2 rounded-xl border-2 px-2 py-2 text-center text-sm font-bold leading-tight';
 const hasApps=upiOk&&(!!upiLink||appsOn.length>0);
 const saved=quote&&quote.discount>0?quote.discount:0;
 const field='mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-base text-slate-900 outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/15';
 const Pay=<div className={card}><h3 className={h}>{t('shop.sec.payment')}</h3>
  <div className="mb-3 flex items-end justify-between gap-3 rounded-2xl bg-gradient-to-br from-navy to-[#14306b] px-4 py-3.5 text-white shadow-md"><div><p className="text-xs font-medium uppercase tracking-wider text-white/70">{t('shop.payamt')}</p>{saved>0&&<p className="mt-0.5 text-xs font-semibold text-green-300">{t('cp.disc')} − ₹{saved}</p>}</div><p className="text-[34px] font-black leading-none text-gold md:text-4xl">₹{total}</p></div>
  <ol className="mb-4 grid gap-1.5 text-xs leading-snug text-slate-600 md:grid-cols-3 md:gap-3">{(['pay.step1','pay.step2','pay.step3'] as const).map((k,i)=><li key={k} className="flex items-start gap-2 md:rounded-lg md:bg-slate-50 md:p-2.5"><b className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-navy text-[11px] text-gold">{i+1}</b><span className="pt-0.5">{t(k)}</span></li>)}</ol>
  {hasPay?<div className="text-sm text-slate-700">
   {hasApps&&<div className="mb-4 md:[@media(pointer:fine)]:hidden"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('pay.appsh')}</p><div className="grid grid-cols-2 gap-2.5">{[...(upiLink?[['upi',upiLink]]:[]),...appsOn.map(m=>[m,appLink(m,upiQuery)])].map(([k,href])=><a key={k} href={href} className={`${tile} active:scale-[.98] active:opacity-80 [&:last-child:nth-child(odd)]:col-span-2 ${k==='upi'?'border-navy bg-navy text-white':tint[k]} max-[359px]:gap-1.5 max-[359px]:px-1.5 max-[359px]:text-[13px]`}>{k==='upi'?<span>{t('pay.upibtn')}</span>:<Logo m={k}/>}</a>)}</div><p className="mt-2 text-[11px] text-slate-500">{t('pay.upifallback')}</p></div>}
   {hasApps&&appsOn.length>0&&showQr&&<div className="mb-4 hidden md:[@media(pointer:fine)]:block"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('pay.accepted')}</p><div className="flex flex-wrap gap-2.5">{appsOn.map(m=><span key={m} className={`${tile} min-h-[46px] min-w-[128px] ${tint[m]}`}><Logo m={m}/></span>)}</div></div>}
   <div className="md:grid md:grid-cols-2 md:items-start md:gap-4">
    <div>{showUpiId&&<div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5"><div className="min-w-0"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t('co.upi')}</p><p className="break-all text-base font-bold text-navy select-all">{pay.upi_id}</p>{pay.payee_name&&<p className="text-xs text-slate-500">{pay.payee_name}</p>}</div><button type="button" className={cb} onClick={()=>copy(String(pay.upi_id))}><Copy className="h-3.5 w-3.5"/>{t('pay.copyupi')}</button></div>}
     {showBank&&<details open={!showUpiId&&!showQr} className="mb-3 rounded-xl border border-slate-200 bg-white"><summary className="flex cursor-pointer items-center gap-2 px-3.5 py-3 text-sm font-semibold text-navy"><Landmark className="h-4 w-4"/>{t('pay.bankdet')}</summary><div className="space-y-1 px-3.5 pb-3.5 text-sm"><p>{t('co.bank')}: {pay.bank_name}</p><p>{t('co.acname')}: {pay.account_name}</p><div className="flex items-center justify-between gap-2"><p className="min-w-0 break-all">{t('co.acno')}: <b className="select-all">{pay.account_number}</b></p><button type="button" className={cb} onClick={()=>copy(String(pay.account_number))}><Copy className="h-3.5 w-3.5"/>{t('pay.copyacno')}</button></div><p>{t('co.ifsc')}: <b className="select-all">{pay.ifsc}</b></p></div></details>}</div>
    <div>{showQr&&<details open={!showUpiId&&!showBank} className="mb-3 rounded-xl border border-slate-200 bg-white"><summary className="flex cursor-pointer items-center gap-2 px-3.5 py-3 text-sm font-semibold text-navy"><QrCode className="h-4 w-4"/>{t('pay.scanqr')}</summary><div className="px-3.5 pb-3.5"><img src={pay.qr_url} alt="Payment QR" className="mx-auto h-52 w-52 rounded-xl border border-slate-200 bg-white object-contain p-2"/></div></details>}</div>
   </div>
   {pay.note&&<p className="text-xs text-slate-500">{pay.note}</p>}</div>:<p className="text-sm text-slate-500">{t('shop.nopay')}</p>}
  <div className="mt-5 border-t border-slate-100 pt-4"><h4 className="mb-2 text-sm font-bold text-navy">{t('pay.proof')}</h4>
   <div className="md:grid md:grid-cols-2 md:gap-4">
    <label className="block text-sm font-medium text-slate-700">{t('co.utr')}<input value={utr} onChange={e=>setUtr(e.target.value)} className={field} placeholder={t('co.utrph')} autoComplete="off" inputMode="text"/></label>
    <div className="mt-3 md:mt-0"><span className="block text-sm font-medium text-slate-700">{t('co.shot')}</span><label className={`mt-1.5 flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed px-3.5 py-3 transition ${file?'border-green-400 bg-green-50':'border-slate-300 bg-slate-50 hover:border-navy'}`}>{file?<CheckCircle2 className="h-6 w-6 shrink-0 text-green-600"/>:<ImageUp className="h-6 w-6 shrink-0 text-navy"/>}<span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-800">{file?file.name:t('pay.pick')}</span><span className="block text-xs text-slate-500">{file?`${(file.size/1024).toFixed(0)} KB · ${t('pay.change')}`:t('co.shotnote')}</span></span>
     <input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={e=>{const f=e.target.files?.[0]||null;if(f&&f.size>MAX_PROOF_BYTES){say(t('co.toolarge'));e.target.value='';setFile(null);return;}setFile(f);}} className="sr-only"/></label></div>
   </div>
   <p className="mt-3 flex items-start gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-900"><ShieldCheck className="mt-px h-4 w-4 shrink-0"/>{t('pay.next')}</p></div></div>;
 const Fail=fail?<div ref={failRef} role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"><b className="block">{t('pay.failtitle')}</b>{fail}<span className="mt-1 block text-xs">{t('pay.failhint')}</span></div>:null;
 const mkBtn=(bar:boolean)=><button disabled={busy} onClick={submit} className={bar?"btn-gold w-full whitespace-nowrap !px-3 !py-2.5 text-sm shadow-md disabled:opacity-50":"btn-gold w-full !py-3 text-base disabled:opacity-50"}>{busy?t('co.submitting'):fail?t('pay.retry'):bar?t('co.submitshort'):<><Upload className="mr-2 inline h-4 w-4"/> {t('co.submit')}</>}</button>;
 const Btn=mkBtn(false);
 return <div className="fixed inset-0 z-[90] overflow-y-auto bg-slate-100 text-slate-900">
  <div className="sticky top-0 z-10 border-b border-gold/30 bg-navy text-white shadow"><div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-3"><button className="flex items-center gap-2 text-sm font-semibold" onClick={onClose}><ArrowLeft className="h-5 w-5"/>{t('shop.back')}</button><div className="text-center"><span className="block text-[10px] uppercase tracking-widest text-gold">{t('co.secure')}</span><h2 className="text-base font-bold">{t('co.title')}</h2></div><button onClick={onClose} aria-label={t('common.close')}><X/></button></div></div>
  <div className="mx-auto max-w-6xl px-3 pb-24 pt-4 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-6 lg:pb-10">
   <div className="space-y-3">
    {Fail}
    <div className={card}><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">{t('shop.sec.review')}</h3><span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">{t('shop.items',{n:existing?1:items.length})}</span></div>
     {existing?<p className="text-sm text-slate-700">{t('shop.existing')} · #{String(existing.id).slice(0,8)}</p>:items.map(p=><div key={p.id} className="flex items-center gap-3 border-b border-slate-100 py-2.5 first:pt-0 last:border-0">
      <div className="h-[60px] w-11 shrink-0 overflow-hidden rounded-md bg-navy shadow-sm ring-1 ring-slate-200">{p.cover_url&&<img src={p.cover_url} alt="" className="h-full w-full object-cover"/>}</div>
      <div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-semibold leading-snug">{p.title}</p><p className="mt-0.5 text-xs text-slate-500">{t('od.qty')}: 1</p></div><p className="text-right text-base font-black">₹{p.selling_price}{orig(p)>Number(p.selling_price)&&<s className="block text-xs font-normal text-slate-400">₹{orig(p)}</s>}</p></div>)}
     <p className="mt-3 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"><span className="text-slate-600">{t('shop.items',{n:existing?1:items.length})}</span><span className="text-base font-black text-slate-900">₹{total}</span></p></div>
    {!existing&&isSupabaseConfigured&&<div className={card}><label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700"><Tag className="h-4 w-4 text-gold"/>{t('cp.label')}</label>
     {applied?<div className="flex items-center justify-between rounded-xl border border-green-300 bg-green-50 px-3.5 py-2.5 text-sm"><b className="text-green-800">{applied}</b><button type="button" className="text-xs font-semibold text-slate-600 underline" onClick={removeCoupon}>{t('cp.remove')}</button></div>
     :<div className="flex gap-2"><input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base outline-none placeholder:normal-case placeholder:tracking-normal focus:border-navy focus:ring-2 focus:ring-navy/15" placeholder={t('cp.ph')} maxLength={30}/><button type="button" disabled={checking||!code.trim()} onClick={applyCoupon} className="btn-blue shrink-0 !px-5 disabled:opacity-50">{checking?t('cp.checking'):t('cp.apply')}</button></div>}
     {cpMsg&&<p className={`mt-1.5 text-xs ${applied?'text-green-700':'text-amber-700'}`}>{cpMsg}</p>}</div>}
    {!isSupabaseConfigured&&<p className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"><AlertCircle className="h-5 w-5 shrink-0"/>{t('co.preview')}</p>}
    {Pay}
   </div>
   <div className="mt-3 lg:sticky lg:top-20 lg:mt-0"><div className={card}><h3 className={h}>{t('shop.sec.confirm')}</h3>
    {!existing&&quote&&quote.discount>0&&<div className="mb-2 space-y-1 text-sm text-slate-700"><p className="flex justify-between"><span>{t('cp.sub')}</span><span>₹{quote.subtotal}</span></p><p className="flex justify-between text-green-700"><span>{t('cp.disc')}{quote.coupon_code?` (${quote.coupon_code})`:''}</span><span>− ₹{quote.discount}</span></p></div>}
    <div className="flex items-end justify-between border-t border-slate-100 pt-3"><p className="text-sm text-slate-500">{t('co.payable')}</p><p className="text-3xl font-black text-navy">₹{total}</p></div>
    <div className="mt-4 hidden lg:block">{Btn}</div><p className="mt-3 text-center text-xs text-slate-500"><ShieldCheck className="mr-1 inline h-4 w-4"/> {t('co.trust')}</p></div></div>
  </div>
  <div className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 px-3 py-2 shadow-[0_-6px_16px_rgba(0,0,0,.08)] backdrop-blur lg:hidden"><div className="mx-auto flex max-w-6xl items-center gap-3"><div><p className="text-[11px] text-slate-500">{t('co.payable')}</p><p className="text-lg font-black leading-none text-navy">₹{total}</p></div><div className="flex-1">{mkBtn(true)}</div></div></div>
 </div>
}
