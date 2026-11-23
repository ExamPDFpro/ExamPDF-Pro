import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { BookOpen, FileText, Headphones, Heart, Languages, Mail, Search, ShieldCheck, ShoppingCart, User, X } from "lucide-react";
import { supabase, PRODUCT_COLS, pub, fnErr, type Product } from "./lib/supabase";
import Preview from "./Preview";
import Checkout from "./Checkout";
import CartPage from "./CartPage";
import { loadSaved, storeSaved } from "./lib/savedForLater";
import Hero3D from "./Hero3D";
import { tilt, untilt } from "./lib/fx";
import BookCover from "./BookCover";
import { Auth, Account } from "./Account";
const Admin = lazy(() => import("./Admin"));
import { ReviewsSection, ReviewModal } from "./Reviews";
import { DEFAULT_PAGES, DEFAULT_TEXTS } from "./lib/defaults";
import { useT, useLang, setLang, LANGS, dyn, dynGroup, locItem, setOverrides, en, type Key, type Lang } from "./i18n";
import SocialIcons from "./SocialIcons";
import PdfPage from "./PdfPage";
const AffiliateApply = lazy(() => import("./AffiliateApply"));
import { captureRef } from "./lib/affiliate";
const AffiliateDashboard = lazy(() => import("./AffiliateDashboard"));
import CallWidget from "./CallWidget";
const PasswordRecovery = lazy(() => import("./PasswordRecovery"));
import PushToggle from "./PushToggle";
import NoticeBar from "./NoticeBar";
import { loadCart, stampCart } from "./lib/cartExpiry";
import { pdfRouteSlug } from "./lib/share";
import { HowItWorks, FaqSection } from "./HomeExtras";

const DEFAULT_CATS = [
  { id: "upsc", name: "UPSC" }, { id: "ssc", name: "SSC CGL" }, { id: "railway", name: "Railway" },
  { id: "banking", name: "Banking IBPS" }, { id: "neet", name: "NEET" }, { id: "ctet", name: "CTET" },
  { id: "wbcs", name: "WBCS" }, { id: "police", name: "WB Police" },
];
const FONTS: Record<string, string> = { sans: "ui-sans-serif, system-ui, sans-serif", serif: 'Georgia, "Times New Roman", serif', mono: "ui-monospace, Menlo, Consolas, monospace" };
type Modal = { t: "preview" | "cart" | "checkout" | "auth" | "account" | "review" | "page" | "affiliate"; page?: any; p?: Product; existing?: { id: string; total: number } } | null;

