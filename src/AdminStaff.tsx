import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { useT } from './i18n';
const input = 'w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm';
const label = 'mb-1 block text-xs text-white/60';
export default function AdminStaff({ say, myId }: { say: (s: string) => void; myId: string }) {
  const t = useT();
  const [people, setPeople] = useState<any[]>([]), [email, setEmail] = useState(''), [role, setRole] = useState('subadmin');
  const [factors, setFactors] = useState<any[]>([]), [enr, setEnr] = useState<any>(null), [code, setCode] = useState('');
  const loadP = async () => { const { data } = await supabase.from('profiles').select('id,email,role,is_disabled').in('role', ['admin', 'subadmin']).order('role'); setPeople(data || []); };
  const loadF = async () => { const { data } = await supabase.auth.mfa.listFactors(); setFactors((data?.totp || []).filter((f: any) => f.status === 'verified')); };
  useEffect(() => { loadP(); loadF(); }, []);
  const apply = async () => {
    const { error } = await supabase.rpc('admin_set_role', { p_email: email.trim(), p_role: role });
    if (error) { say(/own role/i.test(error.message) ? t('ad.st.self') : /not found/i.test(error.message) ? t('ad.st.notfound') : error.message); return; }
    say(t('ad.st.done')); setEmail(''); loadP();
  };
  const toggle = async (p: any) => { if (p.id === myId) { say(t('ad.st.self')); return; } const { error } = await supabase.from('profiles').update({ is_disabled: !p.is_disabled }).eq('id', p.id); if (error) say(error.message); else loadP(); };
  const start = async () => { const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' }); if (error) { say(error.message); return; } setEnr(data); };
  const verify = async () => {
    const ch = await supabase.auth.mfa.challenge({ factorId: enr.id }); if (ch.error) { say(t('ad.mfa.bad')); return; }
    const v = await supabase.auth.mfa.verify({ factorId: enr.id, challengeId: ch.data.id, code: code.trim() }); if (v.error) { say(t('ad.mfa.bad')); return; }
    setEnr(null); setCode(''); say(t('ad.mfa.enabled')); loadF();
  };
  const off = async () => { if (!window.confirm(t('ad.confirm'))) return; const { error } = await supabase.auth.mfa.unenroll({ factorId: factors[0].id }); if (error) say(error.message); else { say(t('ad.mfa.disabled')); loadF(); } };
  const on = factors.length > 0;
  return <>
    <h2 className="mb-4 text-2xl font-black">{t('ad.tab.staff')}</h2>
    <div className="admin-panel mb-4 p-4"><h3 className="mb-1 font-bold text-gold">{t('ad.mfa.title')}</h3><p className="mb-3 text-xs text-white/55">{t('ad.mfa.help')}</p>
      <p className={`mb-3 text-sm ${on ? 'text-green-300' : 'text-gold'}`}>{on ? t('ad.mfa.on') : t('ad.mfa.off')}</p>
      {!on && !enr && <><p className="mb-3 text-xs text-white/60">{t('ad.mfa.warn')}</p><button className="btn-gold" onClick={start}>{t('ad.mfa.enable')}</button></>}
      {enr && <div className="max-w-sm"><p className="mb-2 text-sm">{t('ad.mfa.scan')}</p><img src={enr.totp.qr_code} alt="QR" className="mb-2 h-44 w-44 rounded bg-white p-1" />
        <p className="mb-1 text-xs text-white/55">{t('ad.mfa.secret')}</p><p className="mb-3 select-all break-all rounded bg-white/5 p-2 font-mono text-xs">{enr.totp.secret}</p>
        <input className={input} inputMode="numeric" maxLength={6} placeholder={t('ad.mfa.code')} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} />
        <button className="btn-gold mt-3" disabled={code.length !== 6} onClick={verify}>{t('ad.mfa.confirm')}</button></div>}
      {on && <button className="btn-blue" onClick={off}>{t('ad.mfa.turnoff')}</button>}</div>
    <div className="admin-panel p-4"><h3 className="mb-1 font-bold text-gold">{t('ad.st.title')}</h3><p className="mb-3 text-xs text-white/55">{t('ad.st.help')}</p>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]"><label><span className={label}>{t('ad.st.email')}</span><input className={input} type="email" value={email} onChange={e => setEmail(e.target.value)} /></label>
        <label><span className={label}>{t('ad.st.role')}</span><select className={input} value={role} onChange={e => setRole(e.target.value)}>{['subadmin', 'admin', 'customer'].map(r => <option key={r} value={r}>{t(`ad.st.r.${r}` as any)}</option>)}</select></label>
        <button className="btn-gold self-end" disabled={!email.trim()} onClick={apply}>{t('ad.st.apply')}</button></div>
      <h4 className="mb-2 mt-5 text-sm font-bold text-white/70">{t('ad.st.people')}</h4>
      {people.map(p => <div key={p.id} className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 p-3 text-sm"><div><b>{p.email}</b> <span className="ml-2 rounded-full border border-gold/40 px-2 py-0.5 text-xs text-gold">{t(`ad.st.r.${p.role}` as any)}</span>{p.is_disabled && <span className="ml-2 text-xs text-red-300">{t('ad.st.disabled')}</span>}</div>
        {p.id !== myId && <button className="btn-blue !py-1" onClick={() => toggle(p)}>{p.is_disabled ? t('ad.st.enable') : t('ad.st.disable')}</button>}</div>)}</div></>;
}
