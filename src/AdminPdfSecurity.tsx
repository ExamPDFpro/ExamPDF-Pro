import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { useT } from './i18n';
// Main-admin-only report: possible link sharing + files in the PUBLIC preview folder that look like a full PDF.
export default function AdminPdfSecurity() {
  const t = useT();
  const [r, setR] = useState<any>(null);
  useEffect(() => { (async () => { const { data, error } = await supabase.rpc('admin_pdf_security_report'); if (!error) setR(data); })(); }, []);
  if (!r) return null;
  const mb = (n: number) => (n / 1048576).toFixed(1) + ' MB';
  const warn = r.suspicious.length + r.previews.length > 0;
  return <div className="admin-panel mb-4 p-4"><h3 className="mb-1 font-bold text-gold">{t('ad.sec.title')}</h3><p className="mb-3 text-xs text-white/50">{t('ad.sec.note')}</p>
    {!warn && <p className="py-2 text-sm text-emerald-300">✓ {t('ad.sec.ok')}</p>}
    {r.previews.length > 0 && <div className="mb-3 rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-sm"><p className="mb-1 font-bold text-red-200">⚠ {t('ad.sec.prev')}</p>
      {r.previews.map((p: any) => <p key={p.name} className="break-all text-xs text-white/80">{p.name} · {mb(p.size)} · {p.reason === 'big' ? t('ad.sec.big') : t('ad.sec.close')}</p>)}</div>}
    {r.suspicious.length > 0 && <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-3 text-sm"><p className="mb-1 font-bold text-amber-200">⚠ {t('ad.sec.susp')}</p>
      {r.suspicious.map((s: any, i: number) => <p key={i} className="text-xs text-white/80">{s.email || '—'} · {s.title || '—'} · {s.downloads} {t('ad.sec.dl')} · {s.ips} IP · {s.reason === 'many_ips' ? t('ad.sec.manyips') : t('ad.sec.manydl')} · {new Date(s.last_at).toLocaleString()}</p>)}</div>}
  </div>;
}
