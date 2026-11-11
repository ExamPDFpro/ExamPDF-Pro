import { useEffect, useMemo, useState } from "react";
import { BookOpen, Facebook, Heart, FileText, Headphones, Instagram, Languages, Mail, MessageCircle, Search, Send, ShieldCheck, ShoppingCart, User, X, Youtube } from "lucide-react";
import { supabase, PRODUCT_COLS, pub, fnErr, type Product } from "./lib/supabase";
import Preview from "./Preview";
import Checkout from "./Checkout";
import Hero3D from "./Hero3D";
import { tilt, untilt } from "./lib/fx";
import { Auth, Account } from "./Account";
import Admin from "./Admin";
import { ReviewsSection, ReviewModal } from "./Reviews";
import { DEFAULT_PAGES, DEFAULT_TEXTS } from "./lib/defaults";

const DEFAULT_CATS = [
  { id: "upsc", name: "UPSC" }, { id: "ssc", name: "SSC CGL" }, { id: "railway", name: "Railway" },
  { id: "banking", name: "Banking IBPS" }, { id: "neet", name: "NEET" }, { id: "ctet", name: "CTET" },
  { id: "wbcs", name: "WBCS" }, { id: "police", name: "WB Police" },
];
const FONTS: Record<string, string> = { sans: "ui-sans-serif, system-ui, sans-serif", serif: 'Georgia, "Times New Roman", serif', mono: "ui-monospace, Menlo, Consolas, monospace" };
type Modal = { t: "preview" | "cart" | "checkout" | "auth" | "account" | "review" | "page"; page?: any; p?: Product; existing?: { id: string; total: number } } | null;

