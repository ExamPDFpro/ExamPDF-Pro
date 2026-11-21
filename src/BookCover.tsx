// Realistic CSS 3D book mockup used inside the existing product card.
// Display-only: the cover image (if any) is the front face; otherwise a designed cover is generated.
import { is3d } from "./lib/bookMockup";

export default function BookCover({ title, category, hue, url, ready }: { title: string; category: string; hue: number; url?: string | null; ready: string }) {
  const st = { ["--bh" as any]: hue } as React.CSSProperties;
  // A generated 3D mockup image already contains the whole book: show it as is.
  if (is3d(url)) return <div className="bk-stage bk-img3d" style={st}><img src={url!} alt={title} loading="lazy" draggable={false} /></div>;
  return (
    <div className="bk-stage" style={st} aria-hidden={url ? undefined : true}>
      <div className="bk-shadow" />
      <div className="bk">
        <div className="bk-pages" />
        <div className="bk-spine"><span>ExamPDF Pro</span></div>
        <div className="bk-front">
          {url ? <img src={url} alt={title} loading="lazy" draggable={false} /> : (
            <div className="bk-art">
              <span className="bk-cat">{category}</span>
              <b className="bk-title">{title}</b>
              <i className="bk-line" />
              <span className="bk-ready">{ready}</span>
              <em className="bk-brand">ExamPDF Pro</em>
            </div>
          )}
          <i className="bk-hinge" /><i className="bk-gloss" />
        </div>
      </div>
    </div>
  );
}
