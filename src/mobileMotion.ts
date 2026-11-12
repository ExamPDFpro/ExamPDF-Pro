// MOBILE / TOUCH ONLY: gives PDF cards a very light tilt while scrolling (like the desktop hover movement, but much smaller).
// Desktop (mouse) is not touched: the script exits unless the primary input cannot hover.
export function startMobileCardMotion() {
  if (!matchMedia('(hover: none)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let raf = 0;
  const run = () => {
    raf = 0; const vh = innerHeight, vw = innerWidth;
    document.querySelectorAll<HTMLElement>('.exam-card').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -80 || r.top > vh + 80) return;
      const ry = Math.max(-1, Math.min(1, ((r.top + r.height / 2) - vh / 2) / (vh / 2)));
      const rx = Math.max(-1, Math.min(1, ((r.left + r.width / 2) - vw / 2) / (vw / 2)));
      el.style.setProperty('--m-rx', (ry * -2.2).toFixed(2) + 'deg');
      el.style.setProperty('--m-ry', (rx * 2.6).toFixed(2) + 'deg');
      el.style.setProperty('--m-ty', (ry * 2).toFixed(1) + 'px');
    });
  };
  const tick = () => { if (!raf) raf = requestAnimationFrame(run); };
  addEventListener('scroll', tick, { passive: true }); addEventListener('resize', tick); addEventListener('load', tick);
  new MutationObserver(tick).observe(document.body, { childList: true, subtree: true });
  tick();
}