export default function App() {
  if (window.location.hash === "#admin") return <Suspense fallback={null}><Admin /></Suspense>;
  if (window.location.hash === "#affiliate") return <Suspense fallback={null}><AffiliateDashboard /></Suspense>;
  const [user, setUser] = useState<any>(null), [products, setProducts] = useState<Product[]>([]), [cats, setCats] = useState<any[]>([]);
  const [best, setBest] = useState<string[]>([]), [site, setSite] = useState<Record<string, any>>({}), [owned, setOwned] = useState<string[]>([]);
  const [cart, setCart] = useState<string[]>(() => loadCart()), [savedIds, setSavedIds] = useState<string[]>(() => loadSaved());
  const [likes, setLikes] = useState<Record<string, number>>({}), [myLikes, setMyLikes] = useState<string[]>([]), [reviews, setReviews] = useState<any[]>([]);
  const [q, setQ] = useState(""), [cat, setCat] = useState<string | null>(null), [modal, setModal] = useState<Modal>(null), [toast, setToast] = useState("");
  const say = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2800); };
  const t = useT(), lang = useLang(), [loaded, setLoaded] = useState(false), routeSlug = pdfRouteSlug();

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
    const sm = Object.fromEntries((w.data || []).map((r: any) => [r.key, r.value])); setOverrides(sm.i18n); setSite(sm); setBest((b.data || []).map((r: any) => r.product_id)); setLoaded(true);
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
  useEffect(() => { localStorage.setItem("cart", JSON.stringify(cart)); stampCart(cart); }, [cart]);
  useEffect(() => { storeSaved(savedIds); }, [savedIds]);

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
  // Add to Cart opens the full-screen Cart page straight away (no sticky bar on browsing pages).
  const add = (p: Product) => { if (owned.includes(p.id)) return say(t("cart.owned")); if (!cart.includes(p.id)) { setCart([...cart, p.id]); setSavedIds((s) => s.filter((x) => x !== p.id)); } setModal({ t: "cart" }); };
  const saveLater = (id: string) => { setCart((c) => c.filter((x) => x !== id)); setSavedIds((s) => (s.includes(id) ? s : [...s, id])); };
  const restoreSaved = (id: string) => { setSavedIds((s) => s.filter((x) => x !== id)); if (owned.includes(id)) return say(t("cart.owned")); setCart((c) => (c.includes(id) ? c : [...c, id])); };
  const download = async (p: Product) => { const { data, error } = await supabase.functions.invoke("download-pdf", { body: { product_id: p.id } }); if (error || !data?.url) return say((await fnErr(error, data)) || t("dl.failed")); window.location.href = data.url; };
  const buy = (p: Product) => setModal(user ? { t: "checkout", p } : { t: "auth", p });
  const prods = useMemo(() => products.map((p) => ({ ...p, ...locItem(p as any, ["title", "description"]) }) as Product), [products, lang]);
  const cartItems = cart.map((id) => prods.find((p) => p.id === id)).filter(Boolean) as Product[];
  const cn = (c: any) => dyn("cat." + c.id, c.name);
  const T: any = { ...DEFAULT_TEXTS, ...(site.texts || {}) }, F: any = site.footer || {};
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
  const shown = useMemo(() => prods.filter((p) => {
    const categoryMatch = !cat || p.category_id === cat || (!!activeCategory && (p.title + " " + (p.description || "")).toLowerCase().includes(activeCategory.name.toLowerCase()));
    const queryMatch = !q || (p.title + " " + (p.description || "")).toLowerCase().includes(q.toLowerCase());
    return categoryMatch && queryMatch;
  }), [prods, q, cat, activeCategory]);
  const bestP = best.map((id) => prods.find((p) => p.id === id)).filter(Boolean) as Product[];
  const pct = (p: Product) => (p.original_price > 0 ? Math.round(100 * (1 - p.selling_price / p.original_price)) : 0);
  const offers = [...prods].filter((p) => pct(p) > 0).sort((a, b) => pct(b) - pct(a)).slice(0, 4);

  const Card = (p: Product) => {
    const category = (() => { const c = displayCats.find((x) => x.id === p.category_id); return c ? cn(c) : t("card.cat"); })();
    const hue = [218, 258, 188, 28, 342, 46, 202, 278][Math.abs((p.title || "PDF").split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % 8];
    return <button key={p.id} onClick={() => setModal({ t: "preview", p })} onPointerMove={tilt} onPointerLeave={untilt} className="card exam-card group overflow-hidden text-left transition-transform duration-150">
      <div className="exam-cover bk-on relative aspect-[3/4] overflow-hidden" style={{ ["--bh" as any]: hue, background: `linear-gradient(155deg,hsl(${hue} 70% 42%),hsl(${hue} 65% 15%))` }}>
        <BookCover title={p.title} category={category} hue={hue} url={p.cover_url} ready={t("card.ready")} />
        <span className="absolute right-2 top-2 z-[2] rounded-md bg-gold px-2 py-0.5 text-[10px] font-black text-navy">{t("card.pdf")}</span>
        {T.likes_enabled !== false && <span role="button" tabIndex={0} aria-label={t("card.love")} onClick={(e) => { e.stopPropagation(); toggleLike(p.id); }} onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); toggleLike(p.id); } }} className="absolute right-2 top-9 z-[3] flex cursor-pointer items-center gap-1 rounded-full bg-black/45 px-2 py-1 text-[11px] font-bold text-white backdrop-blur"><Heart size={13} className={myLikes.includes(p.id) ? "fill-red-500 text-red-500" : "text-white"} />{likes[p.id] || 0}</span>}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
      </div>
      <div className="exam-meta"><h3 className="line-clamp-2 min-h-[38px] text-[13px] font-semibold leading-5 sm:text-sm">{p.title}</h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5"><span className="text-lg font-black text-gold">₹{p.selling_price}</span>
          {pct(p) > 0 && <><s className="text-xs text-white/50">₹{p.original_price}</s><span className="rounded bg-gold px-1.5 py-0.5 text-[10px] font-extrabold text-navy">{t("card.off", { n: pct(p) })}</span></>}</div>
        {pct(p) > 0 && <div className="mt-1 text-[11px] font-medium text-[#8be0a4]">{t("card.save", { n: p.original_price - p.selling_price })}</div>}
      </div>
    </button>;
  };
  const Sec = (title: string, list: Product[], desc?: string) => list.length ? (
    <section className="mx-auto max-w-[1100px] px-4 py-6"><h2 className="exam-section-title mb-4 text-xl font-black">{title}</h2>{desc && <p className="-mt-2 mb-4 text-sm text-white/60">{desc}</p>}<div className="grid grid-cols-2 gap-4 md:grid-cols-4 [perspective:1100px]">{list.map(Card)}</div></section>) : null;

  const cfg = site.sections || {};
  const S = (id: string, tkey: Key, list: Product[]) => Sec(dyn("sec." + id, cfg.titles?.[id] || en[tkey], tkey), cfg.limits?.[id] ? list.slice(0, cfg.limits[id]) : list, cfg.descs?.[id] ? dyn("secdesc." + id, cfg.descs[id]) : undefined);
  const secMap: Record<string, any> = { featured: S("featured", "sec.featured", prods.filter((p) => p.is_featured).sort((a, b) => (a.featured_order || 0) - (b.featured_order || 0))), latest: S("latest", "sec.latest", prods.slice(0, 4)), best: S("best", "sec.best", bestP), offers: S("offers", "sec.offers", offers) };
  const secOrder = [...["best", "featured", "latest", "offers"].filter((x) => !(cfg.order || []).includes(x)), ...(cfg.order || [])].filter((id: string, i: number, a: string[]) => secMap[id] && a.indexOf(id) === i && !(cfg.hidden || []).includes(id));
  const m = modal, pp = m?.p ? prods.find((x) => x.id === m.p!.id) || m.p : undefined;
  const routePdf = routeSlug ? prods.find((x) => x.slug === routeSlug) : undefined;
  useEffect(() => { if (routePdf) captureRef(routePdf.id); }, [routePdf?.id]);
  const heroT = dynGroup("hero", { title: { v: site.hero?.title || en["hero.title"], tkey: "hero.title" }, highlight: { v: site.hero?.highlight || en["hero.highlight"], tkey: "hero.highlight" }, text: { v: site.hero?.text || en["hero.text"], tkey: "hero.text" } });
  return (
    <div className="min-h-screen">
      <NoticeBar notice={site.notice} />
      <header className="sticky top-0 z-30 border-b border-gold/30 bg-navy/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1100px] items-center gap-3 px-4 py-2.5">
          <div className="shrink-0">{site.brand?.logo_url && <img src={site.brand.logo_url} alt="Logo" className="mb-0.5 h-7" />}<div className="text-lg font-extrabold text-gold">{site.brand?.title || "ExamPDF Pro"}</div><div className="hidden text-[11px] text-white/60 sm:block">{dyn("brand.tagline", site.brand?.tagline || en["brand.tagline"], "brand.tagline")}</div></div>
          {site.header?.show_search !== false ? <div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-white/50" /><input className="input pl-9" placeholder={dyn("hdr.search", T.search_placeholder, "hdr.search")} value={q} onChange={(e) => setQ(e.target.value)} /></div> : <div className="flex-1" />}
          {site.header?.show_cart !== false && <button aria-label={t("hdr.cart")} onClick={() => setModal({ t: "cart" })} className="relative p-2"><ShoppingCart />{cart.length > 0 && <span className="absolute -right-0.5 -top-0.5 rounded-full bg-gold px-1.5 text-xs font-bold text-navy">{cart.length}</span>}</button>}
          {site.header?.show_account !== false && <button aria-label={t("hdr.account")} onClick={() => setModal({ t: user ? "account" : "auth" })} className="p-2"><User /></button>}
        </div>
      </header>

      {routeSlug ? (loaded ? <PdfPage p={routePdf} category={routePdf ? (() => { const c = displayCats.find((x) => x.id === routePdf.category_id); return c ? cn(c) : undefined; })() : undefined} owned={!!routePdf && owned.includes(routePdf.id)} brand={site.brand?.title || "ExamPDF Pro"} onBuy={() => routePdf && buy(routePdf)} onAdd={() => routePdf && add(routePdf)} onDownload={() => routePdf && download(routePdf)} onPreview={() => routePdf && setModal({ t: "preview", p: routePdf })} /> : <p className="py-16 text-center text-white/60">{t("common.loading")}</p>) : <>
      <section className="exam-hero bg-gradient-to-br from-royal/40 via-navy to-navy bg-cover bg-center px-4 py-8 md:py-12" hidden={site.hero?.hidden === true} style={site.hero?.image_url ? { backgroundImage: `linear-gradient(rgba(10,22,51,.65),rgba(10,22,51,.8)),url(${site.hero.image_url})` } : undefined}>
        <div className={"mx-auto grid max-w-[1100px] items-center gap-2 " + (site.hero?.hide_book === true ? "" : "md:grid-cols-[1.1fr_.9fr]")}><div><h1 className="exam-hero-title mx-auto max-w-2xl text-3xl font-black md:mx-0 md:text-[52px]">{(() => { const title = heroT.title, hi = heroT.highlight; const at = title.indexOf(hi); return at < 0 ? title : <>{title.slice(0,at)}<em>{hi}</em>{title.slice(at+hi.length)}</>; })()}</h1>
        <p className="mx-auto mt-3 max-w-xl text-[15px] leading-7 text-white/70 md:mx-0 md:text-[17px]">{heroT.text}</p>{site.hero?.button_text ? <a href={site.hero.button_link || "#secs"} className="btn-gold mt-5 inline-block">{dyn("hero.button", site.hero.button_text, "hero.button")}</a> : <button className="btn-gold mt-5" onClick={() => document.getElementById("secs")?.scrollIntoView({ behavior: "smooth" })}>{t("hero.button")}</button>}</div>{site.hero?.hide_book !== true && <Hero3D title={site.brand?.title || "ExamPDF Pro"} book={site.book} />}</div>
      </section>

      <div className="mx-auto flex max-w-[1100px] flex-wrap justify-center gap-2 px-4 pt-2">{(site.trust?.items || [en["trust.1"], en["trust.2"], en["trust.3"]]).map((x: string, i: number) => [x, i] as const).filter(([x]) => x).map(([x, i]) => <span key={i} className="rounded-full border border-gold/30 bg-white/5 px-3 py-1.5 text-xs text-white/70 sm:text-sm">{dyn("trust." + i, x, ("trust." + (i + 1)) as Key)}</span>)}</div>
      <section id="secs" className="mx-auto max-w-[1100px] px-4 pt-6"><h2 className="exam-section-title mb-3 text-xl font-black">{dyn("sec.popular", T.popular_title, "sec.popular")}</h2>
        <div className="flex flex-wrap gap-2 pb-2">
          <button onClick={() => setCat(null)} className={!cat ? "btn-gold shrink-0" : "btn-blue shrink-0"}>{t("sec.all")}</button>
          {displayCats.map((c) => <button key={c.id} onClick={() => setCat(c.id)} className={cat === c.id ? "btn-gold shrink-0" : "btn-blue shrink-0"}>{c.image_url && <img src={c.image_url} alt="" className="mr-1.5 inline h-5 w-5 rounded-full object-cover" />}{cn(c)}</button>)}
        </div></section>

      {filtering ? (shown.length ? Sec(t("sec.results"), shown) : <p className="py-10 text-center text-white/60">{t("sec.nothing")}</p>) : <>
        {secOrder.map((id: string) => <div key={id}>{secMap[id]}</div>)}
        {products.length === 0 && loaded && <p className="py-10 text-center text-white/60">{t("sec.empty")}</p>}</>}
      </>}

      {!T.how_hidden && !filtering && !routeSlug && <HowItWorks />}
      {!T.faq_hidden && !filtering && !routeSlug && <FaqSection />}
      {!T.reviews_hidden && !filtering && !routeSlug && <ReviewsSection T={T} reviews={reviews} products={prods} onWrite={() => (user ? setModal({ t: "review" }) : setModal({ t: "auth" }))} />}
      <footer className="site-footer mt-10 border-t border-gold/30 px-4 pt-8 text-sm text-white/60 max-md:pb-14">
        {(() => {
          const go = (c: string | null, query?: string) => { if (routeSlug) { history.replaceState(null, "", location.pathname + location.search); location.reload(); return; } setCat(c); if (query !== undefined) setQ(query); document.getElementById("secs")?.scrollIntoView({ behavior: "smooth" }); };
          const cl = "block py-1 text-left hover:text-gold";
          // Footer list is pinned to the original six links (UPSC, SSC, Railway, Banking, NEET, WBCS), independent of the chip order.
          const footPick = (re: RegExp) => cats.find((c) => re.test(String(c.name || "")));
          const footCats: any[] = [
            footPick(/^upsc$/i) || DEFAULT_CATS[0], footPick(/^ssc/i) || DEFAULT_CATS[1], footPick(/^railway/i) || DEFAULT_CATS[2],
            footPick(/^banking/i) || DEFAULT_CATS[3], footPick(/^neet$/i) || { ...DEFAULT_CATS[4], search: "NEET" }, footPick(/^wbcs$/i) || DEFAULT_CATS[6],
          ];
          const pages = (site.pages?.items ?? DEFAULT_PAGES).filter((x: any) => x.show !== false);
          const pk = (id: string) => (("page." + id) in en ? ("page." + id) : undefined) as Key | undefined;
          const PageLinks = ({ g }: { g: string }) => <>{pages.filter((x: any) => x.group === g).map((x: any) => /^https?:\/\//.test(x.url || "")
            ? <a key={x.id} href={x.url} target="_blank" rel="noopener noreferrer" className={cl}>{dyn(`page.${x.id}.label`, x.label, pk(x.id))}</a>
            : <button key={x.id} className={cl} onClick={() => setModal({ t: "page", page: x })}>{dyn(`page.${x.id}.label`, x.label, pk(x.id))}</button>)}</>;
          return <div className="mx-auto grid max-w-[1100px] grid-cols-2 gap-6 pb-6 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
            <div className="col-span-2 md:col-span-1">
              <p className="flex items-center gap-2 text-lg font-black text-gold"><BookOpen className="h-5 w-5" />{site.brand?.title || "ExamPDF Pro"}</p>
              <p className="mt-1 text-xs text-white/50">{dyn("brand.tagline", site.brand?.tagline || en["brand.tagline"], "brand.tagline")}</p>
              <p className="mt-3 max-w-[230px] text-xs leading-5">{dyn("foot.about", F.support || en["foot.about"], "foot.about")}</p>
              {F.logo_url && <img src={F.logo_url} alt="" className="my-2 h-8" />}
              <SocialIcons site={site} />
            </div>
            <div><p className="mb-2 font-bold text-gold">{dyn("foot.quick", F.quick_title || en["foot.quick"], "foot.quick")}</p>
              <button className={cl} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>{t("common.home")}</button>
              <button className={cl} onClick={() => go(null)}>{t("foot.allpdfs")}</button><button className={cl} onClick={() => go(null)}>{t("foot.popular")}</button><PageLinks g="quick" />
              <button className={cl} onClick={() => setModal({ t: "affiliate" })}>{t("foot.affiliate")}</button><button className={cl} onClick={() => { window.location.hash = "affiliate"; window.location.reload(); }}>{t("foot.affdash")}</button><PushToggle cl={cl} say={say} /></div>
            <div><p className="mb-2 font-bold text-gold">{dyn("foot.cats", F.cats_title || en["foot.cats"], "foot.cats")}</p>{footCats.map((c: any) => <button key={c.id} className={cl} onClick={() => (c.search ? go(null, c.search) : go(c.id))}>{String(c.name).replace(/ CGL| IBPS|\s*\(All India\)/g, "")}</button>)}</div>
            <div><p className="mb-2 font-bold text-gold">{dyn("foot.support", F.support_title || en["foot.support"], "foot.support")}</p>
              {site.contact?.email ? <a className={cl} href={`mailto:${site.contact.email}`}><Mail className="mr-2 inline h-4 w-4" />{t("foot.contact")}</a> : <span className={cl}><Mail className="mr-2 inline h-4 w-4" />{t("foot.contact")}</span>}
              <PageLinks g="support" />
              {(site.contact?.email || site.contact?.phone) && <p className="mt-2 text-xs text-white/50">{site.contact?.email}{site.contact?.email && site.contact?.phone ? " • " : ""}{site.contact?.phone}</p>}</div>
            <div><p className="mb-2 font-bold text-gold">{dyn("foot.legal", F.legal_title || en["foot.legal"], "foot.legal")}</p>
              <PageLinks g="legal" />
              {F.show_language !== false && <><p className="mb-1 mt-4 flex items-center gap-2 font-bold text-gold"><Languages className="h-4 w-4" />{t("common.language")}</p>
              <select className="input !py-2 text-sm" value={lang} onChange={(e) => setLang(e.target.value as Lang)} aria-label={t("common.language")}>{LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}</select></>}</div>
          </div>;
        })()}
        <div className="-mx-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-black/20 px-4 py-4 text-xs">
          <span>{F.copyright ? dyn("foot.copyright.custom", F.copyright) : t("foot.copyright", { year: new Date().getFullYear(), name: site.brand?.title || "ExamPDF Pro" })}</span>
          <span><ShieldCheck className="mr-1 inline h-4 w-4 text-gold" />{F.secure_text === undefined ? t("foot.secure") : dyn("foot.secure", F.secure_text, "foot.secure")}</span>
        </div>
      </footer>
      {cart.length > 0 && <div className="h-20" />}

      {m?.t === "preview" && pp && <Preview p={pp} brand={site.brand?.title || "ExamPDF Pro"} cat={(() => { const c = displayCats.find((x) => x.id === pp.category_id); return c ? cn(c) : undefined; })()} url={pp.preview_enabled && pp.preview_pdf_path ? pub("pdf-previews", pp.preview_pdf_path) : ""}
        owned={owned.includes(pp.id)} onClose={() => setModal(null)} onBuy={() => buy(pp)} onAdd={() => add(pp)} inCart={cart.includes(pp.id)} onViewCart={() => setModal({ t: "cart" })} onDownload={() => download(pp)} />}
      {m?.t === "review" && user && <ReviewModal user={user} products={prods} say={say} onClose={() => setModal(null)} />}
      {m?.t === "page" && m.page && <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-black/80 p-3" onClick={() => setModal(null)}><div className="card max-h-[88vh] w-full max-w-2xl overflow-y-auto bg-navy p-5" onClick={(e) => e.stopPropagation()}><div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-bold text-gold">{dyn(`page.${m.page.id}.label`, m.page.label, (("page." + m.page.id) in en ? "page." + m.page.id : undefined) as Key | undefined)}</h2><button onClick={() => setModal(null)} aria-label={t("common.close")}><X /></button></div><div className="whitespace-pre-line text-sm leading-7 text-white/80">{m.page.content?.trim() ? dyn(`page.${m.page.id}.content`, m.page.content) : t("page.soon")}</div></div></div>}
      {m?.t === "cart" && <CartPage items={cartItems} saved={savedIds.map((id) => prods.find((p) => p.id === id)).filter((p): p is Product => !!p && !owned.includes(p.id))}
        catName={(p) => { const c = displayCats.find((x) => x.id === p.category_id); return c ? cn(c) : t("card.cat"); }}
        onRemove={(id) => setCart(cart.filter((x) => x !== id))} onSave={saveLater} onRestore={restoreSaved} onRemoveSaved={(id) => setSavedIds((s) => s.filter((x) => x !== id))}
        onCheckout={() => setModal(user ? { t: "checkout" } : { t: "auth" })} onClose={() => setModal(null)} />}
      {m?.t === "affiliate" && <Suspense fallback={null}><AffiliateApply onClose={() => setModal(null)} say={say} /></Suspense>}
      {m?.t === "auth" && <Auth onClose={() => setModal(null)} onDone={() => setModal(m.p || cart.length ? { t: "checkout", p: m.p } : null)} />}
      {m?.t === "checkout" && user && <Checkout items={m.existing ? [] : m.p ? [m.p] : cartItems} existing={m.existing} user={user} say={say} onClose={() => setModal(null)} onOrders={() => setModal({ t: "account" })}
        onDone={() => { if (!m.p && !m.existing) setCart([]); }} />}
      {m?.t === "account" && user && <Account user={user} say={say} onClose={() => setModal(null)} onPay={(o) => setModal({ t: "checkout", existing: o })} />}
      <Suspense fallback={null}><PasswordRecovery /></Suspense>
      <CallWidget phone={site.contact?.phone} hide={!!modal} />
      {toast && <div className="fixed bottom-24 left-1/2 z-[95] -translate-x-1/2 w-max max-w-[92vw] rounded-2xl text-center text-sm bg-gold lg:bottom-4 px-4 py-2 font-semibold text-navy shadow-xl">{toast}</div>}
    </div>
  );
}
