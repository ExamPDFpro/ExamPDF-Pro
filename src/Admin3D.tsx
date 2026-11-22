import { useEffect, useRef, useState } from "react";
import { renderMockup, loadImage, toWebp, is3d, origOf } from "./lib/bookMockup";

// Result handed to the product form; saveProduct uploads it to the existing `covers` bucket.
export type Mock3D = { mock: Blob; orig: Blob | null } | { restoreUrl: string } | { flat: true } | null;

const box = "rounded-xl border border-white/10 bg-white/[.03] p-3";
const btn = "rounded-lg border border-white/15 px-2.5 py-1.5 text-xs font-bold hover:bg-white/10 disabled:opacity-40";

export default function Admin3D({ title, category, coverFile, coverUrl, isNew, onChange }: { isNew: boolean; title: string; category: string; coverFile: File | null; coverUrl: string; onChange: (r: Mock3D) => void }) {
  const [on, setOn] = useState(true), [busy, setBusy] = useState(false), [prev, setPrev] = useState(""), [msg, setMsg] = useState(""), [custom, setCustom] = useState<Blob | null>(null);
  const [rest, setRest] = useState(""), [tick, setTick] = useState(0), urlRef = useRef("");
  const had3d = is3d(coverUrl);

  useEffect(() => {
    let dead = false;
    if (!on) { onChange(rest ? { restoreUrl: rest } : { flat: true }); setPrev(""); return; }
    if (!coverFile && !title.trim() && !coverUrl && !custom) { onChange(null); setPrev(""); return; }
    // editing an existing product: never change its cover unless a new file / custom 3D / "Regenerate" is chosen
    if (!isNew && !coverFile && !custom && tick === 0) { onChange(null); setPrev(""); return; }
    const t = setTimeout(async () => {
      setBusy(true); setMsg("");
      try {
        let mock: Blob, orig: Blob | null = null;
        if (custom) { mock = await toWebp(custom, 1400); if (!had3d && coverUrl) { try { const r = await fetch(coverUrl); orig = await toWebp(await r.blob(), 1400); } catch { orig = null; } } }
        else {
          let src: Blob | string | null = coverFile;
          if (!src && coverUrl) src = had3d ? origOf(coverUrl) : coverUrl;
          let img = null as HTMLImageElement | null;
          if (src) { try { img = await loadImage(src); } catch { img = null; if (had3d) setMsg("আসল কভার পাওয়া যায়নি, নাম থেকে মলাট তৈরি হয়েছে।"); } }
          if (img && coverFile) orig = await toWebp(coverFile, 1400);
          else if (img && !had3d && coverUrl) { try { const r = await fetch(coverUrl); orig = await toWebp(await r.blob(), 1400); } catch { orig = null; } }
          mock = await renderMockup({ cover: img, title, category });
        }
        if (dead) return;
        const u = URL.createObjectURL(mock); if (urlRef.current) URL.revokeObjectURL(urlRef.current); urlRef.current = u; setPrev(u);
        onChange({ mock, orig });
      } catch (e: any) { if (!dead) setMsg("3D ছবি বানানো যায়নি: " + (e?.message || "")); }
      finally { if (!dead) setBusy(false); }
    }, 350);
    return () => { dead = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, rest, coverFile, custom, title, category, coverUrl, tick]);

  return (
    <div className={`sm:col-span-2 ${box}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm font-black"><input type="checkbox" checked={on} onChange={(e) => { setOn(e.target.checked); setRest(""); setMsg(""); if (!e.target.checked) setCustom(null); }} />3D Book Mockup (নিজে থেকে বানাবে)</label>
        <span className="text-[10px] text-white/45">কভার ছবি দিলে সেটাই বইয়ের মলাট হবে; না দিলে নাম আর ক্যাটেগরি থেকে মলাট।</span>
      </div>
      {on && (
        <div className="mt-3 flex flex-wrap items-start gap-4">
          <div className="flex h-[200px] w-[150px] items-center justify-center rounded-lg border border-white/10 bg-black/20">
            {busy ? <span className="text-[11px] text-white/50">তৈরি হচ্ছে…</span> : prev ? <img src={prev} alt="3D preview" className="h-full w-full object-contain" /> : had3d && coverUrl ? <img src={coverUrl} alt="current 3D" className="h-full w-full object-contain" /> : <span className="px-2 text-center text-[11px] text-white/40">Preview এখানে দেখাবে</span>}
          </div>
          <div className="flex min-w-[200px] flex-1 flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btn} disabled={busy} onClick={() => { setCustom(null); setTick((n) => n + 1); }}>{isNew || had3d ? "Regenerate mockup" : "3D mockup বানাও"}</button>
              <label className={btn + " cursor-pointer"}>Custom 3D আপলোড<input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setCustom(f); e.target.value = ""; }} /></label>
              {had3d && <button type="button" className={btn} onClick={async () => { const o = origOf(coverUrl); try { const r = await fetch(o, { method: "HEAD" }); if (!r.ok) throw 0; } catch { setMsg("আসল কভার পাওয়া যায়নি (আগে ছবি আপলোড করা ছিল না)।"); return; } setCustom(null); setRest(o); setOn(false); }}>Restore original cover</button>}
            </div>
            <p className="text-[10px] leading-relaxed text-white/45">Replace original cover: উপরের "Cover Image Upload"-এ নতুন ছবি দিন, 3D আবার বানাবে। Save চাপলে ছবি সংরক্ষণ হবে। PDF ফাইল অপরিবর্তিত থাকে।</p>
            {msg && <p className="text-[11px] text-amber-300">{msg}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
