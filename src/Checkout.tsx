import { useState } from 'react';
import { X, ShieldCheck, Upload, AlertCircle } from 'lucide-react';
import { isSupabaseConfigured, supabase, type Product } from './lib/supabase';
type Order={id:string;total:number};
export default function Checkout({items,existing,user,say,onClose,onDone}:{items:Product[];existing?:Order;user:any;say:(s:string)=>void;onClose:()=>void;onDone:()=>void}){
 const [utr,setUtr]=useState(''),[file,setFile]=useState<File|null>(null),[busy,setBusy]=useState(false);
 const total=existing?.total??items.reduce((s,p)=>s+Number(p.selling_price),0);
 async function submit(){if(!isSupabaseConfigured){say('আগে Supabase সেটআপ করতে হবে।');return;}if(!file||!utr.trim()){say('Payment reference ও screenshot দিন।');return;}setBusy(true);try{
  // Payment submissions must be processed by a server-side Edge Function after the matching order exists.
  const {data,error}=await supabase.functions.invoke('submit-payment',{body:{order_id:existing?.id,product_ids:items.map(p=>p.id),payment_reference:utr.trim()}});
  if(error||!data?.upload_path)throw new Error(error?.message||'Payment submission endpoint প্রস্তুত নয়।');
  const up=await supabase.storage.from('payment-proofs').upload(data.upload_path,file,{upsert:false});if(up.error)throw up.error;
  say('Payment screenshot জমা হয়েছে। Admin approval-এর অপেক্ষায় থাকুন।');onDone();onClose();
 }catch(e:any){say(e.message||'জমা করা যায়নি।');}finally{setBusy(false)}}
 return <div className="fixed inset-0 z-[90] overflow-y-auto bg-black/80 p-3"><div className="card mx-auto my-5 w-full max-w-lg bg-navy p-5"><div className="mb-4 flex items-center justify-between"><div><span className="text-xs uppercase tracking-widest text-gold">Secure Checkout</span><h2 className="text-xl font-bold">Payment Submission</h2></div><button onClick={onClose}><X/></button></div>
  <div className="rounded-xl border border-gold/25 bg-white/5 p-4"><p className="text-sm text-white/60">Account</p><p className="font-semibold">{user.email}</p><p className="mt-3 text-sm text-white/60">Payable amount</p><p className="text-3xl font-black text-gold">₹{total}</p></div>
  {!isSupabaseConfigured&&<p className="mt-4 flex gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100"><AlertCircle className="h-5 w-5 shrink-0"/>এটি Local preview mode। আসল payment submission চালু করতে Supabase project ও secure Edge Function সেটআপ প্রয়োজন।</p>}
  <label className="mt-4 block text-sm font-medium">Transaction ID / UTR<input value={utr} onChange={e=>setUtr(e.target.value)} className="input mt-1" placeholder="Payment reference number"/></label>
  <label className="mt-4 block text-sm font-medium">Payment screenshot<input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={e=>setFile(e.target.files?.[0]||null)} className="mt-2 block w-full text-sm text-white/70"/><span className="mt-1 block text-xs text-white/45">JPG, PNG, WEBP বা PDF</span></label>
  <button disabled={busy} onClick={submit} className="btn-gold mt-5 w-full disabled:opacity-50">{busy?'Submitting…':<><Upload className="mr-2 inline h-4 w-4"/> Submit for Admin Verification</>}</button><p className="mt-3 text-center text-xs text-white/45"><ShieldCheck className="mr-1 inline h-4 w-4"/> Admin approval ছাড়া Full PDF Download হবে না।</p>
 </div></div>
}