export default function App() {
  if (window.location.hash === "#admin") return <Admin />;
  const [user, setUser] = useState<any>(null), [products, setProducts] = useState<Product[]>([]), [cats, setCats] = useState<any[]>([]);
  const [best, setBest] = useState<string[]>([]), [site, setSite] = useState<Record<string, any>>({}), [owned, setOwned] = useState<string[]>([]);
  const [cart, setCart] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem("cart") || "[]"); } catch { return []; } });
  const [likes, setLikes] = useState<Record<string, number>>({}), [myLikes, setMyLikes] = useState<string[]>([]), [reviews, setReviews] = useState<any[]>([]);
  const [q, setQ] = useState(""), [cat, setCat] = useState<string | null>(null), [modal, setModal] = useState<Modal>(null), [toast, setToast] = useState("");
  const say = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2800); };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: s } = supabase.auth.onAuthStateChange((_, ses) => setUser(ses?.user ?? null));
    return () => s.subscription.unsubscribe();
  }, []);
  useEffect(() => { (async () => {
    const [p, c, w, b] = await Promise.all([
      supabase.from("pdf_products").select(PRODUCT_COLS).eq("is_published", true).eq("is_active", true).order("created_at", { ascending: false }),
      supabase.from("exam_categories").select("id,name,image_url,sort_order,is_hidden").order("sort_order"),
      supabase.from("website_settings").select("*"), supabase.rpc("best_selling_products", { p_limit: 8 })]);
    setProducts((p.data as any) || []); setCats(c.data || []);
    setSite(Object.fromEntries((w.data || []).map((r: any) => [r.key, r.value]))); setBest((b.data || []).map((r: any) => r.product_id));
  })(); }, []);
  useEffect(() => { if (!user) { setOwned([]); return; } supabase.from("purchases").select("product_id").eq("user_id", user.id).then(({ data }) => setOwned((data || []).map((r: any) => r.product_id))); }, [user, modal]);
  useEffect(() => { (async () => {
    const [r, l] = await Promise.all([supabase.from("reviews").select("id,author_name,rating,comment,product_id,created_at").eq("status", "published").order("created_at", { ascending: false }).limit(12), supabase.rpc("product_like_counts")]);
    setReviews(r.data || []); setLikes(Object.fromEntries((l.data || []).map((x: any) => [x.product_id, Number(x.likes)])));
  })(); }, []);
  useEffect(() => { if (!user) { setMyLikes([]); return; } supabase.from("pdf_likes").select("product_id").eq("user_id", user.id).then(({ data }) => setMyLikes((data || []).map((r: any) => r.product_id))); }, [user]);
  const toggleLike = async (id: string) => {
    if (!user) { setModal({ t: "auth" }); return; }
    const on = myLikes.includes(id);
    setMyLikes(on ? myLikes.filter((x) => x !== id) : [...myLikes, id]); setLikes((c) => ({ ...c, [id]: Math.max(0, (c[id] || 0) + (on ? -1 : 1)) }));
    const { error } = on ? await supabase.from("pdf_likes").delete().eq("user_id", user.id).eq("product_id", id) : await supabase.from("pdf_likes").insert({ user_id: user.id, product_id: id });
    if (error) { setMyLikes(on ? [...myLikes, id] : myLikes.filter((x) => x !== id)); setLikes((c) => ({ ...c, [id]: Math.max(0, (c[id] || 0) + (on ? 1 : -1)) })); say(error.message); }
  };
  useEffect(() => localStorage.setItem("cart", JSON.stringify(cart)), [cart]);

  useEffect(() => {   // apply admin design settings (colors, font, animations)
    const t = site.theme || {}, st = document.documentElement.style;
    const rgb = (h: string) => { const m = /^#?([0-9a-f]{6})$/i.exec(h || ""); return m ? [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)).join(" ") : null; };
    (["navy", "royal", "gold"] as const).forEach((k) => { const v = rgb(t[k]); if (v) st.setProperty("--c-" + k, v); else st.removeProperty("--c-" + k); });
    st.setProperty("--font", FONTS[t.font] || FONTS.sans);
    document.documentElement.classList.toggle("no-anim", t.animations === false);
  }, [site]);
  useEffect(() => {   // website name + favicon from admin settings
    const b = site.brand || {};
    if (b.title) document.title = b.title + (b.tagline ? " – " + b.tagline : "");
    if (b.favicon_url) { let l = document.querySelector("link[rel='icon']") as HTMLLinkElement | null; if (!l) { l = document.createElement("link"); l.rel = "icon"; document.head.appendChild(l); } l.href = b.favicon_url; }
  }, [site]);
  const add = (p: Product) => { if (owned.includes(p.id)) return say("এই PDF আপনি আগেই কিনেছেন।"); if (cart.includes(p.id)) return say("কার্টে আগেই আছে।"); setCart([...cart, p.id]); say("কার্টে যোগ হয়েছে ✓"); };
  const download = async (p: Product) => { const { data, error } = await supabase.functions.invoke("download-pdf", { body: { product_id: p.id } }); if (error || !data?.url) return say((await fnErr(error, data)) || "Download করা যায়নি।"); window.location.href = data.url; };
  const buy = (p: Product) => setModal(user ? { t: "checkout", p } : { t: "auth", p });
  const cartItems = cart.map((id) => products.find((p) => p.id === id)).filter(Boolean) as Product[];
  const T: any = { ...DEFAULT_TEXTS, ...(site.texts || {}) };
  // Keep all eight core exam chips, while honoring Admin renames, visibility and order.
  // The seed migration assigns core categories sort_order 1..8, so a renamed category
  // remains attached to its original slot instead of creating a duplicate default chip.
  const coreCats = DEFAULT_CATS.map((d, i) =>
    cats.find((c) => c.sort_order === i + 1) ||
    cats.find((c) => c.name?.trim().toLowerCase() === d.name.toLowerCase()) || d
  );
  const coreIds = new Set(coreCats.map((c) => c.id));
  const displayCats = [...coreCats, ...cats.filter((c) => !coreIds.has(c.id))]
    .filter((c) => c.is_hidden !== true)
    .sort((a, b) => {
      const aOrder = Number(a.sort_order) > 0 ? Number(a.sort_order) : 1000 + coreCats.indexOf(a);
      const bOrder = Number(b.sort_order) > 0 ? Number(b.sort_order) : 1000 + coreCats.indexOf(b);
      return aOrder - bOrder;
    });
  const filtering = !!q || !!cat;
  const activeCategory = displayCats.find((c) => c.id === cat);
  const shown = useMemo(() => products.filter((p) => {
    const categoryMatch = !cat || p.category_id === cat || (!!activeCategory && (p.title + " " + (p.description || "")).toLowerCase().includes(activeCategory.name.toLowerCase()));
    const queryMatch = !q || (p.title + " " + (p.description || "")).toLowerCase().includes(q.toLowerCase());
    return categoryMatch && queryMatch;
  }), [products, q, cat, activeCategory]);
  const bestP = best.map((id) => products.find((p) => p.id === id)).filter(Boolean) as Product[];
  const pct = (p: Product) => (p.original_price > 0 ? Math.round(100 * (1 - p.selling_price / p.original_price)) : 0);
  const offers = [...products].filter((p) => pct(p) > 0).sort((a, b) => pct(b) - pct(a)).slice(0, 4);

  const Card = (p: Product) => {
    const category = displayCats.find((c) => c.id === p.category_id)?.name || "Exam PDF";
    const hue = [218, 258, 188, 28, 342, 46, 202, 278][Math.abs((p.title || "PDF").split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % 8];
    return <button key={p.id} onClick={() => setModal({ t: "preview", p })} onPointerMove={tilt} onPointerLeave={untilt} className="card exam-card group overflow-hidden text-left transition-transform duration-150">
      <div className="exam-cover relative aspect-[3/4] overflow-hidden" style={{ background: `linear-gradient(155deg,hsl(${hue} 70% 42%),hsl(${hue} 65% 15%))` }}>
        {p.cover_url && <img src={p.cover_url} alt={p.title} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />}
        <span className="absolute right-2 top-2 z-[2] rounded-md bg-gold px-2 py-0.5 text-[10px] font-black text-navy">PDF</span>
        {T.likes_enabled !== false && <span role="button" tabIndex={0} aria-label="Love" onClick={(e) => { e.stopPropagation(); toggleLike(p.id); }} onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); toggleLike(p.id); } }} className="absolute right-2 top-9 z-[3] flex cursor-pointer items-center gap-1 rounded-full bg-black/45 px-2 py-1 text-[11px] font-bold text-white backdrop-blur"><Heart size={13} className={myLikes.includes(p.id) ? "fill-red-500 text-red-500" : "text-white"} />{likes[p.id] || 0}</span>}
        {!p.cover_url && <div className="absolute inset-0 flex flex-col justify-end p-3 text-left"><span className="mb-1 text-[10px] font-bold uppercase tracking-wider text-white/80">{category}</span><b className="text-sm font-black leading-tight text-white sm:text-base">{p.title}</b><span className="mt-2 w-fit rounded-full border border-gold/80 px-2 py-0.5 text-[9px] font-bold tracking-wider text-gold">EXAM READY</span></div>}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
      </div>
      <div className="exam-meta"><h3 className="line-clamp-2 min-h-[38px] text-[13px] font-semibold leading-5 sm:text-sm">{p.title}</h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5"><span className="text-lg font-black text-gold">₹{p.selling_price}</span>
          {pct(p) > 0 && <><s className="text-xs text-white/50">₹{p.original_price}</s><span className="rounded bg-gold px-1.5 py-0.5 text-[10px] font-extrabold text-navy">{pct(p)}% OFF</span></>}</div>
        {pct(p) > 0 && <div className="mt-1 text-[11px] font-medium text-[#8be0a4]">You save ₹{p.original_price-p.selling_price}</div>}
      </div>
    </button>;
  };
  const Sec = (title: string, list: Product[], desc?: string) => list.length ? (
    <section className="mx-auto max-w-[1100px] px-4 py-6"><h2 className="exam-section-title mb-4 text-xl font-black">{title}</h2>{desc && <p className="-mt-2 mb-4 text-sm text-white/60">{desc}</p>}<div className="grid grid-cols-2 gap-4 md:grid-cols-4 [perspective:1100px]">{list.map(Card)}</div></section>) : null;

  const cfg = site.sections || {};
  const S = (id: string, def: string, list: Product[]) => Sec(cfg.titles?.[id] || def, cfg.limits?.[id] ? list.slice(0, cfg.limits[id]) : list, cfg.descs?.[id]);
  const secMap: Record<string, any> = { featured: S("featured", "Featured PDFs", products.filter((p) => p.is_featured).sort((a, b) => (a.featured_order || 0) - (b.featured_order || 0))), latest: S("latest", "Latest PDFs", products.slice(0, 4)), best: S("best", "Best Selling", bestP), offers: S("offers", "Special Offers", offers) };
  const secOrder = [...["best", "featured", "latest", "offers"].filter((x) => !(cfg.order || []).includes(x)), ...(cfg.order || [])].filter((id: string, i: number, a: string[]) => secMap[id] && a.indexOf(id) === i && !(cfg.hidden || []).includes(id));
  const m = modal, pp = m?.p;
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-gold/30 bg-navy/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1100px] items-center gap-3 px-4 py-2.5">
          <div className="shrink-0">{site.brand?.logo_url && <img src={site.brand.logo_url} alt="Logo" className="mb-0.5 h-7" />}<div className="text-lg font-extrabold text-gold">{site.brand?.title || "ExamPDF Pro"}</div><div className="hidden text-[11px] text-white/60 sm:block">{site.brand?.tagline || "Study Smart • Score High"}</div></div>
          {site.header?.show_search !== false ? <div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-white/50" /><input className="input pl-9" placeholder={T.search_placeholder} value={q} onChange={(e) => setQ(e.target.value)} /></div> : <div className="flex-1" />}
          {site.header?.show_cart !== false && <button aria-label="Cart" onClick={() => setModal({ t: "cart" })} className="relative p-2"><ShoppingCart />{cart.length > 0 && <span className="absolute -right-0.5 -top-0.5 rounded-full bg-gold px-1.5 text-xs font-bold text-navy">{cart.length}</span>}</button>}
          {site.header?.show_account !== false && <button aria-label="Account" onClick={() => setModal({ t: user ? "account" : "auth" })} className="p-2"><User /></button>}
        </div>
      </header>

      <section className="exam-hero bg-gradient-to-br from-royal/40 via-navy to-navy bg-cover bg-center px-4 py-8 md:py-12" hidden={site.hero?.hidden === true} style={site.hero?.image_url ? { backgroundImage: `linear-gradient(rgba(10,22,51,.65),rgba(10,22,51,.8)),url(${site.hero.image_url})` } : undefined}>
        <div className={"mx-auto grid max-w-[1100px] items-center gap-2 " + (site.hero?.hide_book === true ? "" : "md:grid-cols-[1.1fr_.9fr]")}><div><h1 className="exam-hero-title mx-auto max-w-2xl text-3xl font-black md:mx-0 md:text-[52px]">{(() => { const title = site.hero?.title || "Crack Your Exam with Premium Study PDFs"; const hi = site.hero?.highlight || "Premium Study PDFs"; const at = title.indexOf(hi); return at < 0 ? title : <>{title.slice(0,at)}<em>{hi}</em>{title.slice(at+hi.length)}</>; })()}</h1>
        <p className="mx-auto mt-3 max-w-xl text-[15px] leading-7 text-white/70 md:mx-0 md:text-[17px]">{site.hero?.text || "UPSC, SSC, Railway, Banking, WBCS, WB Police and more — flip through a real preview first, then buy with confidence."}</p>{site.hero?.button_text ? <a href={site.hero.button_link || "#secs"} className="btn-gold mt-5 inline-block">{site.hero.button_text}</a> : <button className="btn-gold mt-5" onClick={() => document.getElementById("secs")?.scrollIntoView({ behavior: "smooth" })}>Explore PDFs ↓</button>}</div>{site.hero?.hide_book !== true && <Hero3D title={site.brand?.title || "ExamPDF Pro"} book={site.book} />}</div>
      </section>

      <div className="mx-auto flex max-w-[1100px] flex-wrap justify-center gap-2 px-4 pt-2">{(site.trust?.items || ["👀 2-page preview before you buy", "🔒 Private, secure files", "⚡ Download once payment is verified"]).filter(Boolean).map((t:string) => <span key={t} className="rounded-full border border-gold/30 bg-white/5 px-3 py-1.5 text-xs text-white/70 sm:text-sm">{t}</span>)}</div>
      <section id="secs" className="mx-auto max-w-[1100px] px-4 pt-6"><h2 className="exam-section-title mb-3 text-xl font-black">{T.popular_title}</h2>
        <div className="flex flex-wrap gap-2 pb-2">
          <button onClick={() => setCat(null)} className={!cat ? "btn-gold shrink-0" : "btn-blue shrink-0"}>All</button>
          {displayCats.map((c) => <button key={c.id} onClick={() => setCat(c.id)} className={cat === c.id ? "btn-gold shrink-0" : "btn-blue shrink-0"}>{c.image_url && <img src={c.image_url} alt="" className="mr-1.5 inline h-5 w-5 rounded-full object-cover" />}{c.name}</button>)}
        </div></section>

      {filtering ? (shown.length ? Sec("Results", shown) : <p className="py-10 text-center text-white/60">কিছু পাওয়া যায়নি।</p>) : <>
        {secOrder.map((id: string) => <div key={id}>{secMap[id]}</div>)}
        {products.length === 0 && <p className="py-10 text-center text-white/60">এখনো কোনো PDF প্রকাশ হয়নি।</p>}</>}

      {!T.reviews_hidden && !filtering && <ReviewsSection T={T} reviews={reviews} products={products} onWrite={() => (user ? setModal({ t: "review" }) : setModal({ t: "auth" }))} />}
      <footer className="site-footer mt-10 border-t border-gold/30 px-4 pt-8 text-sm text-white/60">
        {(() => {
          const F = site.footer || {};
          const soc: [string, any][] = [["facebook", Facebook], ["instagram", Instagram], ["youtube", Youtube], ["telegram", Send], ["whatsapp", MessageCircle]];
          const go = (c: string | null) => { setCat(c); document.getElementById("secs")?.scrollIntoView({ behavior: "smooth" }); };
          const cl = "block py-1 text-left hover:text-gold";
          const footCats = [0, 1, 2, 3, 4, 6].map((i) => coreCats[i]).filter(Boolean);
          const pages = (site.pages?.items ?? DEFAULT_PAGES).filter((x: any) => x.show !== false);
          const PageLinks = ({ g }: { g: string }) => <>{pages.filter((x: any) => x.group === g).map((x: any) => /^https?:\/\//.test(x.url || "")
            ? <a key={x.id} href={x.url} target="_blank" rel="noopener noreferrer" className={cl}>{x.label}</a>
            : <button key={x.id} className={cl} onClick={() => setModal({ t: "page", page: x })}>{x.label}</button>)}</>;
          return <div className="mx-auto grid max-w-[1100px] grid-cols-2 gap-6 pb-6 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
            <div className="col-span-2 md:col-span-1">
              <p className="flex items-center gap-2 text-lg font-black text-gold"><BookOpen className="h-5 w-5" />{site.brand?.title || "ExamPDF Pro"}</p>
              <p className="mt-1 text-xs text-white/50">{site.brand?.tagline || "Study Smart • Score High"}</p>
              <p className="mt-3 max-w-[230px] text-xs leading-5">{F.support || "Your trusted destination for exam preparation PDFs, notes and study resources."}</p>
              {F.logo_url && <img src={F.logo_url} alt="" className="my-2 h-8" />}
              <div className="mt-3 flex gap-2">{soc.map(([k, Icon]) => { const u = site.social?.[k]; const ok = /^https?:\/\//.test(u || ""); const c2 = "flex h-8 w-8 items-center justify-center rounded-full border border-gold/40 text-gold"; return ok
                ? <a key={k} href={u} target="_blank" rel="noopener noreferrer" aria-label={k} className={c2 + " hover:bg-gold hover:text-navy"}><Icon className="h-4 w-4" /></a>
                : <span key={k} aria-label={k} className={c2 + " opacity-50"}><Icon className="h-4 w-4" /></span>; })}</div>
            </div>
            <div><p className="mb-2 font-bold text-gold">{F.quick_title || "Quick Links"}</p>
              <button className={cl} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Home</button>
              <button className={cl} onClick={() => go(null)}>All PDFs</button><button className={cl} onClick={() => go(null)}>Popular Exams</button><PageLinks g="quick" /></div>
            <div><p className="mb-2 font-bold text-gold">{F.cats_title || "Categories"}</p>{footCats.map((c: any) => <button key={c.id} className={cl} onClick={() => go(c.id)}>{String(c.name).replace(/ CGL| IBPS/g, "")}</button>)}</div>
            <div><p className="mb-2 font-bold text-gold">{F.support_title || "Customer Support"}</p>
              {site.contact?.email ? <a className={cl} href={`mailto:${site.contact.email}`}><Mail className="mr-2 inline h-4 w-4" />Contact Us</a> : <span className={cl}><Mail className="mr-2 inline h-4 w-4" />Contact Us</span>}
              <PageLinks g="support" />
              {(site.contact?.email || site.contact?.phone) && <p className="mt-2 text-xs text-white/50">{site.contact?.email}{site.contact?.email && site.contact?.phone ? " • " : ""}{site.contact?.phone}</p>}</div>
            <div><p className="mb-2 font-bold text-gold">{F.legal_title || "Legal"}</p>
              <PageLinks g="legal" />
              {F.show_language !== false && <><p className="mb-1 mt-4 flex items-center gap-2 font-bold text-gold"><Languages className="h-4 w-4" />Language</p>
              <select className="input !py-2 text-sm" defaultValue="en" aria-label="Language"><option value="en">English</option></select></>}</div>
          </div>;
        })()}
        <div className="-mx-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-black/20 px-4 py-4 text-xs">
          <span>{site.footer?.copyright || `© ${new Date().getFullYear()} ${site.brand?.title || "ExamPDF Pro"}. All Rights Reserved.`}</span>
          <span><ShieldCheck className="mr-1 inline h-4 w-4 text-gold" />{site.footer?.secure_text ?? "Secure learning. Smarter preparation."}</span>
        </div>
      </footer>
      {cart.length > 0 && <div className="h-20" />}

      {m?.t === "preview" && pp && <Preview p={pp} cat={displayCats.find((c) => c.id === pp.category_id)?.name} url={pp.preview_enabled && pp.preview_pdf_path ? pub("pdf-previews", pp.preview_pdf_path) : ""}
        owned={owned.includes(pp.id)} onClose={() => setModal(null)} onBuy={() => buy(pp)} onAdd={() => add(pp)} onDownload={() => download(pp)} />}
      {m?.t === "review" && user && <ReviewModal user={user} products={products} say={say} onClose={() => setModal(null)} />}
      {m?.t === "page" && m.page && <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-black/80 p-3" onClick={() => setModal(null)}><div className="card max-h-[88vh] w-full max-w-2xl overflow-y-auto bg-navy p-5" onClick={(e) => e.stopPropagation()}><div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-bold text-gold">{m.page.label}</h2><button onClick={() => setModal(null)} aria-label="Close"><X /></button></div><div className="whitespace-pre-line text-sm leading-7 text-white/80">{m.page.content?.trim() || "এই পেজের তথ্য শীঘ্রই যোগ করা হবে।"}</div></div></div>}
      {m?.t === "cart" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-2" onClick={() => setModal(null)}>
          <div className="card w-full max-w-md bg-navy p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex justify-between"><h2 className="text-lg font-bold text-gold">Cart</h2><button aria-label="Close" onClick={() => setModal(null)}><X /></button></div>
            {cartItems.length === 0 ? <p className="py-4 text-center text-white/60">কার্ট খালি।</p> : cartItems.map((i) => <div key={i.id} className="flex items-center justify-between border-b border-white/10 py-2"><span className="text-sm">{i.title}</span>
              <span className="flex items-center gap-2">₹{i.selling_price}<button aria-label="Remove" onClick={() => setCart(cart.filter((x) => x !== i.id))}><X className="h-4 w-4" /></button></span></div>)}
            <button disabled={!cartItems.length} className="btn-gold mt-3 w-full" onClick={() => setModal(user ? { t: "checkout" } : { t: "auth" })}>Checkout</button>
          </div></div>)}
      {m?.t === "auth" && <Auth onClose={() => setModal(null)} onDone={() => setModal(m.p || cart.length ? { t: "checkout", p: m.p } : null)} />}
      {m?.t === "checkout" && user && <Checkout items={m.existing ? [] : m.p ? [m.p] : cartItems} existing={m.existing} user={user} say={say} onClose={() => setModal(null)}
        onDone={() => { if (!m.p && !m.existing) setCart([]); }} />}
      {m?.t === "account" && user && <Account user={user} say={say} onClose={() => setModal(null)} onPay={(o) => setModal({ t: "checkout", existing: o })} />}
      {cart.length > 0 && !modal && <div className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 whitespace-nowrap rounded-2xl border border-gold/30 bg-navy/90 py-2 pl-4 pr-2 shadow-2xl backdrop-blur"><span>🛒 <b>{cartItems.length}</b> item{cartItems.length > 1 ? "s" : ""} • <b className="text-gold">₹{cartItems.reduce((s, p) => s + Number(p.selling_price), 0)}</b></span><button className="btn-gold !py-2" onClick={() => setModal(user ? { t: "checkout" } : { t: "auth" })}>Checkout</button></div>}
      {toast && <div className="fixed bottom-4 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-gold px-4 py-2 font-semibold text-navy shadow-xl">{toast}</div>}
    </div>
  );
}
