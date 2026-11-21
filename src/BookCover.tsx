// Realistic CSS 3D book mockup used inside the existing product card.
// Display-only: the cover image (if any) is the front face; otherwise a designed cover is generated.
export default function BookCover({ title, category, hue, url, ready }: { title: string; category: string; hue: number; url?: string | null; ready: string }) {
  const st = { ["--bh" as any]: hue } as React.CSSProperties;
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
