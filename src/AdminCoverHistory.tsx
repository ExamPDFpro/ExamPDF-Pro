import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import { is3d, isOrig, stemOf } from "./lib/bookMockup";

// Cover history for one product, read from the existing public `covers` bucket (no database change, nothing is ever deleted).
// Every saved cover keeps its own file (<base>-3d.webp, <base>-v<time>-3d.webp, <base>-orig.webp), so any of them can be restored.
type Ver = { name: string; url: string; kind: "3d" | "orig"; at: number };
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const fileOf = (u: string) => decodeURIComponent((u.split("/covers/")[1] || "").split("?")[0]);
const when = (t: number) => (t ? new Date(t).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "");

export default function AdminCoverHistory({ coverUrl, pickedUrl, onPick }: { coverUrl: string; pickedUrl: string; onPick: (url: string) => void }) {
  const [vers, setVers] = useState<Ver[] | null>(null), [err, setErr] = useState("");
  const stem = is3d(coverUrl) || isOrig(coverUrl) ? stemOf(coverUrl) : "";

  useEffect(() => {
    let dead = false;
    setVers(null); setErr("");
    if (!stem) return;
    (async () => {
      try {
        const { data, error } = await supabase.storage.from("covers").list("", { limit: 200, search: stem, sortBy: { column: "created_at", order: "desc" } });
        if (error) throw error;
        const re = new RegExp("^" + esc(stem) + "(?:-v(\\d+))?-(3d|orig)\\.webp$");
        const out: Ver[] = [];
        for (const o of data || []) {
          const m = re.exec(o.name); if (!m) continue;
          const created = o.created_at ? Date.parse(o.created_at) : 0;
          out.push({ name: o.name, url: supabase.storage.from("covers").getPublicUrl(o.name).data.publicUrl, kind: m[2] === "orig" ? "orig" : "3d", at: m[1] ? Number(m[1]) : created });
        }
        out.sort((a, b) => b.at - a.at);
        if (!dead) setVers(out);
      } catch (e: any) { if (!dead) setErr(e?.message || "হিস্টোরি লোড হয়নি"); }
    })();
    return () => { dead = true; };
  }, [stem]);

  if (!stem) return null;
  const cur = fileOf(coverUrl), pick = pickedUrl ? fileOf(pickedUrl) : "";
  return (
    <details className="mt-3 rounded-lg border border-white/10 bg-black/10 p-2" open>
      <summary className="cursor-pointer text-xs font-bold">Cover History{vers ? ` (${vers.length})` : ""} — যেকোনো আগের কভার ফিরিয়ে আনুন</summary>
      {err && <p className="mt-2 text-[11px] text-amber-300">{err}</p>}
      {!err && vers === null && <p className="mt-2 text-[11px] text-white/50">লোড হচ্ছে…</p>}
      {vers && vers.length === 0 && <p className="mt-2 text-[11px] text-white/50">এই PDF-এর আগের কোনো কভার সংস্করণ পাওয়া যায়নি।</p>}
      {vers && vers.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-3" aria-label="Cover history">
          {vers.map((v) => {
            const isCur = v.name === cur, isPick = v.name === pick;
            return (
              <li key={v.name} className={`w-[92px] rounded-lg border p-1.5 text-center ${isPick ? "border-gold" : "border-white/10"}`}>
                <div className="flex h-[110px] items-center justify-center rounded bg-black/25"><img src={v.url} alt={v.kind === "orig" ? "Original cover" : "Cover version"} loading="lazy" className="h-full w-full object-contain" /></div>
                <p className="mt-1 text-[10px] font-bold">{isCur ? "এখন চালু" : v.kind === "orig" ? "আসল কভার" : "সংস্করণ"}</p>
                <p className="text-[9px] leading-tight text-white/45">{when(v.at)}</p>
                <button type="button" disabled={isCur || isPick} data-restore={v.name} onClick={() => onPick(v.url)} className="mt-1 w-full rounded border border-white/15 px-1 py-1 text-[10px] font-bold hover:bg-white/10 disabled:opacity-40">{isPick ? "বাছাই করা" : "এটি Restore করুন"}</button>
              </li>
            );
          })}
        </ul>
      )}
    </details>
  );
}
