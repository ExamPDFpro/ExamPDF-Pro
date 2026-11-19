// "Save for later" lives only in this browser (localStorage key "cart_saved" = list of PDF ids). It never touches the cart key or the database.
export function loadSaved(): string[] {
  try { const r = JSON.parse(localStorage.getItem('cart_saved') || '[]'); return Array.isArray(r) ? r.filter((x: any) => typeof x === 'string') : []; } catch { return []; }
}
export function storeSaved(ids: string[]) { try { localStorage.setItem('cart_saved', JSON.stringify(ids)); } catch { /* ignore */ } }
