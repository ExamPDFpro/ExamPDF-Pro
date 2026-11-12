// Runs before the app: reload when the URL hash switches between the shop, #admin and #/pdf/<slug> (the app reads the route once per load).
import { captureRef } from './lib/affiliate';
const routeHash = (h: string) => (/^#(admin|\/pdf\/)/.test(h) ? h.split('?')[0] : '');
let last = routeHash(location.hash);
window.addEventListener('hashchange', () => { const now = routeHash(location.hash); if (now !== last) { last = now; location.reload(); } });
captureRef();
