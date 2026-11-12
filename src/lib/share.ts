/** Public, shareable page of a PDF: <site>/pdf/<slug>/ — never contains the file or a download link. */
export function siteBase(): string {
  const u = new URL(location.href);
  let p = u.pathname.replace(/index\.html$/, '').replace(/\/pdf\/[^/]+\/?$/, '/');
  if (!p.endsWith('/')) p += '/';
  return u.origin + p;
}
export const shareUrl = (slug: string) => `${siteBase()}pdf/${encodeURIComponent(slug)}/`;
export const pdfRouteSlug = (): string | null => { const m = /^#\/pdf\/([^/?#]+)/.exec(location.hash); return m ? decodeURIComponent(m[1]) : null; };
