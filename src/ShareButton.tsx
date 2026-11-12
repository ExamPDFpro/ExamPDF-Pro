import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { supabase, isSupabaseConfigured, type Product } from './lib/supabase';
import { shareUrl } from './lib/share';
import { useT } from './i18n';
// Tiny, light share icon placed next to a PDF's name. Shares a PUBLIC page link only (never the file).
export default function ShareButton({ p, brand = 'ExamPDF Pro' }: { p: Product; brand?: string }) {
  const t = useT(); const [done, setDone] = useState(false);
  if (!p.slug) return null;
  async function go(e: React.MouseEvent) {
    e.stopPropagation();
    const url = shareUrl(p.slug!); let channel = 'link';
    try {
      if (navigator.share && matchMedia('(pointer: coarse)').matches) { await navigator.share({ title: p.title, text: t('share.text', { name: brand }), url }); channel = 'native'; }
      else throw 0;
    } catch (err) {
      if ((err as any)?.name === 'AbortError') return;
      try { await navigator.clipboard.writeText(url); } catch { const ta = document.createElement('textarea'); ta.value = url; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch { /* ignore */ } ta.remove(); }
      setDone(true); setTimeout(() => setDone(false), 1800); channel = 'copy';
    }
    if (isSupabaseConfigured) supabase.rpc('track_share', { p_product_id: p.id, p_channel: channel });
  }
  return <span className="ml-1.5 inline-flex items-center align-middle"><button type="button" onClick={go} aria-label={t('share.label')} title={t('share.label')} className="v2-share inline-flex h-6 w-6 items-center justify-center rounded-full text-white/45 transition hover:text-gold"><Share2 size={14} /></button>{done && <span role="status" className="ml-1 text-[10px] font-semibold text-gold">{t('share.copied')}</span>}</span>;
}
