import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
const input='w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm';
const label='mb-1 block text-xs text-white/60';
const fields:[string,string][]=[['upi_id','UPI ID'],['payee_name','Payee Name'],['bank_name','Bank Name'],['account_name','Account Holder Name'],['account_number','Account Number'],['ifsc','IFSC Code']];
export default function AdminPayments({say}:{say:(s:string)=>void}){
 const [rows,setRows]=useState<any[]>([]),[pay,setPay]=useState<any>({}),[qr,setQr]=useState<File|null>(null),[busy,setBusy]=useState(false),[filter,setFilter]=useState('pending');
 const load=async()=>{
  const {data:ps,error}=await supabase.from('payments').select('id,order_id,user_id,payment_reference,proof_path,status,created_at,orders(total)').order('created_at',{ascending:false});
  if(error){say(error.message);return;}
  const list=ps||[];const oids=list.map((p:any)=>p.order_id),uids=[...new Set(list.map((p:any)=>p.user_id))];
  const [it,pr]=await Promise.all([oids.length?supabase.from('order_items').select('order_id,pdf_products(title)').in('order_id',oids):{data:[]},uids.length?supabase.from('profiles').select('id,email').in('id',uids):{data:[]}]);
  const titles:Record<string,string[]>={};(it.data||[]).forEach((r:any)=>{(titles[r.order_id]=titles[r.order_id]||[]).push(r.pdf_products?.title)});
  const emails:Record<string,string>=Object.fromEntries((pr.data||[]).map((r:any)=>[r.id,r.email]));
  setRows(list.map((p:any)=>({...p,items:titles[p.order_id]||[],email:emails[p.user_id]||''})));
 };
 useEffect(()=>{load();supabase.from('website_settings').select('value').eq('key','payment').maybeSingle().then(({data}:any)=>setPay(data?.value||{}))},[]);
 const proof=async(path:string)=>{const {data,error}=await supabase.storage.from('payment-proofs').createSignedUrl(path,300);if(error||!data?.signedUrl)return say('Screenshot পাওয়া যায়নি (গ্রাহক হয়তো আপলোড করেননি)।');window.open(data.signedUrl,'_blank','noopener');};
 const decide=async(id:string,ok:boolean)=>{if(!confirm(ok?'Payment approve করবেন? গ্রাহক PDF download করতে পারবেন।':'Payment reject করবেন?'))return;const {error}=await supabase.rpc('admin_decide_payment',{p_payment_id:id,p_approve:ok});if(error)say(error.message);else{say(ok?'Approved ✓':'Rejected');load();}};
 const savePay=async()=>{setBusy(true);try{let v={...pay};if(qr){const path=`qr-${Date.now()}-${qr.name.replace(/[^a-zA-Z0-9._-]+/g,'-')}`;const up=await supabase.storage.from('covers').upload(path,qr,{contentType:qr.type||undefined});if(up.error)throw up.error;v.qr_url=supabase.storage.from('covers').getPublicUrl(path).data.publicUrl;}
  const {error}=await supabase.from('website_settings').upsert({key:'payment',value:v},{onConflict:'key'});if(error)throw error;setPay(v);setQr(null);say('Payment details সংরক্ষণ হয়েছে ✓');}catch(e:any){say(e.message||'সেভ হয়নি')}finally{setBusy(false)}};
 const shown=rows.filter(r=>filter==='all'||r.status===filter);
 return <>
  <h2 className="mb-4 text-2xl font-black">Payments & Orders</h2>
  <div className="admin-panel mb-4 p-4"><h3 className="mb-3 font-bold text-gold">Payment Details (Checkout-এ দেখাবে)</h3>
   <div className="grid gap-3 sm:grid-cols-2">{fields.map(([k,t])=><label key={k}><span className={label}>{t}</span><input className={input} value={pay[k]||''} onChange={e=>setPay({...pay,[k]:e.target.value})}/></label>)}
    <label className="sm:col-span-2"><span className={label}>Note (ঐচ্ছিক)</span><input className={input} value={pay.note||''} onChange={e=>setPay({...pay,note:e.target.value})}/></label>
    <label className="sm:col-span-2"><span className={label}>UPI QR Code Image</span>{pay.qr_url&&<img src={pay.qr_url} alt="QR" className="mb-2 h-28 w-28 rounded bg-white object-contain p-1"/>}<input type="file" accept="image/*" onChange={e=>setQr(e.target.files?.[0]||null)} className="block text-sm text-white/70"/></label></div>
   <button className="btn-gold mt-4" disabled={busy} onClick={savePay}>{busy?'Saving…':'Save Payment Details'}</button></div>
  <div className="admin-panel p-4"><div className="mb-3 flex flex-wrap items-center gap-2"><h3 className="mr-auto font-bold text-gold">Payment Requests</h3>{['pending','approved','rejected','all'].map(f=><button key={f} onClick={()=>setFilter(f)} className={`rounded-full border px-3 py-1 text-xs ${filter===f?'border-gold bg-gold text-navy':'border-white/15 text-white/70'}`}>{f}</button>)}</div>
   {shown.length===0&&<p className="py-6 text-center text-sm text-white/50">কোনো payment নেই।</p>}
   {shown.map(r=><div key={r.id} className="mb-2 rounded-xl border border-white/10 p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-semibold">{r.email||r.user_id.slice(0,8)} · ₹{r.orders?.total}</p><p className="text-xs text-white/55">UTR: <b className="select-all text-white/80">{r.payment_reference}</b> · {new Date(r.created_at).toLocaleString()}</p><p className="mt-1 text-xs text-white/60">{r.items.join(', ')}</p></div><span className="rounded-full border border-white/15 px-2 py-0.5 text-xs">{r.status}</span></div>
    <div className="mt-2 flex flex-wrap gap-2"><button className="btn-blue !py-1" onClick={()=>proof(r.proof_path)}>Screenshot দেখুন</button>{r.status!=='approved'&&<button className="btn-gold !py-1" onClick={()=>decide(r.id,true)}>Approve</button>}{r.status==='pending'&&<button className="btn-blue !py-1" onClick={()=>decide(r.id,false)}>Reject</button>}</div></div>)}
  </div></>;
}
