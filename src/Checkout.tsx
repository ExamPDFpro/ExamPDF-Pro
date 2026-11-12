import { useEffect, useState } from 'react';
import { X, ShieldCheck, Upload, AlertCircle } from 'lucide-react';
import { isSupabaseConfigured, supabase, fnErr, type Product } from './lib/supabase';
import { getRef } from './lib/affiliate';
import { useT, en, type Key } from './i18n';
type Order={id:string;total:number};
type Quote={subtotal:number;discount:number;total:number;coupon_code?:string|null};
export default function Checkout({items,existing,user,say,onClose,onDone}:{items:Product[];existing?:Order;user:any;say:(s:string)=>void;onClose:()=>void;onDone:()=>void}){
 const t=useT();
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
 const hasPay=!!(pay.upi_id||pay.qr_url||pay.account_number);
 async function submit(){if(!isSupabaseConfigured){say(t('co.needsetup'));return;}if(!file||!utr.trim()){say(t('co.need'));return;}setBusy(true);try{
  // Payment submissions are processed by a server-side Edge Function: it re-prices the order and records the UTR.
  const {data,error}=await supabase.functions.invoke('submit-payment',{body:{order_id:existing?.id,product_ids:ids,payment_reference:utr.trim(),coupon_code:applied||undefined,ref:getRef()||undefined}});
  if(error||!data?.upload_path)throw new Error((await fnErr(error,data))||t('co.noendpoint'));
  const up=await supabase.storage.from('payment-proofs').upload(data.upload_path,file,{upsert:false});if(up.error)throw up.error;
  say(t('co.done'));onDone();onClose();
 }catch(e:any){say(e.message||t('co.fail'));}finally{setBusy(false)}}
 return <div className="fixed inset-0 z-[90] overflow-y-auto bg-black/80 p-3"><div className="card mx-auto my-5 w-full max-w-lg bg-navy p-5"><div className="mb-4 flex items-center justify-between"><div><span className="text-xs uppercase tracking-widest text-gold">{t('co.secure')}</span><h2 className="text-xl font-bold">{t('co.title')}</h2></div><button onClick={onClose} aria-label={t('common.close')}><X/></button></div>
  <div className="rounded-xl border border-gold/25 bg-white/5 p-4"><p className="text-sm text-white/60">{t('co.account')}</p><p className="font-semibold">{user.email}</p>
   {!existing&&quote&&quote.discount>0&&<div className="mt-3 space-y-1 text-sm text-white/70"><p className="flex justify-between"><span>{t('cp.sub')}</span><span>₹{quote.subtotal}</span></p><p className="flex justify-between text-[#8be0a4]"><span>{t('cp.disc')}{quote.coupon_code?` (${quote.coupon_code})`:''}</span><span>− ₹{quote.discount}</span></p></div>}
   <p className="mt-3 text-sm text-white/60">{t('co.payable')}</p><p className="text-3xl font-black text-gold">₹{total}</p></div>
  {!existing&&isSupabaseConfigured&&<div className="mt-4"><label className="block text-sm font-medium">{t('cp.label')}</label>
   {applied?<div className="mt-1 flex items-center justify-between rounded-lg border border-[#8be0a4]/40 bg-[#8be0a4]/10 px-3 py-2 text-sm"><b className="text-[#8be0a4]">{applied}</b><button type="button" className="text-xs text-white/70 underline" onClick={removeCoupon}>{t('cp.remove')}</button></div>
   :<div className="mt-1 flex gap-2"><input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} className="input flex-1" placeholder={t('cp.ph')} maxLength={30}/><button type="button" disabled={checking||!code.trim()} onClick={applyCoupon} className="btn-blue disabled:opacity-50">{checking?t('cp.checking'):t('cp.apply')}</button></div>}
   {cpMsg&&<p className={`mt-1 text-xs ${applied?'text-[#8be0a4]':'text-gold'}`}>{cpMsg}</p>}</div>}
  {!isSupabaseConfigured&&<p className="mt-4 flex gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100"><AlertCircle className="h-5 w-5 shrink-0"/>{t('co.preview')}</p>}
  {hasPay&&<div className="mt-4 rounded-xl border border-gold/25 bg-white/5 p-4 text-sm"><p className="mb-2 font-semibold text-gold">{t('co.payto')}</p>{pay.qr_url&&<img src={pay.qr_url} alt="Payment QR" className="mx-auto mb-3 h-44 w-44 rounded-lg bg-white object-contain p-1"/>}{pay.upi_id&&<p>{t('co.upi')}: <b className="select-all">{pay.upi_id}</b>{pay.payee_name?` (${pay.payee_name})`:''}</p>}{pay.account_number&&<div className="mt-2 text-white/80"><p>{t('co.bank')}: {pay.bank_name}</p><p>{t('co.acname')}: {pay.account_name}</p><p>{t('co.acno')}: <b className="select-all">{pay.account_number}</b></p><p>{t('co.ifsc')}: <b className="select-all">{pay.ifsc}</b></p></div>}{pay.note&&<p className="mt-2 text-xs text-white/60">{pay.note}</p>}<p className="mt-2 text-xs text-white/50">{t('co.after')}</p></div>}
  <label className="mt-4 block text-sm font-medium">{t('co.utr')}<input value={utr} onChange={e=>setUtr(e.target.value)} className="input mt-1" placeholder={t('co.utrph')}/></label>
  <label className="mt-4 block text-sm font-medium">{t('co.shot')}<input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={e=>setFile(e.target.files?.[0]||null)} className="mt-2 block w-full text-sm text-white/70"/><span className="mt-1 block text-xs text-white/45">{t('co.shotnote')}</span></label>
  <button disabled={busy} onClick={submit} className="btn-gold mt-5 w-full disabled:opacity-50">{busy?t('co.submitting'):<><Upload className="mr-2 inline h-4 w-4"/> {t('co.submit')}</>}</button><p className="mt-3 text-center text-xs text-white/45"><ShieldCheck className="mr-1 inline h-4 w-4"/> {t('co.trust')}</p>
 </div></div>
}
