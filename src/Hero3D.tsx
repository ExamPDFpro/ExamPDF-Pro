import { useEffect, useRef, useState, type CSSProperties } from "react";
import { DEFAULT_BOOK } from "./lib/defaults";

const PAGES = [
  { h: "CHAPTER 1", a: [90, 100, 78], b: [95, 60, 100, 85], bars: false },
  { h: "CHAPTER 2", a: [100, 72, 95], b: [88, 60], bars: true },
  { h: "CHAPTER 3", a: [96, 80, 100], b: [70, 92, 64, 88], bars: false },
];
const N = 4;   // cover + 3 pages
const Lines = ({ w }: { w: number[] }) => <>{w.map((x, i) => <div key={i} className="b3d-ln" style={{ width: x + "%" }} />)}</>;

// Decorative 3D book: the cover opens and the pages turn one by one, then it closes and repeats.
export default function Hero3D({ title = "ExamPDF Pro", book = {} }: { title?: string; book?: any }) {
  const [step, setStep] = useState(0), scene = useRef<HTMLDivElement>(null);
  const B: any = { ...DEFAULT_BOOK, ...book };
  const speed = Math.min(6000, Math.max(900, Number(B.speed) || 1900));
  const cvStyle: CSSProperties = {};
  if (B.cover_image) cvStyle.background = `linear-gradient(rgba(10,22,51,.2),rgba(10,22,51,.5)),url("${String(B.cover_image).replace(/"/g, "%22")}") center/cover`;
  else if (B.cover_from || B.cover_to) cvStyle.background = `linear-gradient(150deg, ${B.cover_from || "rgb(var(--c-royal))"}, ${B.cover_to || "rgb(var(--c-navy))"})`;
  if (B.cover_border) cvStyle.borderColor = B.cover_border;
  const subLines = String(B.cover_sub ?? "").split("\n");
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { setStep(N); return; }
    const t0 = setTimeout(() => setStep(1), 900), t = setInterval(() => { if (!document.hidden) setStep((s) => (s + 1) % (N + 2)); }, speed);
    return () => { clearTimeout(t0); clearInterval(t); };
  }, [speed]);
  useEffect(() => {
    const f = (e: PointerEvent) => { const el = scene.current; if (!el) return; el.style.setProperty("--px", String((e.clientX / innerWidth - 0.5) * 2)); el.style.setProperty("--py", String((e.clientY / innerHeight - 0.5) * 2)); };
    window.addEventListener("pointermove", f); return () => window.removeEventListener("pointermove", f);
  }, []);
  const lf = (i: number) => "b3d-lf" + (i < Math.min(step, N) ? " open" : "");
  const z = (c: number, o: number) => ({ "--zc": c + "px", "--zo": o + "px" } as CSSProperties);
  return (
    <div ref={scene} className="b3d-scene" aria-hidden="true">
      <div className={"b3d-wrap" + (step > 0 ? " open" : "")}>
        <div className="b3d-book">
          <div className="b3d-bkc" />
          <div className="b3d-base"><div className="text-3xl">{B.base_icon}</div><b>{B.base_title}</b><small>{B.base_text}</small></div>
          <div className="b3d-sp" />
          <div className={lf(0)} style={z(22, 4)}>
            <div className="b3d-s b3d-cv" style={cvStyle}>{B.cover_badge && <i>{B.cover_badge}</i>}<b style={B.cover_title_color ? { color: B.cover_title_color } : undefined}>{B.cover_title || title}</b><span>{subLines.map((l, i) => <span key={i}>{i > 0 && <br />}{l}</span>)}</span></div>
            <div className="b3d-s b b3d-cv b3d-cvi"><span>{B.inside_label}</span><b>{B.inside_title}</b></div>
          </div>
          {PAGES.map((p, i) => (
            <div key={p.h} className={lf(i + 1)} style={z(17 - i * 5, 7 + i * 3)}>
              <div className="b3d-s b3d-pg"><h5>{p.h}</h5><Lines w={p.a} />{p.bars && <div className="b3d-bx">{[40, 65, 50, 85, 70, 95].map((h, k) => <i key={k} style={{ height: h + "%" }} />)}</div>}<Lines w={p.b} /></div>
              <div className="b3d-s b b3d-pg"><h5>{p.h} • NOTES</h5><Lines w={[100, 80, 92, 70, 96, 60, 88]} /></div>
            </div>
          ))}
        </div>
      </div>
      {B.show_labels !== false && <><div className="b3d-fl a">{B.labels?.[0]}</div><div className="b3d-fl b">{B.labels?.[1]}</div><div className="b3d-fl c">{B.labels?.[2]}</div></>}
    </div>
  );
}
