import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { supabase } from './lib/supabase';
import { useT } from './i18n';
// Second step of login for accounts that turned on two-step verification (required for admin / sub-admin power to work).
export default function MfaChallenge({ onDone }: { onDone: () => void }) {
  const t = useT(); const [code, setCode] = useState(''), [busy, setBusy] = useState(false), [err, setErr] = useState('');
  async function verify(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      const { data: fs } = await supabase.auth.mfa.listFactors();
      const f = fs?.totp?.find((x: any) => x.status === 'verified'); if (!f) throw new Error('no factor');
      const ch = await supabase.auth.mfa.challenge({ factorId: f.id }); if (ch.error) throw ch.error;
      const v = await supabase.auth.mfa.verify({ factorId: f.id, challengeId: ch.data.id, code: code.trim() }); if (v.error) throw v.error;
      onDone();
    } catch { setErr(t('mfa.bad')); } finally { setBusy(false); }
  }
  return <main className="flex min-h-screen items-center justify-center bg-navy p-4 text-white"><form onSubmit={verify} className="card w-full max-w-sm bg-navy p-6 text-center">
    <ShieldCheck className="mx-auto mb-3 h-9 w-9 text-gold" /><h1 className="text-xl font-black text-gold">{t('mfa.title')}</h1><p className="mt-2 text-sm text-white/65">{t('mfa.sub')}</p>
    <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder={t('mfa.code')} className="input mt-4 text-center text-lg tracking-[.3em]" />
    {err && <p className="mt-2 text-sm text-gold">{err}</p>}
    <button disabled={busy || code.length !== 6} className="btn-gold mt-4 w-full">{t('mfa.verify')}</button>
    <button type="button" onClick={async () => { await supabase.auth.signOut(); location.href = './'; }} className="mt-3 text-xs text-white/50 underline">{t('mfa.out')}</button>
  </form></main>;
}
