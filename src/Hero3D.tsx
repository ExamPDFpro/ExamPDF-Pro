import { useEffect, useRef, useState, type CSSProperties } from "react";

const PAGES = [
  { h: "CHAPTER 1", a: [90, 100, 78], b: [95, 60, 100, 85], bars: false },
  { h: "CHAPTER 2", a: [100, 72, 95], b: [88, 60], bars: true },
  { h: "CHAPTER 3", a: [96, 80, 100], b: [70, 92, 64, 88], bars: false },
];
const N = 4;   // cover + 3 pages
const Lines = ({ w }: { w: number[] }) => <>{w.map((x, i) => <div key={i} className="b3d-ln" style={{ width: x + "%" }} />)}</>;

// Decorative 3D book: the cover opens and the pages turn one by one, then it closes and repeats.
export default function Hero3D({ title = "ExamPDF Pro" }: { title?: string }) {
  const [step, setStep] = useState(0), scene = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { setStep(N); return; }
    const t0 = setTimeout(() => setStep(1), 900), t = setInterval(() => { if (!document.hidden) setStep((s) => (s + 1) % (N + 2)); }, 1900);
    return () => { clearTimeout(t0); clearInterval(t); };
  }, []);
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
          <div className="b3d-base"><div className="text-3xl">🔒</div><b>Like what you see?</b><small>Unlock all pages after payment verification</small></div>
          <div className="b3d-sp" />
          <div className={lf(0)} style={z(22, 4)}>
            <div className="b3d-s b3d-cv"><i>PDF</i><b>{title}</b><span>Study Smart<br />Score High</span></div>
            <div className="b3d-s b b3d-cv b3d-cvi"><span>Preview inside</span><b>Flip through</b></div>
          </div>
          {PAGES.map((p, i) => (
            <div key={p.h} className={lf(i + 1)} style={z(17 - i * 5, 7 + i * 3)}>
              <div className="b3d-s b3d-pg"><h5>{p.h}</h5><Lines w={p.a} />{p.bars && <div className="b3d-bx">{[40, 65, 50, 85, 70, 95].map((h, k) => <i key={k} style={{ height: h + "%" }} />)}</div>}<Lines w={p.b} /></div>
              <div className="b3d-s b b3d-pg"><h5>{p.h} • NOTES</h5><Lines w={[100, 80, 92, 70, 96, 60, 88]} /></div>
            </div>
          ))}
        </div>
      </div>
      <div className="b3d-fl a">👀 Preview first</div><div className="b3d-fl b">🔒 Secure download</div><div className="b3d-fl c">⭐ Exam-ready notes</div>
    </div>
  );
}
