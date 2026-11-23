import { useState } from "react";
import { Eye, Lock, Download, Search, ChevronDown } from "lucide-react";
import { useT, type Key } from "./i18n";

/** New homepage sections (additive): "How it works" and "FAQ". Both can be hidden from site.texts (how_hidden / faq_hidden). */
export function HowItWorks() {
  const t = useT();
  const steps: { icon: typeof Search; title: Key; text: Key }[] = [
    { icon: Search, title: "how.1.t", text: "how.1.d" },
    { icon: Eye, title: "how.2.t", text: "how.2.d" },
    { icon: Lock, title: "how.3.t", text: "how.3.d" },
    { icon: Download, title: "how.4.t", text: "how.4.d" },
  ];
  return (
    <section id="how" className="mx-auto max-w-[1100px] px-4 py-8">
      <div className="mb-5">
        <h2 className="exam-section-title text-xl font-black">{t("how.title")}</h2>
        <p className="mt-1 text-sm text-white/60">{t("how.sub")}</p>
      </div>
      <ol className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <li key={s.title} className="card flex flex-col gap-2 bg-white/[.04] p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold text-sm font-black text-navy">{i + 1}</span>
                <Icon className="h-5 w-5 text-gold" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-bold sm:text-base">{t(s.title)}</h3>
              <p className="text-[13px] leading-6 text-white/65">{t(s.text)}</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function FaqSection() {
  const t = useT();
  const [open, setOpen] = useState<number>(0);
  const items: { q: Key; a: Key }[] = [
    { q: "faq.1.q", a: "faq.1.a" },
    { q: "faq.2.q", a: "faq.2.a" },
    { q: "faq.3.q", a: "faq.3.a" },
    { q: "faq.4.q", a: "faq.4.a" },
  ];
  return (
    <section id="faq" className="mx-auto max-w-[800px] px-4 py-8">
      <div className="mb-5">
        <h2 className="exam-section-title text-xl font-black">{t("faq.title")}</h2>
        <p className="mt-1 text-sm text-white/60">{t("faq.sub")}</p>
      </div>
      <div className="flex flex-col gap-3">
        {items.map((it, i) => {
          const on = open === i;
          return (
            <div key={it.q} className="card overflow-hidden bg-white/[.04]">
              <button
                type="button"
                aria-expanded={on}
                aria-controls={`faq-panel-${i}`}
                onClick={() => setOpen(on ? -1 : i)}
                className="flex min-h-[44px] w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold sm:text-base"
              >
                <span>{t(it.q)}</span>
                <ChevronDown className={"h-5 w-5 shrink-0 text-gold transition-transform " + (on ? "rotate-180" : "")} aria-hidden="true" />
              </button>
              {on && (
                <p id={`faq-panel-${i}`} className="px-4 pb-4 text-sm leading-6 text-white/70">
                  {t(it.a)}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
