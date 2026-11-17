// Cart items stay for 7 days. The cart itself is still stored exactly as before (localStorage "cart" = list of PDF ids);
// the time each item was added is kept in a separate key. Purchases are never touched: this only affects the unbought cart.
const TTL = 7 * 24 * 60 * 60 * 1000;
const stamps = (): Record<string, number> => { try { const s = JSON.parse(localStorage.getItem('cart_added') || '{}'); return s && typeof s === 'object' ? s : {}; } catch { return {}; } };
/** Cart ids on page load, minus items added more than 7 days ago. Old carts without a time are kept (they get stamped now). */
export function loadCart(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem('cart') || '[]'); if (!Array.isArray(raw)) return [];
    const st = stamps(), now = Date.now();
    return raw.filter((id: any) => typeof id === 'string' && !(typeof st[id] === 'number' && now - st[id] > TTL));
  } catch { return []; }
}
/** Remember when each item was added (new items get "now", existing ones keep their time, removed ones are forgotten). */
export function stampCart(cart: string[]) {
  try { const st = stamps(), now = Date.now(), out: Record<string, number> = {}; cart.forEach(id => { out[id] = typeof st[id] === 'number' ? st[id] : now; }); localStorage.setItem('cart_added', JSON.stringify(out)); } catch { /* ignore */ }
}
