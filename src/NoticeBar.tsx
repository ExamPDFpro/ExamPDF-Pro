import { useState } from 'react';
import { X } from 'lucide-react';
import { useLang, useT } from './i18n';
// Website notice / announcement. Shown only when the admin has switched it on; a visitor can close it (it stays closed until the admin saves a new notice).
const seen = (id: string) => { try { return localStorage.getItem('notice_closed') === id; } catch { return false; } };
export default function NoticeBar({ notice }: { notice?: any }) {
  const lang = useLang(), t = useT();
  const id = String(notice?.id || ''), [closed, setClosed] = useState(() => seen(id)), [lastId, setLastId] = useState(id);
  if (id !== lastId) { setLastId(id); setClosed(seen(id)); }
  const text = (notice?.text?.[lang] || notice?.text?.en || '').trim();
  if (!notice?.enabled || !text || closed) return null;
  const url = typeof notice.url === 'string' && /^https?:\/\//i.test(notice.url) ? notice.url : '';
  const close = () => { try { localStorage.setItem('notice_closed', id); } catch { /* ignore */ } setClosed(true); };
  return <div role="status" className="relative z-30 border-b border-gold/30 bg-gold/10 px-10 py-2 text-center text-sm text-white">
    {url ? <a href={url} target="_blank" rel="noopener noreferrer" className="underline">{text}</a> : text}
    <button aria-label={t('common.close')} onClick={close} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/70"><X size={16} /></button></div>;
}
