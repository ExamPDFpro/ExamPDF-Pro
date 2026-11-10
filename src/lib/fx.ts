import type { PointerEvent } from "react";

// Match the supplied demo: pronounced 3D book tilt, lift, and moving light hotspot.
export function tilt(e: PointerEvent<HTMLElement>) {
  if (e.pointerType === "touch") return;
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height) return;
  const x = (e.clientX - r.left) / r.width;
  const y = (e.clientY - r.top) / r.height;
  // Demo values: up to 11deg horizontal / 9deg vertical, lifted 6px.
  el.style.transform = `perspective(1100px) rotateY(${(x - 0.5) * 22}deg) rotateX(${(0.5 - y) * 18}deg) translateY(-6px)`;
  el.style.setProperty("--mx", `${x * 100}%`);
  el.style.setProperty("--my", `${y * 100}%`);
}

export function untilt(e: PointerEvent<HTMLElement>) {
  const el = e.currentTarget;
  el.style.transform = "";
  el.style.setProperty("--mx", "30%");
  el.style.setProperty("--my", "20%");
}

// Small gold spark burst (add to cart / successful payment). Skipped when the visitor prefers reduced motion.
export function burst(x: number, y: number) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  for (let i = 0; i < 14; i++) {
    const s = document.createElement("span"), a = (Math.PI * 2 * i) / 14, d = 50 + Math.random() * 60;
    s.textContent = ["✦", "✨", "⭐"][i % 3]; s.className = "b3d-spark"; s.style.left = x + "px"; s.style.top = y + "px";
    s.style.setProperty("--dx", Math.cos(a) * d + "px"); s.style.setProperty("--dy", Math.sin(a) * d + "px");
    document.body.appendChild(s); setTimeout(() => s.remove(), 950);
  }
}
