import type { ReactNode } from 'react';
import { Facebook, Instagram, Send, MessageCircle, Youtube, Link2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { useT } from './i18n';
const X_ICON = (c: string) => <svg viewBox="0 0 24 24" className={c} fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>;
export const PLATFORMS: { id: string; name: string; icon: (c: string) => ReactNode }[] = [
  { id: 'facebook', name: 'Facebook', icon: (c) => <Facebook className={c} /> }, { id: 'instagram', name: 'Instagram', icon: (c) => <Instagram className={c} /> },
  { id: 'youtube', name: 'YouTube', icon: (c) => <Youtube className={c} /> }, { id: 'telegram', name: 'Telegram', icon: (c) => <Send className={c} /> },
  { id: 'whatsapp', name: 'WhatsApp', icon: (c) => <MessageCircle className={c} /> }, { id: 'x', name: 'X', icon: X_ICON },
  { id: 'website', name: 'Website', icon: (c) => <Link2 className={c} /> },
];
export type SocialItem = { id: string; platform: string; url: string; show: boolean };
export const isHttp = (u: string) => /^https?:\/\/[^\s/$.?#][^\s]*$/i.test((u || '').trim());
/** Items from the admin manager; falls back to the old fixed fields if the manager was never saved. */
export function socialItems(site: any): SocialItem[] {
  const list = site?.social_links?.items;
  if (Array.isArray(list)) return list.filter((x: any) => x && x.show !== false && isHttp(x.url));
  return Object.entries(site?.social || {}).filter(([, u]) => isHttp(String(u))).map(([k, u]) => ({ id: k, platform: k === 'twitter' ? 'x' : k, url: String(u), show: true }));
}
export default function SocialIcons({ site }: { site: any }) {
  const t = useT(); const items = socialItems(site);
  if (!items.length) return null;
  return <div className="v2-social mt-3 flex flex-wrap gap-2.5">{items.map((it) => {
    const pf = PLATFORMS.find((p) => p.id === it.platform) || PLATFORMS[PLATFORMS.length - 1];
    return <a key={it.id} href={it.url.trim()} target="_blank" rel="noopener noreferrer" aria-label={t('social.visit', { name: pf.name })} title={pf.name}
      onClick={() => { if (isSupabaseConfigured) supabase.rpc('track_social_click', { p_platform: pf.id }); }}
      className="v2-social-btn flex h-11 w-11 items-center justify-center rounded-full border border-gold/50 text-gold shadow-[0_4px_14px_rgba(0,0,0,.35)] transition duration-200 hover:-translate-y-0.5 hover:scale-110 hover:bg-gold hover:text-navy active:scale-95 md:h-10 md:w-10">{pf.icon('h-[18px] w-[18px]')}</a>;
  })}</div>;
}
