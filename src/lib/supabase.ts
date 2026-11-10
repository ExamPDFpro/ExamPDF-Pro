import { createClient } from '@supabase/supabase-js';

export type Product = {
  id: string; title: string; description?: string; category_id?: string;
  selling_price: number; original_price: number; cover_url?: string;
  preview_enabled?: boolean; preview_pdf_path?: string; is_featured?: boolean;
  featured_order?: number; is_active?: boolean; is_published?: boolean;
};
export const PRODUCT_COLS = 'id,title,description,category_id,selling_price,original_price,cover_url,preview_enabled,preview_pdf_path,is_featured,featured_order,is_active,is_published,created_at';
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const isSupabaseConfigured = !!(url && key && !url.includes('YOUR_PROJECT') && !key.includes('YOUR_'));

const demoProducts: Product[] = [
 {id:'demo-upsc',title:'UPSC Prelims GS Notes 2026',description:'General Studies notes and practice material for UPSC Prelims.',category_id:'upsc',selling_price:299,original_price:499,cover_url:'',preview_enabled:false,is_featured:true,is_active:true,is_published:true,featured_order:1},
 {id:'demo-ssc',title:'SSC CGL Maths Shortcuts',description:'Topic-wise mathematics shortcuts and practice.',category_id:'ssc',selling_price:199,original_price:399,cover_url:'',preview_enabled:false,is_featured:true,is_active:true,is_published:true,featured_order:2},
 {id:'demo-wbcs',title:'WBCS Prelims Practice Sets',description:'Practice sets for West Bengal Civil Service.',category_id:'wbcs',selling_price:349,original_price:599,cover_url:'',preview_enabled:false,is_featured:true,is_active:true,is_published:true,featured_order:3},
 {id:'demo-police',title:'WB Police Constable Guide',description:'Preparation guide and practice material.',category_id:'police',selling_price:249,original_price:349,cover_url:'',preview_enabled:false,is_featured:false,is_active:true,is_published:true,featured_order:4},
 {id:'demo-rail',title:'RRB NTPC Previous Papers',description:'Previous question papers for railway exams.',category_id:'railway',selling_price:149,original_price:299,cover_url:'',preview_enabled:false,is_featured:false,is_active:true,is_published:true,featured_order:5},
 {id:'demo-bank',title:'IBPS Clerk Reasoning Pack',description:'Reasoning notes and practice questions.',category_id:'banking',selling_price:299,original_price:449,cover_url:'',preview_enabled:false,is_featured:false,is_active:true,is_published:true,featured_order:6},
 {id:'demo-neet',title:'NEET Biology Quick Revision',description:'Quick revision notes for NEET Biology.',category_id:'neet',selling_price:449,original_price:699,cover_url:'',preview_enabled:false,is_featured:true,is_active:true,is_published:true,featured_order:7},
 {id:'demo-ctet',title:'CTET Child Pedagogy Notes',description:'Child development and pedagogy study notes.',category_id:'ctet',selling_price:199,original_price:249,cover_url:'',preview_enabled:false,is_featured:false,is_active:true,is_published:true,featured_order:8}
];
const demoCats = [
 {id:'upsc',name:'UPSC'},{id:'ssc',name:'SSC CGL'},{id:'railway',name:'Railway'},{id:'banking',name:'Banking IBPS'},
 {id:'neet',name:'NEET'},{id:'ctet',name:'CTET'},{id:'wbcs',name:'WBCS'},{id:'police',name:'WB Police'}
];
function demoBuilder(table:string) {
 let rows:any[] = table==='pdf_products'?demoProducts:table==='exam_categories'?demoCats:[];
 const b:any={select:()=>b,eq:(k:string,v:any)=>{rows=rows.filter(r=>r[k]===v);return b;},order:()=>b,limit:()=>b,insert:()=>b,update:()=>b,delete:()=>b,then:(resolve:any)=>Promise.resolve({data:rows,error:null}).then(resolve)};
 return b;
}
const demoAuth = {
 getSession: async()=>({data:{session:null},error:null}),
 onAuthStateChange: (_cb:any)=>({data:{subscription:{unsubscribe(){}}}}),
 signInWithPassword: async()=>({data:null,error:{message:'Supabase সেটআপ করা হয়নি। .env ফাইলে Project URL ও Anon Key দিন।'}}),
 signUp: async()=>({data:null,error:{message:'Supabase সেটআপ করা হয়নি। .env ফাইলে Project URL ও Anon Key দিন।'}}),
 signOut: async()=>({error:null})
};
export const supabase:any = isSupabaseConfigured ? createClient(url!,key!) : {
 auth:demoAuth,
 from:(table:string)=>demoBuilder(table),
 rpc:async(name:string)=>({data:name==='best_selling_products'?[]:null,error:null}),
 storage:{from:()=>({getPublicUrl:()=>({data:{publicUrl:''}})})}
};
export function pub(bucket:string,path:string){ if(!isSupabaseConfigured||!path)return ''; return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl; }
